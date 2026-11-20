import os
import math
import random
import numpy as np
import bpy
import bmesh
from mathutils import Vector

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en tu proyecto
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/arbusto_flores.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# 3. Generador de texturas botánicas RGBA (512x512) empaquetadas en el GLB
def generate_shrub_textures():
    size = 512
    y_grid, x_grid = np.mgrid[0:size, 0:size].astype(np.float32)
    u = x_grid / (size - 1)  # 0 -> 1
    v = y_grid / (size - 1)  # 0 (base) -> 1 (punta)

    rng_np = np.random.default_rng(305)
    noise = rng_np.normal(0.0, 0.018, (size, size))

    def paint_leaf(rgba, cx, cy, angle, length, width, col_base, col_tip):
        dx = math.sin(angle)
        dy = math.cos(angle)
        ru = u - cx
        rv = v - cy
        along = ru * dx + rv * dy
        across = np.abs(-ru * dy + rv * dx)

        t = np.clip(along / max(1e-4, length), 0.0, 1.0)
        # Forma ovada-acuminada típica de Santa Rita / arbusto ornamental
        profile = width * (np.sin(t * math.pi) ** 0.62) * (1.0 - 0.25 * t)
        mask = (along >= 0.0) & (along <= length) & (across <= profile)

        # Nervadura central sutil
        vein = np.exp(-((across / max(1e-4, width * 0.12)) ** 2))
        shade = np.clip(t * 0.7 + 0.2 * vein, 0.0, 1.0)

        for c in range(3):
            c_val = col_base[c] * (1.0 - shade) + col_tip[c] * shade + noise
            rgba[:, :, c] = np.where(mask, c_val, rgba[:, :, c])
        rgba[:, :, 3] = np.where(mask, 1.0, rgba[:, :, 3])

    def paint_flower_cluster(rgba, cx, cy, radius, col_dark, col_bright):
        """Pinta un ramillete de 3 brácteas/florcitas magenta-fucsia."""
        for p in range(3):
            ang = p * (math.tau / 3.0) + 0.35
            px = cx + math.cos(ang) * radius * 0.45
            py = cy + math.sin(ang) * radius * 0.45
            dx = math.cos(ang)
            dy = math.sin(ang)

            ru = u - px
            rv = v - py
            along = ru * dx + rv * dy
            across = np.abs(-ru * dy + rv * dx)

            t = np.clip((along + radius * 0.35) / (radius * 1.15), 0.0, 1.0)
            w_prof = radius * 0.48 * np.sin(t * math.pi) ** 0.7
            mask = (t > 0.0) & (t < 1.0) & (across <= w_prof)

            for c in range(3):
                c_val = col_dark[c] * (1.0 - t) + col_bright[c] * t + noise
                rgba[:, :, c] = np.where(mask, c_val, rgba[:, :, c])
            rgba[:, :, 3] = np.where(mask, 1.0, rgba[:, :, 3])

        # Pequeño centro crema diminuto de la flor
        center_mask = ((u - cx) ** 2 + (v - cy) ** 2) <= (radius * 0.14) ** 2
        cream = np.array([0.88, 0.85, 0.72])
        for c in range(3):
            rgba[:, :, c] = np.where(center_mask, cream[c], rgba[:, :, c])
        rgba[:, :, 3] = np.where(center_mask, 1.0, rgba[:, :, 3])

    # --- A) Ramita de follaje verde denso (brotes nuevos y hojas oscuras) ---
    rgba_foliage = np.zeros((size, size, 4), dtype=np.float32)
    stem_x = 0.5 + 0.025 * np.sin(v * math.pi * 1.5)
    stem_mask = (np.abs(u - stem_x) < 0.012 * (1.0 - 0.5 * v)) & (v < 0.92)
    for c, val in enumerate([0.14, 0.18, 0.10]):
        rgba_foliage[:, :, c] = np.where(stem_mask, val, 0.0)
    rgba_foliage[:, :, 3] = np.where(stem_mask, 1.0, 0.0)

    col_leaf_dark = np.array([0.065, 0.145, 0.055])
    col_leaf_mid = np.array([0.145, 0.265, 0.095])
    col_leaf_fresh = np.array([0.21, 0.34, 0.12])

    for i in range(16):
        t = i / 15.0
        vy = 0.06 + t * 0.82
        vx = 0.5 + 0.025 * math.sin(vy * math.pi * 1.5)
        side = 1.0 if i % 2 == 0 else -1.0
        ang = side * (0.55 + 0.35 * (1.0 - t))
        l_len = 0.24 * (1.0 - 0.35 * t)
        l_wid = 0.078 * (1.0 - 0.30 * t)
        tip_c = col_leaf_fresh if t > 0.65 else col_leaf_mid
        paint_leaf(rgba_foliage, vx, vy, ang, l_len, l_wid, col_leaf_dark, tip_c)

    # Hoja apical
    paint_leaf(rgba_foliage, 0.5, 0.84, 0.02, 0.15, 0.048, col_leaf_mid, col_leaf_fresh)
    rgba_foliage = np.clip(rgba_foliage, 0.0, 1.0)
    img_foliage = bpy.data.images.new("Tex_Arbusto_Follaje", width=size, height=size, alpha=True)
    img_foliage.pixels.foreach_set(rgba_foliage.ravel())
    img_foliage.pack()

    # --- B) Ramita con hojas y ramilletes de flores magenta/fucsia ---
    rgba_bloom = rgba_foliage.copy()
    col_fl_dark = np.array([0.36, 0.08, 0.24])
    col_fl_bright = np.array([0.62, 0.16, 0.42])

    flower_spots = [
        (0.38, 0.54, 0.085),
        (0.62, 0.60, 0.090),
        (0.42, 0.74, 0.095),
        (0.58, 0.80, 0.090),
        (0.50, 0.90, 0.082),
    ]
    for fx, fy, fr in flower_spots:
        paint_flower_cluster(rgba_bloom, fx, fy, fr, col_fl_dark, col_fl_bright)

    rgba_bloom = np.clip(rgba_bloom, 0.0, 1.0)
    img_bloom = bpy.data.images.new("Tex_Arbusto_Flores", width=size, height=size, alpha=True)
    img_bloom.pixels.foreach_set(rgba_bloom.ravel())
    img_bloom.pack()

    # --- C) Textura oscura de sombra foliar para el núcleo interno ---
    rgba_core = np.ones((size, size, 4), dtype=np.float32)
    pat = np.clip(0.5 + 0.3 * np.sin(u * 40.0) * np.cos(v * 40.0) + noise * 3.0, 0.0, 1.0)
    c_in1 = np.array([0.045, 0.095, 0.038])
    c_in2 = np.array([0.095, 0.175, 0.070])
    for c in range(3):
        rgba_core[:, :, c] = c_in1[c] * (1.0 - pat) + c_in2[c] * pat
    img_core = bpy.data.images.new("Tex_Arbusto_Nucleo", width=size, height=size, alpha=True)
    img_core.pixels.foreach_set(rgba_core.ravel())
    img_core.pack()

    return img_foliage, img_bloom, img_core


img_foliage, img_bloom, img_core = generate_shrub_textures()


# 4. Materiales PBR
def create_material(name, image=None, base_hex="2a221b", roughness=0.45, alpha_clip=False):
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
        bsdf.inputs["Specular IOR Level"].default_value = 0.38

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


mat_core = create_material("Mat_NucleoArbusto", image=img_core, roughness=0.88, alpha_clip=False)
mat_foliage = create_material("Mat_RamasVerdes", image=img_foliage, roughness=0.42, alpha_clip=True)
mat_bloom = create_material("Mat_RamasFloridas", image=img_bloom, roughness=0.44, alpha_clip=True)
mat_wood = create_material("Mat_TroncoLenoso", image=None, base_hex="2b241d", roughness=0.88, alpha_clip=False)

# Contenedor principal con pivote en el suelo (0, 0, 0)
container = bpy.data.objects.new("Arbusto_Grande_Flores", None)
bpy.context.scene.collection.objects.link(container)

bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new("UVMap")
rng = random.Random(909)


# 5. Troncos leñosos múltiples que nacen en la base y se abren dentro de la copa
def add_woody_branch(bm, base_pt, top_pt, curve_vec, r0, r1, segs=8):
    rings = []
    for i in range(segs + 1):
        t = i / segs
        c = (
            base_pt * ((1.0 - t) ** 2)
            + (base_pt.lerp(top_pt, 0.5) + curve_vec) * (2.0 * (1.0 - t) * t)
            + top_pt * (t ** 2)
        )
        rad = r0 * (1.0 - t) + r1 * t
        ring = []
        for k in range(7):
            ang = (k / 7.0) * math.tau
            ring.append(bm.verts.new(c + Vector((math.cos(ang) * rad, math.sin(ang) * rad, 0.0))))
        rings.append(ring)

    for i in range(segs):
        for k in range(7):
            kn = (k + 1) % 7
            f = bm.faces.new((rings[i][k], rings[i][kn], rings[i + 1][kn], rings[i + 1][k]))
            f.smooth = True
            f.material_index = 3  # mat_wood


wood_branches = [
    (Vector((-0.04, 0.00, 0.0)), Vector((-0.32, -0.14, 1.05)), Vector((-0.08, -0.05, 0.0)), 0.032, 0.011),
    (Vector((0.03, 0.02, 0.0)), Vector((0.28, -0.10, 1.12)), Vector((0.07, -0.03, 0.0)), 0.030, 0.010),
    (Vector((0.00, -0.03, 0.0)), Vector((-0.06, 0.24, 1.18)), Vector((-0.02, 0.08, 0.0)), 0.028, 0.010),
    (Vector((-0.02, 0.03, 0.0)), Vector((0.12, 0.18, 0.95)), Vector((0.05, 0.04, 0.0)), 0.024, 0.009),
]
for b_pt, t_pt, c_vec, r0, r1 in wood_branches:
    add_woody_branch(bm, b_pt, t_pt, c_vec, r0, r1)


# 6. Núcleo interior orgánico de sombra foliar (elevado ~0.35m como un arbusto real)
core_lobes = [
    (Vector((-0.18, -0.05, 1.02)), Vector((0.54, 0.50, 0.56))),
    (Vector((0.18, -0.04, 0.98)), Vector((0.52, 0.48, 0.54))),
    (Vector((0.00, 0.14, 1.05)), Vector((0.50, 0.46, 0.52))),
    (Vector((0.00, -0.08, 0.68)), Vector((0.36, 0.34, 0.34))),
]
for c_pos, c_rad in core_lobes:
    res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    v_set = set(res["verts"])
    for v in res["verts"]:
        n = rng.uniform(0.84, 1.15)
        v.co.x = c_pos.x + v.co.x * c_rad.x * n
        v.co.y = c_pos.y + v.co.y * c_rad.y * n
        v.co.z = c_pos.z + v.co.z * c_rad.z * n
    for f in bm.faces:
        if all(v in v_set for v in f.verts):
            f.material_index = 0  # mat_core
            for loop in f.loops:
                loop[uv_layer].uv = (
                    (loop.vert.co.x * 1.8) % 1.0,
                    (loop.vert.co.z * 1.8) % 1.0,
                )


def add_curved_branch_sprig(bm, uv_layer, base_pt, dir_vec, length, width, droop, twist, mat_idx):
    """Genera un ramillete curvo en cruz 3D (2 planos en ángulo) con UVs [0..1]."""
    dir_n = dir_vec.normalized()
    up = Vector((0.0, 0.0, 1.0))
    side = dir_n.cross(up)
    if side.length < 1e-4:
        side = Vector((1.0, 0.0, 0.0))
    else:
        side.normalize()
    ortho_up = side.cross(dir_n).normalized()

    p0 = base_pt
    p1 = base_pt + dir_n * (length * 0.52) + ortho_up * (droop * 0.25)
    p2 = base_pt + dir_n * length - up * droop

    for cross_ang in (-0.58, 0.58):
        ang = twist + cross_ang
        tang = (side * math.cos(ang) + ortho_up * math.sin(ang)).normalized()

        hw0 = width * 0.38
        hw1 = width * 0.54
        hw2 = width * 0.44

        v00 = bm.verts.new(p0 - tang * hw0)
        v01 = bm.verts.new(p0 + tang * hw0)
        v10 = bm.verts.new(p1 - tang * hw1)
        v11 = bm.verts.new(p1 + tang * hw1)
        v20 = bm.verts.new(p2 - tang * hw2)
        v21 = bm.verts.new(p2 + tang * hw2)

        f1 = bm.faces.new((v00, v01, v11, v10))
        f1.material_index = mat_idx
        for loop, uv_co in zip(f1.loops, [(0.0, 0.0), (1.0, 0.0), (1.0, 0.52), (0.0, 0.52)]):
            loop[uv_layer].uv = uv_co

        f2 = bm.faces.new((v10, v11, v21, v20))
        f2.material_index = mat_idx
        for loop, uv_co in zip(f2.loops, [(0.0, 0.52), (1.0, 0.52), (1.0, 1.0), (0.0, 1.0)]):
            loop[uv_layer].uv = uv_co


# 7. Poblar la copa grande del arbusto (~1.75m alto x ~1.65m ancho) con hojas y flores magenta
CANOPY_CENTER = Vector((0.0, 0.0, 1.02))
CANOPY_RX = 0.74
CANOPY_RY = 0.68
CANOPY_RZ = 0.66

NUM_SPRIGS = 440
for _ in range(NUM_SPRIGS):
    # Distribución esférica ligeramente achatada en la base (forma de copa frondosa)
    u_rand = rng.uniform(-1.0, 1.0)
    theta = rng.uniform(0.0, math.tau)
    r_shell = rng.uniform(0.58, 1.0) ** 0.65

    horiz = math.sqrt(max(0.0, 1.0 - u_rand * u_rand))
    nx = horiz * math.cos(theta)
    ny = horiz * math.sin(theta)
    nz = u_rand

    # Estrechar levemente la parte inferior para que se vea la base del arbusto
    taper = 0.72 + 0.34 * ((nz + 1.0) * 0.5)
    pos = Vector((
        CANOPY_CENTER.x + nx * CANOPY_RX * r_shell * taper,
        CANOPY_CENTER.y + ny * CANOPY_RY * r_shell * taper,
        max(0.26, CANOPY_CENTER.z + nz * CANOPY_RZ * r_shell),
    ))

    out_dir = Vector((nx * taper, ny * taper, nz + 0.28)).normalized()
    sprig_len = rng.uniform(0.30, 0.46)
    sprig_wid = rng.uniform(0.24, 0.34)
    droop = rng.uniform(0.04, 0.14) * (1.0 - max(0.0, nz) * 0.6)
    twist = rng.uniform(0.0, math.tau)

    # Más flores en el tercio superior y costado izquierdo/frontal, tal como en la foto
    flower_prob = 0.10
    if nz > 0.05:
        flower_prob += 0.28
    if nx < 0.05 and nz > -0.1:
        flower_prob += 0.16

    mat_idx = 2 if rng.random() < flower_prob else 1

    add_curved_branch_sprig(
        bm=bm,
        uv_layer=uv_layer,
        base_pt=pos,
        dir_vec=out_dir,
        length=sprig_len,
        width=sprig_wid,
        droop=droop,
        twist=twist,
        mat_idx=mat_idx,
    )

# 8. Brotes silvestres altos que sobresalen irregularmente arriba (muy característicos de la foto)
for _ in range(28):
    ang = rng.uniform(0.0, math.tau)
    rad = rng.uniform(0.05, 0.48)
    bx = math.cos(ang) * rad
    by = math.sin(ang) * rad
    bz = rng.uniform(1.42, 1.62)

    shoot_dir = Vector((math.cos(ang) * 0.25, math.sin(ang) * 0.25, 1.0)).normalized()
    add_curved_branch_sprig(
        bm=bm,
        uv_layer=uv_layer,
        base_pt=Vector((bx, by, bz)),
        dir_vec=shoot_dir,
        length=rng.uniform(0.28, 0.42),
        width=rng.uniform(0.18, 0.25),
        droop=rng.uniform(0.02, 0.06),
        twist=rng.uniform(0.0, math.tau),
        mat_idx=1,  # brotes verdes nuevos en las puntas altas
    )

mesh = bpy.data.meshes.new("ArbustoGrandeFloresMesh")
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new("Arbusto_Flores_Magenta", mesh)
bpy.context.scene.collection.objects.link(obj)
obj.data.materials.append(mat_core)
obj.data.materials.append(mat_foliage)
obj.data.materials.append(mat_bloom)
obj.data.materials.append(mat_wood)
obj.parent = container

# 9. Exportar GLB con texturas empaquetadas
for o in bpy.context.scene.objects:
    o.select_set(False)
container.select_set(True)
obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Arbusto grande con flores exportado en: {OUTPUT_PATH}")
