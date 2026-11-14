"""Grand projection pavilion: independent architecture and native-scale furniture.

Only constructor prefixes from the earlier authored booth are reused. No earlier
asset is overwritten. Coordinates are website metres, +Z is the open entrance.
"""
from pathlib import Path
import json, math, hashlib, sys

HERE=Path(__file__).resolve().parent
PREVIOUS=HERE/'rebuild_projection_mapping_stall_v12.py'
exec(compile(PREVIOUS.read_text(encoding='utf-8').split('# Native eight-metre island')[0],str(PREVIOUS),'exec'))
CONFIG=json.loads((ROOT/'public/models/expo/grand-dimensions.json').read_text())
MASTER=CONFIG['master']; FLOOR_TOP=MASTER['floor']; TOP=MASTER['fasciaTop']
OUT=ROOT/'public/models/expo/projection-grand-v1.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-grand-v1-layout.json'
PREFIX='Projection Grand V1 | '
SCREENS=[];PROJECTORS=[];SIGNAGE=[];SIGNAGE_OBJECTS=[];LIGHT_POINTS=[];ROLE_BOUNDS={}

def scope(before,role):
    objects=[o for o in set(bpy.context.scene.objects)-before if o.type=='MESH']
    for ob in objects:
        ob['grandRole']=role
        if role=='overhead':ob['projectionOverhead']=True;ob['grandOverhead']=True
    return objects

def solid_box(name,p,size,mat=BLACK,bevel=.012):return box(PREFIX+name,p,size,mat,bevel)

def bnd(objects):
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
    return {'min':[min(p.x for p in points),min(p.z for p in points),min(-p.y for p in points)],
        'max':[max(p.x for p in points),max(p.z for p in points),max(-p.y for p in points)]}

# A flush common-datum interior. The perimeter light is recessed in the fascia,
# not a raised glowing threshold across the principal entrance.
before=set(bpy.context.scene.objects)
deck=[(-12,-8),(12,-8),(12,7.25),(11.25,8),(-11.25,8),(-12,7.25)]
extruded_outline(PREFIX+'flush interior honed stone deck',deck,.055,FLOOR_TOP,FLOOR)
edge=[(x*.998,z*.998)for x,z in deck]
outline_tube(PREFIX+'recessed perimeter champagne lip',edge,.081,.018,CHAMPAGNE)
outline_tube(PREFIX+'warm perimeter recessed diffuser',edge,.094,.009,WHITE)
scope(before,'floor')

# Full rear and side returns create an inhabitable volume behind the front
# elevation. Panel seams are small physical shadow reveals.
before=set(bpy.context.scene.objects)
solid_box('rear enclosure',(0,5.59,-7.88),(24,10.94,.24),REAR_BLACK)
solid_box('left side full depth return',(-11.88,5.59,-.25),(.24,10.94,15.5),BLACK)
scope(before,'architecture')
before=set(bpy.context.scene.objects)
solid_box('right side full depth return',(11.88,5.59,-.25),(.24,10.94,15.5),BLACK)
scope(before,'section-wall')
before=set(bpy.context.scene.objects)
for side in(-1,1):
    for z in(-6.8,-4.8,-2.8,-.8,1.2,3.2,5.2):
        solid_box('side panel fine recessed vertical joint',(side*11.748,5.5,z),(.008,10.5,.012),CHANNEL,.001)
    # The gallery's stepped pilasters are built into the side return rather
    # than floating in front of it.
    for x in(side*6.25,side*11.1):
        solid_box('deep fluted gallery pilaster',(x,5.25,-1.6),(.34,10.26,.50),FLUTED,.004)
        for k in range(7):solid_box('pilaster milled flute',(x-.13+k*.043,5.25,-1.337),(.013,10.22,.026),CHANNEL,.002)
    light_channel('vertical champagne wall return',[Vector((side*6.43,.14,-1.30)),Vector((side*6.43,10.65,-1.30))],.012)
scope(before,'architecture')

# Continuous fascia and its side returns share a single path and four-sided
# extrusion. Top lies exactly on the shared12.821m datum.
before=set(bpy.context.scene.objects)
fascia_path=catmull([(-11.5,0,-7.8),(-11.5,0,5.0),(-11.2,0,6.25),(-9.5,0,7.15),(-6.2,0,7.34),
    (0,0,7.40),(6.3,0,7.34),(9.7,0,7.16),(11.2,0,6.6),(11.5,0,5.25),(11.5,0,-7.8)],14)
vertices=[];faces=[]
for i,p in enumerate(fascia_path):
    tangent=fascia_path[min(i+1,len(fascia_path)-1)]-fascia_path[max(i-1,0)]
    normal=Vector((-tangent.z,0,tangent.x)).normalized()
    p.x=max(-11.55,min(11.55,p.x));p.z=min(7.42,p.z)
    outer=Vector((p.x,0,p.z));inside=outer-normal*.50
    vertices.extend(((outer.x,11.25,outer.z),(outer.x,TOP,outer.z),(inside.x,TOP,inside.z),(inside.x,11.25,inside.z)))
for j in range(len(fascia_path)-1):
    for q in range(4):faces.append((j*4+q,(j+1)*4+q,(j+1)*4+(q+1)%4,j*4+(q+1)%4))
faces.extend(((3,2,1,0),tuple(range(len(vertices)-4,len(vertices)))))
fascia=uv_mesh('continuous deep fascia and rounded returns',vertices,faces,FASCIA,smooth=True)
light_channel('fascia full length underside reveal',[Vector((p.x,11.247,p.z+.005))for p in fascia_path],.012,TEAL)
scope(before,'overhead')

# One analytic arch/trim curve gives the gold band, dark reveal, lighting and
# green folded outer returns identical joints and tangent continuity.
before=set(bpy.context.scene.objects)
controls=[(-10.25,.12,6.28),(-10.12,3.2,6.36),(-9.88,7.2,6.66),(-9.15,9.35,7.04),
    (-7.8,10.65,7.25),(-4.5,10.92,7.35),(0,10.90,7.40),(4.8,10.82,7.35),
    (8.3,10.35,7.19),(9.8,8.7,6.90),(10.28,4.2,6.64),(10.45,.12,6.45)]
arch=catmull(controls,20)
widths=[.43+.20*math.sin(i/(len(arch)-1)*math.pi)**2 for i in range(len(arch))]
depths=[.50]*len(arch)
rect_sweep('champagne continuous entrance arch',arch,widths,depths,ARCH_REVEAL,ARCH_FACE,CHAMPAGNE)
rect_sweep('black entrance arch structural depth',[p-Vector((0,0,.52))for p in arch],[w+.045 for w in widths],[.40]*len(arch),ARCH_STRUCTURE)
gold_edge=[]
for j,p in enumerate(arch):
    tangent=arch[min(j+1,len(arch)-1)]-arch[max(0,j-1)]
    n=Vector((-tangent.y,tangent.x,0)).normalized()
    gold_edge.append(p+n*widths[j]/2+Vector((0,0,.012)))
light_channel('entrance arch recessed warm optical edge',gold_edge,.014)
for side in(-1,1):
    rows=[]
    candidates=[(j,p)for j,p in enumerate(arch)if side*p.x>7.9]
    for j,p in candidates:
        tangent=arch[min(j+1,len(arch)-1)]-arch[max(0,j-1)]
        n=Vector((-tangent.y,tangent.x,0)).normalized()
        inner=p+n*widths[j]/2-Vector((0,0,.10))
        shoulder_join=max(0,min(1,(p.y-8.5)/2))
        outer=Vector((side*11.54,max(.12,p.y+(11.25-p.y)*shoulder_join),p.z-.65))
        crease=inner.lerp(outer,.50)+Vector((0,0,.12))
        rows.append((inner,crease,outer))
    for column in(0,1):
        vs=[];fs=[]
        for row in rows:vs.extend((row[column],row[column+1]))
        for j in range(len(rows)-1):fs.append((j*2,j*2+2,j*2+3,j*2+1))
        uv_mesh('folded emerald arch shoulder '+str(side)+str(column),vs,fs,DEEP_GREEN,smooth=True)
    light_channel('continuous emerald arch outer channel '+str(side),[r[2]+Vector((0,0,.015))for r in rows],.009,TEAL)
scope(before,'overhead')

# Outer guide walls have depth and are physically joined to the full side
# returns. Copy has a measured uniform fit inside1.56m usable panels.
before=set(bpy.context.scene.objects)
for side in(-1,1):
    x=side*11.0;z=7.05;yaw=side*-.13
    solid_box('connected guide wall '+str(side),(x,5.43,z),(1.72,10.62,.25),SIGN_FACE,.016)
    solid_box('guide wall outer folded connector '+str(side),(side*11.72,5.43,6.35),(.25,10.62,1.65),SIGN_FACE,.012)
    copies=(('SPACES','PEOPLE','BRANDS','EMOTIONS'),('RENTAL','SOLUTIONS','EXPERIENCES')) if side<0 else (('IDEAS','MAPPED','BIGGER'),('BUILDINGS','STAGES','PRODUCTS','INTERIORS','EXPERIENCES'))
    for group_index,lines in enumerate(copies):
        y=8.10 if group_index==0 else 4.9
        for index,copy in enumerate(lines):label(copy,(x-.68,y-index*.46,z+.142),.24,1.40,tracking=1.04)
    light_channel('guide wall grounded emerald reveal '+str(side),[Vector((x-side*.83,.15,z+.144)),Vector((x-side*.83,10.70,z+.144))],.006,TEAL)
scope(before,'architecture')

# Header branding is independent of the arch and letterforms retain their
# font aspect ratio. All glyph faces sit on the actualfascia front surface.
before=set(bpy.context.scene.objects)
emblem_before=set(bpy.context.scene.objects);triangle_emblem((-5.2,11.32,7.46),1.06)
for ob in set(bpy.context.scene.objects)-emblem_before:
    if ob.type=='MESH':
        for slot in ob.material_slots:slot.material=MINT
label('livegrid AV',(-3.95,11.31,7.46),.76,5.5,semibold=True,tracking=1)
line((1.95,11.15,7.46),(1.95,12.25,7.46),.007,BRAND)
label('PROJECTION MAPPING',(2.50,11.92,7.46),.30,5.7,tracking=1.28)
label('TRANSFORM SPACES INTO STORIES',(2.52,11.44,7.46),.18,5.65,mat=MINT,tracking=1.16)
for i,c in enumerate(('ANY','SURFACE','A CANVAS')):label(c,(9.30,12.24-i*.31,7.26),.19,1.40,tracking=1.08)
scope(before,'overhead')

# Deep side application galleries keep their eight selected reference-media
# roles, with actual inset housings, backing panels and native sharptext.
before=set(bpy.context.scene.objects)
captions=['ARCHITECTURAL MAPPING','STAGE EXPERIENCES','PRODUCT MAPPING','INTERACTIVE SPACES',
    'LANDMARKS','BRAND EXPERIENCES','INTERIORS','EVENTS & EXHIBITIONS']
galleries=[]
for side in(-1,1):
    x=side*8.72;z=-1.35;yaw=-side*.25;w=4.05
    gb=set(bpy.context.scene.objects)
    solid_box('full application wall backing',(0,5.36,-.16),(4.63,10.25,.34),GALLERY_CASE)
    for row in range(4):
        idx=row+(0 if side<0 else 4);y=9.22-row*2.33
        aperture('projection-application-'+str(idx),(0,y,.022),w,1.80,'projection-application-'+str(idx))
        label(captions[idx],(0,y-1.16,.05),.19,w,centered=True,tracking=1.06)
    objects=set(bpy.context.scene.objects)-gb;place(objects,(x,0,z),yaw)
    # aperture helper recorded local surfaces; bake the exactplacement into
    # metadata with the same transform as their real cabinet meshes.
    for aperture_row in SCREENS[-4:]:
        p=Vector((aperture_row['x'],aperture_row['y'],aperture_row['z']))
        p=Matrix.Rotation(yaw,4,'Y')@p+Vector((x,0,z))
        aperture_row.update(x=p.x,y=p.y,z=p.z,rotation=[0,yaw,0])
    for record in SIGNAGE[-4:]:record['galleryParent']={'position':[x,0,z],'yaw':yaw}
    galleries.append({'side':side,'center':[x,0,z],'yaw':yaw,'width':4.63,'clearInnerEdge':6.43})
scope(before,'architecture')

# A single uninterrupted concave blue LED backdrop now occupies18.4m of
# rear width and8m verticalheight. It is actualcurved displaygeometry.
before=set(bpy.context.scene.objects)
radius=17.0;arc=2*math.asin(9.2/radius);center=Vector((0,6.40,9.33));height=7.90
v=[];f=[];uv=[]
for j in range(193):
    a=-arc/2+arc*j/192
    for r,dy in((radius+.012,-height/2),(radius+.012,height/2),(radius+.12,height/2),(radius+.12,-height/2)):
        v.append(center+Vector((-r*math.sin(a),dy,-r*math.cos(a))));uv.append((j/192,1 if dy>0 else 0))
for j in range(192):
    for side in range(4):f.append((j*4+side,(j+1)*4+side,(j+1)*4+(side+1)%4,j*4+(side+1)%4))
uv_mesh('wide concave rear LED cabinet',v,f,BACK,uv)
SCREENS.append({'id':'projection-backdrop','type':'curved','x':0,'y':center.y,'z':center.z,'w':radius*arc,'h':height,'radius':radius,'arc':arc,
    'rotation':[0,math.pi,0],'flipU':True,'chordWidth':18.4,'mediaHint':'projection-backdrop'})
for y in(2.435,10.365):light_channel('rear curved LED inset edge',[center+Vector((-radius*math.sin(-arc/2+arc*j/192),y-center.y,-radius*math.cos(-arc/2+arc*j/192)))for j in range(193)],.007)
scope(before,'architecture')

# A proper room ceiling, annular cosmic panels and two champagne rings are
# fixed at measured heights. Projectors sit below their rings; drops terminate
# at the realceiling, and their opticalaxes share the raymetadata.
before=set(bpy.context.scene.objects)
solid_box('continuous architectural ceiling soffit',(0,11.08,-.30),(23.48,.22,14.60),REAR_BLACK)
for z in(-6.95,5.50):
    light_channel('room continuous ceiling cove',[Vector((-10.9,10.94,z)),Vector((10.9,10.94,z))],.014)
    for x in(-10,-8,-6,-4,-2,0,2,4,6,8,10):
        disk(PREFIX+'recessed warm downlight optic',x,z,.060,10.93,10.945,WHITE)
        LIGHT_POINTS.append({'position':[x,10.92,z],'kind':'recessed'})
for side in(-1,1):
    light_channel('room side ceiling cove',[Vector((side*11.25,10.95,-7.0)),Vector((side*11.25,10.95,6.0))],.012)
    for z in(-5,-2,1,4):disk(PREFIX+'side recessed optic',side*10.9,z,.055,10.93,10.945,WHITE)
# Annularcanopy substrate/surface, cut fromthe samecentre/radii.
ellipse_annulus(PREFIX+'cosmic canopy annular substrate',(8.7,5.5),(3.3,2.2),0,-.7,10.75,10.88,BACK,192)
SCREENS.append({'id':'projection-ceiling-outer','type':'ellipse','x':0,'y':10.735,'z':-.7,'w':17.4,'h':11,'radiusX':8.7,'radiusZ':5.5,'innerFraction':.38,'rotation':[math.pi/2,0,0],'mediaHint':'projection-ceiling'})
for name,rx,rz,y,band,media in(('outer',6.8,4.6,10.30,.34,False),('inner',4.45,3.25,10.48,.28,True)):
    ellipse_annulus(PREFIX+name+' physical champagne ring',(rx,rz),(rx-band,rz-band),0,-.7,y,y+.18,CHAMPAGNE,192)
    outline_tube(PREFIX+name+' recessed warm ring core',ellipse(rx-band+.025,rz-band+.025),y-.020,.013,WHITE)
    # ellipse() is centeredat0; translate only those cores tothe matchedz.
    latest=bpy.context.scene.objects.get(PREFIX+name+' recessed warm ring core')
    if latest:latest.location.y=.7
    if media:
        SCREENS.append({'id':'projection-ceiling-inner','type':'ellipse','x':0,'y':y+.008,'z':-.7,'w':(rx-band)*2,'h':(rz-band)*2,'radiusX':rx-band,'radiusZ':rz-band,'innerFraction':.01,'rotation':[math.pi/2,0,0],'mediaHint':'projection-ceiling'})
    for angle in(.35,2.3,3.6,5.4):
        x=math.cos(angle)*(rx-.12);z=-.7+math.sin(angle)*(rz-.12)
        rod(PREFIX+'rigid ring ceiling drop',(x,y+.18,z),(x,10.95,z),.018,BRUSHED,8)
scope(before,'overhead')

before=set(bpy.context.scene.objects)
projector_source=UTILITY_SOURCE[UTILITY_SOURCE.index('def projector('):UTILITY_SOURCE.index('def kiosk(')].replace('10.16','10.93')
exec(compile(projector_source,'grand-projector-constructor','exec'))
PROJECTOR_BOUNDS=[]
for name,lens,target,size,r in(('central',(0,10.02,2.1),(0,7.0,-2.8),.48,1.55),
    ('left',(-4.6,9.82,1.0),(-2.7,4.6,-2.6),.43,1.25),('right',(4.6,9.82,1.0),(2.7,4.6,-2.6),.43,1.25)):
    fixture_before=set(bpy.context.scene.objects)
    projector(PREFIX+name+' projector',lens,target,size);PROJECTORS[-1].update(radius=r,opacity=.042)
    fixture=[o for o in set(bpy.context.scene.objects)-fixture_before if o.type=='MESH']
    PROJECTOR_BOUNDS.append({'id':name,'bounds':bnd(fixture)})
scope(before,'overhead')

# Independent miniature/model and all furnishings retain their ownphysical
# scale. A low wide dais and hospitalitycrescent preserve the selecteddesign.
before=set(bpy.context.scene.objects)
stage_center=[0,.95,-2.8];stage_radius=3.9
stage=[(x,z-2.8)for x,z in ellipse(stage_radius,stage_radius,192)]
extruded_outline(PREFIX+'crystal circular exhibition dais',stage,FLOOR_TOP,.95,COUNTER)
outline_tube(PREFIX+'dais warm low toe diffuser',stage,.17,.010,TEAL)
outline_tube(PREFIX+'dais champagne top reveal',stage,.95,.010,CHAMPAGNE)
scope(before,'model-plinth')

# Reception matches the reference left-front position, foldedemeraldendcap
# andnarrowworktopratherthan enlarging people andpropswiththebuilding.
before=set(bpy.context.scene.objects)
reception={'center':[-7.0,FLOOR_TOP,6.0],'width':6.2,'depth':1.05,'height':1.10,'top':1.22}
o=round_outline(6.20,1.05,.09,12)
extruded_outline(PREFIX+'reception satin black cabinet',o,0,1.045,COUNTER)
extruded_outline(PREFIX+'reception quartz worktop',round_outline(6.22,1.07,.09,12),1.045,1.10,WORKTOP)
outline_tube(PREFIX+'reception warm toe diffuser',o,.045,.011,WHITE)
ib=set(bpy.context.scene.objects);triangle_emblem((-2.65,.41,.548),.48)
for ob in set(bpy.context.scene.objects)-ib:
    if ob.type=='MESH':
        for slot in ob.material_slots:slot.material=MINT
label('livegrid AV',(-1.98,.50,.550),.37,3.15,semibold=True,tracking=1)
label('RENTAL  |  SOLUTIONS  |  EXPERIENCES',(-2.64,.22,.552),.10,4.2,tracking=1.08)
chev=[(3.08,.04,.548),(1.92,.55,.600),(3.08,1.06,.548)]
uv_mesh('folded emerald reception wedge',chev+[(2.85,.55,.640)],[(0,3,1),(1,3,2)],WEDGE,smooth=False)
light_channel('reception wedge optical return',[Vector(p)for p in chev],.007,TEAL)
soft_box(PREFIX+'reception laptop base',(-1.75,1.12,-.09),(.56,.026,.35),SILVER,.008)
soft_box(PREFIX+'reception laptop open back',(-1.75,1.29,-.22),(.56,.32,.025),SILVER,.009)
water_glass(.75,1.10,-.12);flowers(1.45,1.10,-.05,.20)
place(set(bpy.context.scene.objects)-before,reception['center']);scope(before,'furniture')

# Furniture at real human scale. Final navigation follows the measured
# Z4.6 connector and X6.4 side route; left consultation is behind reception.
SEATING=[]
def chair(p,yaw):
    before=set(bpy.context.scene.objects)
    soft_box(PREFIX+'lounge upholstered seat',(0,.409,0),(.78,.15,.73),IVORY,.045)
    soft_box(PREFIX+'lounge upholstered back',(0,.76,-.31),(.82,.62,.15),IVORY,.045)
    for s in(-1,1):soft_box(PREFIX+'lounge rounded arm',(s*.39,.66,0),(.13,.40,.77),IVORY,.045)
    for x in(-.29,.29):
        for z in(-.27,.27):rod(PREFIX+'lounge slender metalleg',(x,0,z),(x,.38,z),.017,BRUSHED,10)
    place(set(bpy.context.scene.objects)-before,p,yaw);scope(before,'furniture')
    SEATING.append({'position':p,'yaw':yaw,'width':.91,'depth':.80,'seatTop':p[1]+.484,'height':1.08})
for p,yaw in(([9.25,.12,2.5],-1.5),([9.25,.12,5.2],-1.7),([7.65,.12,4.5],.3),([-8.1,.12,1.0],.2),([-6.5,.12,1.0],-.2),([-7.25,.12,3.0],math.pi)):
    chair(p,yaw)
before=set(bpy.context.scene.objects)
for x,z in((8.6,3.8),(-7.25,2.0)):
    lathe(PREFIX+'round dark lounge tabletop',x,z,[(.56,.74),(.56,.77)],COUNTER,40)
    rod(PREFIX+'round table stem',(x,.12,z),(x,.74,z),.055,BRUSHED,16)
    disk(PREFIX+'table weighted foot',x,z,.32,.12,.15,BLACK)
    flowers(x,.77,z,.18)
scope(before,'furniture')

before=set(bpy.context.scene.objects)
kp=[4.5,.12,5.8];kw=1.40;kh=1.42
solid_box('interactive kiosk body',(0,.63,0),(kw,1.26,.77),COUNTER,.025)
# A real slopingdisplayplane with a slimcabinet, usedbytheruntimeLEDmaterial.
aperture('projection-kiosk',(0,1.31,.06),1.22,.70,'projection-kiosk',rotation=[-.57,0,0])
label('EXPLORE',(0,.74,.405),.14,1.16,centered=True,tracking=1.12)
label('POSSIBILITIES',(0,.49,.405),.12,1.16,centered=True,tracking=1.10)
place(set(bpy.context.scene.objects)-before,kp)
SCREENS[-1]['x']+=kp[0];SCREENS[-1]['y']+=kp[1];SCREENS[-1]['z']+=kp[2]
scope(before,'furniture')

# Recordroleandglyphbounds before draw batching. The common shell envelope
# is measured separately from people/planting/model and the surroundinghall.
bpy.context.view_layer.update()
for role in sorted({o.get('grandRole','architecture')for o in bpy.context.scene.objects if o.type=='MESH'}):
    ROLE_BOUNDS[role]=bnd([o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('grandRole','architecture')==role])
for ob,record in SIGNAGE_OBJECTS:
    record['bounds']=bnd([ob]);record['fontAspectRatioPreserved']=True
groups={}
for ob in list(bpy.context.scene.objects):
    if ob.type!='MESH':continue
    matrix=ob.matrix_world.copy();ob.parent=None;ob.matrix_world=matrix
    groups.setdefault((ob.data.materials[0].name,ob.get('grandRole','architecture')),[]).append(ob)
meshes=[]
for (name,role),items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    ob=bpy.context.object;ob.name=name+' | '+role;ob['grandRole']=role
    ob['projectionOverhead']=role=='overhead';ob['grandOverhead']=role=='overhead'
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    if not ob.data.uv_layers:
        uv=ob.data.uv_layers.new(name='World metre UV')
        for loop in ob.data.loops:
            p=ob.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*.25,p.z*.25-p.y*.13)
    meshes.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_extras=True)
stats={'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'bounds':bnd(meshes),'meshes':len(meshes),
    'vertices':sum(len(o.data.vertices)for o in meshes),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in meshes)}
lowest_projector=min(p['bounds']['min'][1] for p in PROJECTOR_BOUNDS)
layout={'version':'grand-v1','asset':OUT.name,'sha256':stats['sha256'],'units':'metres','runtimeScale':1,
    'root':CONFIG['placements']['projection']['root'],'rootRotation':[0,CONFIG['placements']['projection']['yaw'],0],
    'floorTop':FLOOR_TOP,'deckPolygonXZ':deck,'architecture':{'width':24,'depth':16,'height':MASTER['height'],'top':TOP,'hClear':lowest_projector-FLOOR_TOP,
        'clearHeightMeasurement':{'method':'Lowest evaluated projector chassis/optic vertex over the interior minus finished-floor datum; ringundersides and ceiling lie higher. Entrance jambs and sidewall trim are excluded as perimeterarchitecture.','lowestProjectorVertexY':lowest_projector,'projectors':PROJECTOR_BOUNDS,'floorY':FLOOR_TOP},
        'reception':reception,'stage':{'center':stage_center,'radius':stage_radius,'top':.95},'galleries':galleries,
        'ceilingRings':[{'center':[0,10.30,-.7],'outerRadiusX':6.8,'outerRadiusZ':4.6,'radialBand':.34,'depth':.18},
            {'center':[0,10.48,-.7],'outerRadiusX':4.45,'outerRadiusZ':3.25,'radialBand':.28,'depth':.18}],
        'seating':SEATING,'facade':{'archControlPoints':controls,'top':TOP,'sharedArchAndTrimCurve':True},
        'serviceReturns':{'left':{'center':[-11,5.43,7.05],'usableWidth':1.4,'connectedToSideReturn':True},'right':{'center':[11,5.43,7.05],'usableWidth':1.4,'connectedToSideReturn':True}}},
    'modelPlacement':{'position':[0,.915,-2.8],'scale':[1,1,1],'asset':'projection-grand-crystals-v1.glb'},
    'apertures':SCREENS,'projectors':PROJECTORS,'typography':SIGNAGE,'fixtures':LIGHT_POINTS,'roleBounds':ROLE_BOUNDS,
    'interaction':{'position':[-7,.70,6.55],'rotation':[0,0,0],'w':5.8,'h':1.0},
    'circulation':{'principalEntry':{'min':[-1,.12,2.5],'max':[1,2.2,8],'width':2},'sideRoute':{'min':[5.8,.12,-1.2],'max':[7.0,2.2,6.6],'width':1.2},
        'status':'Designed route envelopes; exact final asset/furniture intersections separately measured'},
    'navigation':{'entrance':[0,1.77,9.4],'interior':[6.4,1.77,1.0],'interiorLook':[0,4.0,-2.0],'exitLook':[0,1.77,11],
        'route':[[0,1.77,9.4],[0,1.77,7.7],[0,1.77,4.6],[6.4,1.77,4.6],[6.4,1.77,1]]},
    'cutaway':{'overhead':'grandRole=overhead','sectionWall':'grandRole=section-wall'},
    'provenance':'Original procedural Blender architecture and furniture. Earlier projection utility constructors reused; earlier GLBs unchanged. No reference raster on booth surfaces.',
    'stats':stats}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('PROJECTION_GRAND_READY '+json.dumps(stats),flush=True)

