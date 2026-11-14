"""Reconstruct the P01 PDF study. Metres, X across, +Y inward, Z up.
Editable source remains unmerged; web export batches by material.
No surveyed/structural claims. Logo contours are provisional.
Run: blender --background --python scripts/blender/build_entrance_p01.py
"""
import bpy, bmesh, math, random, json
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/blender/entrance-p01'
WEB = ROOT / 'public/models/entrance'
OUT.mkdir(parents=True, exist_ok=True)
WEB.mkdir(parents=True, exist_ok=True)
random.seed(21026)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, shade, rough=.8):
    m=bpy.data.materials.new(name); m.diffuse_color=(*([shade]*3),1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Roughness'].default_value=rough
    return m
CLAY=material('P01 | warm white clay',.73)
TRIM=material('P01 | raised trim and letters',.88,.5)
LED=material('P01 | blank LED faces',.39,.6)
LEAF=material('P01 | leaf clay',.52)
WOOD=material('P01 | branch clay',.4)
SOIL=material('P01 | recessed soil',.24)
WATER=material('P01 | neutral rill face',.31,.3)
JOINT=material('P01 | service and reveal',.32)

def mesh(name, verts, faces, mat=CLAY):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob); me.materials.append(mat)
    return ob

def box(name, loc, dims, mat=CLAY, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); ob=bpy.context.object; ob.name=name
    ob.dimensions=dims; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(mat)
    if bevel:
        mod=ob.modifiers.new('Soft manufactured edge','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return ob

def rod(name,a,b,r,mat=WOOD,r2=None):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=r2 if r2 is not None else r,depth=d.length,location=(a+b)/2)
    ob=bpy.context.object; ob.name=name; ob.rotation_euler=d.to_track_quat('Z','Y').to_euler(); ob.data.materials.append(mat)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def bow(x):return -.9*(1-(x/10.6)**2)

# One closed U-shaped body. Upper opening arcs are exactly tangent at R650.
profile=[(-10.6,0),(-10.6,11)]
profile += [(x,11+math.sqrt(max(0,1-(x/10.6)**2))) for x in [-10.6+21.2*i/96 for i in range(1,97)]]
profile += [(10.6,0),(8,0),(8,7.35)]
profile += [(7.35+.65*math.cos(a),7.35+.65*math.sin(a)) for a in [math.pi/2*i/16 for i in range(1,17)]]
profile += [(-7.35,8)]
profile += [(-7.35+.65*math.cos(a),7.35+.65*math.sin(a)) for a in [math.pi/2+math.pi/2*i/16 for i in range(1,17)]]
profile += [(-8,0)]
n=len(profile); flat=[Vector((x,0,z)) for x,z in profile]
tris=tessellate_polygon([flat]); lookup={tuple(v):i for i,v in enumerate(flat)}
faces=[]
for tri in tris:
    ids=[v if isinstance(v,int) else lookup[tuple(v)] for v in tri]; faces += [tuple(reversed(ids)),tuple(i+n for i in ids)]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
portal=mesh('A01-A07 | closed bowed portal and fascia',[(x,depth,z) for depth in (0,1.2) for x,z in profile],faces)
# Tessellate before bending: otherwise the long inner crown edge is a chord,
# leaving letters floating in front of a flat central face.
bm=bmesh.new();bm.from_mesh(portal.data)
bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=12,use_grid_fill=True)
for v in bm.verts:v.co.y+=bow(v.co.x)
bm.to_mesh(portal.data);bm.free()
# Recalculate normals after concave triangulation.
bpy.context.view_layer.objects.active=portal; portal.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); portal.select_set(False)

# Fine U-profile trim, actual tube and recessed channel, including rounded corners.
opening=[(-8,0),(-8,7.35)]
opening += [(-7.35+.65*math.cos(a),7.35+.65*math.sin(a)) for a in [math.pi-math.pi/2*i/24 for i in range(1,25)]]
opening += [(7.35,8)]
opening += [(7.35+.65*math.cos(a),7.35+.65*math.sin(a)) for a in [math.pi/2-math.pi/2*i/24 for i in range(1,25)]]
opening += [(8,0)]
def tube(name,points,r,mat):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=r; c.bevel_resolution=3
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    ob=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(ob); c.materials.append(mat); return ob
tube('A08 | recessed unlit portal channel',[(x,bow(x)-.005,z) for x,z in opening],.105,JOINT)
tube('A08 | rounded portal trim',[(x,bow(x)-.06,z) for x,z in opening],.063,TRIM)

# 96 genuine flutes, 25 mm radial amplitude, complete backs and capped ends.
for side in (-1,1):
    cx=side*10.8; seg=96*8; vs=[]
    for z in (.12,4.58,4.62,9.08):
        vs.extend([(cx+(1.175+.025*math.cos(96*a))*math.cos(a),.6+(1.175+.025*math.cos(96*a))*math.sin(a),z) for a in [2*math.pi*i/seg for i in range(seg)]])
    fs=[tuple(reversed(range(seg))),tuple(3*seg+i for i in range(seg))]
    fs += [(k*seg+i,k*seg+(i+1)%seg,(k+1)*seg+(i+1)%seg,(k+1)*seg+i) for k in range(3) for i in range(seg)]
    col=mesh(f'C01 | {side} full fluted column',vs,fs)
    for p in col.data.polygons:p.use_smooth=True
    for z,h,r in ((.06,.12,1.2),(4.6,.045,1.195),(9.14,.12,1.2)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=192,radius=r,depth=h,location=(cx,.6,z)); ob=bpy.context.object;ob.name=f'C04-C06 | column collar {side} {z}';ob.data.materials.append(TRIM)

# Separate blank active surfaces: all four faces are flat, with flush floor top.
box('L01 | LED FLOOR 16 x 22', (0,-1,-.09),(16,22,.18),LED)
box('L04 | LED WALL LEFT 9.1 x 8',(-8.09,5.45,4),(.18,9.1,8),LED)
box('L05 | LED WALL RIGHT 9.1 x 8',(8.09,5.45,4),(.18,9.1,8),LED)
box('L06 | LED CEILING 16 x 9.1',(0,5.45,8.09),(16,9.1,.18),LED)
box('A07 | neutral throat soffit',(0,.45,8.09),(16,.9,.18))
for s in (-1,1):
    box(f'A07 | neutral throat return {s}',(s*8.09,.45,4),(.18,.9,8))
    box(f'L08 | closed outer enclosure {s}',(s*8.23,5.45,4),(.1,9.1,8))
    for y in (1,3.25,5.5,7.75,9.9):
        box(f'S01 | side support {s} {y}',(s*8.31,y,4),(.08,.08,8),TRIM)
    for z in (2.7,5.4):box(f'S02 | service rail {s} {z}',(s*8.31,5.45,z),(.08,9.1,.06),TRIM)
    box(f'S03 | service hatch {s}',(s*8.3,8.3,1.1),(.035,1,1.9),JOINT,.01)
    box(f'S03 | hatch cover {s}',(s*8.325,8.3,1.1),(.035,.94,1.84),CLAY,.01)
for y in (1,3.25,5.5,7.75,9.9):box(f'S04 | roof cross member {y}',(0,y,8.33),(16.5,.07,.3),TRIM)
for x in (-8.25,0,8.25):box(f'S04 | roof longitudinal {x}',(x,5.45,8.33),(.07,9.1,.3),TRIM)
for x in (-7.7,-4.6,-1.5,1.6,4.7,7.8):
    box(f'A05 | rear fascia access panel {x}',(x,bow(x)+1.22,9.75),(1.35,.04,1.4),CLAY,.015)

# Raised wordmark. Individual letters follow the curved surface.
fontfile=Path('C:/Windows/Fonts/arialbd.ttf')
font=bpy.data.fonts.load(str(fontfile)) if fontfile.exists() else None
word='LIVEGRID AV'; widths=[]
for char in word:
    c=bpy.data.curves.new('letter','FONT');c.body=char;c.size=1.6;c.extrude=.06;c.bevel_depth=.008;c.bevel_resolution=2
    if font:c.font=font
    ob=bpy.data.objects.new('B01 | '+char,c);bpy.context.collection.objects.link(ob);c.materials.append(TRIM)
    bpy.context.view_layer.update(); widths.append((ob,max(ob.dimensions.x,.55)))
total=sum(w for _,w in widths)+.12*(len(widths)-1); x=-total/2+1
for ob,w in widths:
    ob.location=(x,bow(x)-.035,9.25);ob.rotation_euler=(math.pi/2,0,math.atan(1.8*x/10.6**2));x+=w+.12
# Provisional faceted emblem, three separated triangular solids around centre.
cx=-7.8;cz=10.02
for k in range(6):
    a=math.pi/3*k+math.pi/6;b=a+math.pi/3
    pts=[(cx+.06*math.cos(a+.5),cz+.06*math.sin(a+.5)),(cx+.96*math.cos(a),cz+.96*math.sin(a)),(cx+.96*math.cos(b),cz+.96*math.sin(b))]
    vs=[(x,bow(x)-d,z) for d in (.045,.18 if k%2 else .13) for x,z in pts]
    mesh(f'B02 | provisional emblem facet {k}',vs,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],TRIM)

# Below-datum platform, separate landing and slim side circulation strips.
box('F01 | entrance platform',(0,1,-.3),(30,26,.24))
box('F02 | open rear landing',(0,12,-.09),(16,4,.18))
for s in (-1,1):
    box(f'F03 | side walking strip {s}',(s*8.8,-7,-.09),(1.6,10,.18))
    box(f'F04 | outer perimeter {s}',(s*14.75,1,-.09),(.5,26,.18))
    # Hollow planter bodies with true rim, soil and closed base.
    px=s*12.65
    box(f'P01 | planter base {s}',(px,-7,.09),(3.7,10,.18))
    for x in (s*10.86,s*14.44):box(f'P02 | long rim {s} {x}',(x,-7,.275),(.12,10,.55),CLAY,.015)
    for y in (-11.94,-2.06):box(f'P03 | end rim {s} {y}',(px,y,.275),(3.7,.12,.55),CLAY,.015)
    box(f'P04 | soil recess {s}',(px,-7,.35),(3.46,9.76,.14),SOIL)
    box(f'P05 | rill basin {s}',(s*10.2,-7,-.15),(1.2,10,.1),CLAY)
    box(f'P06 | neutral water {s}',(s*10.2,-7,-.075),(1.04,9.84,.01),WATER)
    for x in (s*9.64,s*10.76):box(f'P07 | rill coping {s} {x}',(x,-7,-.05),(.08,10,.3),CLAY,.015)
    for y in (-11.96,-2.04):box(f'P07 | rill ends {s} {y}',(s*10.2,y,-.05),(1.2,.08,.3),CLAY,.015)

# Leaf geometry: folded, tapering lamina, no spheres, sprites or alpha textures.
leafverts=[]; leaffaces=[]
def leaf(center,length,width,angle,tilt):
    p=Vector(center); u=Vector((math.cos(angle),math.sin(angle),tilt)).normalized(); v=Vector((-math.sin(angle),math.cos(angle),0)); base=len(leafverts)
    for t,w,h in ((0,0,0),(.3,-.8,.025),(.52,0,.07),(.3,.8,.025),(.72,-.6,.015),(.72,.6,.015),(1,0,-.03)):
        leafverts.append(tuple(p+u*(t*length)+v*(w*width)+Vector((0,0,h*length))))
    leaffaces.extend([tuple(base+i for i in f) for f in ((0,1,2),(0,2,3),(1,4,2),(3,2,5),(4,6,2),(2,6,5))])
for s in (-1,1):
    for tree in range(3):
        x=s*(12.6+random.uniform(-.35,.35));y=-10.4+tree*3.45+random.uniform(-.25,.25);height=random.uniform(3.3,4.3)
        rod('N01 | flared trunk',(x,y,.4),(x+.1,y,height*.64),.13,r2=.055)
        for k in range(9):
            a=k*2.4+random.random();reach=random.uniform(.65,1.15);end=(x+reach*math.cos(a),y+reach*math.sin(a),height+random.uniform(-.55,.3))
            rod('N02 | tapered branch',(x+.05,y,height*random.uniform(.4,.65)),end,.045,r2=.012)
            for j in range(65):
                ang=random.random()*math.tau;r=math.sqrt(random.random())*.65
                p=(end[0]+r*math.cos(ang),end[1]+r*math.sin(ang),end[2]+random.uniform(-.45,.4))
                leaf(p,random.uniform(.18,.31),random.uniform(.045,.075),random.random()*math.tau,random.uniform(-.5,.8))
    for i in range(32):
        x=s*random.uniform(11.25,14);y=random.uniform(-11.55,-2.45)
        for j in range(25):
            a=random.random()*math.tau;r=random.random()*.32
            leaf((x+r*math.cos(a),y+r*math.sin(a),.45+random.random()*.55),random.uniform(.25,.5),.08,a,random.uniform(.2,1.2))
    for i in range(11):
        x=s*random.uniform(11.3,14);y=random.uniform(-11.4,-2.6)
        for k in range(7):
            a=k*math.tau/7+random.random()*.3
            for j in range(1,11):
                t=j/11;p=(x+t*.7*math.cos(a),y+t*.7*math.sin(a),.45+math.sin(t*math.pi*.8)*.7)
                for d in (-1,1):leaf(p,(1-t)*.27+.04,.035,a+d*1.05,.1)
    for i in range(12):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(s*random.uniform(11.3,14),random.uniform(-11.5,-2.5),.48))
        ob=bpy.context.object;ob.name='N05 | partially buried rock';ob.scale=(random.uniform(.18,.48),random.uniform(.2,.5),random.uniform(.16,.4));ob.data.materials.append(CLAY)
mesh('N03-N04 | individually modeled tree leaves shrubs and fern leaflets',leafverts,leaffaces,LEAF)

# Source opens in a useful perspective; no modifications to the user's gallery file.
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=39
        area.spaces.active.region_3d.view_location=(0,0,5)
        area.spaces.active.clip_end=1000
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Livegrid_AV_Entrance_P01.blend'))
inventory=[{'name':o.name,'type':o.type} for o in bpy.context.scene.objects]
# Only web copy is merged, keeping LED elements separate and inspectable.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
for m in list(bpy.data.materials):
    if m==LED:continue
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
    if not obs:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=m.name
bpy.ops.export_scene.gltf(filepath=str(WEB/'entrance-p01.glb'),export_format='GLB',export_apply=True)
report={'source':'Visual Brief P01, 21 October 2026','units':'metres','world_front_z':-14.4,'rear_landing_world_z':-28.4,'width':24,'height':12,'opening':[16,8],'tunnel_depth':10,'floor':[16,22],'LED_gross_area_m2':643.2,'logo':'provisional contours','source_objects':inventory,'web_meshes':len([o for o in bpy.context.scene.objects if o.type=='MESH'])}
(OUT/'parameters-and-inventory.json').write_text(json.dumps(report,indent=2))
print('P01_EXPORT_COMPLETE',json.dumps({k:v for k,v in report.items() if k!='source_objects'}))
