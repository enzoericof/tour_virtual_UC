"""Avatar original articulado, con gestos y clips compartidos por el visor.
Ejecutar: blender --background --python scripts/blender/campus_person.py
Unidades: metros. Sin texturas ni recursos externos; exportación glTF Y arriba.
"""
from pathlib import Path
from math import sin, pi
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30

def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .78
    return mat

shirt = material('UserShirt', (.22, .42, .7))
pants = material('Trousers', (.085, .12, .18))
skin = material('Skin', (.64, .42, .28))
hair = material('Hair', (.075, .045, .035))
shoe = material('Shoes', (.07, .075, .09))
white = material('Eyes', (.94, .94, .91))
iris = material('Iris', (.035, .045, .06))

def xyz(v): return (v[0], -v[2], v[1])
def pivot(name, parent, at):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.parent = parent
    o.location = xyz(at)
    return o

def shape(name, parent, at, size, mat, sphere=False):
    if sphere:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1)
    else:
        bpy.ops.mesh.primitive_cube_add(size=2)
    o = bpy.context.object
    o.name = name
    o.parent = parent
    o.location = xyz(at)
    o.scale = (size[0]/2, size[2]/2, size[1]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if not sphere:
        bevel = o.modifiers.new('RoundedEdges', 'BEVEL')
        bevel.width = min(size) * .18
        bevel.segments = 2
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        o.modifiers.new('WeightedNormals', 'WEIGHTED_NORMAL')
    for f in o.data.polygons: f.use_smooth = True
    o.data.materials.append(mat)
    return o

root = pivot('AvatarRoot', None, (0,0,0))
pelvis = pivot('Pelvis', root, (0,.89,0))
shape('HipClothing', pelvis, (0,-.02,0), (.32,.19,.22), pants)
spine = pivot('Spine', pelvis, (0,.22,0))
shape('ShirtBody', spine, (0,.06,0), (.39,.46,.24), shirt)
shape('Collar', spine, (0,.295,0), (.16,.07,.16), shirt)
head = pivot('Head', spine, (0,.38,0))
shape('Neck', head, (0,-.10,0), (.105,.16,.11), skin, True)
shape('Face', head, (0,.045,0), (.25,.31,.245), skin, True)
shape('HairCap', head, (0,.15,.02), (.263,.16,.252), hair, True)
shape('HairBack', head, (0,.07,.09), (.245,.20,.095), hair, True)
shape('Nose', head, (0,.045,-.125), (.045,.065,.045), skin, True)
shape('Mouth', head, (0,-.02,-.117), (.063,.012,.014), hair, True)
for side in [-1,1]:
    shape('Ear', head, (side*.126,.04,0), (.047,.085,.045), skin, True)
    shape('Eye', head, (side*.051,.08,-.105), (.047,.038,.027), white, True)
    shape('Pupil', head, (side*.051,.08,-.120), (.020,.023,.013), iris, True)
    shape('Brow', head, (side*.05,.112,-.103), (.057,.012,.015), hair)

joints = {'Pelvis':pelvis, 'Spine':spine, 'Head':head}
for side, suffix in [(-1,'L'),(1,'R')]:
    arm = pivot('UpperArm'+suffix, spine, (side*.24,.22,0))
    shape('Sleeve'+suffix, arm, (0,-.08,0), (.15,.19,.18), shirt)
    shape('UpperArmMesh'+suffix, arm, (0,-.20,0), (.105,.18,.11), skin, True)
    fore = pivot('Forearm'+suffix, arm, (0,-.27,0))
    shape('ForearmMesh'+suffix, fore, (0,-.115,0), (.094,.25,.10), skin, True)
    hand = pivot('Hand'+suffix, fore, (0,-.25,0))
    shape('Palm'+suffix, hand, (0,-.035,0), (.095,.10,.045), skin)
    for i, finger in enumerate(['Index','Middle','Ring','Pinky']):
        p = pivot(finger+suffix, hand, ((i-1.5)*.023,-.075,0))
        shape('Finger'+finger+suffix, p, (0,-.037,0), (.018,.075 if i<2 else .062,.023), skin)
        joints[finger+suffix] = p
    thumb = pivot('Thumb'+suffix, hand, (-side*.055,-.01,0))
    shape('ThumbMesh'+suffix, thumb, (0,-.031,0), (.025,.065,.025), skin)
    thumb.rotation_euler[1] = side*.6
    thigh = pivot('Thigh'+suffix, pelvis, (side*.095,-.07,0))
    shape('ThighMesh'+suffix, thigh, (0,-.19,0), (.15,.40,.18), pants)
    shin = pivot('Shin'+suffix, thigh, (0,-.38,0))
    shape('ShinMesh'+suffix, shin, (0,-.18,0), (.13,.37,.15), pants)
    foot = pivot('Foot'+suffix, shin, (0,-.36,0))
    shape('Shoe'+suffix, foot, (0,-.035,-.05), (.16,.11,.28), shoe)
    shape('Sole'+suffix, foot, (0,-.078,-.05), (.165,.025,.28), white)
    for obj in [arm,fore,hand,thumb,thigh,shin,foot]: joints[obj.name] = obj

# Animaciones por nodos: las pistas NLA con el mismo nombre se exportan como un clip.
rest = {name:(o.location.copy(),o.rotation_euler.copy()) for name,o in joints.items()}
clips = {'Idle':2, 'Walk':1, 'HighFive':3.2, 'HoldHandsJump':5.6, 'OK':3, 'Peace':3, 'Fall':1}
for clip,duration in clips.items():
    frames = round(duration*30)
    for name,o in joints.items():
        o.animation_data_create()
        o.animation_data.action = bpy.data.actions.new(clip+'_'+name)
    for f in range(0,frames+1,3):
        t=f/30
        envelope = min(1,t/.45,max(0,(duration-t)/.45))
        for name,o in joints.items():
            o.location = rest[name][0]
            o.rotation_euler = rest[name][1]
        if clip=='Idle': spine.rotation_euler.x = sin(t*pi)*.018
        if clip=='Walk':
            for suffix,sign in [('L',1),('R',-1)]:
                joints['Thigh'+suffix].rotation_euler.x = sin(t*2*pi)*.55*sign
                joints['Shin'+suffix].rotation_euler.x = max(0,-sin(t*2*pi)*sign)*-.6
                joints['UpperArm'+suffix].rotation_euler.x = -sin(t*2*pi)*.42*sign
        if clip=='HighFive':
            joints['UpperArmR'].rotation_euler.x = 2.25*envelope
            joints['UpperArmR'].rotation_euler.y = -.25*envelope
            joints['ForearmR'].rotation_euler.x = .3*envelope
            joints['HandR'].rotation_euler.x = -.3*envelope
        if clip=='HoldHandsJump':
            for suffix,sign in [('L',-1),('R',1)]:
                joints['UpperArm'+suffix].rotation_euler.x = .55*envelope
                joints['UpperArm'+suffix].rotation_euler.y = sign*.55*envelope
                joints['Forearm'+suffix].rotation_euler.x = .45*envelope
                joints['Thigh'+suffix].rotation_euler.x = -.18*envelope
                joints['Shin'+suffix].rotation_euler.x = -.3*envelope
            pelvis.location.z += max(0,sin((t-1)*pi*1.5))*.36*envelope if 1<t<4.4 else 0
        if clip in ['OK','Peace']:
            joints['UpperArmR'].rotation_euler.x = 1.45*envelope
            joints['ForearmR'].rotation_euler.x = 1.0*envelope
            if clip=='OK':
                joints['IndexR'].rotation_euler.x = 2.2*envelope
                joints['ThumbR'].rotation_euler.x = 1.4*envelope
                joints['MiddleR'].rotation_euler.x = .1*envelope
            else:
                for finger in ['Ring','Pinky']:
                    joints[finger+'R'].rotation_euler.x = 1.7*envelope
                joints['IndexR'].rotation_euler.y = -.26*envelope
                joints['MiddleR'].rotation_euler.y = .26*envelope
                joints['ThumbR'].rotation_euler.x = 1.7*envelope
        if clip=='Fall':
            spine.rotation_euler.x = -.8*envelope
            for suffix in ['L','R']: joints['UpperArm'+suffix].rotation_euler.x = -1.5*envelope
        for name,o in joints.items():
            o.keyframe_insert(data_path='rotation_euler',frame=f)
            o.keyframe_insert(data_path='location',frame=f)
    for name,o in joints.items():
        action = o.animation_data.action
        track = o.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(action.name,0,action)
        o.animation_data.action = None
for name,o in joints.items():
    o.location = rest[name][0]
    o.rotation_euler = rest[name][1]
scene.frame_set(0)
output = Path(__file__).resolve().parents[2] / 'frontend/public/assets/avatar/campus-person.glb'
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animation_mode='NLA_TRACKS',
    export_apply=True,export_force_sampling=True,export_anim_slide_to_zero=True)
print('AVATAR_EXPORTED',output)
