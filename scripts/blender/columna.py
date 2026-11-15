from pathlib import Path
import bpy

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Dimensiones reales estimadas de la galería (en metros)
RADIO_COLUMNA = 0.17       # ~34 cm de diámetro total
ALTURA_COLUMNA = 3.20      # Altura libre desde el piso hasta debajo de la viga
COLOR_HORMIGON = "8b8c80"  # Gris cemento cálido que coincide con la viga/techo
COLOR_JUNTA = "696a5f"     # Sombra/junta superior contra la viga  # Gris claro pintado de la galería


def create_concrete_material(name, hex_color, roughness=0.86):
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

mat_columna = create_concrete_material("HormigonPintadoGris", COLOR_HORMIGON, roughness=0.86)
mat_junta = create_concrete_material("JuntaColumna", COLOR_JUNTA, roughness=0.92)

# Contenedor con pivote exactamente en la base (0, 0, 0)
container = bpy.data.objects.new("Columna_Galeria", None)
bpy.context.scene.collection.objects.link(container)

# 3. Fuste cilíndrico principal (32 lados + smooth shading para curvatura limpia sin facetas)
bpy.ops.mesh.primitive_cylinder_add(
    vertices=32,
    radius=RADIO_COLUMNA,
    depth=ALTURA_COLUMNA - 0.02,
    location=(0.0, 0.0, (ALTURA_COLUMNA - 0.02) / 2.0),
)
fuste = bpy.context.active_object
fuste.name = "Fuste_Columna"
fuste.data.materials.append(mat_columna)
bpy.ops.object.shade_smooth()
fuste.parent = container

# 4. Pequeña junta/rebaje superior donde apoya contra la viga
bpy.ops.mesh.primitive_cylinder_add(
    vertices=32,
    radius=RADIO_COLUMNA - 0.004,
    depth=0.02,
    location=(0.0, 0.0, ALTURA_COLUMNA - 0.01),
)
junta = bpy.context.active_object
junta.name = "Junta_Superior"
junta.data.materials.append(mat_junta)
bpy.ops.object.shade_smooth()
junta.parent = container

# 5. Exportar GLB a frontend/editor-models/
repo_root = Path(__file__).resolve().parents[2]
output_path = repo_root / "frontend" / "editor-models" / "columna_galeria.glb"
output_path.parent.mkdir(parents=True, exist_ok=True)

for obj in bpy.context.scene.objects:
    obj.select_set(False)
container.select_set(True)
for child in container.children:
    child.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=str(output_path),
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Columna exportada en: {output_path}")
