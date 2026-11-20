import os
import math
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en tu proyecto
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/techo_curvo_galeria.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# 3. Materiales PBR (estructura metálica negra y policarbonato humo brillante)
def create_metal_material(name, hex_color, roughness=0.42, metallic=0.78):
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


def create_polycarbonate_material(name, hex_color="151412", roughness=0.12, alpha=0.82):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    if hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.08
    bsdf.inputs["Alpha"].default_value = alpha
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.85
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.65
        bsdf.inputs["Coat Roughness"].default_value = 0.08
    return mat


mat_estructura = create_metal_material("EstructuraTechoNegro", "1a1c1e", roughness=0.44, metallic=0.75)
mat_junquillo = create_metal_material("JunquilloPerimetral", "101113", roughness=0.35, metallic=0.40)
mat_policarbonato = create_polycarbonate_material("PolicarbonatoHumoOscuro", "141312", roughness=0.12, alpha=0.82)

# Contenedor principal con pivote centrado en la base del arco (0, 0, 0)
container = bpy.data.objects.new("Techo_Curvo_Galeria", None)
bpy.context.scene.collection.objects.link(container)

# 4. Dimensiones reales del toldo/techo curvo (en metros)
SPAN_X = 4.30        # Ancho total entre columnas de la galería (-2.15 a +2.15)
DEPTH_Y = 1.48       # Profundidad del alero (-0.74 a +0.74)
ARCH_RISE = 0.54     # Flecha/altura central del arco semicircular rebajado
SEG_X = 48           # Resolución suave de la curva
SEG_Y = 12

# Cálculo exacto del radio R y ángulo máximo theta_max para el arco circular rebajado
HALF_W = SPAN_X * 0.5
R_ARCH = (HALF_W ** 2 + ARCH_RISE ** 2) / (2.0 * ARCH_RISE)
Z_CENTER = ARCH_RISE - R_ARCH
THETA_MAX = math.asin(HALF_W / R_ARCH)


def arch_point_and_normal(tx):
    """Devuelve (x, z) y el vector normal exterior (nx, nz) para tx en [0..1]."""
    theta = (2.0 * tx - 1.0) * THETA_MAX
    x = R_ARCH * math.sin(theta)
    z = Z_CENTER + R_ARCH * math.cos(theta)
    nx = math.sin(theta)
    nz = math.cos(theta)
    return x, z, nx, nz


def add_box(bm, center, size, rot_euler=(0.0, 0.0, 0.0), mat_idx=0):
    res = bmesh.ops.create_cube(bm, size=1.0)
    rot_m = Euler(rot_euler, "XYZ").to_matrix().to_4x4()
    scale_m = Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    trans_m = Matrix.Translation(center)
    bmesh.ops.transform(bm, matrix=trans_m @ rot_m @ scale_m, verts=res["verts"])
    v_set = set(res["verts"])
    for f in bm.faces:
        if all(v in v_set for v in f.verts):
            f.material_index = mat_idx


def add_curved_rib(bm, y_pos, rib_w, rib_h, z_offset=-0.022, mat_idx=0):
    """Genera una costilla metálica curva de sección rectangular siguiendo el arco."""
    rings = []
    for ix in range(SEG_X + 1):
        tx = ix / SEG_X
        x, z, nx, nz = arch_point_and_normal(tx)
        c = Vector((x + nx * z_offset, y_pos, z + nz * z_offset))
        n_vec = Vector((nx, 0.0, nz))
        y_vec = Vector((0.0, 1.0, 0.0))

        hw = rib_w * 0.5
        hh = rib_h * 0.5
        v0 = bm.verts.new(c - y_vec * hw - n_vec * hh)
        v1 = bm.verts.new(c + y_vec * hw - n_vec * hh)
        v2 = bm.verts.new(c + y_vec * hw + n_vec * hh)
        v3 = bm.verts.new(c - y_vec * hw + n_vec * hh)
        rings.append((v0, v1, v2, v3))

    for ix in range(SEG_X):
        r0 = rings[ix]
        r1 = rings[ix + 1]
        for side in range(4):
            s_next = (side + 1) % 4
            f = bm.faces.new((r0[side], r0[s_next], r1[s_next], r1[side]))
            f.smooth = True
            f.material_index = mat_idx

    # Tapas en los extremos izquierdo y derecho
    f_start = bm.faces.new((rings[0][3], rings[0][2], rings[0][1], rings[0][0]))
    f_start.material_index = mat_idx
    f_end = bm.faces.new(rings[-1])
    f_end.material_index = mat_idx


# 5. Estructura metálica negra (costillas curvas, vigas laterales y correas longitudinales)
bm_metal = bmesh.new()

HALF_D = DEPTH_Y * 0.5

# a) 4 costillas curvas transversales (2 en los bordes frontal/trasero y 2 intermedias)
rib_y_positions = [-HALF_D + 0.02, -HALF_D / 3.0, HALF_D / 3.0, HALF_D - 0.02]
for idx, y_p in enumerate(rib_y_positions):
    is_edge = idx in (0, len(rib_y_positions) - 1)
    add_curved_rib(
        bm=bm_metal,
        y_pos=y_p,
        rib_w=0.042 if is_edge else 0.032,
        rib_h=0.048 if is_edge else 0.038,
        z_offset=-0.024 if is_edge else -0.020,
        mat_idx=0,
    )

# b) Correas longitudinales (corren a lo largo de Y por debajo del policarbonato)
# Dividen el arco en 3 paños principales a lo largo de X
purlin_tx = [0.02, 0.34, 0.66, 0.98]
for tx in purlin_tx:
    x, z, nx, nz = arch_point_and_normal(tx)
    tilt_y = math.atan2(nx, nz)
    p_center = Vector((x - nx * 0.028, 0.0, z - nz * 0.028))
    add_box(
        bm_metal,
        center=p_center,
        size=(0.032, DEPTH_Y - 0.02, 0.036),
        rot_euler=(0.0, tilt_y, 0.0),
        mat_idx=0,
    )

# c) Vigas canaleta laterales izquierda y derecha (los perfiles horizontales gruesos de los extremos)
x_left, z_left, _, _ = arch_point_and_normal(0.0)
x_right, z_right, _, _ = arch_point_and_normal(1.0)

BEAM_H = 0.13
BEAM_W = 0.075
add_box(
    bm_metal,
    center=(x_left + BEAM_W * 0.35, 0.0, z_left - BEAM_H * 0.42),
    size=(BEAM_W, DEPTH_Y + 0.04, BEAM_H),
    mat_idx=0,
)
add_box(
    bm_metal,
    center=(x_right - BEAM_W * 0.35, 0.0, z_right - BEAM_H * 0.42),
    size=(BEAM_W, DEPTH_Y + 0.04, BEAM_H),
    mat_idx=0,
)

# d) Pequeños perfiles superiores de unión (tapajuntas sobre las costillas para el brillo)
for y_p in rib_y_positions:
    add_curved_rib(
        bm=bm_metal,
        y_pos=y_p,
        rib_w=0.048,
        rib_h=0.008,
        z_offset=0.007,
        mat_idx=1,
    )

metal_mesh = bpy.data.meshes.new("EstructuraTechoMesh")
bm_metal.to_mesh(metal_mesh)
bm_metal.free()

metal_obj = bpy.data.objects.new("Estructura_Metalica_Negra", metal_mesh)
bpy.context.scene.collection.objects.link(metal_obj)
metal_obj.data.materials.append(mat_estructura)
metal_obj.data.materials.append(mat_junquillo)
metal_obj.parent = container


# 6. Lámina curva de policarbonato humo oscuro translúcido
bm_poly = bmesh.new()
SHEET_THICK = 0.008

top_grid = []
bot_grid = []

for iy in range(SEG_Y + 1):
    ty = iy / SEG_Y
    y = (ty - 0.5) * DEPTH_Y
    row_top = []
    row_bot = []
    for ix in range(SEG_X + 1):
        tx = ix / SEG_X
        x, z, nx, nz = arch_point_and_normal(tx)
        p_top = Vector((x + nx * (SHEET_THICK * 0.5), y, z + nz * (SHEET_THICK * 0.5)))
        p_bot = Vector((x - nx * (SHEET_THICK * 0.5), y, z - nz * (SHEET_THICK * 0.5)))
        row_top.append(bm_poly.verts.new(p_top))
        row_bot.append(bm_poly.verts.new(p_bot))
    top_grid.append(row_top)
    bot_grid.append(row_bot)

for iy in range(SEG_Y):
    for ix in range(SEG_X):
        f_top = bm_poly.faces.new((
            top_grid[iy][ix],
            top_grid[iy][ix + 1],
            top_grid[iy + 1][ix + 1],
            top_grid[iy + 1][ix],
        ))
        f_top.smooth = True

        f_bot = bm_poly.faces.new((
            bot_grid[iy][ix + 1],
            bot_grid[iy][ix],
            bot_grid[iy + 1][ix],
            bot_grid[iy + 1][ix + 1],
        ))
        f_bot.smooth = True

# Cierre perimetral de la placa de policarbonato
for ix in range(SEG_X):
    bm_poly.faces.new((bot_grid[0][ix], bot_grid[0][ix + 1], top_grid[0][ix + 1], top_grid[0][ix]))
    bm_poly.faces.new((top_grid[SEG_Y][ix], top_grid[SEG_Y][ix + 1], bot_grid[SEG_Y][ix + 1], bot_grid[SEG_Y][ix]))

for iy in range(SEG_Y):
    bm_poly.faces.new((bot_grid[iy][0], top_grid[iy][0], top_grid[iy + 1][0], bot_grid[iy + 1][0]))
    bm_poly.faces.new((top_grid[iy][SEG_X], bot_grid[iy][SEG_X], bot_grid[iy + 1][SEG_X], top_grid[iy + 1][SEG_X]))

poly_mesh = bpy.data.meshes.new("PolicarbonatoCurvoMesh")
bm_poly.to_mesh(poly_mesh)
bm_poly.free()

poly_obj = bpy.data.objects.new("Cubierta_Policarbonato_Humo", poly_mesh)
bpy.context.scene.collection.objects.link(poly_obj)
poly_obj.data.materials.append(mat_policarbonato)
poly_obj.parent = container

# 7. Exportar GLB
for obj in bpy.context.scene.objects:
    obj.select_set(False)
container.select_set(True)
metal_obj.select_set(True)
poly_obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Techo curvo exportado en: {OUTPUT_PATH}")
