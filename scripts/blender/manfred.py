import os
import math
import random
import numpy as np
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler	

# 1. Limpiar escena por completo
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Ruta de salida en tu proyecto
OUTPUT_PATH = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/sala_manfred_stark.glb"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


# ==============================================================================
# 3. GENERADOR DE TEXTURAS PROCEDURALES EMPAQUETADAS (100% AUTOCONTENIDO)
# ==============================================================================
def build_textures():
    rng = np.random.default_rng(2026)

    # --- A) Baldosa porcelanato beige/crema (512x512) ---
    sz = 512
    yg, xg = np.mgrid[0:sz, 0:sz].astype(np.float32)
    u = xg / (sz - 1)
    v = yg / (sz - 1)

    grain = rng.normal(0.0, 0.012, (sz, sz))
    mottle = 0.018 * np.sin(u * math.pi * 6.0) * np.cos(v * math.pi * 6.0)
    grout = (u < 0.014) | (u > 0.986) | (v < 0.014) | (v > 0.986)

    tile_rgba = np.ones((sz, sz, 4), dtype=np.float32)
    tile_rgba[:, :, 0] = np.where(grout, 0.56, np.clip(0.84 + grain + mottle, 0.0, 1.0))
    tile_rgba[:, :, 1] = np.where(grout, 0.53, np.clip(0.80 + grain + mottle, 0.0, 1.0))
    tile_rgba[:, :, 2] = np.where(grout, 0.48, np.clip(0.71 + grain + mottle, 0.0, 1.0))

    img_tile = bpy.data.images.new("Tex_Porcelanato_Beige", width=sz, height=sz, alpha=False)
    img_tile.pixels.foreach_set(tile_rgba.ravel())
    img_tile.pack()

    # --- B) Vidrio esmerilado con cartel "SALA MANFRED STARK" ---
    frosted = np.ones((sz, sz, 4), dtype=np.float32)
    f_noise = rng.normal(0.0, 0.015, (sz, sz))
    frosted[:, :, 0] = np.clip(0.76 + f_noise, 0.0, 1.0)
    frosted[:, :, 1] = np.clip(0.79 + f_noise, 0.0, 1.0)
    frosted[:, :, 2] = np.clip(0.81 + f_noise, 0.0, 1.0)
    frosted[:, :, 3] = 0.92

    # Tipografía matricial limpia para "SALA" y "MANFRED STARK"
    FONT_5X7 = {
        "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
        "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
        "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
        "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
        "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
        "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
        "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
        "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
        " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    }

    def draw_text(buf, text, cx, cy, scale_x, scale_y, col_rgb):
        total_w = len(text) * 6 * scale_x
        x0 = int(cx - total_w * 0.5)
        y0 = int(cy - 3.5 * scale_y)
        for idx, ch in enumerate(text):
            glyph = FONT_5X7.get(ch, FONT_5X7[" "])
            for r_i, row_str in enumerate(glyph):
                for c_i, bit in enumerate(row_str):
                    if bit == "1":
                        px0 = x0 + (idx * 6 + c_i) * scale_x
                        px1 = px0 + scale_x
                        # Y invertido en imágenes de Blender (0 abajo -> sz arriba)
                        py1 = y0 + (7 - r_i) * scale_y
                        py0 = py1 - scale_y
                        px0c, px1c = max(0, px0), min(sz, px1)
                        py0c, py1c = max(0, py0), min(sz, py1)
                        for ch_i in range(3):
                            buf[py0c:py1c, px0c:px1c, ch_i] = col_rgb[ch_i]

    draw_text(frosted, "SALA", 256, 295, 5, 6, (0.14, 0.16, 0.18))
    draw_text(frosted, '"MANFRED STARK"', 256, 235, 4, 5, (0.14, 0.16, 0.18))

    img_cartel = bpy.data.images.new("Tex_Vidrio_Cartel_Sala", width=sz, height=sz, alpha=True)
    img_cartel.pixels.foreach_set(frosted.ravel())
    img_cartel.pack()

    # --- C) Escudo circular UC (para puerta de vidrio y panel del estrado) ---
    def make_uc_crest(bg_rgb, fg_rgb, alpha_bg=1.0, alpha_fg=1.0):
        buf = np.zeros((sz, sz, 4), dtype=np.float32)
        for c in range(3):
            buf[:, :, c] = bg_rgb[c]
        buf[:, :, 3] = alpha_bg

        r_dist = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2)
        ang = np.arctan2(v - 0.5, u - 0.5)

        ring_outer = (r_dist >= 0.31) & (r_dist <= 0.34)
        ring_inner = (r_dist >= 0.22) & (r_dist <= 0.245)
        # Letras simuladas en la corona circular
        crown_ticks = (r_dist > 0.255) & (r_dist < 0.30) & (np.sin(ang * 28.0) > 0.25)
        # Estrella superior + libro abierto en el centro
        star = ((u - 0.5) ** 2 + (v - 0.65) ** 2) < 0.028 ** 2
        book = (np.abs(u - 0.5) < 0.11) & (np.abs(v - 0.44) < 0.065) & (np.abs(u - 0.5) > 0.008)
        waves = (r_dist < 0.20) & (v < 0.36) & (np.sin(v * 95.0 + np.sin(u * 25.0) * 1.5) > 0.3)

        crest_mask = ring_outer | ring_inner | crown_ticks | star | book | waves
        for c in range(3):
            buf[:, :, c] = np.where(crest_mask, fg_rgb[c], buf[:, :, c])
        buf[:, :, 3] = np.where(crest_mask, alpha_fg, buf[:, :, 3])
        return buf

    # Vidrio puerta con escudo grabado
    crest_door = make_uc_crest(
        bg_rgb=(0.58, 0.65, 0.69),
        fg_rgb=(0.86, 0.90, 0.92),
        alpha_bg=0.34,
        alpha_fg=0.72,
    )
    img_door_crest = bpy.data.images.new("Tex_Puerta_Escudo_UC", width=sz, height=sz, alpha=True)
    img_door_crest.pixels.foreach_set(crest_door.ravel())
    img_door_crest.pack()

    # Panel negro del estrado con escudo institucional azul/blanco
    crest_stage = make_uc_crest(
        bg_rgb=(0.08, 0.09, 0.11),
        fg_rgb=(0.24, 0.42, 0.72),
        alpha_bg=1.0,
        alpha_fg=1.0,
    )
    img_stage_crest = bpy.data.images.new("Tex_Panel_Escudo_UC", width=sz, height=sz, alpha=False)
    img_stage_crest.pixels.foreach_set(crest_stage.ravel())
    img_stage_crest.pack()

    # --- D) Mapa en relieve de Paraguay (pared derecha) ---
    map_buf = np.zeros((sz, sz, 4), dtype=np.float32)
    # Silueta estilizada del mapa del Paraguay
    poly_py = [
        (0.28, 0.86), (0.50, 0.88), (0.62, 0.70), (0.66, 0.52),
        (0.76, 0.38), (0.72, 0.16), (0.48, 0.14), (0.42, 0.32),
        (0.38, 0.50), (0.22, 0.66),
    ]
    inside = np.zeros((sz, sz), dtype=bool)
    j = len(poly_py) - 1
    for i in range(len(poly_py)):
        xi, yi = poly_py[i]
        xj, yj = poly_py[j]
        cond = ((yi > v) != (yj > v)) & (u < (xj - xi) * (v - yi) / (yj - yi + 1e-6) + xi)
        inside ^= cond
        j = i

    relief_shade = 0.16 + 0.07 * np.sin(u * 35.0) * np.cos(v * 35.0) + rng.normal(0.0, 0.015, (sz, sz))
    map_buf[:, :, 0] = np.where(inside, relief_shade + 0.04, 0.0)
    map_buf[:, :, 1] = np.where(inside, relief_shade + 0.03, 0.0)
    map_buf[:, :, 2] = np.where(inside, relief_shade, 0.0)
    map_buf[:, :, 3] = np.where(inside, 1.0, 0.0)

    img_map = bpy.data.images.new("Tex_Mapa_Paraguay", width=sz, height=sz, alpha=True)
    img_map.pixels.foreach_set(map_buf.ravel())
    img_map.pack()

    return img_tile, img_cartel, img_door_crest, img_stage_crest, img_map


img_tile, img_cartel, img_door_crest, img_stage_crest, img_map = build_textures()


# ==============================================================================
# 4. MATERIALES PBR
# ==============================================================================
def make_mat(name, hex_col="ffffff", roughness=0.5, metallic=0.0, alpha=1.0,
             image=None, alpha_mode="OPAQUE", emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    if alpha_mode == "BLEND" and hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"
    elif alpha_mode == "CLIP" and hasattr(mat, "blend_method"):
        mat.blend_method = "CLIP"
        mat.alpha_threshold = 0.45

    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    r = int(hex_col[0:2], 16) / 255.0
    g = int(hex_col[2:4], 16) / 255.0
    b = int(hex_col[4:6], 16) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha

    if emission_strength > 0.0 and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (r, g, b, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength

    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if alpha_mode in ("BLEND", "CLIP"):
            nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])

    return mat


mat_piso = make_mat("Mat_PisoPorcelanato", roughness=0.36, image=img_tile)
mat_pared = make_mat("Mat_ParedBlancoHueso", "e4e3de", roughness=0.82)
mat_techo_azul = make_mat("Mat_TechoAzulGris", "52657a", roughness=0.68)
mat_reticulado = make_mat("Mat_ReticuladoMetal", "4a5d73", roughness=0.45, metallic=0.65)
mat_columna = make_mat("Mat_ColumnaGris", "7c8691", roughness=0.62)
mat_carpinteria = make_mat("Mat_CarpinteriaAzul", "385063", roughness=0.42, metallic=0.55)
mat_vidrio_claro = make_mat("Mat_VidrioClaro", "9db2bf", roughness=0.08, alpha=0.28, alpha_mode="BLEND")
mat_vidrio_esmerilado = make_mat("Mat_VidrioEsmerilado", "c5cdd1", roughness=0.42, alpha=0.90, alpha_mode="BLEND")
mat_vidrio_cartel = make_mat("Mat_VidrioCartel", roughness=0.40, image=img_cartel, alpha_mode="BLEND")
mat_vidrio_escudo = make_mat("Mat_VidrioEscudo", roughness=0.18, image=img_door_crest, alpha_mode="BLEND")
mat_madera_clara = make_mat("Mat_MaderaClara", "cfa26e", roughness=0.48)
mat_madera_oscura = make_mat("Mat_MaderaOscura", "3b2b20", roughness=0.52)
mat_panel_negro = make_mat("Mat_PanelEscudoUC", roughness=0.45, image=img_stage_crest)
mat_pantalla = make_mat("Mat_PantallaProyeccion", "f2f3f5", roughness=0.55)
mat_pizarra = make_mat("Mat_PizarraBlanca", "eef1f4", roughness=0.22)
mat_metal_negro = make_mat("Mat_MetalNegro", "181a1d", roughness=0.42, metallic=0.72)
mat_cuero_negro = make_mat("Mat_TapizadoNegro", "1c1e22", roughness=0.54)
mat_tela_biombo = make_mat("Mat_BiomboNegro", "16181b", roughness=0.85)
mat_aluminio = make_mat("Mat_AluminioClaro", "c4c9ce", roughness=0.32, metallic=0.85)
mat_bronce = make_mat("Mat_ManijaBronce", "b89748", roughness=0.26, metallic=0.90)
mat_aire_ac = make_mat("Mat_AireAcondicionado", "e5e2d9", roughness=0.38)
mat_tubo_led = make_mat("Mat_TuboLED", "f4f8ff", roughness=0.15, emission_strength=4.5)
mat_rojo_alarma = make_mat("Mat_AlarmaIncendio", "b82520", roughness=0.35)
mat_mapa_py = make_mat("Mat_MapaParaguay", roughness=0.65, image=img_map, alpha_mode="CLIP")

# Contenedor raíz con pivote en el suelo (0, 0, 0)
root = bpy.data.objects.new("Sala_Manfred_Stark", None)
bpy.context.scene.collection.objects.link(root)


def create_mesh_obj(name, bm, materials, parent=root):
    mesh = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for m in materials:
        obj.data.materials.append(m)
    obj.parent = parent
    return obj


def add_box(bm, center, size, rot_euler=(0.0, 0.0, 0.0), mat_idx=0, uv_layer=None, uv_scale=1.0):
    res = bmesh.ops.create_cube(bm, size=1.0)
    rot_m = Euler(rot_euler, "XYZ").to_matrix().to_4x4()
    scale_m = Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    trans_m = Matrix.Translation(center)
    bmesh.ops.transform(bm, matrix=trans_m @ rot_m @ scale_m, verts=res["verts"])
    v_set = set(res["verts"])
    for f in bm.faces:
        if all(v in v_set for v in f.verts):
            f.material_index = mat_idx
            if uv_layer is not None:
                n = f.normal
                for loop in f.loops:
                    co = loop.vert.co
                    if abs(n.z) > 0.7:
                        loop[uv_layer].uv = (co.x * uv_scale, co.y * uv_scale)
                    elif abs(n.y) > 0.7:
                        loop[uv_layer].uv = (co.x * uv_scale, co.z * uv_scale)
                    else:
                        loop[uv_layer].uv = (co.y * uv_scale, co.z * uv_scale)


def add_quad_uv(bm, uv_layer, p0, p1, p2, p3, mat_idx=0):
    v0 = bm.verts.new(p0)
    v1 = bm.verts.new(p1)
    v2 = bm.verts.new(p2)
    v3 = bm.verts.new(p3)
    f = bm.faces.new((v0, v1, v2, v3))
    f.material_index = mat_idx
    uvs = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]
    for loop, uv_co in zip(f.loops, uvs):
        loop[uv_layer].uv = uv_co


def add_cyl(bm, p0, p1, r0, r1=None, segs=20, mat_idx=0):
    if r1 is None:
        r1 = r0
    vec = p1 - p0
    length = vec.length
    if length < 1e-6:
        return
    res = bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r0, radius2=r1, depth=length
    )
    mid = (p0 + p1) * 0.5
    quat = Vector((0.0, 0.0, 1.0)).rotation_difference(vec.normalized())
    xform = Matrix.Translation(mid) @ quat.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=xform, verts=res["verts"])
    v_set = set(res["verts"])
    for f in bm.faces:
        if all(v in v_set for v in f.verts):
            f.material_index = mat_idx
            f.smooth = True


# ==============================================================================
# 5. ARQUITECTURA: PISO CON DESNIVEL CURVO, PAREDES, COLUMNAS Y CIELORRASO
# ==============================================================================
bm_arch = bmesh.new()
uv_arch = bm_arch.loops.layers.uv.new("UVMap")

ROOM_X0, ROOM_X1 = -4.80, 4.80
ROOM_Y0, ROOM_Y1 = -3.60, 3.80
ROOM_H = 3.35
STEP_H = 0.14  # Altura del pasillo superior de entrada antes del escalón curvo


def step_curve_y(x):
    """Curva en S del escalón que separa la platea (Y < curve) del pasillo de entrada (Y > curve)."""
    t = (x - ROOM_X0) / (ROOM_X1 - ROOM_X0)  # 0 (izq) -> 1 (der)
    return 1.75 + 0.42 * math.cos(t * math.pi * 1.15) - 0.18 * math.sin(t * math.pi * 2.0)


# a) Piso inferior de platea (z = 0.0) y pasillo superior curvo (z = 0.14)
NX_FLOOR = 64
TILE_UV = 1.0 / 0.60  # Baldosas de 60x60 cm

for ix in range(NX_FLOOR):
    t0 = ix / NX_FLOOR
    t1 = (ix + 1) / NX_FLOOR
    x0 = ROOM_X0 + t0 * (ROOM_X1 - ROOM_X0)
    x1 = ROOM_X0 + t1 * (ROOM_X1 - ROOM_X0)
    yc0 = step_curve_y(x0)
    yc1 = step_curve_y(x1)

    # Franja de platea inferior (z = 0)
    verts_low = [
        bm_arch.verts.new((x0, ROOM_Y0, 0.0)),
        bm_arch.verts.new((x1, ROOM_Y0, 0.0)),
        bm_arch.verts.new((x1, yc1, 0.0)),
        bm_arch.verts.new((x0, yc0, 0.0)),
    ]
    f_low = bm_arch.faces.new(verts_low)
    f_low.material_index = 0  # mat_piso
    for loop in f_low.loops:
        loop[uv_arch].uv = (loop.vert.co.x * TILE_UV, loop.vert.co.y * TILE_UV)

    # Contrahuella curva de madera oscura / borde antideslizante
    verts_riser = [
        bm_arch.verts.new((x0, yc0, 0.0)),
        bm_arch.verts.new((x1, yc1, 0.0)),
        bm_arch.verts.new((x1, yc1, STEP_H)),
        bm_arch.verts.new((x0, yc0, STEP_H)),
    ]
    f_riser = bm_arch.faces.new(verts_riser)
    f_riser.material_index = 3  # mat_madera_oscura

    # Nariz/cantonera curva de madera oscura sobre el borde del escalón
    verts_nose = [
        bm_arch.verts.new((x0, yc0, STEP_H + 0.002)),
        bm_arch.verts.new((x1, yc1, STEP_H + 0.002)),
        bm_arch.verts.new((x1, yc1 + 0.09, STEP_H + 0.002)),
        bm_arch.verts.new((x0, yc0 + 0.09, STEP_H + 0.002)),
    ]
    f_nose = bm_arch.faces.new(verts_nose)
    f_nose.material_index = 3

    # Pasillo superior de entrada (z = STEP_H)
    verts_high = [
        bm_arch.verts.new((x0, yc0 + 0.09, STEP_H)),
        bm_arch.verts.new((x1, yc1 + 0.09, STEP_H)),
        bm_arch.verts.new((x1, ROOM_Y1, STEP_H)),
        bm_arch.verts.new((x0, ROOM_Y1, STEP_H)),
    ]
    f_high = bm_arch.faces.new(verts_high)
    f_high.material_index = 0
    for loop in f_high.loops:
        loop[uv_arch].uv = (loop.vert.co.x * TILE_UV, loop.vert.co.y * TILE_UV)

# b) Paredes perimetrales (fondo Y=-3.60, izquierda X=-4.80, derecha parcial Y<1.10)
WALL_T = 0.22
# Pared fondo (estrado)
add_box(bm_arch, (0.0, ROOM_Y0 - WALL_T * 0.5, ROOM_H * 0.5), (9.84, WALL_T, ROOM_H), mat_idx=1)
# Pared izquierda
add_box(bm_arch, (ROOM_X0 - WALL_T * 0.5, 0.10, ROOM_H * 0.5), (WALL_T, 7.62, ROOM_H), mat_idx=1)
# Pared derecha (tramo opaco delantero junto al estrado, hasta el ventanal de entrada)
add_box(bm_arch, (ROOM_X1 + WALL_T * 0.5, -1.25, ROOM_H * 0.5), (WALL_T, 4.92, ROOM_H), mat_idx=1)
# Mocheta blanca donde termina el cerramiento acristalado (Foto 2)
add_box(bm_arch, (3.25, 1.25, ROOM_H * 0.5), (0.38, 0.28, ROOM_H), mat_idx=1)

# Zócalos de madera oscura en paredes
add_box(bm_arch, (0.0, ROOM_Y0 + 0.01, 0.05), (9.60, 0.02, 0.10), mat_idx=3)
add_box(bm_arch, (ROOM_X0 + 0.01, -0.80, 0.05), (0.02, 5.60, 0.10), mat_idx=3)
add_box(bm_arch, (ROOM_X1 - 0.01, -1.25, 0.05), (0.02, 4.70, 0.10), mat_idx=3)

# c) Vigas superiores azul-grisáceas y cielorraso
add_box(bm_arch, (0.0, 0.10, ROOM_H + 0.08), (9.84, 7.62, 0.16), mat_idx=2)
# Viga transversal del fondo que une las dos columnas del estrado
add_box(bm_arch, (0.0, -2.55, 3.08), (9.60, 0.34, 0.42), mat_idx=2)
# Vigas longitudinales izquierda y derecha
add_box(bm_arch, (-2.15, 0.45, 3.08), (0.32, 6.20, 0.42), mat_idx=2)
add_box(bm_arch, (2.15, 0.45, 3.08), (0.32, 6.20, 0.42), mat_idx=2)

# d) Dos columnas cilíndricas estructurales del estrado (Fotos 3 y 4)
add_cyl(bm_arch, Vector((-2.15, -2.55, 0.0)), Vector((-2.15, -2.55, 3.00)), r0=0.20, segs=24, mat_idx=4)
add_cyl(bm_arch, Vector((2.15, -2.55, 0.0)), Vector((2.15, -2.55, 3.00)), r0=0.20, segs=24, mat_idx=4)

# Columna cilíndrica de la galería exterior junto a la puerta (Foto 1)
add_cyl(bm_arch, Vector((2.85, 3.45, STEP_H)), Vector((2.85, 3.45, ROOM_H)), r0=0.21, segs=24, mat_idx=4)

create_mesh_obj(
    "Arquitectura_Sala",
    bm_arch,
    [mat_piso, mat_pared, mat_techo_azul, mat_madera_oscura, mat_columna],
)


# ==============================================================================
# 6. CIELORRASO RETICULADO METÁLICO Y TUBOS LED (FOTOS 1, 3 Y 4)
# ==============================================================================
bm_ceil = bmesh.new()

# Barras longitudinales y diagonales de la estructura espacial bajo el techo
GRID_Z_TOP = 3.24
GRID_Z_BOT = 3.00
x_lines = [-4.2, -2.8, -1.4, 0.0, 1.4, 2.8, 4.2]
y_nodes = [-2.3, -1.1, 0.1, 1.3, 2.5, 3.5]

for xl in x_lines:
    add_cyl(bm_ceil, Vector((xl, -2.4, GRID_Z_BOT)), Vector((xl, 3.6, GRID_Z_BOT)), r0=0.024, segs=10, mat_idx=0)
    for iy in range(len(y_nodes) - 1):
        y_a = y_nodes[iy]
        y_b = y_nodes[iy + 1]
        y_mid = (y_a + y_b) * 0.5
        add_cyl(bm_ceil, Vector((xl, y_a, GRID_Z_BOT)), Vector((xl, y_mid, GRID_Z_TOP)), r0=0.016, segs=8, mat_idx=0)
        add_cyl(bm_ceil, Vector((xl, y_mid, GRID_Z_TOP)), Vector((xl, y_b, GRID_Z_BOT)), r0=0.016, segs=8, mat_idx=0)

for yn in y_nodes:
    add_cyl(bm_ceil, Vector((-4.5, yn, GRID_Z_BOT)), Vector((4.5, yn, GRID_Z_BOT)), r0=0.022, segs=10, mat_idx=0)

# Tubos fluorescentes/LED lineales blancos brillantes en 3 hileras transversales
led_rows_y = [-1.45, 0.15, 1.75]
led_cols_x = [-3.3, -1.65, 0.0, 1.65, 3.3]
for ly in led_rows_y:
    for lx in led_cols_x:
        # Regleta metálica + tubo emisivo
        add_box(bm_ceil, (lx, ly, GRID_Z_BOT - 0.025), (1.28, 0.055, 0.03), mat_idx=0)
        add_cyl(bm_ceil, Vector((lx - 0.60, ly, GRID_Z_BOT - 0.045)), Vector((lx + 0.60, ly, GRID_Z_BOT - 0.045)), r0=0.016, segs=12, mat_idx=1)

# Proyector blanco colgado del techo apuntando hacia la pantalla del estrado (Foto 3)
PROJ_POS = Vector((-0.65, -0.35, 2.74))
add_cyl(bm_ceil, Vector((PROJ_POS.x, PROJ_POS.y, GRID_Z_BOT)), PROJ_POS, r0=0.018, segs=10, mat_idx=2)
add_box(bm_ceil, PROJ_POS, (0.34, 0.28, 0.11), mat_idx=2)

create_mesh_obj("Reticulado_Y_Luces_Techo", bm_ceil, [mat_reticulado, mat_tubo_led, mat_aire_ac])


# ==============================================================================
# 7. FACHADA ACRISTALADA DE ENTRADA Y PUERTA ABIERTA (FOTOS 1 Y 2)
# ==============================================================================
bm_facade = bmesh.new()
uv_fac = bm_facade.loops.layers.uv.new("UVMap")

FACADE_Y = 3.55
Z0_F = STEP_H
Z1_F = ROOM_H
H_F = Z1_F - Z0_F
PROF = 0.055


def add_window_bay(bm, uv, p_start, p_end, z_bot, z_top, middle_mat_idx=2, low_mat_idx=2):
    """Construye un módulo vertical de carpintería azul-gris con 4 paños de altura."""
    vec = p_end - p_start
    bay_w = vec.length
    ang_z = math.atan2(vec.y, vec.x)
    mid_xy = (p_start + p_end) * 0.5
    h_tot = z_top - z_bot

    # Postes verticales izquierdo y derecho del módulo
    add_box(bm, (p_start.x, p_start.y, z_bot + h_tot * 0.5), (PROF, PROF, h_tot), (0, 0, ang_z), mat_idx=0)
    add_box(bm, (p_end.x, p_end.y, z_bot + h_tot * 0.5), (PROF, PROF, h_tot), (0, 0, ang_z), mat_idx=0)

    # Travesaños horizontales (4 niveles como en la foto 1)
    levels = [0.0, 0.28, 0.62, 0.84, 1.0]
    for lv in levels:
        zh = z_bot + lv * h_tot
        add_box(bm, (mid_xy.x, mid_xy.y, zh), (bay_w, PROF, PROF * 0.85), (0, 0, ang_z), mat_idx=0)

    # Paños de vidrio entre travesaños
    # 0..0.28: inferior | 0.28..0.62: medio (cartel o esmerilado) | 0.62..0.84: medio-alto | 0.84..1.0: superior claro
    panes = [
        (0.01, 0.27, low_mat_idx),
        (0.29, 0.61, middle_mat_idx),
        (0.63, 0.83, 2),
        (0.85, 0.99, 1),  # vidrio claro arriba
    ]
    dir_x = vec.normalized()
    inset = dir_x * (PROF * 0.5)
    for t_a, t_b, m_id in panes:
        za = z_bot + t_a * h_tot
        zb = z_bot + t_b * h_tot
        q0 = Vector((p_start.x + inset.x, p_start.y + inset.y, za))
        q1 = Vector((p_end.x - inset.x, p_end.y - inset.y, za))
        q2 = Vector((p_end.x - inset.x, p_end.y - inset.y, zb))
        q3 = Vector((p_start.x + inset.x, p_start.y + inset.y, zb))
        add_quad_uv(bm, uv, q0, q1, q2, q3, mat_idx=m_id)


# Paño fijo izquierdo con inscripción "SALA MANFRED STARK"
add_window_bay(
    bm_facade, uv_fac,
    Vector((-0.45, FACADE_Y, 0.0)),
    Vector((0.85, FACADE_Y, 0.0)),
    Z0_F, Z1_F,
    middle_mat_idx=3,  # mat_vidrio_cartel ("SALA MANFRED STARK")
    low_mat_idx=2,
)

# Paño fijo estrecho a la derecha de la puerta (junto a la columna de entrada)
add_window_bay(
    bm_facade, uv_fac,
    Vector((1.95, FACADE_Y, 0.0)),
    Vector((2.58, FACADE_Y, 0.0)),
    Z0_F, Z1_F,
    middle_mat_idx=2,
    low_mat_idx=2,
)

# Tramo lateral derecho en ángulo que conecta con la mocheta (Foto 2)
add_window_bay(
    bm_facade, uv_fac,
    Vector((3.10, 3.25, 0.0)),
    Vector((3.25, 1.45, 0.0)),
    Z0_F, Z1_F,
    middle_mat_idx=2,
    low_mat_idx=2,
)

# Travesaño dintel sobre el vano de la puerta (0.85 .. 1.95)
add_box(bm_facade, (1.40, FACADE_Y, Z0_F + 0.84 * H_F), (1.10, PROF, PROF * 0.85), mat_idx=0)
add_box(bm_facade, (1.40, FACADE_Y, Z1_F - PROF * 0.4), (1.10, PROF, PROF * 0.85), mat_idx=0)
add_quad_uv(
    bm_facade, uv_fac,
    Vector((0.88, FACADE_Y, Z0_F + 0.85 * H_F)),
    Vector((1.92, FACADE_Y, Z0_F + 0.85 * H_F)),
    Vector((1.92, FACADE_Y, Z1_F - PROF)),
    Vector((0.88, FACADE_Y, Z1_F - PROF)),
    mat_idx=1,
)

# Puerta batiente ABIERTA hacia afuera (~74°) con el sello grabado de la UC (Foto 1 y 2)
HINGE_PT = Vector((1.92, FACADE_Y, Z0_F))
DOOR_W = 1.04
DOOR_H = 0.835 * H_F
OPEN_ANG = math.radians(74.0)  # abierta hacia el exterior (+Y)
door_dir = Vector((-math.cos(OPEN_ANG), math.sin(OPEN_ANG), 0.0))
door_end = HINGE_PT + door_dir * DOOR_W
door_mid = (HINGE_PT + door_end) * 0.5

# Marco perimetral de la hoja de puerta
add_box(bm_facade, (HINGE_PT.x, HINGE_PT.y, Z0_F + DOOR_H * 0.5), (0.055, 0.055, DOOR_H), (0, 0, -OPEN_ANG), mat_idx=0)
add_box(bm_facade, (door_end.x, door_end.y, Z0_F + DOOR_H * 0.5), (0.055, 0.055, DOOR_H), (0, 0, -OPEN_ANG), mat_idx=0)
for lv in [0.02, 0.33, 0.72, 0.98]:
    add_box(bm_facade, (door_mid.x, door_mid.y, Z0_F + lv * DOOR_H), (DOOR_W, 0.05, 0.045), (0, 0, -OPEN_ANG), mat_idx=0)

# Vidrios de la puerta (el central tiene el escudo circular grabado de la UC)
for t_a, t_b, m_id in [(0.04, 0.31, 1), (0.35, 0.70, 4), (0.74, 0.96, 1)]:
    add_quad_uv(
        bm_facade, uv_fac,
        Vector((HINGE_PT.x, HINGE_PT.y, Z0_F + t_a * DOOR_H)),
        Vector((door_end.x, door_end.y, Z0_F + t_a * DOOR_H)),
        Vector((door_end.x, door_end.y, Z0_F + t_b * DOOR_H)),
        Vector((HINGE_PT.x, HINGE_PT.y, Z0_F + t_b * DOOR_H)),
        mat_idx=m_id,
    )

# Picaporte / cerradura dorada en el borde libre de la puerta (Foto 1)
handle_pt = HINGE_PT + door_dir * (DOOR_W - 0.07) + Vector((0.0, 0.0, 1.02))
add_box(bm_facade, handle_pt, (0.04, 0.075, 0.16), (0, 0, -OPEN_ANG), mat_idx=5)
add_box(bm_facade, handle_pt + Vector((-0.05, -0.05, 0.02)), (0.12, 0.02, 0.02), (0, 0, -OPEN_ANG), mat_idx=5)

# Pulsador rojo de alarma contra incendios en la columna exterior (Foto 1)
add_box(bm_facade, (2.85, 3.67, Z0_F + 1.45), (0.11, 0.06, 0.13), mat_idx=6)
add_cyl(bm_facade, Vector((2.85, 3.66, Z0_F + 1.52)), Vector((2.85, 3.66, Z0_F + 2.65)), r0=0.012, segs=8, mat_idx=6)

create_mesh_obj(
    "Cerramiento_Y_Puerta",
    bm_facade,
    [mat_carpinteria, mat_vidrio_claro, mat_vidrio_esmerilado, mat_vidrio_cartel, mat_vidrio_escudo, mat_bronce, mat_rojo_alarma],
)


# ==============================================================================
# 8. ESTRADO, MESA PRINCIPAL, PANTALLA, PIZARRAS, AIRES Y BIOMBOS (FOTOS 3 Y 4)
# ==============================================================================
bm_furn = bmesh.new()
uv_furn = bm_furn.loops.layers.uv.new("UVMap")

# a) Panel bipartito del fondo del estrado (madera clara + panel negro con escudo UC y cruz)
add_box(bm_furn, (-0.82, ROOM_Y0 + 0.03, 1.32), (1.05, 0.04, 2.45), mat_idx=0)
add_quad_uv(
    bm_furn, uv_furn,
    Vector((-0.28, ROOM_Y0 + 0.055, 0.10)),
    Vector((1.08, ROOM_Y0 + 0.055, 0.10)),
    Vector((1.08, ROOM_Y0 + 0.055, 2.55)),
    Vector((-0.28, ROOM_Y0 + 0.055, 2.55)),
    mat_idx=1,  # mat_panel_negro con escudo UC
)
# Cruz metálica sobre el panel negro (Foto 4)
add_box(bm_furn, (0.40, ROOM_Y0 + 0.06, 2.74), (0.025, 0.025, 0.30), mat_idx=2)
add_box(bm_furn, (0.40, ROOM_Y0 + 0.06, 2.80), (0.18, 0.025, 0.025), mat_idx=2)

# b) Pantalla de proyección blanca colgada en el estrado (Fotos 3 y 4)
add_box(bm_furn, (-0.75, -2.52, 2.76), (2.15, 0.09, 0.09), mat_idx=3)  # carcasa superior
add_quad_uv(
    bm_furn, uv_furn,
    Vector((-1.78, -2.52, 1.38)),
    Vector((0.28, -2.52, 1.38)),
    Vector((0.28, -2.52, 2.71)),
    Vector((-1.78, -2.52, 2.71)),
    mat_idx=4,  # mat_pantalla
)

# c) Pizarra blanca móvil con caballete detrás de la pantalla (Foto 4)
add_box(bm_furn, (-0.55, -2.95, 1.45), (1.65, 0.03, 1.05), mat_idx=5)
add_box(bm_furn, (-1.35, -2.95, 0.85), (0.04, 0.55, 1.70), mat_idx=2)
add_box(bm_furn, (0.25, -2.95, 0.85), (0.04, 0.55, 1.70), mat_idx=2)

# d) Mesa larga de conferencia en el estrado (Foto 4)
TABLE_X, TABLE_Y = 0.55, -2.35
add_box(bm_furn, (TABLE_X, TABLE_Y, 0.75), (2.25, 0.78, 0.045), mat_idx=0)  # tapa madera clara
add_box(bm_furn, (TABLE_X, TABLE_Y + 0.34, 0.42), (2.10, 0.025, 0.58), mat_idx=0)  # faldón frontal
for lx in [TABLE_X - 1.05, TABLE_X, TABLE_X + 1.05]:
    add_box(bm_furn, (lx, TABLE_Y, 0.375), (0.05, 0.72, 0.75), mat_idx=2)

# e) Escritorio auxiliar derecho (junto a la columna derecha, Foto 3 y 4)
AUX_X, AUX_Y = -2.95, -2.25
add_box(bm_furn, (AUX_X, AUX_Y, 0.74), (1.18, 0.65, 0.04), mat_idx=0)
add_box(bm_furn, (AUX_X, AUX_Y + 0.28, 0.42), (1.08, 0.02, 0.56), mat_idx=0)
add_box(bm_furn, (AUX_X - 0.54, AUX_Y, 0.37), (0.04, 0.60, 0.74), mat_idx=2)
add_box(bm_furn, (AUX_X + 0.54, AUX_Y, 0.37), (0.04, 0.60, 0.74), mat_idx=2)

# f) Pizarra blanca mural derecha + placa en relieve del mapa del Paraguay (Foto 3)
add_box(bm_furn, (-3.35, ROOM_Y0 + 0.04, 1.55), (1.45, 0.03, 1.05), mat_idx=5)
add_quad_uv(
    bm_furn, uv_furn,
    Vector((-4.76, -1.65, 1.35)),
    Vector((-4.76, -0.75, 1.35)),
    Vector((-4.76, -0.75, 2.25)),
    Vector((-4.76, -1.65, 2.25)),
    mat_idx=9,  # mat_mapa_py
)

# g) Dos Biombos plegables negros de 3 hojas (izquierda y derecha, Fotos 3 y 4)
def add_folding_screen(center_xy, rot_z):
    rot_m = Matrix.Rotation(rot_z, 3, "Z")
    for p_idx in (-1, 0, 1):
        local_off = Vector((p_idx * 0.52, (0.06 if p_idx == 0 else -0.04), 0.92))
        w_pos = Vector((center_xy[0], center_xy[1], 0.0)) + (rot_m @ local_off)
        p_ang = rot_z + p_idx * 0.24
        add_box(bm_furn, w_pos, (0.50, 0.025, 1.80), (0, 0, p_ang), mat_idx=6)
        add_box(bm_furn, w_pos + Vector((0, 0, 0)), (0.52, 0.032, 0.025), (0, 0, p_ang), mat_idx=7)

add_folding_screen((3.65, -1.15), math.radians(-55.0))   # Biombo izquierdo (Foto 4)
add_folding_screen((-4.25, -2.85), math.radians(32.0))   # Biombo fondo derecho (Foto 3)

# h) Dos Aires Acondicionados Split grandes en alto (Fotos 2, 3 y 4)
# Split izquierdo
add_box(bm_furn, (3.45, -2.55, 2.68), (1.45, 0.28, 0.36), mat_idx=8)
# Split derecho
add_box(bm_furn, (-3.65, ROOM_Y0 + 0.16, 2.68), (1.45, 0.28, 0.36), mat_idx=8)

create_mesh_obj(
    "Mobiliario_Estrado_Y_Sala",
    bm_furn,
    [mat_madera_clara, mat_panel_negro, mat_metal_negro, mat_aluminio, mat_pantalla,
     mat_pizarra, mat_tela_biombo, mat_aluminio, mat_aire_ac, mat_mapa_py],
)


# ==============================================================================
# 9. PLATEA DE 26 SILLAS UNIVERSITARIAS CON PUPITRE (FOTOS 1, 2, 3 Y 4)
# ==============================================================================
bm_chairs = bmesh.new()


def add_student_chair(pos_xy, yaw_rad):
    """Construye una silla pupitre universitaria fiel a las fotos 1-4."""
    rot_m = Matrix.Rotation(yaw_rad, 3, "Z")
    base = Vector((pos_xy[0], pos_xy[1], 0.0))

    def to_w(lx, ly, lz):
        return base + (rot_m @ Vector((lx, ly, lz)))

    # 4 patas de caño negro
    for lx, ly in [(-0.21, -0.21), (0.21, -0.21), (-0.21, 0.21), (0.21, 0.21)]:
        h_top = 0.78 if ly < 0 else 0.43
        add_cyl(bm_chairs, to_w(lx, ly, 0.0), to_w(lx, ly, h_top), r0=0.011, segs=8, mat_idx=0)

    # Rejilla portaobjetos inferior (z = 0.16)
    for gx in [-0.15, -0.075, 0.0, 0.075, 0.15]:
        add_cyl(bm_chairs, to_w(gx, -0.19, 0.16), to_w(gx, 0.19, 0.16), r0=0.005, segs=6, mat_idx=0)
    add_cyl(bm_chairs, to_w(-0.21, -0.19, 0.16), to_w(0.21, -0.19, 0.16), r0=0.008, segs=6, mat_idx=0)
    add_cyl(bm_chairs, to_w(-0.21, 0.19, 0.16), to_w(0.21, 0.19, 0.16), r0=0.008, segs=6, mat_idx=0)

    # Asiento acolchado negro (z = 0.45)
    add_box(bm_chairs, to_w(0.0, 0.01, 0.45), (0.43, 0.42, 0.045), (0, 0, yaw_rad), mat_idx=1)

    # Respaldo acolchado negro (z = 0.72)
    add_box(bm_chairs, to_w(0.0, -0.20, 0.72), (0.41, 0.04, 0.24), (math.radians(-8.0), 0, yaw_rad), mat_idx=1)

    # Brazo y paleta/pupitre lateral derecho (+X local, z = 0.67)
    add_cyl(bm_chairs, to_w(0.21, 0.18, 0.43), to_w(0.24, 0.18, 0.66), r0=0.011, segs=8, mat_idx=0)
    add_box(bm_chairs, to_w(0.26, 0.24, 0.67), (0.28, 0.46, 0.022), (0, 0, yaw_rad), mat_idx=0)


# Distribución de filas orientadas hacia el estrado (Y = -2.35), respetando el pasillo central y el escalón curvo
# Bloque izquierdo (lado estrado derecho mirando desde la puerta, Foto 4) y bloque derecho (Foto 3)
chair_placements = [
    # Fila 1 (más cercana al estrado)
    (-2.35, -1.15, math.radians(162)),
    (-1.55, -1.25, math.radians(168)),
    (-0.75, -1.30, math.radians(174)),
    (0.65, -1.30, math.radians(-172)),
    (1.45, -1.25, math.radians(-166)),
    (2.25, -1.15, math.radians(-160)),

    # Fila 2
    (-2.55, -0.35, math.radians(160)),
    (-1.75, -0.45, math.radians(166)),
    (-0.95, -0.50, math.radians(172)),
    (0.75, -0.50, math.radians(-172)),
    (1.55, -0.45, math.radians(-166)),
    (2.35, -0.35, math.radians(-160)),
    (3.10, -0.20, math.radians(-152)),

    # Fila 3
    (-2.75, 0.45, math.radians(158)),
    (-1.95, 0.35, math.radians(165)),
    (-1.15, 0.30, math.radians(172)),
    (0.85, 0.30, math.radians(-172)),
    (1.65, 0.35, math.radians(-165)),
    (2.45, 0.45, math.radians(-158)),
    (3.20, 0.60, math.radians(-150)),

    # Fila 4 (bordeando el escalón curvo de entrada, Fotos 1-4)
    (-2.90, 1.20, math.radians(156)),
    (-2.10, 1.15, math.radians(164)),
    (-1.30, 1.10, math.radians(172)),
    (1.75, 1.15, math.radians(-164)),
    (2.55, 1.25, math.radians(-156)),
    (3.30, 1.40, math.radians(-148)),
]

for cx, cy, cyaw in chair_placements:
    add_student_chair((cx, cy), cyaw)

# Sillas de conferencia detrás de la mesa del estrado (Foto 3)
for sx, sy, syaw in [(0.15, -2.90, 0.0), (0.95, -2.90, 0.0), (-2.35, -2.75, math.radians(-20))]:
    add_student_chair((sx, sy), syaw)

create_mesh_obj("Platea_Sillas_Pupitre", bm_chairs, [mat_metal_negro, mat_cuero_negro])


# ==============================================================================
# 10. EXPORTAR GLB COMPLETO CON TODAS LAS TEXTURAS EMPAQUETADAS
# ==============================================================================
for obj in bpy.context.scene.objects:
    obj.select_set(False)
root.select_set(True)
for child in root.children:
    child.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format="GLB",
    use_selection=True,
)

print(f"¡Listo! Sala Manfred Stark reconstruida y exportada en: {OUTPUT_PATH}")
