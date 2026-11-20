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
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/arbustos_lavanda.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# 3. Generador procedural de texturas botánicas RGBA (512x512) empaquetadas en el GLB
def generate_botanical_textures():
    size = 512
    y_grid, x_grid = np.mgrid[0:size, 0:size].astype(np.float32)
    u = x_grid / (size - 1)  # 0 (izq) -> 1 (der)
    v = y_grid / (size - 1)  # 0 (base) -> 1 (punta)

    rng_np = np.random.default_rng(42)

    def build_sprig_image(name, mode="lavender_leaf"):
        rgba = np.zeros((size, size, 4), dtype=np.float32)
        noise = rng_np.normal(0.0, 0.025, (size, size))

        # Tallo central fino ligeramente curvado
        stem_curve = 0.5 + 0.022 * np.sin(v * math.pi * 1.4)
        stem_w = 0.011 * (1.0 - 0.55 * v)
        stem_mask = (np.abs(u - stem_curve) < stem_w) & (v < 0.94)

        if mode == "green_tuft":
            stem_col = np.array([0.24, 0.34, 0.16])
        else:
            stem_col = np.array([0.33, 0.42, 0.35])

        for c in range(3):
            rgba[:, :, c] = np.where(stem_mask, stem_col[c] + noise, rgba[:, :, c])
        rgba[:, :, 3] = np.where(stem_mask, 1.0, rgba[:, :, 3])

        # Hojas opuestas a lo largo del tallo
        if mode == "lavender_leaf":
            num_pairs = 26
            v_max = 0.95
            base_c1 = np.array([0.35, 0.45, 0.38])
            base_c2 = np.array([0.48, 0.58, 0.51])
        elif mode == "lavender_flower":
            num_pairs = 18
            v_max = 0.72
            base_c1 = np.array([0.34, 0.44, 0.37])
            base_c2 = np.array([0.46, 0.56, 0.49])
        else:  # green_tuft
            num_pairs = 16
            v_max = 0.92
            base_c1 = np.array([0.23, 0.36, 0.15])
            base_c2 = np.array([0.33, 0.48, 0.21])

        for i in range(num_pairs):
            t = i / max(1, num_pairs - 1)
            vy0 = 0.04 + t * (v_max - 0.04)
            ux0 = 0.5 + 0.022 * math.sin(vy0 * math.pi * 1.4)

            env = math.sin(min(1.0, t * 0.88 + 0.12) * math.pi)
            leaf_len = (0.16 + 0.22 * env) * (1.15 if mode == "green_tuft" else 0.95)
            leaf_half_w = 0.024 if mode == "green_tuft" else 0.0155

            for side in (-1.0, 1.0):
                ang = side * (0.48 + 0.24 * (1.0 - t))
                dx = math.sin(ang)
                dy = math.cos(ang)

                rel_u = u - ux0
                rel_v = v - vy0
                along = rel_u * dx + rel_v * dy
                across = np.abs(-rel_u * dy + rel_v * dx)

                norm_along = np.clip(along / max(1e-4, leaf_len), 0.0, 1.0)
                width_profile = leaf_half_w * np.sin(norm_along * math.pi) ** 0.65
                leaf_mask = (along >= 0.0) & (along <= leaf_len) & (across <= width_profile)

                mix = np.clip(norm_along * 0.75 + 0.15 * t, 0.0, 1.0)
                for c in range(3):
                    col_val = base_c1[c] * (1.0 - mix) + base_c2[c] * mix + noise
                    rgba[:, :, c] = np.where(leaf_mask, col_val, rgba[:, :, c])
                rgba[:, :, 3] = np.where(leaf_mask, 1.0, rgba[:, :, 3])

        # Espiga floral delicada en la parte superior
        if mode == "lavender_flower":
            num_florets = 16
            for f_idx in range(num_florets):
                ft = f_idx / max(1, num_florets - 1)
                fy = 0.68 + ft * 0.28
                fx = 0.5 + 0.022 * math.sin(fy * math.pi * 1.4) + (0.012 if f_idx % 2 == 0 else -0.012)
                rx = 0.028 * (1.0 - 0.35 * ft)
                ry = 0.022

                dist = ((u - fx) / rx) ** 2 + ((v - fy) / ry) ** 2
                floret_mask = dist <= 1.0

                f_col = np.array([0.45 + 0.06 * ft, 0.38 + 0.05 * ft, 0.56 + 0.07 * ft])
                for c in range(3):
                    rgba[:, :, c] = np.where(floret_mask, f_col[c] + noise, rgba[:, :, c])
                rgba[:, :, 3] = np.where(floret_mask, 1.0, rgba[:, :, 3])

        rgba = np.clip(rgba, 0.0, 1.0)
        img = bpy.data.images.new(name=name, width=size, height=size, alpha=True)
        img.pixels.foreach_set(rgba.ravel())
        img.pack()
        return img

    def build_core_image(name):
        rgba = np.ones((size, size, 4), dtype=np.float32)
        n1 = np.sin(u * math.pi * 18.0) * np.cos(v * math.pi * 18.0)
        n2 = rng_np.normal(0.0, 0.06, (size, size))
        pattern = np.clip(0.5 + 0.25 * n1 + n2, 0.0, 1.0)

        dark_foliage = np.array([0.19, 0.26, 0.21])
        mid_foliage = np.array([0.31, 0.40, 0.34])
        for c in range(3):
            rgba[:, :, c] = dark_foliage[c] * (1.0 - pattern) + mid_foliage[c] * pattern
        img = bpy.data.images.new(name=name, width=size, height=size, alpha=True)
        img.pixels.foreach_set(rgba.ravel())
        img.pack()
        return img

    img_leaf = build_sprig_image("Tex_Lavanda_Hojas", "lavender_leaf")
    img_flower = build_sprig_image("Tex_Lavanda_Flor", "lavender_flower")
    img_tuft = build_sprig_image("Tex_Hierba_Borde", "green_tuft")
    img_core = build_core_image("Tex_Follaje_Interior")
    return img_leaf, img_flower, img_tuft, img_core


img_leaf, img_flower, img_tuft, img_core = generate_botanical_textures()


# 4. Crear materiales PBR con recorte alfa MASK limpio para glTF/Three.js
def create_foliage_material(name, image, alpha_clip=True, roughness=0.86):
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
        bsdf.inputs["Specular IOR Level"].default_value = 0.22

    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = image
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha_clip:
        nt.links.new(tex_node.outputs["Alpha"], bsdf.inputs["Alpha"])

    return mat


mat_core = create_foliage_material("Mat_InteriorArbusto", img_core, alpha_clip=False, roughness=0.94)
mat_leaf = create_foliage_material("Mat_LavandaHojas", img_leaf, alpha_clip=True, roughness=0.84)
mat_flower = create_foliage_material("Mat_LavandaFlor", img_flower, alpha_clip=True, roughness=0.80)
mat_tuft = create_foliage_material("Mat_HierbaDerecha", img_tuft, alpha_clip=True, roughness=0.86)

# Contenedor principal con pivote en el suelo (0, 0, 0)
container = bpy.data.objects.new("Arbustos_Lavanda", None)
bpy.context.scene.collection.objects.link(container)

rng = random.Random(777)

# 5. Conjunto compacto (1/3 de la longitud anterior: ~1.60 m de largo total)
clumps = [
    {"pos": Vector((-0.48,  0.02)), "rx": 0.32, "ry": 0.30, "h": 0.56, "cards": 115},
    {"pos": Vector((-0.02, -0.02)), "rx": 0.34, "ry": 0.31, "h": 0.51, "cards": 120},
    {"pos": Vector(( 0.42,  0.01)), "rx": 0.30, "ry": 0.28, "h": 0.45, "cards": 105},
]

bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new("UVMap")

# 6. Volumen interior suave
for c in clumps:
    center = c["pos"]
    rx, ry, h = c["rx"] * 0.65, c["ry"] * 0.65, c["h"] * 0.54
    res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    verts_set = set(res["verts"])
    for v in res["verts"]:
        n = rng.uniform(0.84, 1.14)
        v.co.x = center.x + v.co.x * rx * n
        v.co.y = center.y + v.co.y * ry * n
        z_raw = (v.co.z + 0.65) * 0.62
        v.co.z = max(0.0, z_raw * h * n)
    for f in bm.faces:
        if all(v in verts_set for v in f.verts):
            f.material_index = 0
            for loop in f.loops:
                loop[uv_layer].uv = (
                    (loop.vert.co.x * 1.4) % 1.0,
                    (loop.vert.co.y * 1.4) % 1.0,
                )


def add_curved_sprig_card(bm, uv_layer, base_pt, radial_xy, height, width, lean, twist_ang, mat_idx):
    up = Vector((0.0, 0.0, 1.0))
    out_dir = Vector((radial_xy.x, radial_xy.y, 0.0)).normalized()
    side_dir = Vector((-out_dir.y, out_dir.x, 0.0))

    p0 = base_pt
    p1 = base_pt + out_dir * (lean * 0.38) + up * (height * 0.52)
    p2 = base_pt + out_dir * lean + up * height

    for cross_angle in (-0.55, 0.55):
        ang = twist_ang + cross_angle
        tangent = (side_dir * math.cos(ang) + out_dir * math.sin(ang)).normalized()

        hw0 = width * 0.42
        hw1 = width * 0.54
        hw2 = width * 0.46

        v00 = bm.verts.new(p0 - tangent * hw0)
        v01 = bm.verts.new(p0 + tangent * hw0)
        v10 = bm.verts.new(p1 - tangent * hw1)
        v11 = bm.verts.new(p1 + tangent * hw1)
        v20 = bm.verts.new(p2 - tangent * hw2)
        v21 = bm.verts.new(p2 + tangent * hw2)

        f_low = bm.faces.new((v00, v01, v11, v10))
        f_low.material_index = mat_idx
        uvs_low = [(0.0, 0.0), (1.0, 0.0), (1.0, 0.52), (0.0, 0.52)]
        for loop, uv_co in zip(f_low.loops, uvs_low):
            loop[uv_layer].uv = uv_co

        f_high = bm.faces.new((v10, v11, v21, v20))
        f_high.material_index = mat_idx
        uvs_high = [(0.0, 0.52), (1.0, 0.52), (1.0, 1.0), (0.0, 1.0)]
        for loop, uv_co in zip(f_high.loops, uvs_high):
            loop[uv_layer].uv = uv_co


# 7. Poblar las matas de lavanda
for c in clumps:
    center = c["pos"]
    for _ in range(c["cards"]):
        ang = rng.uniform(0, math.tau)
        r_norm = math.sqrt(rng.uniform(0.0, 1.0))
        ox = center.x + math.cos(ang) * c["rx"] * 0.85 * r_norm
        oy = center.y + math.sin(ang) * c["ry"] * 0.85 * r_norm

        radial = Vector((ox - center.x, oy - center.y))
        if radial.length < 1e-4:
            radial = Vector((math.cos(ang), math.sin(ang)))
        else:
            radial.normalize()

        dome_factor = math.cos(r_norm * math.pi * 0.44)
        sprig_h = c["h"] * (0.48 + 0.62 * dome_factor) * rng.uniform(0.86, 1.15)
        sprig_w = rng.uniform(0.12, 0.18)
        lean = (0.03 + 0.16 * (r_norm ** 1.2)) * rng.uniform(0.85, 1.2)
        twist = rng.uniform(0, math.tau)

        is_flower = (r_norm < 0.72) and (rng.random() < 0.34)
        if is_flower:
            sprig_h *= rng.uniform(1.05, 1.16)
            mat_idx = 2
        else:
            mat_idx = 1

        add_curved_sprig_card(
            bm=bm,
            uv_layer=uv_layer,
            base_pt=Vector((ox, oy, 0.01)),
            radial_xy=radial,
            height=sprig_h,
            width=sprig_w,
            lean=lean,
            twist_ang=twist,
            mat_idx=mat_idx,
        )

# 8. Pequeña mata verde rastrera en el extremo derecho
tuft_center = Vector((0.68, -0.07))
for _ in range(28):
    ang = rng.uniform(0, math.tau)
    r_norm = math.sqrt(rng.uniform(0.0, 1.0))
    ox = tuft_center.x + math.cos(ang) * 0.18 * r_norm
    oy = tuft_center.y + math.sin(ang) * 0.16 * r_norm
    radial = Vector((math.cos(ang), math.sin(ang)))

    h = rng.uniform(0.13, 0.23) * (1.0 - 0.30 * r_norm)
    w = rng.uniform(0.11, 0.16)
    lean = rng.uniform(0.07, 0.16)
    add_curved_sprig_card(
        bm=bm,
        uv_layer=uv_layer,
        base_pt=Vector((ox, oy, 0.008)),
        radial_xy=radial,
        height=h,
        width=w,
        lean=lean,
        twist_ang=rng.uniform(0, math.tau),
        mat_idx=3,
    )

mesh = bpy.data.meshes.new("ArbustosLavandaMesh")
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new("Macizo_Lavandas", mesh)
bpy.context.scene.collection.objects.link(obj)
obj.data.materials.append(mat_core)
obj.data.materials.append(mat_leaf)
obj.data.materials.append(mat_flower)
obj.data.materials.append(mat_tuft)
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

print(f"¡Listo! Arbustos cortos exportados en: {OUTPUT_PATH}")
