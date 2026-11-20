import os
import math
import random
import bpy
import bmesh
from mathutils import Vector

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en la misma carpeta del editor
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/lavanda_cantero.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# 3. Materiales PBR (tonos verde salvia/grisáceo y espigas lavanda)
def create_material(name, hex_color, roughness=0.85):
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

mat_tallo_oscuro = create_material("LavandaBaseOscura", "3e4f43", roughness=0.90)
mat_hoja_salvia = create_material("LavandaHojaSalvia", "5d7364", roughness=0.84)
mat_hoja_plateada = create_material("LavandaHojaPlateada", "768c7d", roughness=0.80)
mat_flor_violeta = create_material("LavandaFlorVioleta", "6f5b87", roughness=0.78)
mat_hierba_borde = create_material("HierbaBordeDerecho", "486332", roughness=0.86)

# Contenedor principal con pivote en el suelo (0, 0, 0)
container = bpy.data.objects.new("Lavanda_Cantero", None)
bpy.context.scene.collection.objects.link(container)

rng = random.Random(2026)

# 4. Definir centros de las matas principales que forman el macizo (~4.3 m de largo x ~0.85 m de ancho)
# Ordenadas de izquierda (-X) a derecha (+X), ligeramente más altas hacia la izquierda como en la foto
clumps = [
    {"pos": Vector((-1.75,  0.03)), "rx": 0.52, "ry": 0.42, "h": 0.64, "stems": 170},
    {"pos": Vector((-1.05, -0.02)), "rx": 0.54, "ry": 0.44, "h": 0.62, "stems": 180},
    {"pos": Vector((-0.30,  0.04)), "rx": 0.52, "ry": 0.42, "h": 0.56, "stems": 170},
    {"pos": Vector(( 0.45, -0.03)), "rx": 0.55, "ry": 0.44, "h": 0.53, "stems": 175},
    {"pos": Vector(( 1.20,  0.02)), "rx": 0.50, "ry": 0.40, "h": 0.50, "stems": 160},
    {"pos": Vector(( 1.82, -0.02)), "rx": 0.44, "ry": 0.36, "h": 0.45, "stems": 135},
]

bm = bmesh.new()

def add_ribbon_stem(bm, base_pt, dir_xy, height, lean_out, width, mat_foliage, has_flower=False):
    """Crea un tallo arqueado de 2 segmentos con hojas laterales y espiga floral opcional."""
    up = Vector((0.0, 0.0, 1.0))
    perp = Vector((-dir_xy.y, dir_xy.x, 0.0)).normalized()
    out_3d = Vector((dir_xy.x, dir_xy.y, 0.0))

    # Punto medio (60% altura, se abre hacia afuera)
    p0 = base_pt
    p1 = base_pt + out_3d * (lean_out * 0.42) + up * (height * 0.58)
    p2 = base_pt + out_3d * lean_out + up * height

    w0 = width * 0.85
    w1 = width * 1.15
    w2 = width * 0.35

    v0_l = bm.verts.new(p0 - perp * w0)
    v0_r = bm.verts.new(p0 + perp * w0)
    v1_l = bm.verts.new(p1 - perp * w1)
    v1_r = bm.verts.new(p1 + perp * w1)
    v2_t = bm.verts.new(p2)

    f1 = bm.faces.new((v0_l, v0_r, v1_r, v1_l))
    f1.material_index = mat_foliage

    f2 = bm.faces.new((v1_l, v1_r, v2_t))
    f2.material_index = mat_foliage

    # Par de hojitas estrechas opuestas en el tercio medio
    leaf_base = p0.lerp(p1, 0.65)
    for side in (-1.0, 1.0):
        leaf_dir = (perp * side * 0.75 + out_3d * 0.45 + up * 0.65).normalized()
        leaf_len = height * rng.uniform(0.24, 0.36)
        lv0 = bm.verts.new(leaf_base - out_3d * (width * 0.5))
        lv1 = bm.verts.new(leaf_base + out_3d * (width * 0.5))
        lv2 = bm.verts.new(leaf_base + leaf_dir * leaf_len)
        lf = bm.faces.new((lv0, lv1, lv2))
        lf.material_index = mat_foliage

    # Espiga floral violácea en la punta (~45% de los tallos superiores)
    if has_flower:
        f_start = p1.lerp(p2, 0.45)
        f_tip = p2 + (p2 - p1).normalized() * rng.uniform(0.055, 0.095)
        fw = width * 1.25
        fv0 = bm.verts.new(f_start - perp * fw)
        fv1 = bm.verts.new(f_start + perp * fw)
        fv2 = bm.verts.new(f_tip)
        ff = bm.faces.new((fv0, fv1, fv2))
        ff.material_index = 3  # mat_flor_violeta

# 5. Generar volumen interno de sombra/ramas leñosas bajas para dar densidad real
for c in clumps:
    center = c["pos"]
    rx, ry, h = c["rx"] * 0.62, c["ry"] * 0.62, c["h"] * 0.42
    res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    for v in res["verts"]:
        noise = rng.uniform(0.82, 1.15)
        v.co.x = center.x + v.co.x * rx * noise
        v.co.y = center.y + v.co.y * ry * noise
        v.co.z = max(0.0, v.co.z * h * noise + h * 0.45)
    for f in bm.faces:
        if all(v in res["verts"] for v in f.verts):
            f.material_index = 0  # mat_tallo_oscuro

# 6. Poblar cada mata con cientos de tallos radiales y espigas
for c in clumps:
    center = c["pos"]
    for _ in range(c["stems"]):
        ang = rng.uniform(0, math.tau)
        # Distribución radial más densa en el cuerpo de la mata
        r_norm = math.sqrt(rng.uniform(0.0, 1.0))
        ox = center.x + math.cos(ang) * c["rx"] * 0.72 * r_norm
        oy = center.y + math.sin(ang) * c["ry"] * 0.72 * r_norm

        # Dirección hacia afuera desde el centro de la mata
        radial = Vector((ox - center.x, oy - center.y))
        if radial.length < 1e-4:
            radial = Vector((math.cos(ang), math.sin(ang)))
        else:
            radial.normalize()

        # Los tallos del borde se abren más hacia los adoquines; los del centro suben más rectos
        stem_h = c["h"] * (1.0 - 0.32 * (r_norm ** 1.6)) * rng.uniform(0.84, 1.14)
        lean = (0.06 + 0.24 * r_norm) * rng.uniform(0.8, 1.25)
        width = rng.uniform(0.011, 0.017)
        mat_idx = 1 if rng.random() < 0.52 else 2
        has_flower = (r_norm < 0.78) and (rng.random() < 0.48)

        add_ribbon_stem(
            bm=bm,
            base_pt=Vector((ox, oy, 0.015)),
            dir_xy=radial,
            height=stem_h,
            lean_out=lean,
            width=width,
            mat_foliage=mat_idx,
            has_flower=has_flower,
        )

# 7. Mata de hierba verde rastrera en el extremo frontal derecho (como en la foto)
tuft_center = Vector((2.28, -0.14))
for _ in range(95):
    ang = rng.uniform(0, math.tau)
    r_norm = math.sqrt(rng.uniform(0.0, 1.0))
    ox = tuft_center.x + math.cos(ang) * 0.34 * r_norm
    oy = tuft_center.y + math.sin(ang) * 0.28 * r_norm
    radial = Vector((math.cos(ang), math.sin(ang)))

    h = rng.uniform(0.10, 0.24) * (1.0 - 0.35 * r_norm)
    lean = rng.uniform(0.08, 0.22)
    perp = Vector((-radial.y, radial.x, 0.0))
    out_3d = Vector((radial.x, radial.y, 0.0))
    up = Vector((0.0, 0.0, 1.0))

    p0 = Vector((ox, oy, 0.01))
    p1 = p0 + out_3d * lean + up * h
    w = 0.012
    v0 = bm.verts.new(p0 - perp * w)
    v1 = bm.verts.new(p0 + perp * w)
    v2 = bm.verts.new(p1)
    f = bm.faces.new((v0, v1, v2))
    f.material_index = 4  # mat_hierba_borde

mesh = bpy.data.meshes.new("LavandaCanteroMesh")
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new("Macizo_Lavandas", mesh)
bpy.context.scene.collection.objects.link(obj)
obj.data.materials.append(mat_tallo_oscuro)
obj.data.materials.append(mat_hoja_salvia)
obj.data.materials.append(mat_hoja_plateada)
obj.data.materials.append(mat_flor_violeta)
obj.data.materials.append(mat_hierba_borde)
obj.parent = container

# 8. Exportar GLB
for o in bpy.context.scene.objects:
    o.select_set(False)
container.select_set(True)
obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Lavandas exportadas en: {OUTPUT_PATH}")
