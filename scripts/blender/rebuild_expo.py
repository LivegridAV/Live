"""Rebuild the retained hall bay and flagship stage only.

Run with Blender --background --factory-startup.

Blender X/Y/Z maps to website X/-Z/Y. Front is -Y. All dimensions are metres.
Only this script's newly created scene is used; no existing .blend is opened.
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/expo"
QA = ROOT / "qa/blender/expo"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
FONT = bpy.data.fonts.load("C:/Windows/Fonts/segoeui.ttf")
SIGN_FONT = bpy.data.fonts.load("C:/Windows/Fonts/seguisb.ttf")

def material(name, rgb, metal=0, rough=.4, emission=0, alpha=1):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, alpha)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Alpha'].default_value = alpha
    if emission:
        p.inputs['Emission Color'].default_value = (*rgb, 1)
        p.inputs['Emission Strength'].default_value = emission
    if alpha < 1:
        m.surface_render_method = 'DITHERED'
    return m

BLACK = material('Graphite lacquer', (.009,.012,.016), .3,.27)
METAL = material('Brushed champagne aluminium', (.38,.33,.26), .78,.29)
SILVER = material('Satin aluminium', (.42,.46,.5), .8,.27)
STONE = material('Honed grey stone', (.065,.07,.075), .18,.31)
FABRIC = material('Warm grey upholstery', (.3,.28,.25), 0,.87)
GLASS = material('Smoked architectural glass', (.17,.23,.27), .1,.14, alpha=.24)
WARM = material('3000K integrated light', (1,.35,.07), 0,.25, 2)
WHITE = material('Brand porcelain', (.85,.9,.96), .05,.35, .22)
GREEN = material('Olive leaf', (.09,.14,.055), 0,.67)
SCREEN = material('Screen substrate', (.009,.012,.017), .05,.35)
TRAVERTINE = material('Silver travertine', (.22,.205,.18), .08,.53)
TIMBER = material('Smoked oak', (.065,.037,.019), .05,.65)
WATER = material('Obsidian water', (.012,.025,.031), .62,.11)

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def box(name, pos, size, mat=BLACK, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o=bpy.context.object; o.name=name; o.dimensions=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Machined edge radii','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for p in o.data.polygons: p.use_smooth=True
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def rod(name,a,b,r=.025,mat=METAL):
    d=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(mat)
    return o

def ring(name, pos, radius, depth=.24, mat=BLACK):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=depth,major_segments=64,minor_segments=8,location=pos)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def text(body,pos,size=.48,mat=WHITE):
    wordmark = 'livegrid' in body.lower()
    if not wordmark:
        size *= 1.6 if size < .20 else 1.3 if size < .40 else 1
    bpy.ops.object.text_add(location=pos,rotation=(math.pi/2,0,0))
    o=bpy.context.object; o.name='Lettering '+body; o.data.body=body; o.data.font=FONT if wordmark else SIGN_FONT
    o.data.size=size; o.data.extrude=.0015; o.data.resolution_u=8; o.data.materials.append(mat)
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def planter(x,y,seed=0):
    rng=random.Random(seed); verts=[]; faces=[]
    box('Honed planter',(x,y,.44),(.82,.82,.88),TRAVERTINE,.06)
    box('Planting bed',(x,y,.883),(.7,.7,.018),TIMBER,.01)
    rod('Tree trunk',(x,y,.75),(x+.04,y,2.65),.045,TIMBER)
    for i in range(17):
        a=i*2.399+seed; h=1.5+(i%5)*.27
        start=Vector((x,y,1.2+i*.065))
        end=Vector((x+math.cos(a)*(.55+rng.random()*.25),y+math.sin(a)*.65,h+.5))
        rod('Natural branch',start,end,.012,TIMBER)
        for j in range(10):
            center=start.lerp(end,.35+j*.065)+Vector((rng.uniform(-.14,.14),rng.uniform(-.14,.14),rng.uniform(-.08,.12)))
            angle=a+j*2.4; length=.16+rng.random()*.1
            direction=Vector((math.cos(angle),math.sin(angle),rng.uniform(-.3,.5)))*length
            side=Vector((-math.sin(angle),math.cos(angle),.15))*.045
            n=len(verts); verts.extend([center-direction,center+side,center+direction,center-side,center+Vector((0,0,.025))])
            faces.extend([(n,n+1,n+4),(n+1,n+2,n+4),(n+2,n+3,n+4),(n+3,n,n+4)])
    mesh=bpy.data.meshes.new('Botanical leaf mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Olive canopy',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(GREEN)

def downlights(x,y,z,width,depth):
    for xx in [-width*.36,0,width*.36]:
        for yy in [-depth*.3,depth*.3]:
            box('Recessed downlight trim',(x+xx,y+yy,z),(.24,.24,.055),METAL,.025)
            box('Recessed opal lens',(x+xx,y+yy,z-.03),(.15,.15,.015),WHITE,.02)

def fins(x,y,z,width,height,mat=TIMBER):
    for i in range(max(2,int(width/.16))):
        box('Vertical joinery flute',(x-width/2+i*.16,y,z),(.045,.10,height),mat,.01)

def counter(x,y,width=3.1):
    box('Floating reception counter',(x,y,.7),(width,.85,1.22),BLACK,.13)
    box('Stone countertop',(x,y,1.35),(width+.12,.98,.075),STONE,.03)
    box('Champagne counter foot',(x,y,.11),(width-.2,.7,.12),METAL)
    box('Counter underlight',(x,y-.435,.18),(width-.18,.026,.045),WARM,.008)
    text('LivegridAV',(x-width*.36,y-.437,.66),.29)
    box('Metal counter end',(x+width/2-.14,y-.46,.72),(.24,.045,1.12),METAL,.025)
    for i in range(int(width/.11)):
        xx=x-width/2+.08+i*.11
        box('Counter fluted apron',(xx,y-.441,.41),(.025,.016,.3),METAL,.004)
    box('Reception tablet',(x+width*.3,y,1.49),(.44,.06,.26),SCREEN,.025)
    box('Printed folio',(x-width*.2,y-.1,1.405),(.36,.27,.02),FABRIC,.003)

def console(x,y,w=2.8):
    box('Console joinery',(x,y,.65),(w,.78,1.05),BLACK,.07)
    box('Aluminium desk edge',(x,y,1.2),(w+.07,.9,.08),SILVER)
    for k in range(3):
        xx=x+(k-1)*w*.3
        rod('Monitor stem',(xx,y,1.24),(xx,y,1.5),.035,SILVER)
        box('Operator monitor',(xx,y,1.65),(.7,.07,.43),SCREEN,.025)
        for f in range(4):
            box('Fader channel',(xx+(f-1.5)*.12,y-.25,1.25),(.015,.18,.018),SILVER,.002)

def lounge(x,y):
    for k in [-1,1]:
        box('Sculpted upholstered seat',(x+k*.9,y,.49),(1.16,1,.56),FABRIC,.2)
        box('Upholstered seat back',(x+k*.9,y+.4,.93),(1.16,.2,.74),FABRIC,.09)
        for side in [-1,1]:
            box('Upholstered arm',(x+k*.9+side*.49,y,.75),(.19,.85,.38),FABRIC,.08)
            rod('Lounge leg',(x+k*.9+side*.39,y-.29,.15),(x+k*.9+side*.39,y-.29,.38),.025,METAL)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.55,depth=.06,location=(x,y-1,.6))
    bpy.context.object.data.materials.append(STONE)
    rod('Table pedestal',(x,y-1,.05),(x,y-1,.6),.08,METAL)
    box('Table book',(x-.08,y-1,.647),(.33,.26,.035),FABRIC,.004)
    rod('Bud vase',(x+.2,y-.85,.63),(x+.2,y-.85,.85),.065,METAL)

def stool(x,y):
    box('Operator seat',(x,y,.77),(.58,.53,.14),FABRIC,.065)
    box('Operator back',(x,y+.23,1.04),(.56,.1,.46),FABRIC,.055)
    rod('Seat stem',(x,y,.08),(x,y,.75),.045,SILVER)
    for a in [0,1.57,3.14,4.71]:rod('Seat foot',(x,y,.08),(x+math.cos(a)*.3,y+math.sin(a)*.3,.06),.027,SILVER)

def truss(x,y,z,length):
    for yy in [-.18,.18]:
        for zz in [-.18,.18]:rod('Truss chord',(x-length/2,y+yy,z+zz),(x+length/2,y+yy,z+zz),.025,SILVER)
    for i in range(int(length/.8)):
        xx=x-length/2+i*.8
        for yy in [-.18,.18]:rod('Truss diagonal',(xx,y+yy,z-.18),(xx+.8,y+yy,z+.18),.015,SILVER)

def bake_vertex_occlusion():
    """Offline, deterministic hemisphere ray casting. No live SSAO pass needed.

    Vertex colours carry contact shading in GLB; surface colours stay editable.
    Rays are limited to 1.8m so the hall does not become uniformly dark.
    """
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    vertices=[]; polygons=[]
    for o in meshes:
        if o.active_material in [GLASS,WARM,WHITE,GREEN]:continue
        offset=len(vertices);vertices.extend(o.matrix_world@v.co for v in o.data.vertices)
        polygons.extend(tuple(offset+i for i in p.vertices) for p in o.data.polygons)
    tree=BVHTree.FromPolygons(vertices,polygons)
    directions=[]
    for i in range(8):
        z=math.sqrt((i+.5)/8);r=math.sqrt(1-z*z);a=i*2.39996
        directions.append(Vector((r*math.cos(a),r*math.sin(a),z)))
    for o in meshes:
        colors=o.data.color_attributes.new(name='Architectural AO',type='FLOAT_COLOR',domain='POINT')
        o.data.color_attributes.active_color=colors
        normals=o.matrix_world.to_3x3().inverted().transposed()
        for v in o.data.vertices:
            shade=1
            if o.active_material not in [GLASS,WARM,WHITE,GREEN]:
                normal=(normals@v.normal).normalized()
                rot=Vector((0,0,1)).rotation_difference(normal)
                pos=o.matrix_world@v.co+normal*.008
                shade=.46+.54*sum(tree.ray_cast(pos,rot@d,1.8)[0] is None for d in directions)/len(directions)
            colors.data[v.index].color=(shade,shade,shade,1)

def merge_export(key, occlusion=True):
    # Merge by material: the whole architectural kit takes ~10 draw calls.
    if occlusion:bake_vertex_occlusion()
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    groups={mat:[o for o in meshes if o.active_material==mat] for mat in set(o.active_material for o in meshes)}
    for mat,group in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        bpy.ops.object.join(); bpy.context.object.name=mat.name
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{key}.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_animations=False,export_vertex_color='ACTIVE')

def render(key):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
    scene.cycles.use_denoising=True
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='OPTIX'
        scene.cycles.device='GPU'
    except Exception:pass
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.28,.34,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    box('Render-only floor',(0,2,-.07),(80,80,.1),STONE,.01)
    for pos,power,size in [((0,-5,11),2600,8),((-8,3,10),1800,6),((8,7,12),2100,7)]:
        bpy.ops.object.light_add(type='AREA',location=pos)
        o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size
        o.rotation_euler=(Vector((0,3,2))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(13,-17,9))
    camera=bpy.context.object;camera.rotation_euler=(Vector((0,3,3.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=43;scene.camera=camera
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(QA/f'{key}.png')
    bpy.ops.render.render(write_still=True)

clear()
# Flagship stage: a broad architectural plinth, stepped centre aisle and
# staggered scenic fins. Screens and show lighting remain live in WebGL.
box('Flagship stage deck',(0,-11,.8),(80,22,1.6),BLACK,.06)
box('Brushed fascia',(0,-22.02,.8),(80,.08,1.6),BLACK)
box('Continuous deck edge',(0,-22.08,1.57),(80,.035,.055),WARM,.01)
for i in range(5):
    h=1.6-i*.32
    box('Wide floating stair',(0,-22.6-i*.8,h/2),(20+i*1.3,.85,h),BLACK,.03)
    box('Recessed stair light',(0,-23.02-i*.8,h-.035),(19.9+i*1.3,.026,.035),WARM,.006)
box('Upstage architectural wall',(0,.45,8.1),(82,.75,16.2),BLACK)
for side in [-1,1]:
    for i,x in enumerate([12.3,13.1,14,16.2,30.6,31.5,39.2]):
        h=12.8 if i<3 else 10.5+(i%2)*2.3
        box('Layered scenic fin',(side*x,-.35,1.6+h/2),(.28,1.2,h),BLACK)
        box('Scenic fin edge',(side*x,-.97,1.6+h/2),(.045,.028,h-.12),WARM,.005)
    box('Outer framing tower',(side*40.5,-1.8,7.5),(1.2,3.2,15),BLACK)
    for yy in [-2,-11,-20]:
        rod('Roof stay',(side*38,yy,15.4),(side*38,yy,17),.045,SILVER)
for yy in [-2,-11,-20]:truss(0,yy,15.1,80)
for xx in [-35,-20,0,20,35]:
    for yy in range(-19,0,4):
        box('Acoustic ceiling slat',(xx,yy,16.2),(14,.24,.18),METAL,.02)
merge_export('flagship-stage',False)

clear()
# Repeatable 26 m gallery hall bay, kept as one material-batched asset.
for side in [-1,1]:
    box('Hall wall',(side*19,0,7.5),(.3,26,15),STONE,.015)
    for yy in [-12.7,0,12.7]:
        box('Exhibition column',(side*18.7,yy,7.1),(.42,.52,14.2),SILVER,.04)
    box('High wall cove',(side*18.8,0,11.8),(.035,26,.08),WARM,.01)
    box('Architectural skirting',(side*18.8,0,.12),(.035,26,.05),WARM,.006)
box('Acoustic ceiling',(0,0,15.1),(38,26,.2),BLACK,.01)
for yy in [-10,-3.4,3.4,10]:
    truss(0,yy,14.3,37.4)
    for xx in [-15,-9,-3,3,9,15]:
        box('Recessed ceiling fixture',(xx,yy,14.9),(1.0,.36,.08),WARM,.025)
for xx in range(-18,19,2):box('Ceiling acoustic baffle',(xx,0,14.95),(.07,26,.2),METAL,.01)
merge_export('hall-bay',False)


print('EXPO_COMPLETE',flush=True)
