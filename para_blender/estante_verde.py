import os
import bpy
import math

# 1. Limpiar la escena por defecto
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Configuración y dimensiones (en metros)
GREEN_HEX = "162c21"
METALLIC_HEX = "252c28"

# 3. Función para crear material PBR (compatible con Blender 5.x)
def create_material(name, hex_color, roughness=0.75, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    if not mat.use_nodes:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    return mat

green_mat = create_material("MuebleVerde", GREEN_HEX, roughness=0.82)
metal_mat = create_material("EstructuraMetal", METALLIC_HEX, roughness=0.6, metalness=0.4)

# 4. Contenedor principal con pivote en la base (0, 0, 0)
base_container = bpy.data.objects.new("Estante_Verde", None)
bpy.context.scene.collection.objects.link(base_container)

def add_box(name, size, pos, material, rot_x_deg=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.location = pos
    if rot_x_deg != 0.0:
        obj.rotation_euler[0] = math.radians(rot_x_deg)
    obj.data.materials.append(material)
    obj.parent = base_container
    return obj

# Sección Derecha: Armario alto cerrado
add_box("Armario_Derecha", (0.55, 0.45, 1.85), (0.35, 0.0, 1.85 / 2), green_mat)

# Sección Izquierda: Base cerrada
add_box("Base_Izquierda", (0.65, 0.42, 0.45), (-0.325, -0.015, 0.45 / 2), green_mat)

# Soportes verticales traseros (en la foto real solo lleva postes atrás, el frente queda libre)
add_box("Soporte_Posterior_Izquierdo", (0.04, 0.04, 1.48), (-0.61, -0.18, 0.45 + 1.48 / 2), metal_mat)
add_box("Soporte_Posterior_Derecho", (0.04, 0.04, 1.48), (-0.02, -0.18, 0.45 + 1.48 / 2), metal_mat)

# Repisas
estante_alturas = [0.75, 1.10, 1.45, 1.86]
for i, altura in enumerate(estante_alturas):
    if i == 3:
        add_box("Estante_Superior", (0.63, 0.40, 0.025), (-0.315, -0.01, altura), green_mat, rot_x_deg=-3.0)
    else:
        add_box(f"Estante_{i+1}", (0.63, 0.40, 0.025), (-0.315, -0.01, altura), green_mat)

# 5. Exportar a formato GLB relativo a la ubicación de este script
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.normpath(os.path.join(script_dir, "..", "frontend", "editor-models", "estante_verde.glb"))
os.makedirs(os.path.dirname(output_path), exist_ok=True)

for obj in bpy.context.scene.objects:
    obj.select_set(False)
base_container.select_set(True)
for child in base_container.children:
    child.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True
)

print(f"¡Hecho! Exportado en: {output_path}")
