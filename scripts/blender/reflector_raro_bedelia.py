import os
import math
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en tu proyecto
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/poste_reflector.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# 3. Materiales PBR
def create_material(name, hex_color, roughness=0.45, metallic=0.2, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission_strength > 0.0 and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (r, g, b, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


mat_hierro_negro = create_material("HierroNegroMate", "181a1c", roughness=0.48, metallic=0.75)
mat_reflector_blanco = create_material("ReflectorBlancoSatinado", "e9eceb", roughness=0.28, metallic=0.08)
mat_tapa_negra = create_material("TapaPlasticaNegra", "111214", roughness=0.65, metallic=0.05)

# Contenedor principal con pivote en el suelo (0, 0, 0)
container = bpy.data.objects.new("Poste_Reflector", None)
bpy.context.scene.collection.objects.link(container)


def add_box_part(bm, center, size, rot_euler=(0.0, 0.0, 0.0), mat_idx=0):
    """Agrega un perfil metálico rectangular (caño estructural) al bmesh."""
    res = bmesh.ops.create_cube(bm, size=1.0)
    rot_mat = Euler(rot_euler, "XYZ").to_matrix().to_4x4()
    scale_mat = Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    trans_mat = Matrix.Translation(center)
    xform = trans_mat @ rot_mat @ scale_mat
    bmesh.ops.transform(bm, matrix=xform, verts=res["verts"])
    verts_set = set(res["verts"])
    for f in bm.faces:
        if all(v in verts_set for v in f.verts):
            f.material_index = mat_idx


# 4. Construcción de la estructura metálica negra (caño vertical + bastidor superior)
bm_metal = bmesh.new()

# Dimensiones generales (en metros)
POST_HEIGHT = 2.52       # Altura del mástil hasta la base del bastidor
POST_SIZE = 0.052        # Caño cuadrado negro de ~5.2 cm
FRAME_W = 0.42           # Ancho del bastidor superior
FRAME_H = 0.66           # Alto del bastidor superior
BAR_T = 0.028            # Grosor de los perfiles del marco superior
TILT_X = math.radians(-10.0)  # Ligera inclinación del cabezal superior como en la foto

# a) Pequeña base/collar de anclaje al ras del suelo (z = 0.0 .. 0.025)
add_box_part(
    bm_metal,
    center=(0.0, 0.0, 0.0125),
    size=(POST_SIZE * 1.65, POST_SIZE * 1.65, 0.025),
    mat_idx=0,
)

# b) Mástil vertical negro principal (z = 0.0 .. POST_HEIGHT)
add_box_part(
    bm_metal,
    center=(0.0, 0.0, POST_HEIGHT * 0.5),
    size=(POST_SIZE, POST_SIZE, POST_HEIGHT),
    mat_idx=0,
)

# c) Bastidor rectangular negro en la parte superior
# Centro del bastidor ligeramente desplazado en Y para abrazar la lámina curva
frame_center = Vector((0.0, 0.02, POST_HEIGHT + FRAME_H * 0.46))
rot_frame = Euler((TILT_X, 0.0, 0.0), "XYZ").to_matrix()


def add_frame_member(local_pos, size, mat_idx=0):
    world_pos = frame_center + (rot_frame @ Vector(local_pos))
    add_box_part(
        bm_metal,
        center=world_pos,
        size=size,
        rot_euler=(TILT_X, 0.0, 0.0),
        mat_idx=mat_idx,
    )


# Parantes verticales izquierdo y derecho del bastidor
half_w = (FRAME_W - BAR_T) * 0.5
add_frame_member((-half_w, 0.0, 0.0), (BAR_T, BAR_T * 1.35, FRAME_H), mat_idx=0)
add_frame_member((half_w, 0.0, 0.0), (BAR_T, BAR_T * 1.35, FRAME_H), mat_idx=0)

# Travesaños horizontales inferior y superior del bastidor
half_h = (FRAME_H - BAR_T) * 0.5
add_frame_member((0.0, 0.0, -half_h), (FRAME_W, BAR_T * 1.35, BAR_T), mat_idx=0)
add_frame_member((0.0, 0.0, half_h), (FRAME_W, BAR_T * 1.35, BAR_T), mat_idx=0)

# Soportes cortos de unión entre el caño principal y el bastidor
add_frame_member((0.0, -0.025, -half_h + 0.03), (POST_SIZE * 1.15, 0.055, 0.045), mat_idx=0)
add_frame_member((0.0, -0.025, 0.04), (POST_SIZE * 1.05, 0.055, 0.038), mat_idx=0)

# Tapones plásticos en los extremos superiores de los parantes
add_frame_member((-half_w, 0.0, half_h + BAR_T * 0.55), (BAR_T * 1.04, BAR_T * 1.4, 0.008), mat_idx=1)
add_frame_member((half_w, 0.0, half_h + BAR_T * 0.55), (BAR_T * 1.04, BAR_T * 1.4, 0.008), mat_idx=1)

metal_mesh = bpy.data.meshes.new("EstructuraPosteMesh")
bm_metal.to_mesh(metal_mesh)
bm_metal.free()

metal_obj = bpy.data.objects.new("Estructura_Poste_Negro", metal_mesh)
bpy.context.scene.collection.objects.link(metal_obj)
metal_obj.data.materials.append(mat_hierro_negro)
metal_obj.data.materials.append(mat_tapa_negra)
metal_obj.parent = container


# 5. Panel reflector blanco curvo montado dentro del bastidor superior
bm_panel = bmesh.new()

PANEL_W = 0.44          # Apenas más ancho que el bastidor
PANEL_H = 0.74          # Sobresale levemente por arriba y abajo del marco
PANEL_THICK = 0.008     # Espesor de la placa (~8 mm)
ARCH_DEPTH = 0.075      # Curvatura suave en arco hacia el frente/atrás
SEG_Z = 24
SEG_X = 8

front_grid = []
back_grid = []

for iz in range(SEG_Z + 1):
    tz = iz / SEG_Z
    # Coordenada vertical local [-PANEL_H/2 .. +PANEL_H/2]
    lz = (tz - 0.5) * PANEL_H
    # Perfil curvo parabólico suave: sobresale en el centro y se curva hacia atrás en puntas
    arch_y = ARCH_DEPTH * (1.0 - (2.0 * tz - 1.0) ** 2) - 0.032

    row_front = []
    row_back = []
    for ix in range(SEG_X + 1):
        tx = ix / SEG_X
        lx = (tx - 0.5) * PANEL_W

        # Ligero redondeo en las 4 esquinas de la lámina
        edge_x = abs(2.0 * tx - 1.0)
        edge_z = abs(2.0 * tz - 1.0)
        corner_trim = max(0.0, edge_x - 0.86) * max(0.0, edge_z - 0.90) * 0.25
        lx_adj = lx * (1.0 - corner_trim)
        lz_adj = lz * (1.0 - corner_trim * 0.6)

        p_front = frame_center + (rot_frame @ Vector((lx_adj, arch_y + PANEL_THICK * 0.5, lz_adj)))
        p_back = frame_center + (rot_frame @ Vector((lx_adj, arch_y - PANEL_THICK * 0.5, lz_adj)))

        row_front.append(bm_panel.verts.new(p_front))
        row_back.append(bm_panel.verts.new(p_back))

    front_grid.append(row_front)
    back_grid.append(row_back)

# Caras frontal y trasera de la placa blanca
for iz in range(SEG_Z):
    for ix in range(SEG_X):
        f_front = bm_panel.faces.new((
            front_grid[iz][ix],
            front_grid[iz][ix + 1],
            front_grid[iz + 1][ix + 1],
            front_grid[iz + 1][ix],
        ))
        f_front.smooth = True

        f_back = bm_panel.faces.new((
            back_grid[iz][ix + 1],
            back_grid[iz][ix],
            back_grid[iz + 1][ix],
            back_grid[iz + 1][ix + 1],
        ))
        f_back.smooth = True

# Bordes perimetrales de cierre (izquierdo, derecho, inferior, superior)
for iz in range(SEG_Z):
    bm_panel.faces.new((back_grid[iz][0], front_grid[iz][0], front_grid[iz + 1][0], back_grid[iz + 1][0]))
    bm_panel.faces.new((front_grid[iz][SEG_X], back_grid[iz][SEG_X], back_grid[iz + 1][SEG_X], front_grid[iz + 1][SEG_X]))

for ix in range(SEG_X):
    bm_panel.faces.new((back_grid[0][ix], back_grid[0][ix + 1], front_grid[0][ix + 1], front_grid[0][ix]))
    bm_panel.faces.new((front_grid[SEG_Z][ix], front_grid[SEG_Z][ix + 1], back_grid[SEG_Z][ix + 1], back_grid[SEG_Z][ix]))

panel_mesh = bpy.data.meshes.new("PanelReflectorMesh")
bm_panel.to_mesh(panel_mesh)
bm_panel.free()

panel_obj = bpy.data.objects.new("Panel_Reflector_Blanco", panel_mesh)
bpy.context.scene.collection.objects.link(panel_obj)
panel_obj.data.materials.append(mat_reflector_blanco)
panel_obj.parent = container

# 6. Exportar GLB
for obj in bpy.context.scene.objects:
    obj.select_set(False)
container.select_set(True)
metal_obj.select_set(True)
panel_obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Poste con reflector exportado en: {OUTPUT_PATH}")
