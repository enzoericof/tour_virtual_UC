"""Deriva las texturas, los murales y los sonidos del ascensor del Bloque 1.

Uso, desde la raíz del repositorio:
    python scripts/prepare-elevator-assets.py ~/Downloads [--preview carpeta]

La carpeta indicada debe contener las fotos y grabaciones aportadas por el equipo el 19/11/2026
(nombres en SOURCES). Solo se leen: los originales quedan fuera del repositorio. Escribe
frontend/public/assets/ascensor/ y sus entradas en frontend/public/assets/sources.json.
Requiere numpy, Pillow y ffmpeg en el PATH.

Método:
- Fotos: cada superficie plana (pared del fondo, piso, botonera, avisos, frente exterior, armario
  y murales) se endereza con una homografía a partir de cuatro esquinas marcadas a mano en la foto
  y se lleva a su tamaño real en metros. Las calcomanías, el afiche con la cara de una persona, el
  pasamanos (se modela aparte), las hojas y los elementos de limpieza se borran interpolando entre
  los bordes de cada hueco. El revoque azul y el acero se vuelven repetibles fundiendo bordes.
- Sonidos: se recorta cada evento, se filtra el ruido grave del celular, se normaliza el nivel y
  el zumbido del viaje se convierte en un bucle sin costuras (fundido cruzado de 1 s), con un
  margen periódico a ambos lados para que el relleno del MP3 no afecte el bucle.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend/public/assets"
OUT = ASSETS / "ascensor"

SOURCES = {
    "fondo": "ascensor fondo.jpeg",
    "piso": "ascensor piso.jpeg",
    "panel": "ascensor panel izquierda foto 2.jpeg",
    "panel-amplia": "ascensor panel izquierda.jpeg",
    "derecha": "ascensor derecha.jpeg",
    "puerta": "ascensor puerta.jpeg",
    "mural-oeste": "cara este.jpeg",
    "mural-sur": "cara sur.jpeg",
    "abriendo": "Ascensor abriendose.m4a",
    "llegada": "Sonido ascensor llegó.m4a",
    "viaje": "Ascensor subiendo y llegando.m4a",
}

# Medidas de la cabina (interpretación: cabina OTIS de 8 personas / 630 kg, 1,1 × 1,4 m, que
# coincide con las franjas de granito del piso enderezado, todas de unos 10 cm).
CABIN = {"width": 1.1, "depth": 1.4, "height": 2.25}
# Frente exterior: puerta de 0,8 × 2,0 m (la proporción coincide con la foto), montante izquierdo
# de 0,28 m, derecho de 0,235 m y dintel de 0,226 m medidos sobre la foto enderezada.
FRAME = {"width": 1.315, "height": 2.226}
CABINET = {"width": 0.45, "height": 2.16}
COP = {"width": 0.25, "height": 1.25}
MURAL = {"width": 2.44, "height": 6.4}


# ---------------------------------------------------------------- geometría

def homography(src, dst):
    rows = []
    for (x, y), (u, v) in zip(src, dst):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    _, _, vt = np.linalg.svd(np.array(rows, float))
    h = vt[-1].reshape(3, 3)
    return h / h[2, 2]


def project(h, points):
    p = np.c_[np.asarray(points, float), np.ones(len(points))] @ h.T
    return p[:, :2] / p[:, 2:]


def sample(a, sx, sy):
    """Muestreo bilineal de un arreglo (alto, ancho, canales)."""
    x0 = np.clip(np.floor(sx).astype(int), 0, a.shape[1] - 2)
    y0 = np.clip(np.floor(sy).astype(int), 0, a.shape[0] - 2)
    fx = np.clip(sx - x0, 0, 1)[:, None]
    fy = np.clip(sy - y0, 0, 1)[:, None]
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
            + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)


def rectify(a, quad, size, out, target=None):
    """Lleva el cuadrilátero `quad` de la foto (o los puntos `target` en metros, si se dan) al
    rectángulo de `size` metros, con `out` píxeles de ancho."""
    w = out
    h = int(round(out * size[1] / size[0]))
    scale = w / size[0]
    if target is None:
        target = [(0, 0), (size[0], 0), (size[0], size[1]), (0, size[1])]
    hm = homography([(x * scale, y * scale) for x, y in target], quad)
    ys, xs = np.mgrid[0:h, 0:w]
    src = project(hm, np.c_[xs.ravel() + 0.5, ys.ravel() + 0.5])
    flat = sample(a, src[:, 0] - 0.5, src[:, 1] - 0.5)
    return flat.reshape(h, w, a.shape[2]), np.linalg.inv(hm) / scale


def polygon_mask(shape, polygons, photo_to_image):
    """Máscara en la imagen enderezada a partir de polígonos marcados en la foto."""
    from PIL import ImageDraw
    canvas = Image.new("L", (shape[1], shape[0]), 0)
    draw = ImageDraw.Draw(canvas)
    for poly in polygons:
        pts = project(photo_to_image, poly) * 1.0
        draw.polygon([tuple(p) for p in pts], fill=255)
    return np.asarray(canvas) > 0


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


# ---------------------------------------------------------------- retoque

def fill_runs(a, mask, axis):
    """Interpola linealmente cada tramo enmascarado entre sus bordes, por filas (axis=1) o
    columnas (axis=0). Con axis=2 repite por filas el borde derecho (hueco pegado a una junta)."""
    a = a.copy()
    view = a if axis != 0 else a.transpose(1, 0, 2)
    m = mask if axis != 0 else mask.T
    for r in range(m.shape[0]):
        row = m[r]
        if not row.any():
            continue
        idx = np.flatnonzero(row)
        starts = idx[np.r_[True, np.diff(idx) > 1]]
        ends = idx[np.r_[np.diff(idx) > 1, True]] + 1
        for s, e in zip(starts, ends):
            left = view[r, max(0, s - 2):s].mean(0) if s > 0 else None
            right = view[r, e:e + 2].mean(0) if e < row.size else None
            if axis == 2 and right is not None:
                left = right
            if left is None:
                left = right
            if right is None:
                right = left
            t = np.linspace(0, 1, e - s + 2)[1:-1, None]
            view[r, s:e] = left * (1 - t) + right * t
    return a


def blur(a, radius):
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)


def add_grain(a, filled, mask, shift, dirty=None):
    """Repone el grano fino (vetas del acero) copiándolo desde la zona limpia más cercana en
    vertical: primero debajo, a `shift`, al doble o al triple, y si no, arriba. `dirty` marca
    todo lo que se va a borrar, para no copiar restos de otras calcomanías."""
    detail = a - blur(a, 3)
    out = filled.copy()
    pending = mask.copy()
    dirty = mask if dirty is None else dirty
    for step in (-shift, -2 * shift, -3 * shift, shift, 2 * shift, 3 * shift):
        moved = np.roll(detail, step, axis=0)
        clean = ~np.roll(dirty, step, axis=0)
        take = pending & clean
        out[take] += moved[take]
        pending &= ~take
    return out


def propagate(a, mask):
    """Rellena desde el borde hacia adentro con el promedio de los vecinos ya conocidos."""
    pad = 2
    a = np.pad(a, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    m = np.pad(mask, pad, mode="constant", constant_values=True)
    offsets = ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1))
    while m.any():
        acc = np.zeros_like(a)
        count = np.zeros(m.shape, np.float32)
        for dy, dx in offsets:
            known = ~np.roll(np.roll(m, dy, 0), dx, 1)
            acc += np.roll(np.roll(a, dy, 0), dx, 1) * known[..., None]
            count += known
        front = m & (count > 0)
        if not front.any():
            break
        a[front] = acc[front] / count[front][:, None]
        m &= ~front
    return a[pad:-pad, pad:-pad]


def diffuse(a, mask, iterations=300):
    """Relleno suave por difusión, para huecos con figuras detrás."""
    a = np.pad(propagate(a, mask), ((1, 1), (1, 1), (0, 0)), mode="edge")
    m = np.pad(mask, 1, mode="constant")[..., None]
    for _ in range(iterations):
        avg = (np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 4
        a = np.where(m, avg, a)
    return a[1:-1, 1:-1]


def seamless(a, blend, vertical=True):
    """Funde los bordes opuestos para que la textura se repita sin costuras."""
    h, w = a.shape[:2]
    bx, by = int(w * blend), int(h * blend) if vertical else 0
    out = a[by:, bx:].copy()
    if bx:
        t = np.linspace(0, 1, bx)[None, :, None]
        out[:, -bx:] = out[:, -bx:] * (1 - t) + a[by:, :bx] * t
    if by:
        t = np.linspace(0, 1, by)[:, None, None]
        top = a[:by, bx:].copy()
        if bx:
            tt = np.linspace(0, 1, bx)[None, :, None]
            top[:, -bx:] = top[:, -bx:] * (1 - tt) + a[:by, :bx] * tt
        out[-by:] = out[-by:] * (1 - t) + top * t
    return out


def flatten_light(a, radius, strength=1.0):
    """Compensa la iluminación desigual conservando el color medio."""
    low = blur(a, radius)
    mean = a.reshape(-1, a.shape[2]).mean(0)
    return a * (1 - strength) + a / np.maximum(low, 1) * mean * strength


def load(folder, key):
    wanted = unicodedata.normalize("NFC", SOURCES[key])
    for file in folder.iterdir():
        if unicodedata.normalize("NFC", file.name) == wanted:
            return file
    raise SystemExit(f"Falta {SOURCES[key]} en {folder}")


def photo(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)


def save(a, name, size=None, quality=80):
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if size:
        img = img.resize(size, Image.LANCZOS)
    target = OUT / name
    img.save(target, quality=quality, method=6)
    return target


# ---------------------------------------------------------------- texturas

def back_wall(folder):
    """Pared del fondo de la cabina, de frente (foto «ascensor fondo»), sin calcomanías ni
    pasamanos."""
    a = photo(load(folder, "fondo"))
    quad = [(143, 40), (868, 31), (836, 1600), (257, 1600)]
    # La foto llega hasta unos 5 cm del piso: se completa repitiendo la franja perforada.
    size = (CABIN["width"], CABIN["height"] - 0.05)
    img, to_img = rectify(a, quad, size, 512)
    # Calcomanías altas: se rellenan por filas, siguiendo las franjas de reflejo; las bajas o junto
    # a una junta, por columnas, para que la junta continúe.
    tall = [rect(186, 222, 226, 280), rect(196, 520, 290, 645), rect(404, 484, 452, 524),
            rect(396, 570, 438, 614), rect(405, 622, 465, 698)]
    # El afiche llega hasta la junta izquierda de su panel: se extiende el borde derecho.
    poster = [[(517, 310), (685, 310), (686, 612), (527, 612)]]
    short = [rect(466, 668, 532, 694), rect(470, 742, 580, 772)]
    passes = [(polygon_mask(img.shape, polygons, to_img), axis, shift)
              for polygons, axis, shift in ((tall, 1, 120), (poster, 2, 120), (short, 0, 60),
                                            ([rect(195, 1052, 862, 1134)], 0, 70))]
    dirty = np.logical_or.reduce([mask for mask, _, _ in passes])
    filled = img
    for mask, axis, shift in passes:
        filled = add_grain(img, fill_runs(filled, mask, axis), mask, shift, dirty)
    rows = int(round(0.05 / size[1] * filled.shape[0]))
    return np.concatenate([filled, np.repeat(filled[-1:], rows, axis=0)], axis=0)


def side_wall(back):
    """Pared lateral de 1,4 m: cinco paneles tomados de la pared del fondo (cuatro paneles)."""
    w = back.shape[1]
    panel = w // 4
    parts = [back[:, :panel], back[:, panel:2 * panel], back[:, 2 * panel:3 * panel],
             back[:, 3 * panel:], back[:, panel:2 * panel]]
    return np.concatenate(parts, axis=1)


def steel_tile(back):
    """Acero inoxidable repetible para puertas y frentes: un panel limpio sin juntas."""
    panel = back.shape[1] // 4
    h = back.shape[0]
    strip = back[int(h * 0.1):int(h * 0.94), 3 * panel + 8:4 * panel - 8]
    return seamless(strip, 0.08, vertical=False)


def floor(folder):
    a = photo(load(folder, "piso"))
    quad = [(330, 598), (935, 584), (1050, 1445), (205, 1445)]
    img, _ = rectify(a, quad, (CABIN["width"], CABIN["depth"]), 512)
    return img


def control_panel(folder):
    """Botonera: los cuatro tornillos de la placa (foto «panel izquierda foto 2») van a 1,2 cm de
    los costados y a 4 cm de los extremos."""
    a = photo(load(folder, "panel"))
    screws = [(497, 60), (693, 128), (707, 1155), (558, 1253)]
    w, h = COP["width"], COP["height"]
    target = [(0.012, 0.04), (w - 0.012, 0.04), (w - 0.012, h - 0.04), (0.012, h - 0.04)]
    img, to_img = rectify(a, screws, (w, h), 200, target)
    points = {
        "display": [(530, 215), (683, 430)],
        "3": (632, 888), "2": (632, 925), "1": (632, 960), "PB": (633, 993),
        "abrir": (598, 1155), "alarma": (650, 1125), "cerrar": (688, 1102),
    }
    layout = {}
    for name, value in points.items():
        pts = project(to_img, value if isinstance(value[0], tuple) else [value])
        layout[name] = [[round(float(x) / img.shape[1], 4), round(float(y) / img.shape[0], 4)] for x, y in pts]
    return img, layout


def notices(folder):
    """Avisos pegados en la pared de la botonera: control de mantenimiento, recomendaciones de OTIS
    y afiche del PCOE de la universidad, en un atlas horizontal."""
    a = photo(load(folder, "panel"))
    specs = [
        ("mantenimiento", [(232, 40), (383, 72), (388, 196), (240, 166)], (0.15, 0.115)),
        ("recomendaciones", [(218, 168), (418, 205), (438, 516), (252, 518)], (0.2, 0.33)),
        ("pcoe", [(258, 567), (447, 553), (473, 878), (280, 928)], (0.21, 0.297)),
    ]
    ppm = 900
    images, layout, x = [], {}, 0
    height = int(round(max(s[1] for _, _, s in specs) * ppm))
    for name, quad, size in specs:
        img, _ = rectify(a, quad, size, int(round(size[0] * ppm)))
        images.append(img)
        layout[name] = {"size": size, "uv": [x, 0, img.shape[1], img.shape[0]]}
        x += img.shape[1] + 4
    atlas = np.full((height, x - 4, 3), 128, np.float32)
    x = 0
    for (name, _, _), img in zip(specs, images):
        atlas[:img.shape[0], x:x + img.shape[1]] = img
        u0, v0, w, h = layout[name]["uv"]
        layout[name]["uv"] = [round(u0 / atlas.shape[1], 4), round(1 - h / atlas.shape[0], 4),
                              round((u0 + w) / atlas.shape[1], 4), 1.0]
        x += img.shape[1] + 4
    return atlas, layout


def exterior(folder):
    """Frente de planta baja (foto «ascensor puerta»): marco y hojas de acero, armario de maniobra y
    revoque azul."""
    a = photo(load(folder, "puerta"))
    frame, _ = rectify(a, [(312, 275), (1088, 263), (1050, 1505), (328, 1505)],
                       (FRAME["width"], FRAME["height"]), 640)
    cabinet, _ = rectify(a, [(16, 303), (300, 302), (345, 1588), (105, 1588)],
                         (CABINET["width"], CABINET["height"]), 220)
    blue = a[8:248, 340:1180]
    blue = flatten_light(blue, 40, 0.8)
    tile = seamless(blue[:, :256 + 40], 0.12)[:, :256]
    tile = np.concatenate([tile, tile[:, ::-1]], axis=1)[:, :256] if tile.shape[1] < 256 else tile
    return frame, cabinet, tile


def paint_under(img, mask):
    """Redibuja, solo donde había hojas, las figuras planas de la parte alta del mural sur: fondo
    verde, rectángulo azul, franja blanca y regla amarilla con borde y marcas naranjas. Polígonos en
    píxeles de la imagen enderezada (512 de ancho), siguiendo los bordes que quedan a la vista."""
    from PIL import ImageDraw
    canvas = Image.new("RGB", (img.shape[1], img.shape[0]), (139, 201, 61))
    draw = ImageDraw.Draw(canvas)
    draw.polygon([(350, 0), (512, 0), (512, 47), (420, 32), (370, 10)], fill=(205, 205, 195))
    draw.polygon([(0, 0), (150, 0), (172, 52), (80, 192), (0, 195)], fill=(27, 103, 198))
    draw.polygon([(80, 182), (168, 60), (258, 100), (198, 222)], fill=(237, 238, 232))
    orange, start, end, half = (226, 120, 62), np.array([150.0, 105.0]), np.array([318.0, 176.0]), 14
    along = (end - start) / np.linalg.norm(end - start)
    across = np.array([-along[1], along[0]])
    ruler = [tuple(start + across * half), tuple(end + across * half), tuple(end - across * half),
             tuple(start - across * half)]
    draw.polygon(ruler, fill=(253, 207, 44))
    draw.line(ruler + [ruler[0]], fill=orange, width=2)
    draw.line([tuple(start + across * 2), tuple(end + across * 2)], fill=orange, width=2)
    for k in np.arange(8, np.linalg.norm(end - start), 11):
        q = start + along * k
        draw.line([tuple(q + across * half), tuple(q + across * 2)], fill=orange, width=2)
    paint = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32)
    soft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)),
                      dtype=np.float32)[..., None] / 255
    return img * (1 - soft) + paint * soft


def edge_strip(occluder, edge):
    """Franja entre el borde real de una cara (`edge(y)`) y el contorno de lo que la tapa."""
    return occluder + [(edge(y), y) for _, y in reversed(occluder)]


def murals(folder):
    """Murales oeste («cara este.jpeg», cascos) y sur («cara sur.jpeg», lápiz). La cara este conserva
    el recorte de IMG_5727 (mural de la computadora): ubicación según el orden en que se ven al
    rodear la torre, confirmada por el usuario el 19/11/2026."""
    out = {}
    a = photo(load(folder, "mural-oeste"))
    quad = [(423, 300), (632, 247), (580, 1425), (281, 1362)]
    img, to_img = rectify(a, quad, (MURAL["width"], MURAL["height"]), 512)
    # Carro, balde y cartel de piso mojado al pie; mango del lampazo; borde izquierdo tapado por las
    # lamas, la losa y la viga del edificio.
    clutter = [[(372, 1236), (540, 1236), (540, 1430), (372, 1430)], rect(486, 1110, 508, 1340),
               edge_strip([(428, 285), (424, 400), (412, 470), (405, 560), (393, 700), (393, 840), (369, 1000),
                           (333, 1100), (306, 1200)], lambda y: 423 - 0.134 * (y - 300) - 8)]
    mask = polygon_mask(img.shape, clutter, to_img)
    out["mural-oeste"] = diffuse(img, mask)
    a = photo(load(folder, "mural-sur"))
    quad = [(369, 178), (703, 158), (797, 1465), (366, 1458)]
    img, to_img = rectify(a, quad, (MURAL["width"], MURAL["height"]), 512)
    # Hojas del árbol que cuelgan delante de la parte alta.
    region = polygon_mask(img.shape, [rect(360, 150, 720, 345)], to_img)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    value = img.max(axis=2)
    # En la parte alta solo hay figuras planas sin contorno negro: lo oscuro y los verdes grisáceos
    # son hojas.
    pale = (g - r > 6) & (g - b > 8) & (g - b < 55) & (value < 205) & (r > 90)
    leaves = region & ((value < 135) | pale)
    leaves = np.asarray(Image.fromarray((leaves * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
                        .filter(ImageFilter.MaxFilter(11))) > 0
    out["mural-sur"] = paint_under(img, leaves & region)
    return out


# ---------------------------------------------------------------- sonidos

def decode(path, filters="", rate=44100):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate)]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, check=True, capture_output=True).stdout, np.float32).copy()


def encode(samples, name, rate=44100, bitrate="96k"):
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "audio.f32"
        raw.write_bytes(samples.astype(np.float32).tobytes())
        target = OUT / name
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(rate), "-ac", "1", "-i", str(raw),
                        "-codec:a", "libmp3lame", "-b:a", bitrate, "-map_metadata", "-1", str(target)], check=True)
    return target


def level(samples, rms_db, peak_db=-1.0):
    rms = np.sqrt(np.mean(samples ** 2)) + 1e-9
    gain = 10 ** (rms_db / 20) / rms
    peak = np.abs(samples).max() * gain
    limit = 10 ** (peak_db / 20)
    if peak > limit:
        gain *= limit / peak
    return samples * gain


def fades(samples, rate, fade_in, fade_out):
    out = samples.copy()
    n_in, n_out = int(fade_in * rate), int(fade_out * rate)
    if n_in:
        out[:n_in] *= np.sin(np.linspace(0, np.pi / 2, n_in)) ** 2
    if n_out:
        out[-n_out:] *= np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2
    return out


def sounds(folder, rate=44100):
    written = {}
    # Puertas: arranque del motor a 0,1 s, recorrido hasta el golpe de tope a 2,3–2,5 s.
    door = decode(load(folder, "abriendo"), "highpass=f=70,afftdn=nf=-42", rate)
    door = door[int(0.05 * rate):int(3.35 * rate)]
    written["puertas.mp3"] = encode(level(fades(door, rate, 0.02, 0.6), -19), "puertas.mp3", rate)
    # Gong de llegada: tono de 1,26 kHz a 0,9 s y de 1,05 kHz a 1,5 s; se quita el ruido grave
    # (pasos y voces) que domina la grabación por debajo de 300 Hz.
    chime = decode(load(folder, "llegada"), "highpass=f=320,highpass=f=320,afftdn=nf=-45", rate)
    chime = chime[int(0.86 * rate):int(3.35 * rate)]
    written["llegada.mp3"] = encode(level(fades(chime, rate, 0.012, 0.5), -21), "llegada.mp3", rate)
    # Zumbido del viaje: tramo estable de 4,5 a 12,5 s, en bucle con fundido cruzado de 1 s.
    hum = decode(load(folder, "viaje"), "highpass=f=35,lowpass=f=5000,afftdn=nf=-50", rate)
    length, cross = int(7.0 * rate), int(1.0 * rate)
    seg = hum[int(4.5 * rate):int(4.5 * rate) + length + cross]
    loop = seg[:length].copy()
    t = np.linspace(0, np.pi / 2, cross)
    loop[:cross] = seg[:cross] * np.sin(t) + seg[length:length + cross] * np.cos(t)
    loop = level(loop, -24)
    pad = int(0.1 * rate)
    padded = np.concatenate([loop[-pad:], loop, loop[:pad]])
    written["viaje.mp3"] = encode(padded, "viaje.mp3", rate)
    return written, {"loopStart": pad / rate, "loopEnd": (pad + length) / rate}


# ---------------------------------------------------------------- procedencia

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Carpeta con las fotos y grabaciones originales")
    parser.add_argument("--preview", type=Path, help="Guarda vistas previas sin compresión")
    args = parser.parse_args()
    folder = args.source.expanduser().resolve()
    if not folder.is_dir():
        raise SystemExit("No existe la carpeta de originales.")
    if shutil.which("ffmpeg") is None:
        raise SystemExit("Hace falta ffmpeg en el PATH.")
    OUT.mkdir(parents=True, exist_ok=True)

    back = back_wall(folder)
    cop, cop_layout = control_panel(folder)
    atlas, notice_layout = notices(folder)
    frame, cabinet, blue = exterior(folder)
    images = {
        "pared-fondo.webp": (back, ["fondo"], "Pared del fondo enderezada, sin calcomanías, afiche ni pasamanos"),
        "pared-lateral.webp": (side_wall(back), ["fondo"], "Cinco paneles de la pared del fondo para las paredes laterales"),
        "acero.webp": (steel_tile(back), ["fondo"], "Panel de acero inoxidable sin juntas, repetible"),
        "piso.webp": (floor(folder), ["piso"], "Piso de granito con guarda enderezado a 1,1 × 1,4 m"),
        "botonera.webp": (cop, ["panel"], "Placa de la botonera enderezada desde sus cuatro tornillos"),
        "avisos.webp": (atlas, ["panel"], "Avisos de OTIS y afiche del PCOE enderezados"),
        "frente.webp": (frame, ["puerta"], "Marco y hojas exteriores de planta baja enderezados"),
        "armario.webp": (cabinet, ["puerta"], "Armario de maniobra de acero junto a la puerta de planta baja"),
        "revoque-azul.webp": (blue, ["puerta"], "Revoque azul texturado, repetible (0,4 m)"),
    }
    for name, img in murals(folder).items():
        label = "Mural de los cascos (cara oeste)" if name == "mural-oeste" else "Mural del lápiz (cara sur)"
        images[f"{name}.webp"] = (img, [name], f"{label}, enderezado a 2,44 × 6,4 m y sin objetos delante")

    entries = []
    for name, (img, keys, derivation) in images.items():
        target = save(img, name)
        if args.preview:
            args.preview.mkdir(parents=True, exist_ok=True)
            Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(args.preview / name.replace(".webp", ".png"))
        for key in keys[:1]:
            source = load(folder, key)
            entries.append({"source": f"Fotos del ascensor (19/11/2026)\\{source.name}", "sourceSha256": sha(source),
                            "asset": f"ascensor/{name}", "derivation": f"{derivation} (scripts/prepare-elevator-assets.py)",
                            "bytes": target.stat().st_size, "sha256": sha(target)})
    audio, loop = sounds(folder)
    origin = {"puertas.mp3": ("abriendo", "Apertura de puertas recortada, filtrada y normalizada"),
              "llegada.mp3": ("llegada", "Gong de llegada sin el ruido grave de fondo"),
              "viaje.mp3": ("viaje", "Zumbido del viaje en bucle sin costuras")}
    for name, target in audio.items():
        key, derivation = origin[name]
        source = load(folder, key)
        entries.append({"source": f"Grabaciones del ascensor (19/11/2026)\\{source.name}", "sourceSha256": sha(source),
                        "asset": f"ascensor/{name}", "derivation": f"{derivation} (scripts/prepare-elevator-assets.py)",
                        "bytes": target.stat().st_size, "sha256": sha(target)})

    manifest_path = ASSETS / "sources.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["assets"] = [e for e in manifest["assets"] if not e["asset"].startswith("ascensor/")] + entries
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"botonera": cop_layout, "avisos": notice_layout, "bucle": loop}, ensure_ascii=False, indent=1))
    print(f"{len(entries)} recursos del ascensor preparados. Originales sin modificar.")


if __name__ == "__main__":
    main()
