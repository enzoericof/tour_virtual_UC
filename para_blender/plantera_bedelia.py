import os
import math
import random
import bpy
import bmesh
from mathutils import Vector, Euler

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Materiales PBR
def create_material(name, hex_color, roughness=0.75, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    if not mat.use_nodes:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    return mat

mat_madera_1 = create_material("MaderaBarnizadaA", "b97a45", roughness=0.58)
mat_madera_2 = create_material("MaderaBarnizadaB", "a86b39", roughness=0.62)
mat_poste_int = create_material("MaderaPosteInt", "8c562b", roughness=0.72)
mat_cemento = create_material("MacetaCementoGris", "8c8e8a", roughness=0.88)
mat_tierra = create_material("TierraOscura", "2c221b", roughness=0.95)
mat_tallo = create_material("CanaVerde", "3c5727", roughness=0.65)
mat_hoja_1 = create_material("HojaBambuOscura", "2d4d20", roughness=0.55)
mat_hoja_2 = create_material("HojaBambuMedia", "426b2d", roughness=0.52)

# Contenedor principal con pivote en el piso (0, 0, 0)
container = bpy.data.objects.new("Plantera_Galeria", None)
bpy.context.scene.collection.objects.link(container)

def add_box(name, size, pos, material, rot_euler=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.location = pos
    obj.rotation_euler = rot_euler
    obj.data.materials.append(material)
    obj.parent = container
    return obj

# 3. Cajón exterior de listones de madera (Ancho X: 0.66m, Profundidad Y: 0.56m, Alto Z: 0.44m)
ANCHO = 0.66
PROF = 0.56
ALTO_CAJON = 0.44
ESP_TABLA = 0.022
NUM_LISTONES = 5
GAP = 0.014
ALTO_LISTON = (ALTO_CAJON - GAP * (NUM_LISTONES - 1)) / NUM_LISTONES

# 4 listones verticales internos en las esquinas
poste_lado = 0.042
for sx in (-1, 1):
    for sy in (-1, 1):
        px = sx * (ANCHO / 2 - ESP_TABLA - poste_lado / 2)
        py = sy * (PROF / 2 - ESP_TABLA - poste_lado / 2)
        add_box(f"Poste_Esquina_{sx}_{sy}", (poste_lado, poste_lado, ALTO_CAJON - 0.01), (px, py, (ALTO_CAJON - 0.01) / 2), mat_poste_int)

# 5 listones horizontales en las 4 caras
for i in range(NUM_LISTONES):
    cz = ALTO_LISTON / 2 + i * (ALTO_LISTON + GAP)
    mat_tabla = mat_madera_1 if i % 2 == 0 else mat_madera_2
    # Caras frontal y trasera (+Y / -Y)
    for sy in (-1, 1):
        add_box(f"Liston_FB_{i}_{sy}", (ANCHO, ESP_TABLA, ALTO_LISTON), (0.0, sy * (PROF / 2 - ESP_TABLA / 2), cz), mat_tabla)
    # Caras laterales (+X / -X)
    for sx in (-1, 1):
        add_box(f"Liston_LR_{i}_{sx}", (ESP_TABLA, PROF - ESP_TABLA * 2, ALTO_LISTON), (sx * (ANCHO / 2 - ESP_TABLA / 2), 0.0, cz), mat_tabla)

# Base inferior del cajón
add_box("Base_Cajon", (ANCHO - 0.03, PROF - 0.03, 0.02), (0.0, 0.0, 0.015), mat_poste_int)

# 4. Maceta interior de cemento gris (un poco más baja que el cajón, como en la foto)
CIM_W = ANCHO - 0.13
CIM_D = PROF - 0.13
CIM_H = ALTO_CAJON - 0.045
PARED_CIM = 0.032

add_box("Cemento_Fondo", (CIM_W, CIM_D, 0.03), (0.0, 0.0, 0.04), mat_cemento)
for sy in (-1, 1):
    add_box(f"Cemento_FB_{sy}", (CIM_W, PARED_CIM, CIM_H), (0.0, sy * (CIM_D / 2 - PARED_CIM / 2), 0.025 + CIM_H / 2), mat_cemento)
for sx in (-1, 1):
    add_box(f"Cemento_LR_{sx}", (PARED_CIM, CIM_D - PARED_CIM * 2, CIM_H), (sx * (CIM_W / 2 - PARED_CIM / 2), 0.0, 0.025 + CIM_H / 2), mat_cemento)

# Tierra oscura dentro de la maceta de cemento
NIVEL_TIERRA = 0.025 + CIM_H - 0.05
add_box("Tierra", (CIM_W - PARED_CIM * 2, CIM_D - PARED_CIM * 2, 0.04), (0.0, 0.0, NIVEL_TIERRA - 0.02), mat_tierra)

# 5. Planta tipo palmera bambú (Chamaedorea) con hojas lanceoladas
def create_leaf_mesh():
    bm = bmesh.new()
    # Hoja lanceolada ligeramente arqueada con pliegue central
    verts_coords = [
        (0.00, 0.00, 0.000),   # 0: base pecíolo
        (-0.016, 0.045, 0.004),# 1: izq ancho
        (0.00, 0.045, 0.008),  # 2: nervadura central
        (0.016, 0.045, 0.004), # 3: der ancho
        (-0.011, 0.105, -0.002),# 4: izq medio
        (0.00, 0.105, 0.003),  # 5: nervadura medio
        (0.011, 0.105, -0.002), # 6: der medio
        (0.00, 0.165, -0.016), # 7: punta caída
    ]
    verts = [bm.verts.new(c) for c in verts_coords]
    faces = [
        (0, 1, 2), (0, 2, 3),
        (1, 4, 5, 2), (2, 5, 6, 3),
        (4, 7, 5), (5, 7, 6),
    ]
    for f in faces:
        bm.faces.new([verts[idx] for idx in f])
    mesh = bpy.data.meshes.new("HojaBambuMesh")
    bm.to_mesh(mesh)
    bm.free()
    return mesh

leaf_mesh = create_leaf_mesh()

rng = random.Random(42)

# Configuración de 4 cañas principales de distintas alturas (hasta ~1.65m total)
canas_cfg = [
    {"base": (-0.04, -0.02), "top": (-0.16, 0.14, 1.62), "radio": 0.011, "nodos": 7},
    {"base": (0.03, 0.02),   "top": (0.14, -0.10, 1.38), "radio": 0.010, "nodos": 6},
    {"base": (-0.01, 0.04),  "top": (-0.08, 0.18, 1.12), "radio": 0.009, "nodos": 5},
    {"base": (0.05, -0.03),  "top": (0.17, 0.08, 0.92),  "radio": 0.008, "nodos": 4},
]

for idx_c, cfg in enumerate(canas_cfg):
    p0 = Vector((cfg["base"][0], cfg["base"][1], NIVEL_TIERRA - 0.01))
    p2 = Vector(cfg["top"])
    p1 = p0.lerp(p2, 0.5) + Vector((rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03), 0.04))

    # Construir tallo segmentado
    segs = 8
    pts = []
    for s in range(segs + 1):
        t = s / segs
        pt = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
        pts.append(pt)

    for s in range(segs):
        a, b = pts[s], pts[s + 1]
        vec = b - a
        dist = vec.length
        mid = (a + b) / 2
        rot = vec.to_track_quat("Z", "Y").to_euler()
        r_seg = cfg["radio"] * (1.0 - 0.35 * (s / segs))
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=r_seg, depth=dist + 0.005, location=mid)
        seg_obj = bpy.context.active_object
        seg_obj.name = f"Cana_{idx_c}_{s}"
        seg_obj.rotation_euler = rot
        seg_obj.data.materials.append(mat_tallo)
        seg_obj.parent = container

    # Agregar frondas (ramitas con pares de hojas) en los nodos superiores
    for n in range(cfg["nodos"]):
        t_node = 0.25 + 0.72 * (n / max(1, cfg["nodos"] - 1))
        node_pos = (1 - t_node) ** 2 * p0 + 2 * (1 - t_node) * t_node * p1 + t_node ** 2 * p2
        yaw = idx_c * 1.4 + n * 2.25 + rng.uniform(-0.25, 0.25)
        pitch = math.radians(32 + (1.0 - t_node) * 28 + rng.uniform(-6, 6))
        frond_len = 0.24 + 0.10 * (1.0 - abs(t_node - 0.65))

        dir_vec = Vector((
            math.cos(yaw) * math.sin(pitch),
            math.sin(yaw) * math.sin(pitch),
            math.cos(pitch),
        ))

        # Raquis (nervadura de la fronda)
        r_end = node_pos + dir_vec * frond_len + Vector((0, 0, -0.05))
        r_vec = r_end - node_pos
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.003, depth=r_vec.length, location=(node_pos + r_end) / 2)
        raquis = bpy.context.active_object
        raquis.name = f"Raquis_{idx_c}_{n}"
        raquis.rotation_euler = r_vec.to_track_quat("Z", "Y").to_euler()
        raquis.data.materials.append(mat_tallo)
        raquis.parent = container

        # Pares de foliolos a lo largo de la fronda
        pares = 4
        for p in range(pares):
            tp = 0.28 + 0.68 * (p / (pares - 1))
            base_h = node_pos.lerp(r_end, tp)
            escala_h = (0.72 + 0.35 * math.sin(tp * math.pi)) * rng.uniform(0.9, 1.12)
            for lado in (-1, 1):
                hoja_obj = bpy.data.objects.new(f"Hoja_{idx_c}_{n}_{p}_{lado}", leaf_mesh)
                bpy.context.scene.collection.objects.link(hoja_obj)
                hoja_obj.location = base_h
                ang_z = yaw - math.pi / 2 + lado * math.radians(52 - tp * 18) + rng.uniform(-0.12, 0.12)
                ang_x = math.radians(-18 - tp * 22 + rng.uniform(-5, 5))
                ang_y = lado * math.radians(15)
                hoja_obj.rotation_euler = Euler((ang_x, ang_y, ang_z), "XYZ")
                hoja_obj.scale = (escala_h, escala_h * 1.15, escala_h)
                hoja_obj.data.materials.append(mat_hoja_1 if (p + idx_c) % 2 == 0 else mat_hoja_2)
                hoja_obj.parent = container

# 6. Exportar GLB a frontend/editor-models/
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.normpath(os.path.join(script_dir, "..", "frontend", "editor-models", "plantera_galeria.glb"))
os.makedirs(os.path.dirname(output_path), exist_ok=True)

for obj in bpy.context.scene.objects:
    obj.select_set(False)
container.select_set(True)
for child in container.children:
    child.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Plantera exportada en: {output_path}")
