import os
import math
import numpy as np
import bpy
import bmesh
from mathutils import Vector, Matrix

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en tu proyecto
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/puerta_blindex_esmerilada.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# 3. Generar textura procedural RGBA (512x512) de vidrio esmerilado/arenado claro
def generate_frosted_glass_texture():
    size = 512
    y_grid, x_grid = np.mgrid[0:size, 0:size].astype(np.float32)
    u = x_grid / (size - 1)
    v = y_grid / (size - 1)

    rng = np.random.default_rng(2026)

    # Grano fino tipo arenado/esmerilado + sutil gradiente luminoso
    fine_grain = rng.normal(0.0, 0.016, (size, size))
    soft_wave = 0.025 * np.sin(u * math.pi * 2.0) * np.cos(v * math.pi * 1.5)
    light_grad = 0.045 * np.exp(-(((u - 0.52) / 0.38) ** 2 + ((v - 0.62) / 0.32) ** 2))
    floor_bounce = 0.055 * np.clip(1.0 - v * 3.2, 0.0, 1.0)

    # Tono vidrio templado esmerilado blanco-celeste/menta suave (#d5e5e3)
    base_r = 0.81 + fine_grain + soft_wave + light_grad + floor_bounce
    base_g = 0.88 + fine_grain + soft_wave + light_grad + floor_bounce
    base_b = 0.87 + fine_grain + soft_wave + light_grad + floor_bounce

    rgba = np.ones((size, size, 4), dtype=np.float32)
    rgba[:, :, 0] = np.clip(base_r, 0.0, 1.0)
    rgba[:, :, 1] = np.clip(base_g, 0.0, 1.0)
    rgba[:, :, 2] = np.clip(base_b, 0.0, 1.0)
    rgba[:, :, 3] = 1.0  # 100% opaco: no deja pasar la mirada atrás

    img = bpy.data.images.new(name="Tex_Vidrio_Esmerilado_Claro", width=size, height=size, alpha=False)
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    return img


img_frosted = generate_frosted_glass_texture()


# 4. Materiales PBR
def create_frosted_glass_material(image):
    mat = bpy.data.materials.new(name="Mat_VidrioEsmeriladoClaro")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")

    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])

    bsdf.inputs["Roughness"].default_value = 0.34
    bsdf.inputs["Metallic"].default_value = 0.04
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.62
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.35
        bsdf.inputs["Coat Roughness"].default_value = 0.16
    return mat


def create_metal_material(name, hex_color, roughness=0.35, metallic=0.82):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


mat_vidrio_claro = create_frosted_glass_material(img_frosted)
mat_marco_aluminio = create_metal_material("MarcoAluminioGris", "7c8288", roughness=0.38, metallic=0.78)
mat_herraje_cromo = create_metal_material("HerrajeAceroSatinado", "b4bac0", roughness=0.25, metallic=0.90)
mat_herraje_negro = create_metal_material("CerraduraNegra", "1c1e21", roughness=0.40, metallic=0.45)

# Contenedor principal con pivote centrado en el piso (0, 0, 0)
container = bpy.data.objects.new("Puerta_Blindex_Esmerilada", None)
bpy.context.scene.collection.objects.link(container)

# 5. Dimensiones ampliadas para cubrir todo el vano negro sin bordes visibles (en metros)
DOOR_TOTAL_W = 1.16     # Ancho exterior ampliado (antes 0.96 m)
DOOR_TOTAL_H = 2.54     # Alto exterior ampliado (antes 2.12 m)
FRAME_FACE = 0.052      # Perfil de aluminio gris (5.2 cm)
FRAME_DEPTH = 0.090     # Profundidad del marco (9.0 cm)
SILL_H = 0.018          # Umbral inferior rasante (1.8 cm)
GAP = 0.005             # Luz perimetral entre marco y hoja blindex (5 mm)
GLASS_THICK = 0.010     # Vidrio templado 10 mm


def add_box(bm, center, size, mat_idx=0, uv_layer=None):
    res = bmesh.ops.create_cube(bm, size=1.0)
    scale_m = Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    trans_m = Matrix.Translation(center)
    bmesh.ops.transform(bm, matrix=trans_m @ scale_m, verts=res["verts"])
    v_set = set(res["verts"])
    for f in bm.faces:
        if all(v in v_set for v in f.verts):
            f.material_index = mat_idx
            if uv_layer is not None:
                for loop in f.loops:
                    co = loop.vert.co
                    u = (co.x + DOOR_TOTAL_W * 0.5) / DOOR_TOTAL_W
                    v = co.z / DOOR_TOTAL_H
                    loop[uv_layer].uv = (max(0.0, min(1.0, u)), max(0.0, min(1.0, v)))


def add_cylinder_y(bm, center, radius, depth_y, segs=24, mat_idx=0):
    res = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=radius,
        depth=depth_y,
    )
    rot_m = Matrix.Rotation(math.pi * 0.5, 4, "X")
    trans_m = Matrix.Translation(center)
    bmesh.ops.transform(bm, matrix=trans_m @ rot_m, verts=res["verts"])
    v_set = set(res["verts"])
    for f in bm.faces:
        if all(v in v_set for v in f.verts):
            f.material_index = mat_idx
            f.smooth = True


# 6. Marco de aluminio gris + herrajes blindex
bm_hw = bmesh.new()

half_w = DOOR_TOTAL_W * 0.5
jamb_h = DOOR_TOTAL_H - SILL_H - FRAME_FACE
jamb_mid_z = SILL_H + jamb_h * 0.5

# Marco perimetral (izquierdo, derecho, dintel superior y umbral inferior)
add_box(bm_hw, (-half_w + FRAME_FACE * 0.5, 0.0, jamb_mid_z), (FRAME_FACE, FRAME_DEPTH, jamb_h), mat_idx=0)
add_box(bm_hw, (half_w - FRAME_FACE * 0.5, 0.0, jamb_mid_z), (FRAME_FACE, FRAME_DEPTH, jamb_h), mat_idx=0)
add_box(bm_hw, (0.0, 0.0, DOOR_TOTAL_H - FRAME_FACE * 0.5), (DOOR_TOTAL_W, FRAME_DEPTH, FRAME_FACE), mat_idx=0)
add_box(bm_hw, (0.0, 0.0, SILL_H * 0.5), (DOOR_TOTAL_W, FRAME_DEPTH, SILL_H), mat_idx=0)

# Coordenadas de la hoja de vidrio
leaf_w = DOOR_TOTAL_W - 2.0 * FRAME_FACE - 2.0 * GAP
leaf_h = DOOR_TOTAL_H - FRAME_FACE - SILL_H - 2.0 * GAP
leaf_z0 = SILL_H + GAP
leaf_z1 = leaf_z0 + leaf_h
leaf_x0 = -leaf_w * 0.5
leaf_x1 = leaf_w * 0.5

# Herrajes de pivote blindex en el borde derecho (superior e inferior)
PATCH_W = 0.145
PATCH_H = 0.056
PATCH_T = GLASS_THICK + 0.010

# Pivote inferior derecho
add_box(
    bm_hw,
    center=(leaf_x1 - PATCH_W * 0.5, 0.0, leaf_z0 + PATCH_H * 0.5),
    size=(PATCH_W, PATCH_T, PATCH_H),
    mat_idx=1,
)
# Pivote superior derecho
add_box(
    bm_hw,
    center=(leaf_x1 - PATCH_W * 0.5, 0.0, leaf_z1 - PATCH_H * 0.5),
    size=(PATCH_W, PATCH_T, PATCH_H),
    mat_idx=1,
)

# Cerradura circular negra a altura ergonómica (~1.02 m) + recibidor en el marco
LOCK_Z = 1.02
LOCK_X = leaf_x0 + 0.080
add_cylinder_y(bm_hw, center=(LOCK_X, 0.0, LOCK_Z), radius=0.038, depth_y=GLASS_THICK + 0.014, mat_idx=2)
add_box(
    bm_hw,
    center=(leaf_x0 - 0.008, 0.0, LOCK_Z),
    size=(0.024, GLASS_THICK + 0.016, 0.092),
    mat_idx=2,
)

# Pomo/picaporte redondo sobre la cerradura
add_cylinder_y(bm_hw, center=(leaf_x0 + 0.052, 0.0, LOCK_Z + 0.078), radius=0.017, depth_y=GLASS_THICK + 0.028, mat_idx=1)

# Ranura horizontal tipo buzón en el centro de la hoja
add_box(
    bm_hw,
    center=(0.0, 0.0, LOCK_Z),
    size=(0.145, GLASS_THICK + 0.008, 0.021),
    mat_idx=2,
)

hw_mesh = bpy.data.meshes.new("MarcoYHerrajesPuertaMesh")
bm_hw.to_mesh(hw_mesh)
bm_hw.free()

hw_obj = bpy.data.objects.new("Marco_Y_Herrajes", hw_mesh)
bpy.context.scene.collection.objects.link(hw_obj)
hw_obj.data.materials.append(mat_marco_aluminio)
hw_obj.data.materials.append(mat_herraje_cromo)
hw_obj.data.materials.append(mat_herraje_negro)
hw_obj.parent = container


# 7. Hoja de vidrio templado esmerilado claro (100% opaco)
bm_glass = bmesh.new()
uv_layer = bm_glass.loops.layers.uv.new("UVMap")

add_box(
    bm_glass,
    center=(0.0, 0.0, (leaf_z0 + leaf_z1) * 0.5),
    size=(leaf_w, GLASS_THICK, leaf_h),
    mat_idx=0,
    uv_layer=uv_layer,
)

glass_mesh = bpy.data.meshes.new("HojaVidrioEsmeriladoMesh")
bm_glass.to_mesh(glass_mesh)
bm_glass.free()

glass_obj = bpy.data.objects.new("Vidrio_Blindex_Esmerilado", glass_mesh)
bpy.context.scene.collection.objects.link(glass_obj)
glass_obj.data.materials.append(mat_vidrio_claro)
glass_obj.parent = container

# 8. Exportar GLB con textura empaquetada
for obj in bpy.context.scene.objects:
    obj.select_set(False)
container.select_set(True)
hw_obj.select_set(True)
glass_obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Puerta blindex ampliada exportada en: {OUTPUT_PATH}")
