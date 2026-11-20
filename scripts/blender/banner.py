import os
import math
import struct
import zlib
import bpy
import bmesh

# 1. Limpiar escena
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Dimensiones reales del banner colgante (en metros)
ANCHO = 0.64
ALTO_LONA = 1.92
ALTURA_BASE = 0.22      # Altura desde el piso hasta el borde inferior del banner
CURVATURA_Z = 0.028     # Ligera curvatura hacia adelante sobre la columna

script_dir = os.path.dirname(os.path.abspath(__file__))
tex_path = os.path.join(script_dir, "banner_fcyt_tex.png")
output_path = os.path.normpath(os.path.join(script_dir, "..", "frontend", "editor-models", "banner_fcyt.glb"))
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# 3. Generar textura PNG 1024x3072 con todos los logos y textos de la foto
def generate_banner_png(filepath):
    W, H = 1024, 3072
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        # Fallback: instalar/usar canvas básico si Pillow no está en el Python embebido de Blender
        import subprocess, sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "pillow"])
        from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (W, H), (246, 248, 250, 255))
    draw = ImageDraw.Draw(img)

    # Sutil degradado de iluminación de lona vinílica
    for y in range(H):
        shade = int(247 - 10 * (y / H))
        draw.line([(0, y), (W, y)], fill=(shade, shade + 2, shade + 4, 255))

    def load_font(size, bold=False, serif=False):
        candidates = []
        if serif:
            candidates = [
                "/usr/share/fonts/TTF/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/TTF/DejaVuSerif.ttf",
                "/usr/share/fonts/liberation/LiberationSerif-Bold.ttf" if bold else "/usr/share/fonts/liberation/LiberationSerif-Regular.ttf",
            ]
        else:
            candidates = [
                "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/TTF/DejaVuSans.ttf",
                "/usr/share/fonts/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/noto/NotoSans-Regular.ttf",
            ]
        for path in candidates:
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        return ImageFont.load_default()

    BLUE_UC = (58, 124, 165, 255)
    NAVY = (42, 48, 118, 255)
    RED_DOT = (205, 45, 45, 255)
    GRAY_TXT = (72, 78, 92, 255)

    f_uc_top = load_font(66, bold=False, serif=True)
    f_uc_cat = load_font(108, bold=True, serif=True)
    f_uc_sub = load_font(34, bold=False, serif=True)
    f_fac_cap = load_font(22, bold=True, serif=False)
    f_fac_main = load_font(34, bold=True, serif=False)
    f_dept_sub = load_font(27, bold=True, serif=False)
    f_bienv = load_font(86, bold=False, serif=False)
    f_uc_bot = load_font(76, bold=True, serif=True)

    def draw_star(cx, cy, r_outer, color):
        pts = []
        for i in range(10):
            ang = -math.pi / 2 + i * math.pi / 5
            r = r_outer if i % 2 == 0 else r_outer * 0.38
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
        draw.polygon(pts, fill=color)

    # --- ENCABEZADO: Universidad Católica Nuestra Señora de la Asunción ---
    draw_star(W // 2, 115, 26, BLUE_UC)
    draw.text((220, 155), "Universidad", fill=BLUE_UC, font=f_uc_top)
    draw.line([(615, 195), (785, 195)], fill=BLUE_UC, width=4)
    draw.line([(225, 275), (345, 275)], fill=BLUE_UC, width=4)
    draw.text((358, 218), "Católica", fill=BLUE_UC, font=f_uc_cat)
    draw.text((255, 338), "Nuestra Señora de la Asunción", fill=BLUE_UC, font=f_uc_sub)

    # Helper para trazar letras geométricas estilo logotipo FCyT
    def stroke_arc(bbox, start_deg, end_deg, width=16, color=NAVY):
        draw.arc(bbox, start=start_deg, end=end_deg, fill=color, width=width)

    def stroke_line(p1, p2, width=16, color=NAVY):
        draw.line([p1, p2], fill=color, width=width)

    def red_dot(cx, cy, r=10):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RED_DOT)

    # --- BLOQUE 1: CT - Facultad de Ciencias y Tecnología ---
    y0 = 445
    # C grande geométrica
    stroke_arc([215, y0, 385, y0 + 170], 65, 295, width=18)
    red_dot(300, y0 + 85, r=11)
    # T grande
    stroke_line((335, y0 + 68), (505, y0 + 68), width=18)
    stroke_line((420, y0 + 68), (420, y0 + 235), width=18)
    # Texto lateral
    tx = 525
    draw.text((tx, y0 + 98), "F A C U L T A D", fill=GRAY_TXT, font=f_fac_cap)
    draw.text((tx, y0 + 128), "de Ciencias", fill=GRAY_TXT, font=f_fac_main)
    draw.text((tx, y0 + 166), "y Tecnología", fill=GRAY_TXT, font=f_fac_main)

    # --- BLOQUE 2: DAS - de Análisis de Sistemas ---
    y1 = 795
    # D abierta
    stroke_line((315, y1 + 10), (315, y1 + 55), width=13)
    stroke_arc([275, y1 + 10, 395, y1 + 125], 270, 90, width=13)
    stroke_line((315, y1 + 125), (355, y1 + 125), width=13)
    # A triangular estilizada con punto rojo
    stroke_line((415, y1 + 125), (468, y1 + 12), width=13)
    stroke_line((468, y1 + 12), (521, y1 + 125), width=13)
    red_dot(468, y1 + 88, r=8)
    # S curva
    stroke_arc([542, y1 + 10, 635, y1 + 72], 110, 320, width=13)
    stroke_arc([542, y1 + 62, 635, y1 + 125], 290, 145, width=13)
    draw.text((435, y1 + 142), "de Análisis de Sistemas", fill=GRAY_TXT, font=f_dept_sub)

    # --- BLOQUE 3: DA - de Arquitectura ---
    y2 = 1085
    stroke_line((300, y2 + 10), (300, y2 + 55), width=13)
    stroke_arc([260, y2 + 10, 380, y2 + 125], 270, 90, width=13)
    stroke_line((300, y2 + 125), (340, y2 + 125), width=13)
    stroke_line((402, y2 + 125), (455, y2 + 12), width=13)
    stroke_line((455, y2 + 12), (508, y2 + 125), width=13)
    red_dot(455, y2 + 88, r=8)
    draw.text((470, y2 + 138), "de Arquitectura", fill=GRAY_TXT, font=f_dept_sub)

    # --- BLOQUE 4: DEI - de Electrónica e Informática ---
    y3 = 1370
    # D
    stroke_line((290, y3 + 10), (290, y3 + 52), width=13)
    stroke_arc([252, y3 + 10, 368, y3 + 122], 270, 90, width=13)
    stroke_line((290, y3 + 122), (330, y3 + 122), width=13)
    # E
    stroke_arc([388, y3 + 10, 488, y3 + 122], 60, 300, width=13)
    stroke_line((392, y3 + 66), (478, y3 + 66), width=13)
    # i con punto rojo
    stroke_line((512, y3 + 45), (512, y3 + 122), width=13)
    red_dot(512, y3 + 22, r=8)
    draw.text((545, y3 + 42), "de Electrónica", fill=GRAY_TXT, font=f_dept_sub)
    draw.text((545, y3 + 76), "e Informática", fill=GRAY_TXT, font=f_dept_sub)

    # --- BLOQUE 5: DG - de Diseño Gráfico e Industrial ---
    y4 = 1655
    stroke_line((305, y4 + 10), (305, y4 + 52), width=13)
    stroke_arc([267, y4 + 10, 383, y4 + 122], 270, 90, width=13)
    stroke_line((305, y4 + 122), (345, y4 + 122), width=13)
    # G con punto rojo
    stroke_arc([405, y4 + 10, 515, y4 + 122], 45, 315, width=13)
    stroke_line((465, y4 + 70), (515, y4 + 70), width=13)
    stroke_line((515, y4 + 70), (515, y4 + 122), width=13)
    red_dot(460, y4 + 66, r=8)
    draw.text((545, y4 + 34), "de Diseño", fill=GRAY_TXT, font=f_dept_sub)
    draw.text((545, y4 + 66), "Gráfico", fill=GRAY_TXT, font=f_dept_sub)
    draw.text((545, y4 + 98), "e Industrial", fill=GRAY_TXT, font=f_dept_sub)

    # --- BLOQUE 6: DICIA - de Ingeniería Civil, Industrial y Ambiental ---
    y5 = 1945
    # D
    stroke_line((275, y5 + 10), (275, y5 + 50), width=13)
    stroke_arc([238, y5 + 10, 350, y5 + 118], 270, 90, width=13)
    stroke_line((275, y5 + 118), (312, y5 + 118), width=13)
    # I
    stroke_line((375, y5 + 12), (375, y5 + 118), width=13)
    # C con punto rojo
    stroke_arc([405, y5 + 12, 505, y5 + 118], 55, 305, width=13)
    red_dot(455, y5 + 65, r=8)
    # I
    stroke_line((530, y5 + 12), (530, y5 + 118), width=13)
    # A
    stroke_line((558, y5 + 118), (608, y5 + 14), width=13)
    stroke_line((608, y5 + 14), (658, y5 + 118), width=13)
    draw.text((345, y5 + 138), "de Ingeniería Civil, Industrial", fill=GRAY_TXT, font=f_dept_sub)
    draw.text((435, y5 + 172), "y Ambiental", fill=GRAY_TXT, font=f_dept_sub)

    # --- BLOQUE 7: DPI - Dirección de Posgrado e Investigación ---
    y6 = 2265
    # D
    stroke_line((290, y6 + 10), (290, y6 + 50), width=13)
    stroke_arc([252, y6 + 10, 365, y6 + 118], 270, 90, width=13)
    stroke_line((290, y6 + 118), (328, y6 + 118), width=13)
    # P
    stroke_line((392, y6 + 12), (392, y6 + 118), width=13)
    stroke_arc([365, y6 + 12, 465, y6 + 74], 270, 90, width=13)
    # i con punto rojo
    stroke_line((495, y6 + 42), (495, y6 + 118), width=13)
    red_dot(495, y6 + 20, r=8)
    draw.text((530, y6 + 28), "Dirección", fill=GRAY_TXT, font=f_dept_sub)
    draw.text((530, y6 + 60), "de Posgrado", fill=GRAY_TXT, font=f_dept_sub)
    draw.text((530, y6 + 92), "e Investigación", fill=GRAY_TXT, font=f_dept_sub)

    # --- PIE: BIENVENIDOS (en diagonal ascendente) + estrella UC ---
    txt_img = Image.new("RGBA", (780, 140), (0, 0, 0, 0))
    txt_draw = ImageDraw.Draw(txt_img)
    txt_draw.text((15, 20), "BIENVENIDOS", fill=NAVY, font=f_bienv)
    rotated_txt = txt_img.rotate(13, resample=Image.Resampling.BICUBIC, expand=True)
    img.alpha_composite(rotated_txt, (130, 2480))

    draw_star(725, 2755, 22, BLUE_UC)
    draw.text((665, 2785), "UC", fill=BLUE_UC, font=f_uc_bot)

    img.save(filepath, "PNG")

generate_banner_png(tex_path)

# 4. Materiales PBR
mat_lona = bpy.data.materials.new(name="LonaBannerFCyT")
if not mat_lona.use_nodes:
    mat_lona.use_nodes = True
bsdf = mat_lona.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 0.28   # Brillo satinado de lona vinílica
bsdf.inputs["Metallic"].default_value = 0.0

tex_node = mat_lona.node_tree.nodes.new("ShaderNodeTexImage")
tex_node.image = bpy.data.images.load(tex_path)
mat_lona.node_tree.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])

mat_reverso = bpy.data.materials.new(name="LonaReverso")
if not mat_reverso.use_nodes:
    mat_reverso.use_nodes = True
bsdf_rev = mat_reverso.node_tree.nodes.get("Principled BSDF")
bsdf_rev.inputs["Base Color"].default_value = (0.86, 0.87, 0.89, 1.0)
bsdf_rev.inputs["Roughness"].default_value = 0.45

mat_varilla = bpy.data.materials.new(name="VarillaNegra")
if not mat_varilla.use_nodes:
    mat_varilla.use_nodes = True
bsdf_var = mat_varilla.node_tree.nodes.get("Principled BSDF")
bsdf_var.inputs["Base Color"].default_value = (0.08, 0.08, 0.09, 1.0)
bsdf_var.inputs["Roughness"].default_value = 0.4
bsdf_var.inputs["Metallic"].default_value = 0.7

# 5. Contenedor con origen en el suelo (0, 0, 0)
container = bpy.data.objects.new("Banner_FCyT", None)
bpy.context.scene.collection.objects.link(container)

# 6. Construir malla curvada de la lona (frente texturizado + reverso gris claro)
bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new("UVMap")

cols = 20
rows = 32
front_verts = []
back_verts = []
THICK = 0.003

for r in range(rows + 1):
    v = r / rows
    z = ALTURA_BASE + v * ALTO_LONA
    # Ondulación vertical suave en los extremos como en la foto
    sag = math.sin(v * math.pi) * 0.012
    row_f = []
    row_b = []
    for c in range(cols + 1):
        u = c / cols
        x = (u - 0.5) * ANCHO
        # Curvatura horizontal para abrazar visualmente la columna
        arch = math.cos((u - 0.5) * math.pi) * CURVATURA_Z + sag
        vf = bm.verts.new((x, -arch, z))
        vb = bm.verts.new((x, -arch + THICK, z))
        row_f.append((vf, u, v))
        row_b.append((vb, u, v))
    front_verts.append(row_f)
    back_verts.append(row_b)

for r in range(rows):
    for c in range(cols):
        # Cara frontal (-Y mirando hacia el espectador)
        v00, u00, w00 = front_verts[r][c]
        v10, u10, w10 = front_verts[r][c + 1]
        v11, u11, w11 = front_verts[r + 1][c + 1]
        v01, u01, w01 = front_verts[r + 1][c]
        f_face = bm.faces.new((v00, v10, v11, v01))
        f_face.material_index = 0
        f_face.smooth = True
        uvs = [(u00, w00), (u10, w10), (u11, w11), (u01, w01)]
        for loop, uv in zip(f_face.loops, uvs):
            loop[uv_layer].uv = uv

        # Cara trasera (+Y)
        b00, _, _ = back_verts[r][c]
        b10, _, _ = back_verts[r][c + 1]
        b11, _, _ = back_verts[r + 1][c + 1]
        b01, _, _ = back_verts[r + 1][c]
        b_face = bm.faces.new((b01, b11, b10, b00))
        b_face.material_index = 1
        b_face.smooth = True

lona_mesh = bpy.data.meshes.new("LonaBannerMesh")
bm.to_mesh(lona_mesh)
bm.free()

lona_obj = bpy.data.objects.new("Lona_Banner", lona_mesh)
bpy.context.scene.collection.objects.link(lona_obj)
lona_obj.data.materials.append(mat_lona)
lona_obj.data.materials.append(mat_reverso)
lona_obj.parent = container

# 7. Varillas superior e inferior y cordón superior de colgado
for name, z_pos in [("Varilla_Inferior", ALTURA_BASE), ("Varilla_Superior", ALTURA_BASE + ALTO_LONA)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.011, depth=ANCHO + 0.04, location=(0.0, 0.002, z_pos))
    varilla = bpy.context.active_object
    varilla.name = name
    varilla.rotation_euler[1] = math.pi / 2
    varilla.data.materials.append(mat_varilla)
    bpy.ops.object.shade_smooth()
    varilla.parent = container

# Cordón superior en V para colgarlo del gancho
z_top = ALTURA_BASE + ALTO_LONA
for side in (-1, 1):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0025, depth=0.34, location=(side * 0.14, 0.012, z_top + 0.08))
    cordon = bpy.context.active_object
    cordon.name = f"Cordon_{side}"
    cordon.rotation_euler[1] = side * math.radians(64)
    cordon.data.materials.append(mat_varilla)
    cordon.parent = container

# 8. Exportar GLB autocontenido (con la textura PNG empaquetada adentro)
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

print(f"¡Listo! Banner exportado en: {output_path}")
