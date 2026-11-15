"""Deriva texturas repetibles del escaneo del pasillo del tercer piso (Bloque 1).

Uso, desde la raíz del repositorio:
    python scripts/extract-scan-textures.py "ruta/a/Pasillo - Piso 3.glb" [--preview carpeta]

Se usó el original de Drive (textura de 8192 px). Indicá la ruta a tu copia local.
Solo lee el escaneo. Escribe frontend/public/assets/textures/*.webp, su descripción
textures.json y las entradas correspondientes de frontend/public/assets/sources.json.
Con --preview solo guarda ortofotos amplias en la carpeta indicada para elegir regiones.

Método: el pasillo se alinea con su eje principal (PCA del plano XZ); se rasterizan vistas
ortográficas de regiones elegidas (pared, piso, lamas, cubierta) muestreando la textura
original; se compensa la iluminación con un desenfoque amplio y los bordes se funden con el
tramo contiguo para que la textura se repita sin costuras. Requiere numpy y Pillow.
"""
import argparse
import hashlib
import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend/public/assets"
DRIVE_SOURCE = "Piso 3 - Bloque 1\\Pasillo - Piso 3.glb"

# Regiones en el marco alineado del escaneo, en metros: a = a lo largo del pasillo,
# y = altura sobre el piso, s = transversal (pared de aulas en s≈-1,9; baranda en s≈+0,55).
# u/v son los ejes de la imagen de cada vista; "tile" es el tamaño real que cubre la textura.
# Medidas del escaneo: franjas del piso cada 1,286 m (cuatro por módulo de 5,14 m entre
# pilastras) e hiladas de ladrillo de unos 6,5 cm.
SPECS = [
    # Ventana con hiladas rectas: 4 ladrillos (0,27 m) × 18 hiladas (0,0658 m) para conservar la traba.
    {"name": "ladrillo", "label": "Pared de ladrillo visto de las aulas", "view": "wall",
     "u": (15.32, 16.40), "v": (1.20, 2.384), "depth": (-2.6, -1.2), "blend": 0.06, "size": 512},
    # Un período de franjas, con la franja centrada.
    {"name": "granito-franja", "label": "Piso de granito de la galería, con su franja oscura", "view": "floor",
     "u": (10.517, 11.803), "v": (0.25, 1.536), "depth": (-0.4, 0.5), "blend": 0.12, "size": 512},
    {"name": "granito", "label": "Piso de granito de la galería, sin franja", "view": "floor",
     "u": (9.98, 10.88), "v": (0.36, 1.26), "depth": (-0.4, 0.5), "blend": 0.2, "size": 512},
    # El dintel es bajo: se apilan franjas de cuatro módulos distintos.
    {"name": "hormigon", "label": "Hormigón a la vista (dintel sobre el ladrillo)", "view": "wall",
     "u": (2.2, 4.2), "v": (3.24, 3.54), "depth": (-2.6, -1.2), "blend": 0.18, "size": 512,
     "stack": [2.2, 13.4, -3.1, -12.15], "delight": 0.04},
    # Desde la galería las lamas se ven a contraluz; se lleva su color medio al gris azulado
    # que muestran las fotos desde el patio, conservando el dibujo del escaneo.
    {"name": "lamas", "label": "Lamas de la media sombra sobre la baranda", "view": "rail",
     "u": (-9.55, -7.55), "v": (2.08, 3.04), "depth": (0.0, 1.4), "blend": 0.1, "vblend": 0.0,
     "size": 512, "albedo": (125, 138, 144)},
    {"name": "chapa-cubierta", "label": "Cara inferior de la cubierta de chapa del tercer piso", "view": "ceiling",
     "u": (-10.7, -10.1), "v": (-0.13, 0.29), "depth": (2.4, 6.0), "blend": 0.16, "size": 512},
]


def read_glb(path):
    data = path.read_bytes()
    magic, version, total = struct.unpack_from("<III", data)
    if magic != 0x46546C67 or version != 2 or total != len(data):
        raise SystemExit(f"GLB inválido: {path}")
    jlen = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + jlen])
    blen = struct.unpack_from("<I", data, 20 + jlen)[0]
    binary = data[28 + jlen:28 + jlen + blen]

    def accessor(i):
        a = doc["accessors"][i]
        view = doc["bufferViews"][a["bufferView"]]
        dtype = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a["componentType"]]
        width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[a["type"]]
        offset = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        return np.frombuffer(binary, dtype, a["count"] * width, offset).reshape(a["count"], width)

    primitive = doc["meshes"][0]["primitives"][0]
    positions = accessor(primitive["attributes"]["POSITION"]).astype(np.float64)
    uvs = accessor(primitive["attributes"]["TEXCOORD_0"]).astype(np.float64)
    triangles = accessor(primitive["indices"]).reshape(-1, 3).astype(np.int64)
    image = doc["images"][0]
    view = doc["bufferViews"][image["bufferView"]]
    start = view.get("byteOffset", 0)
    texture = np.asarray(Image.open(io.BytesIO(binary[start:start + view["byteLength"]])).convert("RGB"))
    return positions, uvs, triangles, texture


def align(positions):
    """Rota el escaneo para que el pasillo quede sobre el eje a (determinista)."""
    xz = positions[:, [0, 2]]
    centre = xz.mean(0)
    values, vectors = np.linalg.eigh(np.cov((xz - centre).T))
    axis = vectors[:, np.argmax(values)]
    if axis[0] < 0:
        axis = -axis
    rotation = np.array([[axis[0], axis[1]], [-axis[1], axis[0]]])
    local = (xz - centre) @ rotation.T
    return np.c_[local[:, 0], positions[:, 1], local[:, 1]]  # a, y, s


def view_coordinates(aligned, view):
    a, y, s = aligned[:, 0], aligned[:, 1], aligned[:, 2]
    # u, v (arriba en la imagen), cercanía a la cámara, coordenada usada para recortar profundidad
    return {
        "wall": (a, y, s, s),          # pared vista desde la galería
        "floor": (a, -s, y, y),        # piso visto desde arriba
        "ceiling": (a, s, -y, y),      # cubierta vista desde abajo
        "rail": (-a, y, -s, s),        # baranda y lamas vistas desde la galería
    }[view]


def bary_grid(k):
    return np.array([(i / k, j / k) for i in range(k + 1) for j in range(k + 1 - i)])


def bilinear(texture, uv):
    h, w, _ = texture.shape
    x = np.clip(uv[:, 0] * w - 0.5, 0, w - 1.001)
    y = np.clip(uv[:, 1] * h - 0.5, 0, h - 1.001)
    x0, y0 = x.astype(np.int64), y.astype(np.int64)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    p = lambda yy, xx: texture[yy, xx].astype(np.float32)
    top = p(y0, x0) * (1 - fx) + p(y0, x0 + 1) * fx
    bottom = p(y0 + 1, x0) * (1 - fx) + p(y0 + 1, x0 + 1) * fx
    return top * (1 - fy) + bottom * fy


def orthophoto(scan, view, u_range, v_range, depth, ppm):
    """Rasteriza la región con prueba de profundidad muestreando puntos baricéntricos."""
    aligned, uvs, triangles, texture = scan
    u, v, near, cut = view_coordinates(aligned, view)
    width = int(round((u_range[1] - u_range[0]) * ppm))
    height = int(round((v_range[1] - v_range[0]) * ppm))
    tu, tv, tc = u[triangles], v[triangles], cut[triangles]
    keep = ((tc >= depth[0]) & (tc <= depth[1])).all(1)
    keep &= (tu.max(1) >= u_range[0]) & (tu.min(1) <= u_range[1])
    keep &= (tv.max(1) >= v_range[0]) & (tv.min(1) <= v_range[1])
    tris = triangles[keep]
    px = np.stack([(u[tris] - u_range[0]) * ppm, (v_range[1] - v[tris]) * ppm], -1)
    edges = np.linalg.norm(px - np.roll(px, 1, axis=1), axis=-1).max(1)
    # Suficientes muestras por arista para no dejar huecos (los pisos tienen triángulos grandes).
    levels = np.clip(2 ** np.ceil(np.log2(np.maximum(edges * 1.6, 1))), 1, 2048).astype(int)
    best = np.full(width * height, -np.inf)
    colour = np.zeros((width * height, 3), np.float32)
    for k in np.unique(levels):
        grid = bary_grid(int(k))
        w1, w2 = grid[:, 0], grid[:, 1]
        w0 = 1 - w1 - w2
        members = tris[levels == k]
        chunk = max(1, 3_000_000 // len(grid))
        for start in range(0, len(members), chunk):
            group = members[start:start + chunk]
            def interpolate(values):
                return (values[group][:, 0, None] * w0 + values[group][:, 1, None] * w1
                        + values[group][:, 2, None] * w2).ravel()
            sx = (interpolate(u) - u_range[0]) * ppm
            sy = (v_range[1] - interpolate(v)) * ppm
            sn = interpolate(near)
            inside = (sx >= 0) & (sx < width) & (sy >= 0) & (sy < height)
            index = sy[inside].astype(np.int64) * width + sx[inside].astype(np.int64)
            sn = sn[inside]
            order = np.lexsort((sn, index))
            index, sn = index[order], sn[order]
            last = np.r_[index[1:] != index[:-1], True]
            index, sn = index[last], sn[last]
            better = sn > best[index]
            index, sn = index[better], sn[better]
            uv = np.stack([interpolate(uvs[:, 0]), interpolate(uvs[:, 1])], -1)[inside][order][last][better]
            best[index] = sn
            colour[index] = bilinear(texture, uv)
    mask = np.isfinite(best).reshape(height, width)
    return colour.reshape(height, width, 3), mask


def box_blur(image, radius, axis):
    pad = [(0, 0)] * image.ndim
    pad[axis] = (radius + 1, radius)
    padded = np.pad(image, pad, mode="reflect")
    total = np.cumsum(padded, axis=axis)
    upper = np.take(total, np.arange(2 * radius + 1, padded.shape[axis]), axis=axis)
    lower = np.take(total, np.arange(0, padded.shape[axis] - 2 * radius - 1), axis=axis)
    return (upper - lower) / (2 * radius + 1)


def blur(image, radius):
    for _ in range(3):
        image = box_blur(box_blur(image, radius, 0), radius, 1)
    return image


def fill_holes(image, mask):
    """Completa huecos pequeños del escaneo con el promedio de sus vecinos cubiertos."""
    image, mask = image.copy(), mask.copy()
    for _ in range(64):
        if mask.all():
            break
        weight = blur(mask.astype(np.float32)[..., None], 1)
        total = blur(image * mask[..., None], 1)
        grow = (~mask) & (weight[..., 0] > 0.05)
        image[grow] = total[grow] / weight[grow]
        mask = mask | grow
    return image


def delight(image, radius):
    """Divide por la iluminación de baja frecuencia y conserva el color medio."""
    low = blur(image, radius)
    return np.clip(image / np.maximum(low, 1) * image.reshape(-1, 3).mean(0), 0, 255)


def make_tileable(image, bu, bv):
    """Funde el tramo sobrante final con el inicio para que la textura se repita sin costuras."""
    if bu:
        width = image.shape[1] - bu
        ramp = np.linspace(0, 1, bu)[None, :, None]
        body = image[:, :width].copy()
        body[:, :bu] = image[:, width:] * (1 - ramp) + image[:, :bu] * ramp
        image = body
    if bv:
        height = image.shape[0] - bv
        ramp = np.linspace(0, 1, bv)[:, None, None]
        body = image[:height].copy()
        body[:bv] = image[height:] * (1 - ramp) + image[:bv] * ramp
        image = body
    return image


def build(scan, spec, ppm):
    (u0, u1), (v0, v1) = spec["u"], spec["v"]
    tile_u, tile_v = u1 - u0, v1 - v0
    bu = spec["blend"] * tile_u
    bv = spec.get("vblend", spec["blend"]) * tile_v
    if "stack" in spec:
        # Una superficie baja (el dintel) se apila con tramos de otros módulos para cubrir un cuadrado.
        rows = []
        for start in spec["stack"]:
            image, mask = orthophoto(scan, spec["view"], (start, start + tile_u + bu), (v0, v1), spec["depth"], ppm)
            radius = int(spec.get("delight", 0.25) * ppm)
            rows.append(make_tileable(delight(fill_holes(image, mask), radius), int(round(bu * ppm)), 0))
        # Cada tramo conserva su detalle pero adopta el color medio común, para no formar bandas.
        common = np.mean([row.reshape(-1, 3).mean(0) for row in rows], 0)
        rows = [row * (common / row.reshape(-1, 3).mean(0)) for row in rows]
        overlap = int(0.25 * tile_v * ppm)
        image = rows[0]
        for row in rows[1:]:
            ramp = np.linspace(0, 1, overlap)[:, None, None]
            image[-overlap:] = image[-overlap:] * (1 - ramp) + row[:overlap] * ramp
            image = np.concatenate([image, row[overlap:]], 0)
        image = make_tileable(np.concatenate([image, rows[0][:overlap]], 0), 0, overlap)
        tile_v = image.shape[0] / ppm
        return image, (round(tile_u, 3), round(tile_v, 3))
    image, mask = orthophoto(scan, spec["view"], (u0, u1 + bu), (v0 - bv, v1), spec["depth"], ppm)
    coverage = mask.mean()
    if coverage < 0.97:
        print(f"  aviso: {spec['name']} cubre {coverage:.1%} de la región; se completan huecos")
    image = delight(fill_holes(image, mask), int(spec.get("delight", 0.35) * ppm))
    # El sobrante (u1..u1+bu a la derecha, v0-bv..v0 abajo) continúa el borde opuesto.
    return make_tileable(image, int(round(bu * ppm)), int(round(bv * ppm))), (round(tile_u, 3), round(tile_v, 3))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scan", type=Path, help="ruta al escaneo GLB local")
    parser.add_argument("--preview", type=Path, help="guardar ortofotos amplias para elegir regiones")
    args = parser.parse_args()
    positions, uvs, triangles, texture = read_glb(args.scan)
    scan = (align(positions), uvs, triangles, texture)
    ppm = texture.shape[0] / 8192 * 400  # ~400 px/m con la textura original
    if args.preview:
        args.preview.mkdir(parents=True, exist_ok=True)
        views = {"pared": ("wall", (-30, 30), (0, 3.9), (-2.6, -1.2)),
                 "piso": ("floor", (-30, 30), (-0.6, 2.2), (-0.4, 0.5)),
                 "baranda": ("rail", (-30, 30), (0, 3.4), (0.0, 1.4)),
                 "cubierta": ("ceiling", (-30, 30), (-3.2, 1.2), (2.4, 6.0))}
        for name, (view, u, v, depth) in views.items():
            image, mask = orthophoto(scan, view, u, v, depth, 100)
            image[~mask] = (255, 0, 255)
            Image.fromarray(image.astype(np.uint8)).save(args.preview / f"{name}.png")
            print("vista previa", name, image.shape)
        return
    out = ASSETS / "textures"
    out.mkdir(exist_ok=True)
    catalogue = {}
    source_hash = sha256(args.scan)
    for spec in SPECS:
        image, tile = build(scan, spec, ppm)
        if "albedo" in spec:
            image = image * (np.array(spec["albedo"]) / image.reshape(-1, 3).mean(0))
        result = Image.fromarray(np.clip(image, 0, 255).astype(np.uint8))
        size = spec["size"]
        aspect = tile[1] / tile[0]
        result = result.resize((size, max(64, int(round(size * aspect / 32)) * 32)), Image.LANCZOS)
        target = out / f"{spec['name']}.webp"
        result.save(target, quality=86, method=6)
        mean = np.asarray(result).reshape(-1, 3).mean(0)
        catalogue[spec["name"]] = {"label": spec["label"], "tile": tile,
                                   "mean": "#%02x%02x%02x" % tuple(int(c) for c in mean)}
        print(f"{target.name}: {result.size[0]}×{result.size[1]} px, cubre {tile[0]}×{tile[1]} m")
    (out / "textures.json").write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sources_path = ASSETS / "sources.json"
    sources = json.loads(sources_path.read_text(encoding="utf-8"))
    original = next((a for a in sources["assets"] if a["asset"] == "scans/pasillo-p3.glb"), None)
    entries = [a for a in sources["assets"] if not a["asset"].startswith("textures/")]
    for spec in SPECS:
        target = out / f"{spec['name']}.webp"
        entries.append({
            "source": DRIVE_SOURCE if original and source_hash == original["sourceSha256"] else str(args.scan.name),
            "sourceSha256": source_hash,
            "asset": f"textures/{target.name}",
            "derivation": "Ortofoto del escaneo con iluminación compensada y bordes repetibles "
                          "(scripts/extract-scan-textures.py)",
            "bytes": target.stat().st_size,
            "sha256": sha256(target),
        })
    sources["assets"] = entries
    sources_path.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(SPECS)} texturas escritas en {out.relative_to(ROOT)}; sources.json actualizado.")


if __name__ == "__main__":
    main()
