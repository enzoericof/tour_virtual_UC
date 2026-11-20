import os
import math
import random
import bpy
import bmesh
from mathutils import Vector

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en la carpeta solicitada
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/pasto_cantero.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# 3. Materiales PBR (tonos verdes naturales del césped de la foto)
def create_material(name, hex_color, roughness=0.88):
    mat = bpy.data.materials.new(name=name)
    if not mat.use_nodes:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat

mat_suelo_cesped = create_material("BaseCesped", "324d1f", roughness=0.92)
mat_borde_tierra = create_material("BordeTierraCesped", "362b21", roughness=0.95)
mat_brizna_oscura = create_material("BriznaOscura", "294219", roughness=0.82)
mat_brizna_media = create_material("BriznaMedia", "3b5c25", roughness=0.80)
mat_brizna_clara = create_material("BriznaClara", "4d7330", roughness=0.78)

# Contenedor principal con pivote en el suelo (0, 0, 0)
container = bpy.data.objects.new("Pasto_Cantero", None)
bpy.context.scene.collection.objects.link(container)

# 4. Trapecio NO rectángulo (trapecio escaleno con ambos lados inclinados hacia el fondo)
# Vértices en sentido antihorario vistos desde arriba:
# (-Y = base mayor frontal junto a los adoquines, +Y = base menor trasera junto a las plantas/galería)
#   0: esquina frontal-izquierda (lado izquierdo inclinado hacia adentro)
#   1: esquina frontal-derecha (punta aguda derecha)
#   2: esquina trasera-derecha (lado derecho más inclinado)
#   3: esquina trasera-izquierda
poly_2d = [
    Vector((-3.15, -1.50)),  # 0: frente-izq
    Vector(( 3.05, -1.50)),  # 1: frente-der
    Vector(( 1.45,  1.50)),  # 2: fondo-der
    Vector((-2.25,  1.50)),  # 3: fondo-izq
]

ALTURA_CESPED = 0.036
RETRANQUEO_TOP = 0.028

bm = bmesh.new()
n = len(poly_2d)

# Anillo inferior (z = 0.0)
bottom_verts = [bm.verts.new((p.x, p.y, 0.0)) for p in poly_2d]

# Anillo superior ligeramente retraído hacia el centro para bisel suave en los bordes
center_2d = sum(poly_2d, Vector((0.0, 0.0))) / n
top_verts = []
for p in poly_2d:
    dir_in = (center_2d - p).normalized()
    p_top = p + dir_in * RETRANQUEO_TOP
    top_verts.append(bm.verts.new((p_top.x, p_top.y, ALTURA_CESPED)))

# Cara superior (césped)
top_face = bm.faces.new(top_verts)
top_face.material_index = 0

# Cara inferior
bot_face = bm.faces.new(list(reversed(bottom_verts)))
bot_face.material_index = 1

# Taludes laterales
for i in range(n):
    j = (i + 1) % n
    side_face = bm.faces.new((bottom_verts[i], bottom_verts[j], top_verts[j], top_verts[i]))
    side_face.material_index = 1

# Subdividir la cara superior para darle relieve orgánico sutil
bmesh.ops.subdivide_edges(
    bm,
    edges=list(top_face.edges),
    cuts=7,
    use_grid_fill=True,
)

def dist_to_segment(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / (ab.length_squared + 1e-9)))
    proj = a + ab * t
    return (p - proj).length

rng = random.Random(314)
for v in bm.verts:
    if v.co.z > ALTURA_CESPED * 0.8:
        pt2d = Vector((v.co.x, v.co.y))
        dist_edge = min(
            dist_to_segment(pt2d, poly_2d[i], poly_2d[(i + 1) % n])
            for i in range(n)
        )
        bump = min(0.015, dist_edge * 0.014) + rng.uniform(-0.003, 0.004)
        v.co.z += bump

base_mesh = bpy.data.meshes.new("BaseCanteroMesh")
bm.to_mesh(base_mesh)
bm.free()

base_obj = bpy.data.objects.new("Terreno_Cesped", base_mesh)
bpy.context.scene.collection.objects.link(base_obj)
base_obj.data.materials.append(mat_suelo_cesped)
base_obj.data.materials.append(mat_borde_tierra)
bpy.context.view_layer.objects.active = base_obj
bpy.ops.object.shade_smooth()
base_obj.parent = container

# 5. Briznas de pasto densas distribuidas dentro del trapecio
def point_in_poly(pt, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i].x, poly[i].y
        xj, yj = poly[j].x, poly[j].y
        intersect = ((yi > pt.y) != (yj > pt.y)) and (
            pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 1e-9) + xi
        )
        if intersect:
            inside = not inside
        j = i
    return inside

bm_grass = bmesh.new()
min_x = min(p.x for p in poly_2d) + 0.035
max_x = max(p.x for p in poly_2d) - 0.035
min_y = min(p.y for p in poly_2d) + 0.035
max_y = max(p.y for p in poly_2d) - 0.035

NUM_MATAS = 1600
creadas = 0
intentos = 0
while creadas < NUM_MATAS and intentos < NUM_MATAS * 8:
    intentos += 1
    px = rng.uniform(min_x, max_x)
    py = rng.uniform(min_y, max_y)
    pt = Vector((px, py))
    if not point_in_poly(pt, poly_2d):
        continue

    creadas += 1
    base_z = ALTURA_CESPED - 0.003
    for b in range(3):
        ang = rng.uniform(0, math.tau)
        tilt = rng.uniform(0.010, 0.026)
        h = rng.uniform(0.034, 0.066)
        w = 0.007

        dx = math.cos(ang)
        dy = math.sin(ang)
        nx = -dy * w
        ny = dx * w

        ox = px + rng.uniform(-0.014, 0.014)
        oy = py + rng.uniform(-0.014, 0.014)

        v0 = bm_grass.verts.new((ox - nx, oy - ny, base_z))
        v1 = bm_grass.verts.new((ox + nx, oy + ny, base_z))
        v2 = bm_grass.verts.new((ox + dx * tilt, oy + dy * tilt, base_z + h))
        face = bm_grass.faces.new((v0, v1, v2))
        face.material_index = (creadas + b) % 3

grass_mesh = bpy.data.meshes.new("BriznasCespedMesh")
bm_grass.to_mesh(grass_mesh)
bm_grass.free()

grass_obj = bpy.data.objects.new("Briznas_Cesped", grass_mesh)
bpy.context.scene.collection.objects.link(grass_obj)
grass_obj.data.materials.append(mat_brizna_oscura)
grass_obj.data.materials.append(mat_brizna_media)
grass_obj.data.materials.append(mat_brizna_clara)
grass_obj.parent = container

# 6. Exportar GLB
for obj in bpy.context.scene.objects:
    obj.select_set(False)
container.select_set(True)
for child in container.children:
    child.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Pasto exportado en: {OUTPUT_PATH}")
