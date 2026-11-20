import os
import math
import bpy
import bmesh
from mathutils import Vector

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida exacta
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/tele_galeria.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# 3. Dimensiones reales (en metros)
ANCHO_TV = 1.24          # ~55 pulgadas (16:9)
ALTO_TV = 0.71
GROSOR_TV = 0.045
SEPARACION_PARED = 0.065 # Distancia del soporte VESA desde la pared
ALTURA_BASE_TV = 1.92    # Altura desde el piso hasta el borde inferior de la TV

# 4. Materiales PBR
def create_material(name, hex_color, roughness=0.5, metalness=0.0):
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

mat_carcasa = create_material("CarcasaNegraMate", "161719", roughness=0.58, metalness=0.15)
mat_pantalla = create_material("PantallaVidrioNegro", "08090c", roughness=0.08, metalness=0.1)
mat_soporte = create_material("SoporteMetalico", "232528", roughness=0.45, metalness=0.75)
mat_led = create_material("LedStandby", "8c1d1d", roughness=0.3)
mat_cartel_azul = create_material("CartelAzulPared", "1e4494", roughness=0.45)
mat_cartel_blanco = create_material("CartelRecuadroBlanco", "e6ebf5", roughness=0.5)

# Contenedor principal: Y=0 es el plano de la pared, mirando hacia -Y
container = bpy.data.objects.new("Tele_Galeria", None)
bpy.context.scene.collection.objects.link(container)

def add_box(name, size, pos, material):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.location = pos
    obj.data.materials.append(material)
    obj.parent = container
    return obj

centro_z = ALTURA_BASE_TV + ALTO_TV / 2.0
y_trasera_tv = -SEPARACION_PARED
y_centro_tv = y_trasera_tv - GROSOR_TV / 2.0

# 5. Soporte de pared VESA (placa en pared + 2 brazos)
add_box("Soporte_PlacaPared", (0.48, 0.015, 0.24), (0.0, -0.0075, centro_z), mat_soporte)
for sx in (-0.18, 0.18):
    add_box(f"Soporte_Brazo_{sx}", (0.035, SEPARACION_PARED, 0.32), (sx, -SEPARACION_PARED / 2.0, centro_z), mat_soporte)

# 6. Cuerpo trasero y marco exterior del televisor
add_box("TV_Chasis", (ANCHO_TV, GROSOR_TV, ALTO_TV), (0.0, y_centro_tv, centro_z), mat_carcasa)

# Bisel inferior ligeramente más grueso con sensor LED central (como en la foto)
y_frente = y_trasera_tv - GROSOR_TV
add_box("TV_BiselInferior", (ANCHO_TV, 0.006, 0.022), (0.0, y_frente - 0.002, ALTURA_BASE_TV + 0.011), mat_carcasa)
add_box("TV_SensorCentral", (0.035, 0.008, 0.012), (0.0, y_frente - 0.003, ALTURA_BASE_TV + 0.006), mat_led)

# 7. Panel frontal de vidrio negro brillante (con bisel de 1.2 cm alrededor)
BISEL = 0.012
add_box(
    "TV_Pantalla",
    (ANCHO_TV - BISEL * 2, 0.003, ALTO_TV - BISEL - 0.022),
    (0.0, y_frente - 0.0015, ALTURA_BASE_TV + 0.022 + (ALTO_TV - BISEL - 0.022) / 2.0),
    mat_pantalla,
)

# 8. Cable colgante debajo a la derecha (curva orgánica entrando hacia la pared)
cable_pts = [
    Vector((0.28, y_trasera_tv + 0.005, ALTURA_BASE_TV + 0.04)),
    Vector((0.29, y_trasera_tv + 0.012, ALTURA_BASE_TV - 0.11)),
    Vector((0.36, -0.035, ALTURA_BASE_TV - 0.17)),
    Vector((0.43, -0.012, ALTURA_BASE_TV - 0.09)),
    Vector((0.45, -0.004, ALTURA_BASE_TV + 0.02)),
]

bm_cable = bmesh.new()
radio_cable = 0.0045
lados = 8
rings = []
for idx, pt in enumerate(cable_pts):
    if idx == 0:
        tangent = (cable_pts[1] - cable_pts[0]).normalized()
    elif idx == len(cable_pts) - 1:
        tangent = (cable_pts[-1] - cable_pts[-2]).normalized()
    else:
        tangent = (cable_pts[idx + 1] - cable_pts[idx - 1]).normalized()

    up = Vector((0, 1, 0)) if abs(tangent.y) < 0.9 else Vector((1, 0, 0))
    side_a = tangent.cross(up).normalized()
    side_b = tangent.cross(side_a).normalized()

    ring = []
    for k in range(lados):
        ang = k * math.tau / lados
        offset = (side_a * math.cos(ang) + side_b * math.sin(ang)) * radio_cable
        ring.append(bm_cable.verts.new(pt + offset))
    rings.append(ring)

for r_idx in range(len(rings) - 1):
    r1 = rings[r_idx]
    r2 = rings[r_idx + 1]
    for k in range(lados):
        kn = (k + 1) % lados
        f = bm_cable.faces.new((r1[k], r1[kn], r2[kn], r2[k]))
        f.smooth = True

cable_mesh = bpy.data.meshes.new("CableTVMesh")
bm_cable.to_mesh(cable_mesh)
bm_cable.free()

cable_obj = bpy.data.objects.new("TV_Cable", cable_mesh)
bpy.context.scene.collection.objects.link(cable_obj)
cable_obj.data.materials.append(mat_carcasa)
cable_obj.parent = container

# 9. Cartel azul pequeño en la pared debajo de la tele (como se ve en la foto)
CARTEL_Z = ALTURA_BASE_TV - 0.34
add_box("Cartel_Azul_Base", (0.14, 0.004, 0.21), (0.04, -0.002, CARTEL_Z), mat_cartel_azul)
add_box("Cartel_Azul_QR", (0.085, 0.005, 0.095), (0.04, -0.0025, CARTEL_Z - 0.015), mat_cartel_blanco)

# 10. Exportar GLB directo a frontend/editor-models/tele_galeria.glb
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

print(f"¡Listo! Televisor exportado en: {OUTPUT_PATH}")
