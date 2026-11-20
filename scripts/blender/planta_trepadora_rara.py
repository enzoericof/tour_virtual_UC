import bpy
import bmesh
import math
import random
import os
from mathutils import Vector, Euler, Matrix

# Ruta de salida solicitada para el modelo web (.glb)
RUTA_DESTINO_GLB = "/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/enredadera_techo_bedelia.glb"

def limpiar_escena():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def crear_material_tronco():
    mat_name = "Mat_Tronco_Enredadera"
    if mat_name in bpy.data.materials:
        return bpy.data.materials[mat_name]
    mat = bpy.data.materials.new(name=mat_name)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        # Corteza marrón grisácea leñosa
        bsdf.inputs['Base Color'].default_value = (0.11, 0.085, 0.065, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.9
    return mat

def crear_material_follaje():
    mat_name = "Mat_Follaje_Enredadera"
    if mat_name in bpy.data.materials:
        return bpy.data.materials[mat_name]
    mat = bpy.data.materials.new(name=mat_name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.42
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.45

    # Variación sutil de tonos verdes usando ruido 3D en espacio de objeto
    tex_coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 4.5
    noise.inputs['Detail'].default_value = 3.0

    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (0.015, 0.055, 0.012, 1.0) # Verde sombra profundo
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.055, 0.145, 0.025, 1.0) # Verde brote iluminado

    links.new(tex_coord.outputs['Object'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat

def agregar_tubo_a_bmesh(bm, puntos, radios, lados=6):
    """Genera un tubo continuo a lo largo de una lista de puntos 3D y radios."""
    if len(puntos) < 2:
        return
    anillos = []
    for i, (pt, rad) in enumerate(zip(puntos, radios)):
        if i == 0:
            tangente = (puntos[1] - puntos[0]).normalized()
        elif i == len(puntos) - 1:
            tangente = (puntos[-1] - puntos[-2]).normalized()
        else:
            tangente = (puntos[i+1] - puntos[i-1]).normalized()

        up = Vector((0, 0, 1)) if abs(tangente.z) < 0.95 else Vector((1, 0, 0))
        normal = tangente.cross(up).normalized()
        binormal = tangente.cross(normal).normalized()

        anillo = []
        for s in range(lados):
            ang = (2 * math.pi * s) / lados
            offset = (normal * math.cos(ang) + binormal * math.sin(ang)) * rad
            anillo.append(bm.verts.new(pt + offset))
        anillos.append(anillo)

    for i in range(len(anillos) - 1):
        for s in range(lados):
            s_next = (s + 1) % lados
            f = bm.faces.new((anillos[i][s], anillos[i][s_next], anillos[i+1][s_next], anillos[i+1][s]))
            f.smooth = True

def agregar_hoja_a_bmesh(bm, pos, rot_euler, largo, ancho):
    """Agrega una hoja ovalada/puntiaguda de baja carga poligonal (4 triángulos / 2 quads) con pliegue."""
    mat_rot = rot_euler.to_matrix().to_4x4()
    mat_trans = Matrix.Translation(pos)
    xform = mat_trans @ mat_rot

    # 6 vértices formando una hoja doblada en V (mantiene volumen desde cualquier ángulo)
    v_base = bm.verts.new(xform @ Vector((0.0, 0.0, 0.0)))
    v_mid_c = bm.verts.new(xform @ Vector((0.0, largo * 0.45, -0.005)))
    v_mid_l = bm.verts.new(xform @ Vector((-ancho * 0.5, largo * 0.42, 0.008)))
    v_mid_r = bm.verts.new(xform @ Vector((ancho * 0.5, largo * 0.42, 0.008)))
    v_tip = bm.verts.new(xform @ Vector((0.0, largo, -0.015)))

    f1 = bm.faces.new((v_base, v_mid_r, v_mid_c))
    f2 = bm.faces.new((v_base, v_mid_c, v_mid_l))
    f3 = bm.faces.new((v_mid_c, v_mid_r, v_tip))
    f4 = bm.faces.new((v_mid_l, v_mid_c, v_tip))
    for f in (f1, f2, f3, f4):
        f.smooth = True

def generar_enredadera_techo():
    limpiar_escena()
    random.seed(108)

    bm_madera = bmesh.new()
    bm_hojas = bmesh.new()

    puntos_follaje = [] # Almacena (posición, densidad, es_colgante)

    # ---------------------------------------------------------
    # 1. TRONCOS TREPADORES (Suben desde Z=0 hasta el techo Z=2.55)
    # ---------------------------------------------------------
    altura_techo = 2.55
    num_troncos = 4
    for t in range(num_troncos):
        pts = []
        rads = []
        pasos = 26
        fase = (2 * math.pi * t) / num_troncos
        radio_espiral = 0.14 + random.uniform(-0.03, 0.03) # Deja hueco central para abrazar la columna

        for i in range(pasos + 1):
            prog = i / pasos
            z = prog * altura_techo
            ang = fase + prog * 3.8 + math.sin(prog * 6.0) * 0.3
            r_esp = radio_espiral * (1.0 + 0.35 * math.sin(prog * math.pi))
            x = math.cos(ang) * r_esp
            y = math.sin(ang) * r_esp
            pts.append(Vector((x, y, z)))
            # Más grueso en la base, más fino al llegar arriba
            rads.append(0.038 * (1.0 - prog * 0.55) * random.uniform(0.85, 1.15))

            # Algunas hojitas dispersas a lo largo del tronco que sube
            if 0.2 < prog < 0.9 and random.random() < 0.45:
                puntos_follaje.append((Vector((x, y, z)), 4, False))

        agregar_tubo_a_bmesh(bm_madera, pts, rads, lados=7)

    # ---------------------------------------------------------
    # 2. RAMAS PRINCIPALES SOBRE LA VIGA DEL TECHO (Eje X: -2.2m a +2.6m)
    # ---------------------------------------------------------
    # En la foto la copa se extiende a ambos lados de la columna, siendo más voluminosa hacia la derecha
    num_ramas_principales = 18
    for r in range(num_ramas_principales):
        lado = 1 if r % 3 != 0 else -1 # Más ramas hacia +X (derecha) como en la imagen
        largo_rama = random.uniform(1.1, 2.7) if lado == 1 else random.uniform(0.9, 2.1)
        
        pts = []
        rads = []
        pasos = 16
        dir_x = lado * random.uniform(0.85, 1.0)
        dir_y = random.uniform(-0.35, 0.35)
        arco_z = random.uniform(0.15, 0.65) # Altura de la masa vegetal sobre el techo

        pos_actual = Vector((random.uniform(-0.15, 0.15), random.uniform(-0.15, 0.15), altura_techo))
        for i in range(pasos + 1):
            prog = i / pasos
            x = pos_actual.x + dir_x * largo_rama * prog + math.sin(prog * 5.0 + r) * 0.12
            y = pos_actual.y + dir_y * largo_rama * prog + math.cos(prog * 4.0 + r) * 0.18
            # Sube formando copa y cae ligeramente en las puntas
            z = altura_techo + math.sin(prog * math.pi * 0.85) * arco_z - (prog ** 3) * 0.18

            pt = Vector((x, y, z))
            pts.append(pt)
            rads.append(0.022 * (1.0 - prog * 0.82))

            # Registrar nodos para generar ramitas y cúmulos de hojas
            if prog > 0.08:
                puntos_follaje.append((pt, 18, False))

            # Generar brotes secundarios y zarcillos colgantes en los bordes
            if prog > 0.35 and random.random() < 0.55:
                sub_pts = [pt]
                sub_rads = [0.009]
                es_colgante = (prog > 0.72 and random.random() < 0.5)
                sub_largo = random.uniform(0.35, 0.75)
                sub_dir = Vector((
                    dir_x * random.uniform(0.2, 0.8) + random.uniform(-0.4, 0.4),
                    random.uniform(-0.85, 0.85),
                    -0.85 if es_colgante else random.uniform(-0.1, 0.6)
                )).normalized()

                for s in range(1, 7):
                    sp = s / 6.0
                    caida = -0.35 * (sp ** 2) if es_colgante else -0.08 * (sp ** 2)
                    spt = pt + sub_dir * (sub_largo * sp) + Vector((0, 0, caida))
                    sub_pts.append(spt)
                    sub_rads.append(0.008 * (1.0 - sp * 0.75))
                    puntos_follaje.append((spt, 14, es_colgante))

                agregar_tubo_a_bmesh(bm_madera, sub_pts, sub_rads, lados=5)

        agregar_tubo_a_bmesh(bm_madera, pts, rads, lados=6)

    # ---------------------------------------------------------
    # 3. GENERACIÓN DENSA DE HOJAS EN LOS CÚMULOS
    # ---------------------------------------------------------
    for centro, cantidad, colgante in puntos_follaje:
        radio_dispersion = 0.14 if colgante else 0.24
        for _ in range(cantidad):
            offset = Vector((
                random.uniform(-radio_dispersion, radio_dispersion),
                random.uniform(-radio_dispersion, radio_dispersion),
                random.uniform(-radio_dispersion * 0.8, radio_dispersion * 0.9)
            ))
            pos_hoja = centro + offset
            rot = Euler((
                random.uniform(-0.9, 1.1) if not colgante else random.uniform(0.3, 1.4),
                random.uniform(-0.8, 0.8),
                random.uniform(0, math.pi * 2)
            ), 'XYZ')
            largo_h = random.uniform(0.065, 0.115)
            ancho_h = largo_h * random.uniform(0.45, 0.62)
            agregar_hoja_a_bmesh(bm_hojas, pos_hoja, rot, largo_h, ancho_h)

    # Convertir BMesh a objetos de Blender
    mesh_madera = bpy.data.meshes.new("Mesh_Tronco_Enredadera")
    bm_madera.to_mesh(mesh_madera)
    bm_madera.free()
    obj_madera = bpy.data.objects.new("Tronco_Enredadera", mesh_madera)
    bpy.context.scene.collection.objects.link(obj_madera)
    obj_madera.data.materials.append(crear_material_tronco())

    mesh_hojas = bpy.data.meshes.new("Mesh_Hojas_Enredadera")
    bm_hojas.to_mesh(mesh_hojas)
    bm_hojas.free()
    obj_hojas = bpy.data.objects.new("Hojas_Enredadera", mesh_hojas)
    bpy.context.scene.collection.objects.link(obj_hojas)
    obj_hojas.data.materials.append(crear_material_follaje())

    # Unir tronco y follaje en un solo objeto limpio
    bpy.ops.object.select_all(action='DESELECT')
    obj_madera.select_set(True)
    obj_hojas.select_set(True)
    bpy.context.view_layer.objects.active = obj_madera
    bpy.ops.object.join()
    bpy.context.active_object.name = "Enredadera_Techo_Bedelia"

    # Guardar .blend local y exportar .glb directo a frontend/editor-models/
    directorio_script = os.path.dirname(os.path.abspath(__file__))
    ruta_blend = os.path.join(directorio_script, "enredadera_techo_bedelia.blend")
    bpy.ops.wm.save_as_mainfile(filepath=ruta_blend)

    os.makedirs(os.path.dirname(RUTA_DESTINO_GLB), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=RUTA_DESTINO_GLB, export_format='GLB')
    print(f"Modelo generado y exportado en: {RUTA_DESTINO_GLB}")

generar_enredadera_techo()
