"""Abstract stepped projection maquette from the October 16 sculptural reference.

Blender 5.2 --background --factory-startup --python this-file.py

Native physical Three XYZ, front +Z, bottom Y0. The website places it on the
demonstration stage at [0,.72,-.45]. No photograph supplies the model geometry.
The exported object is a white maquette: architectural planes, rounded portals,
an inset porcelain moon, real stairs, asymmetrical roofs and vertical reeds.
"""
from pathlib import Path

HELPER=Path(__file__).with_name('rebuild_projection_palace.py')
source=HELPER.read_text(encoding='utf-8').split('# A broad low three-level')[0]
exec(compile(source,str(HELPER),'exec'))
OUT=ROOT/'public/models/expo/projection-sculpture.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-sculpture-layout.json'
QA=ROOT/'qa/projection-mapping-v3'
HERO_OUT=ROOT/'public/media/projection-mapping-v3/sculpture-hero-render.png'
PORTALS=[]
raw_mesh=mesh
raw_box=box


def mesh(name,points,faces,mat,smooth=False):
    ob=raw_mesh(name,points,faces,mat,smooth)
    ob.name='Projection Sculpture | '+name
    return ob


def box(name,p,size,mat,bevel=.006):
    ob=raw_box(name,p,size,mat,bevel)
    ob.name='Projection Sculpture | '+name
    return ob


def role(name,rgb,rough=.72):
    mat=material(name,rgb,rough)
    mat.name='Projection Sculpture | '+name
    return mat


FACE=role('white projected sculpted facade',(.66,.65,.61),.69)
RETURN=role('ivory sculpted return',(.62,.60,.54),.73)
RECESS=role('dark shallow alcove receiver',(.20,.22,.25),.83)
MOON=role('porcelain moon sphere',(.85,.82,.73),.42)
REED=role('warm narrow architectural rib',(.73,.69,.59),.61)


def polygon_solid(name,outline,front,back,face=FACE,returns=RETURN):
    """Separate real front plane from the volumetric edge and rear returns."""
    n=len(outline)
    front_points=[(x,y,front) for x,y in outline]
    mesh(name+' | projected front',front_points,[tuple(range(n))],face)
    points=front_points+[(x,y,back) for x,y in outline]
    faces=[tuple(range(n*2-1,n-1,-1))]
    faces.extend((j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n))
    return mesh(name+' | genuine solid returns',points,faces,returns)


def round_contour(w,h,steps=48):
    r=w/2;spring=h-r
    return [(-r,0)]+[(math.cos(math.pi-j*math.pi/steps)*r,
        spring+math.sin(math.pi-j*math.pi/steps)*r) for j in range(steps+1)]+[(r,0)]


def round_ring(name,x,y,front,w,h,thickness,depth=.08,mat=RETURN,steps=48):
    inner=round_contour(w,h,steps)
    # The two profiles share their spring line. Unlike shifting an enlarged
    # contour downward, this keeps the real thresholds on the model floor.
    outer=round_contour(w+2*thickness,h+thickness,steps)
    pts,faces=[],[]
    for (ix,iy),(ox,oy) in zip(inner,outer):
        pts.extend(((x+ox,y+oy,front),(x+ix,y+iy,front),
            (x+ix,y+iy,front-depth),(x+ox,y+oy,front-depth)))
    for j in range(len(inner)):
        k=(j+1)%len(inner)
        for q in range(4):faces.append((j*4+q,k*4+q,k*4+(q+1)%4,j*4+(q+1)%4))
    return mesh(name,pts,faces,mat,False)


def arch_wall(name,x,bottom,front,width,height,opening_w,opening_h,opening_bottom,
              depth=.30,receiver_depth=.16,top_left=None,top_right=None,trim=.055):
    """A real rounded empty portal with a shallow shaped projection receiver."""
    top_left=height if top_left is None else top_left
    top_right=height if top_right is None else top_right
    xmin,xmax=x-width/2,x+width/2
    def roof(xx):return bottom+top_left+(top_right-top_left)*(xx-xmin)/width
    hole_base=bottom+opening_bottom
    half=opening_w/2
    # Solid lower tier when the opening is elevated above the stair bridge.
    if opening_bottom>0:
        polygon_solid(name+' | elevated portal lower facade',[(xmin,bottom),(xmax,bottom),
            (xmax,hole_base),(xmin,hole_base)],front,front-depth)
    # Genuine supporting piers with pitched head levels.
    for lo,hi in ((xmin,x-half),(x+half,xmax)):
        polygon_solid(name+' | load bearing carved pier',[(lo,hole_base),(hi,hole_base),
            (hi,roof(hi)),(lo,roof(lo))],front,front-depth)
    curve=round_contour(opening_w,opening_h)[1:-1]
    for a,b in zip(curve[:-1],curve[1:]):
        ax,ay=x+a[0],hole_base+a[1];bx,by=x+b[0],hole_base+b[1]
        polygon_solid(name+' | curved structural spandrel',[(ax,ay),(bx,by),
            (bx,roof(bx)),(ax,roof(ax))],front,front-depth)
    # Receiver is a physical shaped, inset wall, never an external image card.
    poly=[(x+px,hole_base+py) for px,py in round_contour(opening_w*.985,opening_h*.99)]
    polygon_solid(name+' | shallow shaped alcove partition',list(reversed(poly)),
        front-receiver_depth,front-receiver_depth-.022,RECESS,RETURN)
    round_ring(name+' | soft plaster arch reveal',x,hole_base,front+.015,opening_w,
        opening_h,trim,.055,RETURN)
    PORTALS.append({'name':name,'center':[x,hole_base+opening_h/2,front],
        'width':opening_w,'height':opening_h,'bottom':hole_base,'front':front,
        'receiverZ':front-receiver_depth,'receiverDepth':receiver_depth,'structuralDepth':depth})


def circular_band(name,cx,cy,front,outer,inner,depth,mat,segments=128):
    points,faces=[],[]
    for j in range(segments):
        a=j*math.tau/segments
        for r,z in ((outer,front),(inner,front),(inner,front-depth),(outer,front-depth)):
            points.append((cx+math.cos(a)*r,cy+math.sin(a)*r,z))
    for j in range(segments):
        k=(j+1)%segments
        for q in range(4):faces.append((j*4+q,k*4+q,k*4+(q+1)%4,j*4+(q+1)%4))
    return mesh(name,points,faces,mat,True)


def roof_wedge(name,x0,x1,y0,left,right,front,back):
    return polygon_solid(name,[(x0,y0),(x1,y0),(x1,right),(x0,left)],front,back)


def peaked_tower(name,x,bottom,width,wall_top,peak,front,back,slot_w=.08):
    slot_bottom=bottom+.28
    slot_h=wall_top-slot_bottom-.17
    arch_wall(name,x,bottom,front,width,wall_top-bottom,slot_w,slot_h,.28,
        depth=front-back,receiver_depth=.085,trim=.017)
    polygon_solid(name+' | steep pointed upper face',[(x-width/2,wall_top),
        (x+width/2,wall_top),(x,peak)],front,back,RETURN,RETURN)
    # Two folded cap planes give the slim silhouette actual three dimensionality.
    mesh(name+' | faceted pitched crown',[(x-width/2,wall_top,front),
        (x,peak,front),(x,peak-.055,back),(x-width/2,wall_top,back)],[(0,1,2,3)],RETURN)
    mesh(name+' | opposite pitched crown',[(x,peak,front),(x+width/2,wall_top,front),
        (x+width/2,wall_top,back),(x,peak-.055,back)],[(0,1,2,3)],RETURN)


def slim_arcade(name,x0,x1,bottom,height,front,back,count,top_left=None,top_right=None):
    pitch=(x1-x0)/count;hole=pitch*.51
    for j in range(count):
        cx=x0+(j+.5)*pitch
        t=(j+.5)/count
        total=(top_left or height+.10)+((top_right or height+.10)-(top_left or height+.10))*t
        arch_wall(name,cx,bottom,front,pitch,total,hole,height,0,
            depth=front-back,receiver_depth=.10,trim=.010)


def sphere(name,p,r,mat,segments=96,rings=48):
    pts=[(p[0],p[1]+r,p[2])]
    for j in range(1,rings):
        phi=j*math.pi/rings
        for k in range(segments):
            a=k*math.tau/segments
            pts.append((p[0]+math.sin(phi)*math.cos(a)*r,p[1]+math.cos(phi)*r,
                p[2]+math.sin(phi)*math.sin(a)*r))
    pts.append((p[0],p[1]-r,p[2]));faces=[]
    for k in range(segments):faces.append((0,1+k,1+(k+1)%segments))
    for j in range(rings-2):
        for k in range(segments):
            a=1+j*segments+k;b=1+j*segments+(k+1)%segments
            faces.append((a,a+segments,b+segments,b))
    last=len(pts)-1;start=1+(rings-2)*segments
    for k in range(segments):faces.append((start+k,last,start+(k+1)%segments))
    return mesh(name,pts,faces,mat,True)


# A fine neutral model foot establishes the physical maquette's local origin.
# A broad low foot and layered side wings establish the reference's wide
# asymmetric outline. Native dimensions are 4.30W x 2.49H x 1.44D, rather than
# the earlier narrow 4.20W x 3.35H composition. All openings remain true geometry.
box('thin continuous sculptural maquette footing',(0,.018,-.015),(4.30,.036,1.43),RETURN,.009)

# A varied left skyline: slender pointed lancets, angular folded heads and
# staggered arcades. Their perforations replace the old solid rectangular mass.
peaked_tower('left slender peaked tower',-1.17,.38,.155,2.04,2.36,-.29,-.55,.063)
peaked_tower('left inner slender peaked tower',-.885,.58,.125,1.80,2.08,-.305,-.51,.047)
arch_wall('left folded lancet facade',-1.535,1.00,-.22,.43,.94,.155,.69,.06,
    depth=.42,receiver_depth=.105,top_left=1.00,top_right=.78,trim=.021)
mesh('left angular folded roof planes',[(-1.75,2.00,-.22),(-1.32,1.78,-.22),
    (-1.32,1.91,-.64),(-1.75,2.065,-.64)],[(0,1,2,3)],RETURN)
roof_wedge('left small faceted skyline step',-2.02,-1.72,.51,1.55,1.64,-.34,-.64)
slim_arcade('left raised tall narrow arch colonnade',-2.025,-1.47,.555,.595,-.020,-.28,7,1.00,.80)
slim_arcade('far left low scalloped arcade',-2.115,-1.535,.035,.355,.285,-.015,5,.56,.65)
# The tiny carved fins on the raised arcade are solid ivory, with dark voids
# between them and gently stepped tops following the left diagonal composition.
for j in range(11):
    x=-1.985+j*.046
    top=1.52-(x+1.985)*.31
    box('left raised fine vertical ivory reed',(x,(.65+top)/2,.027),
        (.012,top-.65,.035),REED,.0025)

# The high portal has a genuinely open lower tier and an elevated arched bay.
# Its former opaque lower rectangular plate no longer flattens the silhouette.
UPPER_X=-.295
arch_wall('central lower pierced bridge facade',UPPER_X,.035,-.145,1.12,1.415,
    .59,1.13,0,depth=.53,receiver_depth=.13,top_left=1.365,top_right=1.415,trim=.039)
arch_wall('elevated upper-left round portal',UPPER_X,1.45,-.145,1.12,.93,
    .52,.80,0,depth=.555,receiver_depth=.145,top_left=.82,top_right=1.04,trim=.044)
# The folded crown rises to the reference's off-center high point, then falls
# into a narrow fluted shoulder rather than a horizontal rectangular header.
mesh('upper central asymmetrical pitched roof',[(-.855,2.27,-.145),(.265,2.49,-.145),
    (.265,2.375,-.70),(-.855,2.345,-.70)],[(0,1,2,3)],RETURN)
for j in range(9):
    x=.040+j*.025
    top=2.27+(2.49-2.27)*(x+.855)/1.12
    box('upper portal tall carved ivory rib',(x,(1.67+top)/2,-.112),
        (.014,top-1.67,.047),REED,.0027)
# A second arch rib gives the upper opening a soft, layered porcelain reveal.
round_ring('upper portal second carved plaster rib',UPPER_X,1.45,-.121,
    .615,.8475,.018,.055,RETURN)
for j in range(7):
    x=UPPER_X-.215+j*(.43/6)
    box('upper portal slender balcony pin',(x,1.495,-.087),(.015,.090,.040),RETURN,.003)
box('upper portal restrained balcony threshold',(UPPER_X,1.45,-.09),(.54,.030,.14),RETURN,.005)

# Reference moon alcove: a circular recess integrated into an asymmetric wing,
# with substantial warm ivory rims and a real inset porcelain sphere.
MC=[.835,1.335,.165];MR=.415
circular_band('moon alcove broad outer ivory hood',MC[0],MC[1],MC[2],.535,.485,.135,RETURN)
circular_band('moon alcove narrow projected curved facade',MC[0],MC[1],MC[2]+.007,.487,.432,.11,FACE)
circular_band('moon alcove rounded inner porcelain reveal',MC[0],MC[1],MC[2]+.017,.435,MR-.009,.105,RETURN)
circular_band('moon alcove shallow dark receiving wall',MC[0],MC[1],MC[2]-.155,MR-.006,.112,.025,RECESS)
MOON_CENTER=[.835,1.292,.045]
sphere('inset round porcelain moon',MOON_CENTER,.151,MOON,80,40)
for lo,hi in ((.235,.409),(1.26,1.455)):
    roof_wedge('moon alcove sculpted tapered shoulder',lo,hi,.56,1.48,1.64,.112,-.33)
roof_wedge('moon alcove right angular folded shoulder',1.265,1.455,.63,1.68,1.77,.10,-.35)
mesh('moon alcove folded shoulder cap',[(1.265,1.68,.10),(1.455,1.77,.10),
    (1.455,1.825,-.35),(1.265,1.755,-.35)],[(0,1,2,3)],RETURN)
PORTALS.append({'name':'circular moon alcove','type':'circle','center':MC,'radius':MR,
    'front':MC[2],'receiverZ':MC[2]-.155,'receiverDepth':.155,
    'moon':{'center':MOON_CENTER,'radius':.151}})

# Right skyline is deliberately lower than the high portal. A peaked tower and
# long slender arched fins frame the circular alcove without making a boxy wall.
peaked_tower('right slender peaked tower',1.515,.37,.145,1.92,2.24,-.265,-.515,.055)
slim_arcade('right elevated sloping lancet colonnade',1.65,1.985,.67,.67,-.23,-.60,6,1.00,1.19)
for j in range(10):
    x=1.66+j*.034
    top=1.67+(x-1.65)*.57
    box('right tall individually modeled ivory reed',(x,(.73+top)/2,-.197),
        (.014,top-.73,.040),REED,.0028)
mesh('right high faceted folded crown',[(1.65,1.67,-.23),(1.985,1.86,-.23),
    (1.985,1.91,-.60),(1.65,1.77,-.60)],[(0,1,2,3)],RETURN)

# Foreground arched masses are broad and low, with nested real plaster ribs.
# The round hoods, narrow lancets and small arcade ends give the reference's
# scalloped lower outline instead of the former long flat wall panels.
arch_wall('lower left large arched void',-1.075,.035,.395,1.02,1.12,
    .575,.875,0,depth=.55,receiver_depth=.155,top_left=1.25,top_right=1.03,trim=.056)
round_ring('lower left second deeply carved arch rib',-1.075,.035,.429,.690,.932,.024,.075,RETURN)
round_ring('lower left fine outer arch scallop',-1.075,.035,.405,.775,.975,.015,.055,REED)
arch_wall('left outer low arch bay',-1.77,.035,.31,.43,.68,
    .218,.435,0,depth=.34,receiver_depth=.10,top_left=.64,top_right=.82,trim=.025)
arch_wall('lower right broad arched void',1.24,.035,.355,.92,.98,
    .525,.690,0,depth=.48,receiver_depth=.145,top_left=.83,top_right=1.12,trim=.049)
round_ring('lower right second carved arch rib',1.24,.035,.382,.625,.740,.019,.065,RETURN)
arch_wall('central lower slender arched void',.515,.035,.42,.395,.77,
    .205,.585,0,depth=.28,receiver_depth=.10,top_left=.74,top_right=.85,trim=.026)
slim_arcade('far right low scalloped arcade',1.735,2.12,.035,.28,.235,-.075,4,.41,.365)
# An intermediate rising arch colonnade makes the right lower wing read as
# carved architecture in depth, behind its closer large rounded foreground bay.
slim_arcade('right rising carved side arcade',1.675,2.03,.37,.43,.125,-.16,4,.53,.90)

# The left diagonal blade descends into the large foreground arch. Its two
# folded roof faces and slender plaster arris add facets without a flat card.
roof_wedge('left descending diagonal ramp facade',-1.73,-.49,.88,1.77,.985,.175,-.14)
mesh('left diagonal folded ramp crown',[(-1.73,1.77,.175),(-.49,.985,.175),
    (-.49,1.09,-.14),(-1.73,1.875,-.14)],[(0,1,2,3)],RETURN)
tube('left sharp diagonal architectural ridge',[(-1.73,1.775,.182),(-.49,.99,.182)],.007,REED,6)

# A real diagonal central flight reaches the elevated upper portal. The run
# traverses right-to-left as it rises, in addition to moving back in depth.
STEP_COUNT=21
STAIR_BOTTOM=[.29,1.448/STEP_COUNT,.695]
STAIR_TOP=[UPPER_X,1.448,-.215]
for j in range(STEP_COUNT):
    t=j/(STEP_COUNT-1)
    top=1.448*(j+1)/STEP_COUNT
    x=STAIR_BOTTOM[0]+(STAIR_TOP[0]-STAIR_BOTTOM[0])*t
    z=STAIR_BOTTOM[2]+(STAIR_TOP[2]-STAIR_BOTTOM[2])*t
    w=.91-.37*t
    box('central diagonal individual stair solid tread',(x,top/2,z-.026),
        (w,top,.054),FACE,.003)
    box('central fine ivory stair nosing',(x,top+.002,z+.002),
        (w+.012,.010,.012),RETURN,.002)
box('central upper real bridge landing',(UPPER_X,1.446,-.285),(.57,.030,.28),FACE,.005)

# The moon wing has a separate small ascending stair-cut shoulder. This remains
# distinct from the diagonal main flight and leaves the moon physically inset.
for j in range(8):
    x=.26+j*.065;top=.735+j*.063
    box('moon alcove small ascending side stair',(x,(.53+top)/2,.255),
        (.068,top-.53,.245),RETURN,.004)
    box('moon side stair fine projected top',(x,top+.004,.255),(.068,.011,.245),FACE,.002)

# Individual shallow reeds catch warm light on major arch piers. They are real
# extruded details, not a normal-map substitution for missing architecture.
for x,lo,hi,z in ((-1.515,.12,1.09,.421),(-.637,.12,.98,.421),
                  (.817,.10,.74,.380),(1.663,.10,1.00,.380)):
    for side in(-1,1):
        box('front tier plain vertical plaster reed',(x+side*.015,(lo+hi)/2,z),
            (.011,hi-lo,.024),REED,.0025)


def batch():
    bpy.context.view_layer.update();groups={}
    for ob in list(bpy.context.scene.objects):
        if ob.type!='MESH':continue
        matrix=ob.matrix_world.copy()
        for vertex in ob.data.vertices:vertex.co=matrix@vertex.co
        ob.matrix_world=Matrix.Identity(4)
        groups.setdefault(ob.data.materials[0].name,[]).append(ob)
    objects=[]
    for name,items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in items:ob.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        ob=bpy.context.view_layer.objects.active;ob.name=name;objects.append(ob)
    return objects


objects=batch()
ao_helper=Path(__file__).with_name('bake_technical_ao.py')
exec(compile(ao_helper.read_text(encoding='utf-8'),str(ao_helper),'exec'))
AO_STATS=bake_technical_ao(objects,samples=32,max_distance=.15,min_factor=.58,max_seconds=100)
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,
    export_lights=False,export_animations=False,export_vertex_color='NAME',
    export_vertex_color_name='Col',export_all_vertex_colors=False)
points=[v.co for ob in objects for v in ob.data.vertices]
lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
stats={'file':OUT.name,'bytes':OUT.stat().st_size,'meshes':len(objects),
    'vertices':sum(len(ob.data.vertices) for ob in objects),
    'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects),
    'bounds':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}}
layout={'version':2,'authoringScale':1,'authoringSpace':'Three XYZ, front +Z, bottom Y0',
    'placement':{'position':[0,.72,-.45],'scale':1},'projectionDomain':{'min':[-2.15,0],'max':[2.15,2.49]},
    'portals':PORTALS,'moon':{'center':MOON_CENTER,'radius':.151},
    'centralStair':{'steps':STEP_COUNT,'rise':1.448,'widthBottom':.91,'widthTop':.54,'bottom':STAIR_BOTTOM,'top':STAIR_TOP,'frontZ':.695,'backZ':-.215,'diagonal':True},
    'materialRoles':[ob.data.materials[0].name for ob in objects],
    'ambientOcclusion':AO_STATS,'stats':stats}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('PROJECTION_SCULPTURE '+json.dumps(stats),flush=True)
if '--geometry-only' in __import__('sys').argv:
    __import__('sys').exit(0)

# Model-only review renders. Neither is a geometry billboard in the website.
QA.mkdir(parents=True,exist_ok=True);HERO_OUT.parent.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.014,.020,.034,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.25
scene.view_settings.view_transform='AgX'
ground_mat=role('QA navy ground only',(.007,.011,.022),.46)
ground=box('QA ground only',(0,-.065,0),(40,.06,40),ground_mat,0)
def area(name,p,power,color,size,target):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(p)
    ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
area('warm white soft sculptural key',(-3,6,5),800,(1,.83,.60),5,(0,1.7,0))
area('cool clean sculptural fill',(4,4,3),500,(.66,.82,1),4,(0,1.7,0))
area('warm edge light behind sculpture',(-1,4,-4),1000,(1,.68,.32),3,(0,1.7,0))
cam_data=bpy.data.cameras.new('isolated sculpture review camera');cam=bpy.data.objects.new('isolated sculpture review camera',cam_data)
bpy.context.collection.objects.link(cam);cam.location=xyz((-5.4,2.45,14))
cam.rotation_euler=(Vector(xyz((0,1.22,-.1)))-cam.location).to_track_quat('-Z','Y').to_euler()
cam_data.type='ORTHO';cam_data.ortho_scale=5.6;scene.camera=cam
scene.render.filepath=str(QA/'sculpture-unmapped-clay.png');bpy.ops.render.render(write_still=True)
if '--clay-only' in __import__('sys').argv:
    __import__('sys').exit(0)

# Native procedural projected light, used only for the isolated display render.
# It is sampled in common world coordinates, so the caustic veins continue
# coherently across all sculptural tiers and genuine rounded surfaces.
for mat in(FACE,RECESS):
    nt=mat.node_tree;nodes=nt.nodes;links=nt.links;bsdf=nodes.get('Principled BSDF')
    position=nodes.new('ShaderNodeNewGeometry')
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1.65
    noise.inputs['Detail'].default_value=2.2;noise.inputs['Roughness'].default_value=.58
    links.new(position.outputs['Position'],noise.inputs['Vector'])
    patch=nodes.new('ShaderNodeValToRGB')
    patch.color_ramp.elements[0].position=.43;patch.color_ramp.elements[0].color=(.72,.72,.66,1)
    patch.color_ramp.elements[1].position=.60;patch.color_ramp.elements[1].color=(.014,.19,.43,1)
    links.new(noise.outputs['Fac'],patch.inputs[0])
    warp=nodes.new('ShaderNodeVectorMath');warp.operation='SCALE';warp.inputs[3].default_value=.46
    links.new(noise.outputs['Color'],warp.inputs[0])
    add=nodes.new('ShaderNodeVectorMath');add.operation='ADD';links.new(position.outputs['Position'],add.inputs[0]);links.new(warp.outputs[0],add.inputs[1])
    vor=nodes.new('ShaderNodeTexVoronoi');vor.feature='DISTANCE_TO_EDGE';vor.inputs['Scale'].default_value=5.2
    links.new(add.outputs[0],vor.inputs['Vector'])
    veins=nodes.new('ShaderNodeValToRGB');veins.color_ramp.elements[0].position=.009;veins.color_ramp.elements[0].color=(.8,.99,1,1)
    veins.color_ramp.elements[1].position=.047;veins.color_ramp.elements[1].color=(.012,.06,.12,1)
    links.new(vor.outputs['Distance'],veins.inputs[0])
    mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='SCREEN';mix.inputs[0].default_value=.70
    links.new(patch.outputs['Color'],mix.inputs[1]);links.new(veins.outputs['Color'],mix.inputs[2])
    links.new(mix.outputs[0],bsdf.inputs['Base Color']);links.new(mix.outputs[0],bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value=.45 if mat==FACE else .20
    bsdf.inputs['Roughness'].default_value=.56
MOON.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.82,.74,.53,1)
MOON.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.28
# Prefer the exact native runtime light field for the isolated display image.
caustic_path=ROOT/'public/media/projection-mapping-v3/sculpture-caustics.webp'
if caustic_path.exists():
    caustic_image=bpy.data.images.load(str(caustic_path),check_existing=True)
    for mat in(FACE,RECESS):
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
        geom=nodes.new('ShaderNodeNewGeometry');separate=nodes.new('ShaderNodeSeparateXYZ')
        links.new(geom.outputs['Position'],separate.inputs[0])
        ux=nodes.new('ShaderNodeMath');ux.operation='MULTIPLY_ADD';ux.inputs[1].default_value=1/4.3;ux.inputs[2].default_value=.5
        vy=nodes.new('ShaderNodeMath');vy.operation='DIVIDE';vy.inputs[1].default_value=2.49
        links.new(separate.outputs['X'],ux.inputs[0]);links.new(separate.outputs['Z'],vy.inputs[0])
        uv=nodes.new('ShaderNodeCombineXYZ');links.new(ux.outputs[0],uv.inputs[0]);links.new(vy.outputs[0],uv.inputs[1])
        tex=nodes.new('ShaderNodeTexImage');tex.image=caustic_image;tex.interpolation='Linear';tex.extension='EXTEND'
        links.new(uv.outputs[0],tex.inputs['Vector'])
        links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);links.new(tex.outputs['Color'],bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value=.65 if mat==FACE else .28
scene.render.resolution_x=1600;scene.render.resolution_y=900
scene.render.filepath=str(QA/'sculpture-mapped-preview.png');bpy.ops.render.render(write_still=True)
import shutil
shutil.copyfile(QA/'sculpture-mapped-preview.png',HERO_OUT)
