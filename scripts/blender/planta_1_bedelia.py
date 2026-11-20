import bpy
import bmesh
import math
import random
from mathutils import Vector, Euler

def limpiar_escena():
    # Opcional: elimina objetos existentes si quieres empezar limpio
    # bpy.ops.object.select_all(action='SELECT')
    # bpy.ops.object.delete()
    pass

def crear_material_hoja():
    mat_name = "Material_Hoja_Dracaena"
    if mat_name in bpy.data.materials:
        return bpy.data.materials[mat_name]
        
    mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Nodos principales
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (600, 0)
    
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (300, 0)
    bsdf.inputs['Roughness'].default_value = 0.35 # Brillo ceroso característico
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.6

    # Coordenadas UV para hacer las rayas en los bordes
    tex_coord = nodes.new('ShaderNodeTexCoord')
    tex_coord.location = (-600, 0)
    
    sep_xyz = nodes.new('ShaderNodeSeparateXYZ')
    sep_xyz.location = (-400, 0)
    
    # Calcular distancia desde el centro de la hoja (U = 0.5)
    math_sub = nodes.new('ShaderNodeMath')
    math_sub.operation = 'SUBTRACT'
    math_sub.inputs[1].default_value = 0.5
    math_sub.location = (-200, 0)
    
    math_abs = nodes.new('ShaderNodeMath')
    math_abs.operation = 'ABSOLUTE'
    math_abs.location = (0, 0)

    # Rampa de color: Centro verde oscuro, bordes crema/amarillo claro
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.location = (50, 200)
    ramp.color_ramp.elements[0].position = 0.38
    ramp.color_ramp.elements[0].color = (0.025, 0.08, 0.02, 1.0) # Verde oscuro
    ramp.color_ramp.elements[1].position = 0.43
    ramp.color_ramp.elements[1].color = (0.75, 0.78, 0.55, 1.0)  # Borde claro

    # Conectar nodos
    links.new(tex_coord.outputs['UV'], sep_xyz.inputs['Vector'])
    links.new(sep_xyz.outputs['X'], math_sub.inputs[0])
    links.new(math_sub.outputs['Value'], math_abs.inputs[0])
    links.new(math_abs.outputs['Value'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat

def crear_material_tallo():
    mat_name = "Material_Tallo_Dracaena"
    if mat_name in bpy.data.materials:
        return bpy.data.materials[mat_name]
    mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs['Base Color'].default_value = (0.12, 0.10, 0.07, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.85
    return mat

def crear_hoja(longitud, ancho, curvatura, inclinacion_z, rotacion_z, ubicacion, coleccion, material):
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    
    segmentos_largo = 14
    segmentos_ancho = 3 # Izquierda, centro (nervadura), derecha
    
    verts = []
    for i in range(segmentos_largo + 1):
        t = i / segmentos_largo # 0 en la base, 1 en la punta
        
        # Perfil de ancho de la hoja (se ensancha en el medio y termina en punta aguda)
        factor_ancho = math.sin(t * math.pi) ** 0.65
        if t < 0.15:
            factor_ancho = 0.35 + (t / 0.15) * 0.45
        ancho_actual = ancho * factor_ancho
        
        # Arco de caída por gravedad
        y = t * longitud
        z = (t * longitud * math.sin(inclinacion_z)) - (curvatura * (t ** 2.3))
        
        fila = []
        for j in range(segmentos_ancho):
            u = j / (segmentos_ancho - 1) # 0, 0.5, 1
            x = (u - 0.5) * ancho_actual
            # Ligero pliegue en V en el centro de la hoja
            z_pliegue = abs(u - 0.5) * 0.018 * factor_ancho
            v = bm.verts.new((x, y, z + z_pliegue))
            fila.append((v, u, t))
        verts.append(fila)
        
    # Crear caras y asignar UVs
    for i in range(segmentos_largo):
        for j in range(segmentos_ancho - 1):
            v1, u1, t1 = verts[i][j]
            v2, u2, t2 = verts[i][j+1]
            v3, u3, t3 = verts[i+1][j+1]
            v4, u4, t4 = verts[i+1][j]
            
            face = bm.faces.new((v1, v2, v3, v4))
            face.smooth = True
            uvs = [(u1, t1), (u2, t2), (u3, t3), (u4, t4)]
            for loop, uv in zip(face.loops, uvs):
                loop[uv_layer].uv = uv

    mesh = bpy.data.meshes.new("Hoja_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("Hoja", mesh)
    coleccion.objects.link(obj)
    obj.location = ubicacion
    obj.rotation_euler = Euler((0, random.uniform(-0.15, 0.15), rotacion_z), 'XYZ')
    obj.data.materials.append(material)
    
    # Añadir un poco de grosor real
    solidify = obj.modifiers.new(name="Solidify", type='SOLIDIFY')
    solidify.thickness = 0.002

def crear_tallo_y_roseta(base_pos, altura, radio_tallo, num_hojas, escala_hojas, coleccion, mat_hoja, mat_tallo):
    # 1. Crear el tallo principal
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, 
        radius=radio_tallo, 
        depth=altura, 
        location=(base_pos[0], base_pos[1], base_pos[2] + altura / 2)
    )
    tallo = bpy.context.active_object
    tallo.name = "Tallo_Dracaena"
    tallo.data.materials.append(mat_tallo)
    
    # Mover a la colección de la planta
    for col in tallo.users_collection:
        col.objects.unlink(tallo)
    coleccion.objects.link(tallo)
    
    # 2. Distribuir hojas en espiral (filotaxis)
    angulo_aureo = math.radians(137.5)
    zona_foliar = altura * 0.72 # Las hojas cubren el 72% superior del tallo
    
    for i in range(num_hojas):
        progreso = i / max(1, num_hojas - 1) # 0 abajo (hojas viejas), 1 arriba (brotes nuevos)
        z_offset = (altura - zona_foliar) + (progreso * zona_foliar)
        pos_hoja = Vector((base_pos[0], base_pos[1], base_pos[2] + z_offset))
        
        rot_z = i * angulo_aureo + random.uniform(-0.15, 0.15)
        
        # Las hojas superiores son más erguidas y cortas; las inferiores caen más
        inclinacion = math.radians(10 + progreso * 55) + random.uniform(-0.08, 0.08)
        longitud = (0.38 - progreso * 0.14) * escala_hojas * random.uniform(0.85, 1.15)
        ancho = 0.042 * escala_hojas * random.uniform(0.9, 1.1)
        curvatura = (0.22 - progreso * 0.15) * escala_hojas * random.uniform(0.8, 1.2)
        
        crear_hoja(longitud, ancho, curvatura, inclinacion, rot_z, pos_hoja, coleccion, mat_hoja)

def generar_planta_completa():
    random.seed(42) # Semilla fija para replicar la composición de la foto
    
    # Crear una colección dedicada para mantener todo ordenado
    col_planta = bpy.data.collections.new("Planta_Dracaena")
    bpy.context.scene.collection.children.link(col_planta)
    
    mat_hoja = crear_material_hoja()
    mat_tallo = crear_material_tallo()
    
    # Recrear los 3 grupos principales de la fotografía:
    # 1. Tallo central alto
    crear_tallo_y_roseta(
        base_pos=(0.0, 0.0, 0.0), 
        altura=0.85, 
        radio_tallo=0.018, 
        num_hojas=48, 
        escala_hojas=1.1, 
        coleccion=col_planta, 
        mat_hoja=mat_hoja, 
        mat_tallo=mat_tallo
    )
    
    # 2. Tallo secundario derecho (altura media)
    crear_tallo_y_roseta(
        base_pos=(0.24, -0.06, 0.0), 
        altura=0.52, 
        radio_tallo=0.015, 
        num_hojas=36, 
        escala_hojas=0.95, 
        coleccion=col_planta, 
        mat_hoja=mat_hoja, 
        mat_tallo=mat_tallo
    )
    
    # 3. Tallo secundario izquierdo (más bajo y compacto)
    crear_tallo_y_roseta(
        base_pos=(-0.28, 0.05, 0.0), 
        altura=0.40, 
        radio_tallo=0.014, 
        num_hojas=32, 
        escala_hojas=0.88, 
        coleccion=col_planta, 
        mat_hoja=mat_hoja, 
        mat_tallo=mat_tallo
    )

# Ejecutar generación
generar_planta_completa()

# Guardar escena en editor-models
bpy.ops.wm.save_as_mainfile(
    filepath="/home/Mati/Repos/tour_virtual_UC/frontend/editor-models/planta_1_bedelia.blend"
)

print("¡Planta generada y guardada correctamente!")
