import os
import math
import random
import numpy as np
import bpy
import bmesh
from mathutils import Vector, Matrix

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en tu proyecto
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/planta_dracaena.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# 3. Generador de texturas procedurales RGBA (512x512) empaquetadas en el GLB
def generate_plant_textures():
    size = 512
    y_grid, x_grid = np.mgrid[0:size, 0:size].astype(np.float32)
    u = x_grid / (size - 1)  # 0 (izq) -> 1 (der)
    v = y_grid / (size - 1)  # 0 (base de hoja) -> 1 (punta de hoja)

    rng_np = np.random.default_rng(108)
    noise = rng_np.normal(0.0, 0.015, (size, size))

    # --- A) Textura de hoja variegada (Dracaena: centro verde oscuro + franjas crema/blancas) ---
    rgba_leaf = np.zeros((size, size, 4), dtype=np.float32)

    # Perfil lanceolado alargado: estrecho en el pecíolo, ancho en el tercio medio y punta aguda
    half_width = 0.44 * np.sin(np.clip(v ** 0.78, 0.0, 1.0) * math.pi) ** 0.72
    half_width = np.maximum(half_width, 0.04 * (1.0 - v))
    # Ligera curvatura orgánica del eje central de la hoja
    center_u = 0.5 + 0.018 * np.sin(v * math.pi)
    dist_center = np.abs(u - center_u)
    norm_w = dist_center / np.maximum(half_width, 1e-4)

    leaf_mask = (norm_w <= 1.0) & (v >= 0.0) & (v <= 0.995)

    # Colores característicos de la foto: verde bosque profundo, verde oliva claro y borde crema
    col_dark_green = np.array([0.075, 0.165, 0.075])
    col_mid_green = np.array([0.145, 0.265, 0.125])
    col_variegated = np.array([0.74, 0.78, 0.65])
    col_midrib = np.array([0.18, 0.30, 0.14])

    # Mezcla de bandas longitudinales (variegado en los bordes + vetas finas interiores)
    stripe_band = np.clip((norm_w - 0.64) / 0.18, 0.0, 1.0)
    fine_veins = 0.5 + 0.5 * np.sin(norm_w * 38.0)
    midrib_band = np.exp(-((norm_w / 0.08) ** 2))

    # Atenuar ligeramente el variegado justo en la base y punta extrema
    tip_fade = np.sin(np.clip(v, 0.0, 1.0) * math.pi) ** 0.35
    var_weight = np.clip(stripe_band * (0.78 + 0.22 * fine_veins) * tip_fade, 0.0, 1.0)

    for c in range(3):
        base_green = col_dark_green[c] * (1.0 - 0.35 * fine_veins) + col_mid_green[c] * (0.35 * fine_veins)
        base_green = base_green * (1.0 - 0.45 * midrib_band) + col_midrib[c] * (0.45 * midrib_band)
        col_final = base_green * (1.0 - var_weight) + col_variegated[c] * var_weight + noise
        rgba_leaf[:, :, c] = np.where(leaf_mask, col_final, 0.0)

    rgba_leaf[:, :, 3] = np.where(leaf_mask, 1.0, 0.0)
    rgba_leaf = np.clip(rgba_leaf, 0.0, 1.0)

    img_leaf = bpy.data.images.new(name="Tex_Dracaena_Hoja", width=size, height=size, alpha=True)
    img_leaf.pixels.foreach_set(rgba_leaf.ravel())
    img_leaf.pack()

    # --- B) Textura de tronco anillado (caña leñosa gris-verdosa con nudos de hojas) ---
    rgba_stem = np.ones((size, size, 4), dtype=np.float32)
    rings = 0.5 + 0.5 * np.sin(v * math.pi * 42.0)
    fibers = 0.5 + 0.5 * np.sin(u * math.pi * 60.0 + noise * 12.0)
    c_bark_dark = np.array([0.16, 0.17, 0.13])
    c_bark_light = np.array([0.30, 0.31, 0.24])
    blend_bark = np.clip(0.55 * rings + 0.25 * fibers + noise * 2.0, 0.0, 1.0)

    for c in range(3):
        rgba_stem[:, :, c] = c_bark_dark[c] * (1.0 - blend_bark) + c_bark_light[c] * blend_bark
    rgba_stem = np.clip(rgba_stem, 0.0, 1.0)

    img_stem = bpy.data.images.new(name="Tex_Dracaena_Tronco", width=size, height=size, alpha=True)
    img_stem.pixels.foreach_set(rgba_stem.ravel())
    img_stem.pack()

    return img_leaf, img_stem


img_leaf, img_stem = generate_plant_textures()


# 4. Materiales PBR (hojas con brillo ceroso natural como en la foto, sin planos rígidos)
def create_pbr_material(name, image=None, base_hex="1d3318", roughness=0.38, alpha_clip=False):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    if alpha_clip and hasattr(mat, "blend_method"):
        mat.blend_method = "CLIP"
        mat.alpha_threshold = 0.45

    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.45

    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if alpha_clip:
            nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    else:
        r = int(base_hex[0:2], 16) / 255.0
        g = int(base_hex[2:4], 16) / 255.0
        b = int(base_hex[4:6], 16) / 255.0
        bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)

    return mat


mat_hoja = create_pbr_material("Mat_Dracaena_Hoja", image=img_leaf, roughness=0.34, alpha_clip=True)
mat_tronco = create_pbr_material("Mat_Dracaena_Tronco", image=img_stem, roughness=0.82, alpha_clip=False)
mat_pasto_base = create_pbr_material("Mat_Ophiopogon_Base", base_hex="152612", roughness=0.62, alpha_clip=False)

# Contenedor principal con pivote en el suelo (0, 0, 0)
container = bpy.data.objects.new("Planta_Dracaena", None)
bpy.context.scene.collection.objects.link(container)

bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new("UVMap")
rng = random.Random(2026)


def add_curved_stem(bm, uv_layer, base_pt, top_pt, mid_offset, r_base, r_top, segs_z=12, segs_rad=10):
    """Genera un tallo cilíndrico ligeramente arqueado con UVs continuas."""
    rings = []
    for iz in range(segs_z + 1):
        t = iz / segs_z
        # Curva cuadrática suave
        center = (
            base_pt * ((1.0 - t) ** 2)
            + (base_pt.lerp(top_pt, 0.5) + mid_offset) * (2.0 * (1.0 - t) * t)
            + top_pt * (t ** 2)
        )
        radius = r_base * (1.0 - t) + r_top * t

        # Tangente local para orientar el anillo
        if iz < segs_z:
            t_next = (iz + 1) / segs_z
            c_next = (
                base_pt * ((1.0 - t_next) ** 2)
                + (base_pt.lerp(top_pt, 0.5) + mid_offset) * (2.0 * (1.0 - t_next) * t_next)
                + top_pt * (t_next ** 2)
            )
            tangent = (c_next - center).normalized()
        else:
            tangent = Vector((0.0, 0.0, 1.0))

        ref = Vector((1.0, 0.0, 0.0)) if abs(tangent.x) < 0.9 else Vector((0.0, 1.0, 0.0))
        binorm = tangent.cross(ref).normalized()
        norm = binorm.cross(tangent).normalized()

        ring_verts = []
        for ir in range(segs_rad):
            ang = (ir / segs_rad) * math.tau
            offset = (norm * math.cos(ang) + binorm * math.sin(ang)) * radius
            ring_verts.append(bm.verts.new(center + offset))
        rings.append(ring_verts)

    for iz in range(segs_z):
        v0_frac = iz / segs_z
        v1_frac = (iz + 1) / segs_z
        for ir in range(segs_rad):
            ir_next = (ir + 1) % segs_rad
            f = bm.faces.new((
                rings[iz][ir],
                rings[iz][ir_next],
                rings[iz + 1][ir_next],
                rings[iz + 1][ir],
            ))
            f.smooth = True
            f.material_index = 1  # mat_tronco
            u0 = ir / segs_rad
            u1 = (ir + 1) / segs_rad
            uvs = [(u0, v0_frac), (u1, v0_frac), (u1, v1_frac), (u0, v1_frac)]
            for loop, uv_co in zip(f.loops, uvs):
                loop[uv_layer].uv = uv_co

    # Tapa superior
    top_f = bm.faces.new(rings[-1])
    top_f.material_index = 1


def add_arched_3d_leaf(
    bm,
    uv_layer,
    origin,
    azimuth,
    pitch_start,
    droop_angle,
    length,
    max_width,
    roll_twist,
    segs_len=7,
):
    """
    Construye una hoja 3D curvada en arco con pliegue central en V (3 vértices por sección)
    para evitar el efecto plano/rígido de triángulos simples.
    """
    dir_xy = Vector((math.cos(azimuth), math.sin(azimuth), 0.0))
    side_xy = Vector((-dir_xy.y, dir_xy.x, 0.0))
    up = Vector((0.0, 0.0, 1.0))

    pos = origin.copy()
    step_len = length / segs_len
    rows = []

    for i in range(segs_len + 1):
        t = i / segs_len
        # Ángulo vertical: sube al salir del tallo y luego cae en arco elegante
        pitch = pitch_start - droop_angle * (t ** 1.35)
        forward = (dir_xy * math.cos(pitch) + up * math.sin(pitch)).normalized()

        # Torsión suave a lo largo de la hoja
        twist = roll_twist * t
        local_side = (side_xy * math.cos(twist) + forward.cross(side_xy) * math.sin(twist)).normalized()
        local_up = local_side.cross(forward).normalized()

        # Ancho en cada sección (acampanado en la vaina, ancho en el medio, fino en la punta)
        w_env = math.sin(max(0.08, t ** 0.75) * math.pi) ** 0.65
        half_w = max_width * 0.5 * max(0.05, w_env)

        # Pliegue en V hacia arriba en los bordes (da volumen y reflejos realistas)
        v_fold = half_w * 0.24 * (1.0 - 0.5 * t)

        v_left = bm.verts.new(pos - local_side * half_w + local_up * v_fold)
        v_mid = bm.verts.new(pos)
        v_right = bm.verts.new(pos + local_side * half_w + local_up * v_fold)
        rows.append((v_left, v_mid, v_right, t))

        if i < segs_len:
            pos += forward * step_len

    for i in range(segs_len):
        l0, m0, r0, t0 = rows[i]
        l1, m1, r1, t1 = rows[i + 1]

        # Mitad izquierda de la hoja
        f_left = bm.faces.new((l0, m0, m1, l1))
        f_left.smooth = True
        f_left.material_index = 0  # mat_hoja
        for loop, uv_co in zip(f_left.loops, [(0.0, t0), (0.5, t0), (0.5, t1), (0.0, t1)]):
            loop[uv_layer].uv = uv_co

        # Mitad derecha de la hoja
        f_right = bm.faces.new((m0, r0, r1, m1))
        f_right.smooth = True
        f_right.material_index = 0  # mat_hoja
        for loop, uv_co in zip(f_right.loops, [(0.5, t0), (1.0, t0), (1.0, t1), (0.5, t1)]):
            loop[uv_layer].uv = uv_co


def build_dracaena_head(
    bm,
    uv_layer,
    stem_base,
    stem_top,
    stem_curve,
    r_base,
    r_top,
    foliage_start_t,
    num_leaves,
    leaf_len_range,
    leaf_w_range,
):
    """Arma un tallo completo con su penacho espiralado de hojas."""
    add_curved_stem(bm, uv_layer, stem_base, stem_top, stem_curve, r_base, r_top)

    golden_angle = math.radians(137.508)
    az = rng.uniform(0.0, math.tau)

    for i in range(num_leaves):
        frac = i / max(1, num_leaves - 1)  # 0 = hojas inferiores más caídas, 1 = brote apical erguido
        t_stem = foliage_start_t + frac * (1.0 - foliage_start_t)

        # Punto exacto sobre la curva del tallo
        attach_pt = (
            stem_base * ((1.0 - t_stem) ** 2)
            + (stem_base.lerp(stem_top, 0.5) + stem_curve) * (2.0 * (1.0 - t_stem) * t_stem)
            + stem_top * (t_stem ** 2)
        )

        # Hojas inferiores más abiertas/colgantes; hojas superiores más erguidas
        pitch_start = math.radians(18.0 + 58.0 * (frac ** 1.15)) + rng.uniform(-0.08, 0.08)
        droop = math.radians(82.0 - 46.0 * frac) + rng.uniform(-0.10, 0.12)
        l_len = rng.uniform(*leaf_len_range) * (0.85 + 0.25 * math.sin(frac * math.pi * 0.85))
        l_wid = rng.uniform(*leaf_w_range)
        twist = rng.uniform(-0.38, 0.38)

        add_arched_3d_leaf(
            bm=bm,
            uv_layer=uv_layer,
            origin=attach_pt,
            azimuth=az,
            pitch_start=pitch_start,
            droop_angle=droop,
            length=l_len,
            max_width=l_wid,
            roll_twist=twist,
            segs_len=7,
        )
        az += golden_angle + rng.uniform(-0.12, 0.12)


# 5. Composición exacta de la planta de la foto:
#    - Tallo principal alto central (~1.15 m) con copa doble frondosa
#    - Tallo secundario izquierdo más bajo (~0.62 m)
#    - Tallo secundario derecho medio (~0.74 m)
#    - Tallo trasero de apoyo para volumen 360°
stems_spec = [
    # Tallo principal alto (centro)
    {
        "base": Vector((0.00, 0.00, 0.0)),
        "top": Vector((-0.02, 0.02, 1.12)),
        "curve": Vector((0.04, -0.02, 0.0)),
        "r_base": 0.026,
        "r_top": 0.015,
        "f_start": 0.28,
        "leaves": 54,
        "len": (0.36, 0.52),
        "wid": (0.042, 0.056),
    },
    # Tallo secundario izquierdo (más bajo y abierto hacia la izquierda como en la foto)
    {
        "base": Vector((-0.08, -0.03, 0.0)),
        "top": Vector((-0.34, -0.06, 0.56)),
        "curve": Vector((-0.07, -0.02, 0.04)),
        "r_base": 0.020,
        "r_top": 0.012,
        "f_start": 0.32,
        "leaves": 36,
        "len": (0.30, 0.44),
        "wid": (0.036, 0.048),
    },
    # Tallo secundario derecho (altura media, inclinado levemente a la derecha)
    {
        "base": Vector((0.07, -0.02, 0.0)),
        "top": Vector((0.28, -0.04, 0.70)),
        "curve": Vector((0.06, -0.01, 0.03)),
        "r_base": 0.021,
        "r_top": 0.012,
        "f_start": 0.30,
        "leaves": 38,
        "len": (0.32, 0.46),
        "wid": (0.038, 0.050),
    },
    # Tallo trasero (relleno posterior para vista desde la galería)
    {
        "base": Vector((0.03, 0.07, 0.0)),
        "top": Vector((0.12, 0.22, 0.86)),
        "curve": Vector((0.02, 0.05, 0.02)),
        "r_base": 0.022,
        "r_top": 0.013,
        "f_start": 0.32,
        "leaves": 40,
        "len": (0.34, 0.48),
        "wid": (0.038, 0.052),
    },
]

for spec in stems_spec:
    build_dracaena_head(
        bm=bm,
        uv_layer=uv_layer,
        stem_base=spec["base"],
        stem_top=spec["top"],
        stem_curve=spec["curve"],
        r_base=spec["r_base"],
        r_top=spec["r_top"],
        foliage_start_t=spec["f_start"],
        num_leaves=spec["leaves"],
        leaf_len_range=spec["len"],
        leaf_w_range=spec["wid"],
    )

# 6. Mata basal de pasto oscuro fino (Ophiopogon) alrededor de la raíz, tal como en la foto
for _ in range(160):
    ang = rng.uniform(0.0, math.tau)
    rad = math.sqrt(rng.uniform(0.0, 1.0)) * 0.26
    ox = math.cos(ang) * rad
    oy = math.sin(ang) * rad

    blade_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
    perp = Vector((-blade_dir.y, blade_dir.x, 0.0))
    up = Vector((0.0, 0.0, 1.0))

    h = rng.uniform(0.10, 0.21) * (1.0 - 0.35 * (rad / 0.26))
    reach = rng.uniform(0.09, 0.19)
    w = 0.006

    p0 = Vector((ox, oy, 0.0))
    p1 = p0 + blade_dir * (reach * 0.45) + up * (h * 0.72)
    p2 = p0 + blade_dir * reach + up * (h * 0.45)

    v0 = bm.verts.new(p0 - perp * w)
    v1 = bm.verts.new(p0 + perp * w)
    v2 = bm.verts.new(p1 - perp * (w * 0.7))
    v3 = bm.verts.new(p1 + perp * (w * 0.7))
    v4 = bm.verts.new(p2)

    f1 = bm.faces.new((v0, v1, v3, v2))
    f1.material_index = 2  # mat_pasto_base
    f2 = bm.faces.new((v2, v3, v4))
    f2.material_index = 2

mesh = bpy.data.meshes.new("PlantaDracaenaMesh")
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new("Dracaena_Variegada", mesh)
bpy.context.scene.collection.objects.link(obj)
obj.data.materials.append(mat_hoja)
obj.data.materials.append(mat_tronco)
obj.data.materials.append(mat_pasto_base)
obj.parent = container

# 7. Exportar GLB con texturas empaquetadas
for o in bpy.context.scene.objects:
    o.select_set(False)
container.select_set(True)
obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Planta Dracaena exportada en: {OUTPUT_PATH}")
