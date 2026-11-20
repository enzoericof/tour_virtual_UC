import os
import math
import bpy
import bmesh
from mathutils import Vector

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida exacta
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/basurero_galeria.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# 3. Materiales PBR
def create_material(name, hex_color, roughness=0.45):
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

mat_cuerpo = create_material("PlasticoBeigeCuerpo", "c9c5bc", roughness=0.42)
mat_tapa = create_material("PlasticoCremaTapa", "dedad0", roughness=0.36)
mat_vaiven = create_material("CompuertaBlanca", "ebe9e4", roughness=0.32)
mat_bolsa = create_material("BolsaNegra", "1c1d20", roughness=0.28)
mat_sombra = create_material("RanuraSombra", "2a2a2c", roughness=0.85)

# Contenedor principal con pivote en el piso (0, 0, 0) mirando hacia -Y
container = bpy.data.objects.new("Basurero_Galeria", None)
bpy.context.scene.collection.objects.link(container)

def rounded_rect_points(w, d, r, segs_corner=6):
    pts = []
    hw = w / 2.0 - r
    hd = d / 2.0 - r
    corners = [
        (hw, -hd, -math.pi / 2, 0.0),
        (hw, hd, 0.0, math.pi / 2),
        (-hw, hd, math.pi / 2, math.pi),
        (-hw, -hd, math.pi, 3 * math.pi / 2),
    ]
    for cx, cy, a0, a1 in corners:
        for i in range(segs_corner + 1):
            t = i / segs_corner
            ang = a0 + (a1 - a0) * t
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts

# 4. Cuerpo principal troncocónico redondeado (alto 0.51 m)
ALTO_CUERPO = 0.51
levels_cuerpo = [
    (0.000, 0.34, 0.25, 0.045),
    (0.015, 0.35, 0.26, 0.048),
    (0.480, 0.39, 0.29, 0.055),
    (ALTO_CUERPO, 0.405, 0.305, 0.058),
]

bm_body = bmesh.new()
rings = []
for z, w, d, r in levels_cuerpo:
    pts = rounded_rect_points(w, d, r)
    rings.append([bm_body.verts.new((x, y, z)) for x, y in pts])

n_pts = len(rings[0])
for i in range(len(rings) - 1):
    r1, r2 = rings[i], rings[i + 1]
    for j in range(n_pts):
        jn = (j + 1) % n_pts
        f = bm_body.faces.new((r1[j], r1[jn], r2[jn], r2[j]))
        f.smooth = True

bm_body.faces.new(list(reversed(rings[0])))
bm_body.faces.new(rings[-1])

body_mesh = bpy.data.meshes.new("CuerpoBasureroMesh")
bm_body.to_mesh(body_mesh)
bm_body.free()

body_obj = bpy.data.objects.new("Cuerpo_Basurero", body_mesh)
bpy.context.scene.collection.objects.link(body_obj)
body_obj.data.materials.append(mat_cuerpo)
body_obj.parent = container

# 5. Nervaduras verticales en relieve (3 al frente/atrás y 3 en cada costado) + asas
def add_box(name, size, pos, material, rot_x=0.0, rot_y=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.location = pos
    obj.rotation_euler = (rot_x, rot_y, 0.0)
    obj.data.materials.append(material)
    obj.parent = container
    return obj

for side_y in (-1, 1):
    for rx in (-0.032, 0.0, 0.032):
        add_box(
            f"Nervadura_FB_{side_y}_{rx}",
            (0.011, 0.010, 0.40),
            (rx, side_y * 0.141, 0.25),
            mat_cuerpo,
            rot_x=side_y * math.radians(3.2),
        )

for side_x in (-1, 1):
    for ry in (-0.028, 0.0, 0.028):
        add_box(
            f"Nervadura_LR_{side_x}_{ry}",
            (0.010, 0.011, 0.40),
            (side_x * 0.188, ry, 0.25),
            mat_cuerpo,
            rot_y=-side_x * math.radians(3.4),
        )
    # Asa lateral superior
    add_box(f"Asa_{side_x}", (0.024, 0.11, 0.016), (side_x * 0.205, 0.0, 0.445), mat_cuerpo)

# 6. Doblez de la bolsa negra sobresaliendo en el cuello
bm_bag = bmesh.new()
bag_levels = [
    (ALTO_CUERPO - 0.055, 0.396, 0.296, 0.056),
    (ALTO_CUERPO - 0.032, 0.416, 0.316, 0.060),
    (ALTO_CUERPO - 0.006, 0.418, 0.318, 0.060),
    (ALTO_CUERPO + 0.010, 0.402, 0.302, 0.057),
]
bag_rings = []
for idx_l, (z, w, d, r) in enumerate(bag_levels):
    pts = rounded_rect_points(w, d, r)
    ring = []
    for idx_p, (x, y) in enumerate(pts):
        # Ligera arruga orgánica en el borde inferior de la bolsa
        dz = 0.004 * math.sin(idx_p * 0.75) if idx_l == 0 else 0.0
        ring.append(bm_bag.verts.new((x, y, z + dz)))
    bag_rings.append(ring)

n_bag = len(bag_rings[0])
for i in range(len(bag_rings) - 1):
    r1, r2 = bag_rings[i], bag_rings[i + 1]
    for j in range(n_bag):
        jn = (j + 1) % n_bag
        f = bm_bag.faces.new((r1[j], r1[jn], r2[jn], r2[j]))
        f.smooth = True
bm_bag.faces.new(bag_rings[-1])

bag_mesh = bpy.data.meshes.new("BolsaNegraMesh")
bm_bag.to_mesh(bag_mesh)
bm_bag.free()

bag_obj = bpy.data.objects.new("Bolsa_Negra", bag_mesh)
bpy.context.scene.collection.objects.link(bag_obj)
bag_obj.data.materials.append(mat_bolsa)
bag_obj.parent = container

# 7. Tapa abovedada (domo) + compuerta basculante inclinada
Z_TAPA_BASE = ALTO_CUERPO + 0.006
ALTO_TAPA = 0.205
bm_lid = bmesh.new()

lid_slices = 10
lid_rings = []
for s in range(lid_slices + 1):
    t = s / lid_slices
    # Perfil abovedado: falda baja + arco semicircular arriba
    if t < 0.22:
        u = t / 0.22
        z = Z_TAPA_BASE + u * 0.045
        w = 0.412 - u * 0.006
        d = 0.312 - u * 0.004
    else:
        u = (t - 0.22) / 0.78
        ang = u * (math.pi / 2)
        z = Z_TAPA_BASE + 0.045 + math.sin(ang) * (ALTO_TAPA - 0.045)
        w = 0.406 - (1.0 - math.cos(ang)) * 0.032
        d = 0.308 * math.cos(ang) + 0.045 * (1.0 - math.cos(ang))
    r = min(0.056, d * 0.45)
    pts = rounded_rect_points(w, d, r)
    lid_rings.append([bm_lid.verts.new((x, y, z)) for x, y in pts])

n_lid = len(lid_rings[0])
for i in range(len(lid_rings) - 1):
    r1, r2 = lid_rings[i], lid_rings[i + 1]
    for j in range(n_lid):
        jn = (j + 1) % n_lid
        f = bm_lid.faces.new((r1[j], r1[jn], r2[jn], r2[j]))
        f.smooth = True
bm_lid.faces.new(lid_rings[-1])

lid_mesh = bpy.data.meshes.new("TapaDomoMesh")
bm_lid.to_mesh(lid_mesh)
bm_lid.free()

lid_obj = bpy.data.objects.new("Tapa_Basurero", lid_mesh)
bpy.context.scene.collection.objects.link(lid_obj)
lid_obj.data.materials.append(mat_tapa)
lid_obj.parent = container

# Marco oscuro de la boca + puerta vaivén blanca inclinada en la cara frontal (-Y)
add_box(
    "Marco_Boca_Tapa",
    (0.285, 0.012, 0.145),
    (0.0, -0.108, Z_TAPA_BASE + 0.125),
    mat_sombra,
    rot_x=math.radians(-42),
)
add_box(
    "Compuerta_Vaiven",
    (0.268, 0.014, 0.132),
    (0.0, -0.112, Z_TAPA_BASE + 0.128),
    mat_vaiven,
    rot_x=math.radians(-42),
)

# 8. Exportar GLB directo a /home/Mati/Repos/tour_virtual_UC/frontend/editor-models/basurero_galeria.glb
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

print(f"¡Listo! Basurero exportado en: {OUTPUT_PATH}")
