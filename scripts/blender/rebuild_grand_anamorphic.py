"""Grand Content Studio and anamorphic corner: genuine same-volume interior.

Native Three XYZ metres. New assets only; selected sculpture artwork, folded
LED, basin and gallery identity are retained. No legacy camera-ray room fit.
"""
from pathlib import Path
import hashlib

OLD=Path(__file__).with_name('rebuild_anamorphic_stall.py')
exec(compile(OLD.read_text(encoding='utf-8').split('# Tall convex L-corner')[0],str(OLD),'exec'))
HUMAN_HELPER=Path(__file__).with_name('technical_humans.py')
exec(compile(HUMAN_HELPER.read_text(encoding='utf-8'),str(HUMAN_HELPER),'exec'))
CFG=json.loads((ROOT/'public/models/expo/grand-dimensions.json').read_text())
M=CFG['master'];F=M['floor'];TOP=M['fasciaTop'];OUTDIR=ROOT/'public/models/expo'
ROOT_ANCHOR=CFG['placements']['anamorphic']['root'];ROOT_YAW=CFG['placements']['anamorphic']['yaw']
APERTURES=[];JETS=[];ROLE_BOUNDS=[];EXPORTS={};SIGNS=[];PLANTS=[]
FOLD=(4.10,1.60);LW=7.10;RW=9.0;BOTTOM=.80;LED_TOP=11.70
BOTANIC=material('Content Studio | natural varied olive foliage',(.055,.105,.030),0,.74)
SOIL=material('Content Studio | granular dark potting soil',(.018,.012,.007),0,.97)
STEM=material('Content Studio | natural branch bark',(.11,.075,.039),0,.86)
leaf_maps=ROOT/'public/media/projection-mapping-v11/botanical'
for filename,socket,normal in(('leaf-atlas-basecolor.png','Base Color',False),('leaf-atlas-normal.png','Normal',True)):
    image=bpy.data.images.load(str(leaf_maps/filename),check_existing=True);image.pack()
    image_node=BOTANIC.node_tree.nodes.new('ShaderNodeTexImage');image_node.image=image
    bsdf=BOTANIC.node_tree.nodes.get('Principled BSDF')
    if normal:
        image.colorspace_settings.name='Non-Color'
        detail=BOTANIC.node_tree.nodes.new('ShaderNodeNormalMap');detail.inputs['Strength'].default_value=.20
        BOTANIC.node_tree.links.new(image_node.outputs['Color'],detail.inputs['Color']);BOTANIC.node_tree.links.new(detail.outputs['Normal'],bsdf.inputs['Normal'])
    else:BOTANIC.node_tree.links.new(image_node.outputs['Color'],bsdf.inputs[socket])

def bounds(objects):
    bpy.context.view_layer.update();pts=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    return {'min':[min(p.x for p in pts),min(p.z for p in pts),-max(p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),-min(p.y for p in pts)]} if pts else None

def record(role,before,overhead=False):
    objects=set(bpy.context.scene.objects)-before
    for ob in objects:
        if ob.type=='MESH':ob['grandRole']='section-wall' if role=='gallery-wall' else role;ob['grandOverhead']=overhead
    ROLE_BOUNDS.append({'role':role,'bounds':bounds(objects),'overhead':overhead});return objects

def lift_native(before):
    objects=set(bpy.context.scene.objects)-before
    for ob in objects:
        if ob.parent not in objects:ob.location.z+=F

def batch_export(name,objects):
    bpy.context.view_layer.update();meshes=[ob for ob in objects if ob.type=='MESH']
    for ob in meshes:
        matrix=ob.matrix_world.copy();ob.data=ob.data.copy();ob.parent=None;ob.matrix_world=matrix
    groups={}
    for ob in meshes:
        key=(ob.get('grandRole','detail'),ob.get('grandOverhead',False),ob.data.materials[0].name)
        groups.setdefault(key,[]).append(ob)
    result=[]
    for (role,overhead,finish),items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in items:ob.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        ob=bpy.context.view_layer.objects.active;ob.name=f'{name} | {role} | {finish}';ob['grandRole']=role;ob['grandOverhead']=overhead
        ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4);ob.data.update();result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:ob.select_set(True)
    path=OUTDIR/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
    EXPORTS[name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'bounds':bounds(result)}

def label(body,p,height,width,yaw=0,tracking=1.05,centered=False):
    # Existing lettering is a genuine font mesh. Fit uniformly to real width.
    ob=text(body,p,height,yaw,centered,tracking)
    natural=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
    factor=min(1,width/max(natural,.001))
    for v in ob.data.vertices:v.co*=factor
    SIGNS.append({'body':body,'position':list(p),'yaw':yaw,'availableWidth':width,'measuredWidth':natural*factor,'uniformFit':factor,'horizontalAspectRatio':1})
    return ob

# The shell's exact external envelope is independent of furniture and people.
shell_start=set(bpy.context.scene.objects)
before=set(bpy.context.scene.objects)
box('Content Studio shared 24m x16m mineral platform',(0,F/2,0),(24,F,16),STUDIO_FLOOR,.015)
record('platform',before)
before=set(bpy.context.scene.objects)
box('Content Studio fully closed left return',(-11.85,(TOP+F)/2,0),(.30,TOP-F,16),WALL,.018)
record('side-left',before)
before=set(bpy.context.scene.objects)
box('Content Studio complete rear boundary',(0,(TOP+F)/2,-7.85),(23.4,TOP-F,.30),WALL,.018)
record('rear-boundary',before)
before=set(bpy.context.scene.objects)
box('Content Studio same volume ceiling',(-7.30,TOP-.06,0),(8.80,.12,15.4),ROOF,.010)
box('Content Studio ceiling fascia front return',(-7.30,TOP-1.25,7.75),(8.80,2.50,.45),WALL,.018)
label('LivegridAV',(-11.10,TOP-1.28,7.994),1.70,7.60)
label('CONTENT STUDIO',(-11.08,TOP-2.08,7.998),.60,7.55,tracking=1.14)
box('Content Studio reference fascia recessed warm cove',(-7.30,TOP-2.53,7.98),(8.65,.024,.025),COVE,.004)
record('fascia-brand',before,True)
before=set(bpy.context.scene.objects)
box('Content Studio side return interior wall',(-3.10,4.80,-3.08),(.24,9.36,9.24),WALL,.014)
record('studio-return',before)
before=set(bpy.context.scene.objects)
box('Content Studio left entry display blade',(-10.55,5.12,7.65),(2.25,10.0,.28),WALL,.015)
for i,line in enumerate(('IDEAS','CONTENT','EXPERIENCES','REALITY')):label(line,(-11.48,8.95-i*.47,7.81),.42,1.84,tracking=1.08)
box('Content Studio blade quiet underline',(-11.20,6.75,7.813),(.40,.015,.009),BRAND,.002)
aperture('studio-front-portrait',(-10.55,4.10,7.82),2.02,4.20,'studio-coastal-portrait')
record('entry-brand-blade',before)

# Two perpendicular real screen cabinets, with one coincident joining edge.
before=set(bpy.context.scene.objects)
box('Anamorphic continuous left display structural cabinet',(FOLD[0]-LW/2,(BOTTOM+LED_TOP)/2,FOLD[1]-.125),(LW,LED_TOP-BOTTOM,.24),BLACK,.010)
box('Anamorphic continuous right display structural cabinet',(FOLD[0]-.125,(BOTTOM+LED_TOP)/2,FOLD[1]-RW/2),(.24,LED_TOP-BOTTOM,RW),BLACK,.010)
box('Anamorphic left foundation',(FOLD[0]-LW/2,(BOTTOM+F)/2,FOLD[1]-.12),(LW,BOTTOM-F,.40),BLACK,.008)
box('Anamorphic right foundation',(FOLD[0]-.12,(BOTTOM+F)/2,FOLD[1]-RW/2),(.40,BOTTOM-F,RW),BLACK,.008)
record('corner-display-cabinets',before)
before=set(bpy.context.scene.objects)
box('Anamorphic left thick crown',(FOLD[0]-LW/2,(TOP+LED_TOP)/2,FOLD[1]-.15),(LW,TOP-LED_TOP,.40),WALL,.014)
box('Anamorphic right thick crown',(FOLD[0]-.15,(TOP+LED_TOP)/2,FOLD[1]-RW/2),(.40,TOP-LED_TOP,RW),WALL,.014)
record('corner-crown',before,True)

# Right application gallery is a deep wall in the same footprint, facing the
# approach at 22 degrees rather than an unconnected floating picture plane.
gallery_start=set(bpy.context.scene.objects)
GX,GZ=9.10,-2.05;GYAW=-.38;GW=5.20
box('Content Gallery thick exterior volume',(GX,(TOP+F)/2,GZ-.30),(GW,TOP-F,.60),WALL,.016)
box('Content Gallery closed right return',(11.84,(TOP+F)/2,-3.15),(.32,TOP-F,9.7),WALL,.016)
label('LivegridAV',(GX-GW/2+.34,TOP-1.18,GZ+.022),1.1,GW-.68)
label('VISUALS FOR A BRIGHTER TOMORROW',(GX-GW/2+.32,TOP-1.73,GZ+.026),.33,GW-.64,tracking=1.04)
aperture('gallery-upper-portrait',(GX-1.45,8.80,GZ+.04),1.85,2.60,'gallery-ice-vortex')
for i,line in enumerate(('CONTENT','PRODUCTION','VIRTUAL PRODUCTION','LIVE EXPERIENCES','LED SOLUTIONS')):
    label(line,(GX-.25,9.82-i*.41,GZ+.05),.30,2.50)
for row in range(2):
    for col,hint in enumerate(('gallery-human','gallery-silver-object','gallery-landscape')):
        aperture('gallery-'+str(row)+'-'+str(col),(GX-1.68+col*1.68,5.94-row*1.74,GZ+.04),1.56,1.45,hint)
for i,line in enumerate(('STORIES THAT MOVE PEOPLE','CREATIVE TECHNOLOGY','HUMAN IMPACT')):label(line,(GX-GW/2+.42,2.58-i*.48,GZ+.05),.25,GW-.84,tracking=1.12)
record('gallery-wall',gallery_start)

# Studio overhead deliberately spans the actual interior. Reeds stay more than
# 7m above the floor; both ceiling levels are genuinely modelled.
before=set(bpy.context.scene.objects)
CC=(-7.05,2.0)
ellipse_band('Studio oval black acoustic canopy',CC,(3.95,4.20),.40,8.03,8.25,BLACK)
ellipse_band('Studio continuous inner champagne cove',CC,(3.85,4.10),.025,8.015,8.045,COVE)
ellipse_disk('Studio upper inset oval ceiling',CC,(3.52,3.77),8.17,8.23,ROOF)
ellipse_band('Studio inset warm island cove',CC,(2.75,2.90),.023,8.105,8.135,COVE)
for i in range(96):
    a=i*math.tau/96;x=CC[0]+math.sin(a)*3.78;z=CC[1]+math.cos(a)*4.03
    rod('Studio varying satin black hanging reed',(x,7.36+.25*math.sin(i*1.71),z),(x,8.03,z),.014,BLACK,6)
for z in(-6,-2,2,6):
    for x in(-10.6,-7.1,-3.8):
        rod('Studio recessed soffit warm optic',(x,TOP-.19,z),(x,TOP-.22,z),.055,LENS,12)
record('studio-canopy',before,True)
before=set(bpy.context.scene.objects)
for x in(-11.65,-3.35):
    box('Studio full depth concealed side cove',(x,TOP-.30,-.10),(.024,.024,15.1),COVE,.003)
box('Studio rear recessed warm cove',(-7.45,9.17,-7.66),(8.20,.022,.024),COVE,.003)
record('architectural-lighting',before,True)
batch_export('grand-anamorphic-shell',set(bpy.context.scene.objects)-shell_start)

# Occupied room: rear service/gallery and consultation at distinctly separated
# real depths. A 2m central entry route is kept free of actual furniture bounds.
interior_start=set(bpy.context.scene.objects)
before=set(bpy.context.scene.objects)
aperture('studio-rear-landscape',(-7.35,4.72,-7.64),5.80,3.14,'studio-brighter-reality')
record('rear-gallery-screen',before)
before=set(bpy.context.scene.objects)
aperture('studio-left-small-screen',(-11.66,3.05,-3.9),1.60,2.20,'studio-forest',math.pi/2)
record('side-gallery-screen',before)
before=set(bpy.context.scene.objects)
box('Studio rear consultation counter',(-7.2,.62,-6.6),(5.8,1.0,.94),BLACK,.035)
box('Studio rear stone countertop',(-7.2,1.1475,-6.6),(5.86,.055,1.0),STUDIO_STONE,.015)
box('Studio rear service desk concealed toe',(-7.2,.15,-6.11),(5.65,.023,.020),COVE,.003)
label('LivegridAV',(-9.55,.72,-6.11),.55,4.7)
flowers(-5.10,1.18,-6.6,.36)
for xx in(-8.6,-7.9):drinking_glass(xx,1.18,-6.5,mat=CLEAR_GLASS)
record('rear-service-counter',before)
before=set(bpy.context.scene.objects)
sofa(-9.1,-2.9,2.45,0);chair(-10.55,-.55,-90);chair(-8.15,-.55,90);cocktail_table(-9.15,-.55)
lift_native(before)
record('rear-lounge',before)
before=set(bpy.context.scene.objects)
sofa(-4.40,-3.25,1.80,0);chair(-4.45,-.65,170);cocktail_table(-4.40,-1.55)
lift_native(before)
record('inner-consultation',before)
before=set(bpy.context.scene.objects)
box('Studio native scale front reception black carcass',(-9.20,.62,6.78),(3.30,1.0,.95),BLACK,.045)
box('Studio native scale front honed countertop',(-9.20,1.1475,6.78),(3.36,.055,1.01),STUDIO_STONE,.018)
box('Studio reception recessed warm toe',(-9.20,.155,7.264),(3.20,.024,.019),COVE,.003)
label('LivegridAV',(-10.65,.71,7.269),.66,2.90)
flowers(-8.15,1.18,6.75,.34);drinking_glass(-9.75,1.18,6.90,mat=CLEAR_GLASS)
box('Studio slim tablet on reception',(-9.1,1.29,6.75),(.28,.22,.025),BLACK,.011)
record('front-reception',before)

# Basin with deliberate L outline, a narrow continuous lip and actual fractured
# strata. All pieces occupy the forecourt outside the studio entry route.
before=set(bpy.context.scene.objects)
BASIN=[(-.80,1.72),(-.80,4.35),(7.60,4.35),(7.60,-6.75),(5.30,-6.75),(5.30,1.72)]
n=len(BASIN);verts=[(x,y,z) for y in(F,.51) for x,z in BASIN]
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
patch_mesh('Anamorphic closed L basin structural base',verts,faces,BLACK)
for i,a in enumerate(BASIN):
    b=BASIN[(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);yaw=math.atan2(-dz,dx)
    lip=box('Anamorphic basalt basin fine raised lip',((a[0]+b[0])/2,.58,(a[1]+b[1])/2),(length+.012,.14,.075),BLACK,.012);lip.rotation_euler[2]=yaw
    light=box('Anamorphic continuous basin recessed warm toe',((a[0]+b[0])/2,.17,(a[1]+b[1])/2),(length+.008,.022,.018),COVE,.003);light.rotation_euler[2]=yaw
label('LIVE IDEAS   LIVING WORLDS',(.55,.28,4.395),.26,5.60,tracking=1.15)
record('basin',before)
before=set(bpy.context.scene.objects)
# Retain the selected interlocking diagonal granite form with actual irregular
# silhouettes; move its native structure into this genuine front basin.
start=set(bpy.context.scene.objects);fractured_diagonal_slab()
for ob in set(bpy.context.scene.objects)-start:ob.location+=Vector(xyz((3.15,.12,.20)))
for i,(p,r) in enumerate((((6.65,.85,3.18),(.56,.42,.51)),((5.95,.74,-3.9),(.50,.33,.55)),((.14,.70,3.35),(.45,.31,.38)),((4.18,.79,2.25),(.60,.45,.45)))):
    rock('Basin naturally fractured granite fragment',p,r,130+i,4)
record('natural-rocks',before)

def living_tree(x,z,height,seed,pot_radius=.28):
    before=set(bpy.context.scene.objects);rng=random.Random(seed);pot_h=.58
    lathe('Studio brushed planter',x,z,[(pot_radius*.84,F),(pot_radius,F+.06),(pot_radius*.93,F+pot_h)],ALLOY,32)
    disk('Studio visible potting soil',x,z,pot_radius*.85,F+pot_h-.025,F+pot_h-.01,SOIL)
    rod('Studio living woody trunk',(x,F+pot_h,z),(x+.05,F+height*.86,z),.030,STEM,9)
    vertices=[];faces=[];leaf_count=0
    # Irregular secondary twigs form a rounded, full crown instead of regularly
    # spaced thin fronds. Leaf surfaces remain individually curved native meshes.
    for branch in range(19):
        a=branch*2.399+rng.uniform(-.45,.45);t=branch/18
        yy=F+height*(.35+.50*t)+rng.uniform(-.04,.04)
        reach=height*(.15+.095*math.sin(t*math.pi))*rng.uniform(.82,1.10)
        base=Vector((x+.035*t,yy,z));tip=Vector((x+math.cos(a)*reach,yy+height*rng.uniform(.08,.16),z+math.sin(a)*reach))
        rod('Studio irregular natural branch',base,tip,.007,STEM,6)
        for twig in range(4):
            q=.35+twig*.19;origin=base.lerp(tip,q);ta=a+(-1 if twig%2 else 1)*rng.uniform(.40,1.15)
            end=origin+Vector((math.cos(ta)*height*.075,height*rng.uniform(.015,.075),math.sin(ta)*height*.075))
            rod('Studio fine crown twig',origin,end,.0035,STEM,5)
            for j in range(14):
                center=origin.lerp(end,.10+j*.065);la=ta+(-1 if j%2 else 1)*rng.uniform(.60,1.35)
                length=rng.uniform(.13,.22);direction=Vector((math.cos(la),rng.uniform(-.22,.43),math.sin(la))).normalized()
                across=direction.cross(Vector((0,1,0))).normalized();normal=across.cross(direction).normalized();off=len(vertices)
                for row in range(6):
                    tt=row/5;mid=center+direction*length*tt+normal*math.sin(tt*math.pi)*length*.13;half=math.sin(tt*math.pi)**.8*length*.24
                    vertices.extend((mid-across*half-normal*half*.13,mid+normal*half*.10,mid+across*half-normal*half*.13))
                for row in range(5):
                    for col in range(2):q=off+row*3+col;faces.append((q,q+1,q+4,q+3))
                leaf_count+=1
    leaves=patch_mesh('Studio individually curved olive living leaves',vertices,faces,BOTANIC)
    uv=leaves.data.uv_layers.new(name='Native leaf atlas')
    for loop in leaves.data.loops:
        index=loop.vertex_index;leaf=index//18;point=index%18
        uv.data[loop.index].uv=((leaf%8+(point%3)/2)/8,(point//3)/5)
    for poly in leaves.data.polygons:poly.use_smooth=True
    BOTANIC.use_backface_culling=False
    record('botanical',before);PLANTS.append({'position':[x,F,z],'height':height,'potRadius':pot_radius,'leaves':leaf_count})

for i,(x,z,h) in enumerate(((-11.0,6.1,3.35),(-3.65,6.6,3.2),(-10.8,-6.75,2.7),(-3.8,-6.7,2.65),(10.7,3.9,3.3),(10.8,-6.6,3.0),(8.6,1.0,2.0))):living_tree(x,z,h,212+i)
batch_export('grand-anamorphic-interior',set(bpy.context.scene.objects)-interior_start)

people_start=set(bpy.context.scene.objects)
for i,(x,z,turn,female,pose) in enumerate(((-9.4,5.92,0,True,0),(-8.6,-7.25,0,False,0),(-4.8,-5.7,25,True,1),(-8.8,1.0,145,False,1),(-9.55,1.2,-30,True,1),(8.8,2.8,-70,False,0),(10.2,3.0,50,True,0))):
    person_before=set(bpy.context.scene.objects)
    human(x,z,.97+(i%3)*.025,turn,female,NAVY,i%3,pose,root_y=F)
    HUMAN_PLACEMENTS[-1]['bounds']=bounds(set(bpy.context.scene.objects)-person_before)
record('visitors',people_start);batch_export('grand-anamorphic-visitors',set(bpy.context.scene.objects)-people_start)

def world(p):
    co,si=math.cos(ROOT_YAW),math.sin(ROOT_YAW);return [ROOT_ANCHOR[0]+co*p[0]+si*p[2],p[1],ROOT_ANCHOR[2]-si*p[0]+co*p[2]]
views={'entry':{'position':[-6.35,1.77,10.2],'look':[-6.35,2.3,-4.5]},
       'interior':{'position':[-6.35,1.77,-.30],'look':[-7.4,3.7,-7.3]},
       'out':{'position':[-6.35,1.77,-2.6],'look':[-6.35,2.0,10]}}
for v in views.values():v.update(worldPosition=world(v['position']),worldLook=world(v['look']))
clear_underside=min(r['bounds']['min'][1] for r in ROLE_BOUNDS if r['overhead'] and r['bounds'])
layout={'version':'grand-20261018','assetNames':list(EXPORTS),'assets':EXPORTS,'units':'metres','root':ROOT_ANCHOR,'rootRotation':[0,ROOT_YAW,0],
 'bounds':{'min':[-12,0,-8],'max':[12,TOP,8]},'architecturalDimensions':{'width':24,'depth':16,'height':TOP-F,'floor':F,'fasciaTop':TOP,'lowestOverheadUnderside':clear_underside,'clearHeight':clear_underside-F},
 'mainCorner':{'fold':[FOLD[0],0,FOLD[1]],'leftWidth':LW,'rightWidth':RW,'bottom':BOTTOM,'top':LED_TOP,'headerTop':TOP},
 'contentStudio':{'bounds':{'min':[-11.70,F,-7.70],'max':[-3.22,TOP,7.50]},'actualInteriorDepth':15.20,'actualInteriorWidth':8.48,'floorTop':F,'canopyBottom':7.11,'ceilingTop':TOP},
 'apertures':APERTURES,'screens':APERTURES,'water':{'y':.595,'polygonXZ':BASIN,'outerPolygonXZ':BASIN},'waterJets':[],
 'typography':SIGNS,'roles':ROLE_BOUNDS,'humans':HUMAN_PLACEMENTS,'plants':PLANTS,'views':views,
 'routes':[{'id':'studio-occupied-entry','width':2,'centerline':[[-6.35,F,8],[-6.35,F,-4.8]],'clearEnvelopeXZ':[-7.35,-5.35,-4.8,8],
 'measurement':'2m principal route between left reception/right tree, lounge and consultation envelopes; real 12.8m entry-to-rear-service path'}],
 'provenance':{'architecture':'Original bespoke Blender geometry; selected corner artwork remains runtime media','humans':'Microsoft Rocketbox MIT; technical-humans-LICENSE.txt','plants':'Original branch and curved-leaf geometry; no downloaded models'},
 'notes':['Same-volume studio interior; no camera-ray or nonuniform room-depth compression','Native staff heights ~1.74–1.83m; counter top1.175m','No display is placed inside the main corner notch/occupied studio volume']}
(OUTDIR/'grand-anamorphic-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_ANAMORPHIC '+json.dumps({'assets':EXPORTS,'screens':len(APERTURES),'roles':len(ROLE_BOUNDS),'people':len(HUMAN_PLACEMENTS)}),flush=True)
