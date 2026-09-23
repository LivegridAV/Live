"""Reproducible bespoke expo assets. Run with Blender --background --factory-startup.

Blender X/Y/Z maps to website X/-Z/Y. Front is -Y. All dimensions are metres.
Only this script's newly created scene is used; no existing .blend is opened.
"""
import bpy
import math
import json
import random
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/expo"
QA = ROOT / "qa/blender/expo"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
FONT = bpy.data.fonts.load("C:/Windows/Fonts/segoeui.ttf")

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
    bpy.ops.object.text_add(location=pos,rotation=(math.pi/2,0,0))
    o=bpy.context.object; o.name='Lettering '+body; o.data.body=body; o.data.font=FONT
    o.data.size=size; o.data.extrude=.002; o.data.resolution_u=3; o.data.materials.append(mat)
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

LABELS = [
 ('av-engineering','AV ENGINEERING','DESIGN / INTEGRATE / DELIVER'),
 ('content-studio','CONTENT STUDIO','IDEAS / CONTENT / EXPERIENCES'),
 ('led-solutions','LED DISPLAY SOLUTIONS','SCREEN TECHNOLOGY / CREATIVE APPLICATION'),
 ('spatial','IMMERSIVE EXPERIENCES','PROJECTION / SPACE / STORY'),
 ('show-control','SHOW CONTROL','CUES / TIMELINES / AUTOMATION'),
 ('live-production','LIVE PRODUCTION','CAPTURE / SWITCH / STREAM'),
 ('connected-events','CONNECTED EVENTS','ONE EVENT / EVERY AUDIENCE'),
 ('digital','DIGITAL EXPERIENCES','DESIGN / BUILD / CONNECT'),
 ('partner-bay','SOUND & LIGHTING','WITH TRUSTED PRODUCTION PARTNERS'),
]

# Website-space display apertures (x, height, -depth, width, height).
LAYOUTS={}
def display(x,y,z,w,h,media,rotation=0):
    box('Inset display carcass',(x,y+.07,z),(w+.12,.14,h+.12),SCREEN,.035)
    LAYOUTS[current].append(dict(x=x,y=z,z=-y+.011,w=w,h=h,media=media,rotation=rotation))

def booth(index,key,title,sub):
    clear(); global current; current=key; LAYOUTS[key]=[]
    box('Stone island',(0,3.25,.10),(13,8.2,.20),STONE,.08)
    box('Floating perimeter',(0,-.84,.12),(12.9,.045,.06),WARM,.012)
    for x in [-6.43,6.43]:box('Island side reveal',(x,3.2,.12),(.035,8,.05),WARM,.008)
    box('Architectural back wall',(0,7.1,3.9),(13,.28,7.6),BLACK,.06)
    # Inlaid stone platform, panel joints and a recessed champagne skirting.
    for xx in [-4.3,0,4.3]:box('Stone floor joint',(xx,3.2,.203),(.012,8,.004),BLACK,.001)
    for yy in [1.3,3.4,5.5]:box('Stone transverse joint',(0,yy,.203),(12.9,.012,.004),BLACK,.001)
    for xx in [-6,6]:
        box('Layered return panel',(xx,6.82,3.9),(.5,.14,7.2),TRAVERTINE,.015)
        box('Return panel reveal',(xx-.29,6.73,3.9),(.025,.028,7.1),WARM,.004)
    # Every silhouette is different: corner gallery, horizontal glass canopy,
    # concentric portal, suspended ring, asymmetric fin, technical lattice.
    if index in [0,4,5]:
        # The three bays share one external shell, not three repeated facades.
        for x in [-6.2,6.2]:
            box('Technical wall return',(x,6.1,3.8),(.18,1.8,7.4),BLACK,.04)
        for xx in range(-5,7):box('Suspended soffit blade',(xx,2.2,6.98),(.065,5.5,.22),METAL,.012)
        downlights(0,2.2,6.92,11,5)
        box('Service lettering band',(0,6.68,6.8),(11.7,.25,.52),BLACK)
        text(title,(-5.65,6.53,6.64),.38)
        fins(-5.9,6.58,3.2,.5,5.3)
        if index==4:
            # Continuous media-operations wall and offset command desk.
            display(-1.8,6.89,4.1,7.9,3.8,'cue-wall')
            display(4.35,6.89,4.1,3.35,3.8,'program')
            console(-1.8,3.7,6.5);console(4.3,5.15,2.7)
            box('Control room floating lintel',(0,3,6.2),(11.4,.8,.42),BLACK)
            box('Control room light slot',(0,2.58,6.05),(11.2,.025,.025),WARM,.005)
            for xx in [-4,-1.8,.4]:stool(xx,2.6)
        elif index==5:
            display(-2.15,6.89,4.35,7.4,4.1,'multiview')
            display(4.1,6.89,4.35,3.55,4.1,'program')
            console(-1.4,4.9,8.2)
            text('ON AIR',(2.55,6.84,6.77),.35,WARM)
            for xx in [-4,-1.4,1.3]:stool(xx,3.8)
            for xx in [-4.8,3.9]:
                for angle in [0,2.094,4.189]:
                    rod('Camera tripod',(xx+math.cos(angle)*.56,2.2+math.sin(angle)*.56,.2),(xx,2.2,1.62),.026,SILVER)
                box('Broadcast camera',(xx,2.2,1.94),(.35,.65,.37),BLACK)
                rod('Camera lens',(xx,1.7,1.94),(xx,1.95,1.94),.15,BLACK)
                box('Camera viewfinder',(xx+.26,2.35,2.08),(.25,.18,.15),BLACK)
        else:
            for xx in [-4.25,0,4.25]:
                display(xx,6.89,4.25,3.95,2.55,f'{index}-{int(xx)}')
                console(xx,5.2,3.6)
            for xx in [-4.25,0,4.25]:stool(xx,4)
    elif index==1:
        # Reference 4: monumental media volume next to a sheltered salon.
        box('Content studio gallery platform',(8.9,3.25,.1),(5.75,8.2,.2),STONE,.055)
        box('Gallery plinth light',(8.9,-.84,.12),(5.7,.045,.055),WARM,.008)
        box('Monumental media volume',(2.1,5.3,4.6),(7.65,3.65,8.8),BLACK,.05)
        display(2.1,3.455,4.65,7.48,7.75,'content-anamorphic')
        box('Deep studio portal lintel',(-3.85,1.35,7.5),(5.3,5.4,1.25),BLACK,.04)
        box('Stone studio portal jamb',(-6.25,1.5,3.65),(.48,5.4,7.2),TRAVERTINE)
        for xx in [-6,-5.7]:box('Portal light reveal',(xx,-1.34,3.7),(.025,.03,7.15),WARM,.004)
        box('Canopy warm cut',(-3.85,-1.37,6.91),(5.1,.03,.055),WARM,.008)
        downlights(-3.7,1.4,6.84,4.6,4.5)
        ring('Floating studio halo',(-3.8,3.25,6.35),2.05,.12,METAL)
        ring('Halo downlight',(-3.8,3.25,6.27),2.05,.025,WARM)
        for i in range(32):
            a=i*math.tau/32
            rod('Champagne pendant fringe',(-3.8+math.cos(a)*1.85,3.25+math.sin(a)*1.85,5.7),(-3.8+math.cos(a)*1.85,3.25+math.sin(a)*1.85,6.25),.012,METAL)
        display(-3.95,6.86,3.65,3.65,2.1,'content-motion')
        display(-6,1.0,3.1,.42,3.6,'content-motion')
        counter(-3.7,-.12,3.5); lounge(-3.8,4.6)
        # A shallow reflective basin ties the virtual sculpture to real scenery.
        box('Hero reflecting basin',(2.25,1.86,.37),(7.1,2.4,.34),BLACK,.045)
        box('Obsidian reflecting water',(2.25,1.84,.548),(6.88,2.18,.018),WATER,.015)
        for i,(xx,yy,scale) in enumerate([(-.7,2.2,.68),(4.8,1.3,.46),(4.3,2.5,.28)]):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=(xx,yy,.59+scale*.45))
            o=bpy.context.object;o.name='Basalt scenic outcrop';o.scale=(scale,scale*.7,scale*.75);o.rotation_euler=(.2*i,.33*i,i);o.data.materials.append(STONE)
            for vertex in o.data.vertices:
                vertex.co *= 1+.12*math.sin(vertex.co.x*13+vertex.co.y*7+vertex.co.z*9)
            for polygon in o.data.polygons:polygon.use_smooth=True
        for yy in [3.8,4.5,5.2,5.9]:box('Studio wall vertical fin',(-6.04,yy,3.3),(.13,.07,5.8),METAL,.01)
        box('Studio portfolio wall',(8.9,6.82,3.8),(5.75,.5,7.4),BLACK,.04)
        box('Portfolio fascia',(8.9,6.35,7.02),(5.75,1.2,1),BLACK,.04)
        text('LivegridAV',(6.5,5.74,7.02),.66)
        text('VISUALS FOR A BRIGHTER TOMORROW',(6.5,5.73,6.62),.145)
        for row in range(3):
            for col in range(2):
                display(7.5+col*2.53,6.53,5.3-row*1.65,2.36,1.44,'content-anamorphic' if (row+col)%2 else 'content-motion')
        text('CREATIVE TECHNOLOGY / HUMAN IMPACT',(6.5,6.54,.7),.15)
        planter(10.8,3.0,39)
    elif index==2:
        box('Offset cantilever',(-1.4,1.2,7.3),(10.1,4.5,1.15),BLACK)
        box('Technical end fin',(-6.2,2.6,3.9),(.46,6.6,7.7),BLACK)
        for xx,h in [(-4.5,4.6),(-1.8,6.1)]:
            box('Wrapped LED sample column',(xx,4,h/2+.22),(1.8,1.8,h),SCREEN)
            display(xx,3.09,h/2+.22,1.78,h,'wrap')
        display(2.5,6.86,4.1,5.7,4.1,'hero'); counter(2,0,4.2)
    elif index==3:
        for j in range(3):
            yy=1+j*2.1
            for xx in [-5.8,5.8]:box('Immersive portal pier',(xx,yy,3.5),(.32,.38,6.6),BLACK)
            box('Immersive portal beam',(0,yy,6.8),(11.9,.38,.4),BLACK)
            box('Portal light',(0,yy-.2,6.6),(11.4,.025,.035),WARM,.006)
        display(0,6.85,3.6,10.8,5.8,'hero'); counter(-3.3,-.05,3)
    elif index==6:
        ring('Connected canopy',(0,3.4,6.7),4.45,.3,BLACK)
        ring('Connected halo',(0,3.4,6.5),4.45,.04,WARM)
        for xx in [-5.9,5.9]:box('Slender link support',(xx,4,3.5),(.25,4.6,6.6),METAL)
        display(-2.6,6.87,3.7,6.7,3.9,'hero')
        display(3.95,6.85,3.7,3.7,4.8,'remote'); lounge(2.5,3.8); counter(-2,0,3.8)
    elif index==7:
        for xx in [-5.5,-4.8,-4.1]:box('Digital architectural fin',(xx,2.8,3.7),(.14,6.3,7.1),METAL)
        box('Asymmetric fascia',(0,1.4,7),(12,4.8,1.1),BLACK)
        display(1.1,6.87,4.3,8.8,4.8,'hero')
        console(1,3.7,5.7); counter(1,-.05,4.2)
    else:
        for xx in [-6,6]:
            box('Production tower',(xx,4,3.7),(.7,1,7.2),BLACK)
            for j in range(5):box('Line array element',(xx*.76,4,5.4-j*.4),(.8,.65,.34),BLACK,.025)
        truss(0,3.9,7.4,12)
        display(0,6.86,4,7.7,4.2,'hero');console(0,2.8,5);counter(-3,-.1,3)
    # Branding lives on the architecture, never floating across the aisle.
    if index in [0,4,5]:
        text(sub,(-5.6,6.52,6.22),.17)
    elif index==1:
        text('LivegridAV',(-6.1,-1.38,7.57),.78)
        text('CONTENT STUDIO',(-6.1,-1.38,7.13),.24)
    else:
        text('LivegridAV',(-5.4,6.89,7.13),.65)
        text(title,(-5.4,6.88,6.73),.25)
    if index not in [1,2,3]:text(sub,(-5.5,6.88,2.44),.15)
    # Edge-lit smoked-glass wayfinding and natural accents at the threshold.
    box('Illuminated glass monolith',(5.15,-.18,1.2),(1.15,.16,2.1),GLASS,.065)
    for xx in [4.58,5.72]:box('Glass edge',(xx,-.26,1.2),(.021,.024,2),WHITE,.005)
    text(f'{[1,4,5,6,2,3,7,8,9][index]:02}',(4.84,-.275,1.57),.4)
    text('EXPLORE',(4.75,-.276,1.15),.14)
    planter(5.45,1.1,index)
    planter(-5.35,5.8,index+4)
    if index in [2,3,7,8]:
        fins(5.7,6.65,3.5,.6,5.9)
        downlights(0,2.2,6.5,10,4)

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

for index,(key,title,sub) in enumerate(LABELS):
    booth(index,key,title,sub)
    merge_export(key)
    if index in [0,1,6] and '--no-preview' not in sys.argv:render(key)
    print('EXPO_ASSET',key,(OUT/f'{key}.glb').stat().st_size,flush=True)

clear()
# Reference 5: one continuous technical wing, with three distinct operating
# stations and furnished connecting salons. Local X maps down the boulevard.
box('Technical pavilion graphite crown',(-8.3,1.55,8.3),(13.8,6.0,1.7),BLACK,.065)
box('Technical pavilion glass crown',(6.4,1.55,8.3),(15.6,6.0,1.7),GLASS,.065)
for xx in [-15.4,14.4]:
    box('Technical pavilion end pier',(xx,2.1,4.1),(.5,7.2,8.2),BLACK,.055)
    box('Illuminated end reveal',(xx-.28,-1.55,4.1),(.035,.035,8.05),WARM,.007)
for yy in [-1.48,4.57]:
    box('Continuous canopy cornice',(0,yy,7.43),(30.5,.07,.08),METAL,.012)
    box('Continuous canopy opal edge',(0,yy-.045,7.4),(30.4,.025,.045),WARM,.007)
for xx in [0,14.2]:box('Glazed crown mullion',(xx,-1.48,8.3),(.045,.06,1.64),SILVER,.008)
box('Technical reception apron',(0,-.8,.1),(30.5,3.3,.2),STONE,.055)
counter(-.5,-1.0,9.2)
for xx in [-12,11.5]:
    lounge(xx,-.3)
    planter(xx-1.7,-1.5,45+int(xx))
    box('Technical glass screen',(xx,-2,1.35),(2.1,.11,2.45),GLASS,.06)
    text('IDEAS / SYSTEMS',(xx-.85,-2.07,1.66),.17)
    text('PEOPLE / EVENTS',(xx-.85,-2.07,1.3),.17)
text('LivegridAV',(-14.4,-1.49,8.24),1.18)
text('PEOPLE. TECHNOLOGY. EXTRAORDINARY EVENTS.',(-14.3,-1.49,7.72),.24)
text('FROM VISION TO LIVE',(2.4,-1.49,8.45),.36)
text('TECHNICAL / CREATIVE / HUMAN',(2.4,-1.49,7.94),.19)
merge_export('technical-wing')

clear()
# A hospitality wall gives the tall pillar installation a real expo context.
box('Pillar forum feature wall',(0,.18,3.5),(21,.36,7),BLACK,.055)
box('Forum stone wainscot',(0,-.05,1.2),(20.9,.16,2.2),TRAVERTINE,.025)
box('Forum floating cornice',(0,-.8,6.7),(21,1.7,.32),BLACK)
box('Forum wall wash',(0,-.15,6.49),(20.7,.025,.05),WARM,.005)
for xx in [-9,-6,6,9]:fins(xx,-.18,4.1,1,4.7)
text('LivegridAV',(-3.4,-.08,4.8),.92)
text('VISUAL EXPERIENCES',(-3.4,-.09,4.12),.27)
text('THAT MOVE PEOPLE',(-3.4,-.09,3.7),.27)
counter(0,-1.5,4.6);lounge(-6.6,-2.6);lounge(6.6,-2.6)
planter(-9.5,-2.4,78);planter(9.5,-2.4,81)
merge_export('pillar-forum')

clear()
# A curved hospitality island, object-level detail is batched into materials.
for xx in [-4,4]:
    lounge(xx,1.8)
    planter(xx*1.55,2.8,int(xx)+90)
counter(0,-1.2,5.5)
box('Gallery hospitality wall',(0,4.5,3.6),(15,.3,7.2),BLACK)
text('LivegridAV',(-5.7,4.32,6.1),.75)
text('EXPERIENCE / CONNECT / CREATE',(-5.65,4.3,5.54),.23)
for xx in [-7.2,7.2]:fins(xx,4.23,3.6,.4,6.8)
box('Hospitality wall cove',(0,4.29,7.0),(14.6,.04,.03),WARM,.006)
merge_export('gallery-salon')

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

(OUT/'screen-layouts.json').write_text(json.dumps(LAYOUTS,indent=2))
print('EXPO_COMPLETE',flush=True)
