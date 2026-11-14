"""09:32 reference: twin galleries, curved cosmic backdrop and crystal stage.

Physical authoring is native Three XYZ metres. The website applies its approved
uniform 3x installation scale. No visitors or photographic overlays are baked.
"""
from pathlib import Path

PREVIOUS = Path(__file__).with_name("rebuild_projection_mapping_stall_v3.py")
prefix = PREVIOUS.read_text(encoding="utf-8").split("# Exact physical")[0]
prefix = prefix.replace("Projection Booth V3", "Projection Booth V4").replace("10.13", "5.65")
exec(compile(prefix, str(PREVIOUS), "exec"))
OUT = ROOT / "public/models/expo/projection-mapping-stall-v4.glb"
LAYOUT_OUT = ROOT / "public/models/expo/projection-mapping-v4-layout.json"
SCALE, OFFSET = Vector((1, 1, 1)), Vector((0, 0, 0))
FLOOR_TOP = PHYSICAL_FLOOR = .10
SCREENS, PROJECTORS, SIGNAGE_METRICS, SIGNAGE_OBJECTS = [], [], [], []

ARCH_CONTROLS = [(-5.42,.12,1.78),(-5.18,2.10,1.84),(-5.00,4.10,1.92),
    (-4.45,4.95,2.01),(-3.60,5.20,2.07),(-1.50,5.12,2.15),
    (.60,5.05,2.17),(2.60,4.96,2.14),(4.75,4.75,2.05),
    (5.18,3.90,1.94),(5.32,2.10,1.88),(5.32,.12,1.78)]
ARCH_PATH = catmull(ARCH_CONTROLS, 12)
ARCH_WIDTHS = [p.x*.75 for p in catmull([(w,0,0) for w in
    (.35,.38,.44,.40,.28,.24,.25,.28,.42,.56,.53,.46)],12)]
for p in ARCH_PATH:
    weight=max(0,min(1,(p.y-3.80)/.90))
    p.y-=.20*weight*weight*(3-2*weight)
ARCH_UPPER_CROWN = []
for j in range(36, 100):
    tangent = ARCH_PATH[j+1] - ARCH_PATH[j-1]
    p = ARCH_PATH[j] + Vector((-tangent.y,tangent.x,0)).normalized()*ARCH_WIDTHS[j]/2
    ARCH_UPPER_CROWN.append((p.x,p.y+.012))

def shell_bottom(x):
    if x < ARCH_UPPER_CROWN[0][0]:
        return interpolate(x,[(-6,4.78),ARCH_UPPER_CROWN[0]])
    if x > ARCH_UPPER_CROWN[-1][0]:
        return interpolate(x,[ARCH_UPPER_CROWN[-1],(6,4.58)])
    return interpolate(x,ARCH_UPPER_CROWN)

# Keep a genuine green shoulder below the black crown and above the gold arch.
for p in ARCH_PATH:
    rise=max(0,min(1,(p.x-.25)/3.1));fall=1-max(0,min(1,(p.x-4.65)/.85))
    p.y-=.28*(rise*rise*(3-2*rise))*(fall*fall*(3-2*fall))

deck=[(-6,-2.75),(6,-2.75),(6,1.85),(5.32,2.75),(-2.58,2.75),(-5.69,2.24),(-6,1.79)]
extruded_outline("Projection Booth V4 | angular honed stone island",deck,.035,FLOOR_TOP,FLOOR)
deck_trim=[(x-math.copysign(.025,x),z-math.copysign(.025,z+.3)) for x,z in deck]
outline_tube("Projection Booth V4 | continuous fine warm platform edge",deck_trim,.117,.010,WHITE)
outline_tube("Projection Booth V4 | machined champagne platform joint",deck_trim,.103,.007,CHAMPAGNE)

# Real deep, chamfered perimeter crown. Its lower edge follows the gold sweep.
outer=[(5.65+.35*math.cos(a*math.pi/24),1.80+.35*math.sin(a*math.pi/24)) for a in range(13)]
outer.extend([(-3.85,2.15),(-6,.35),(-6,-2.75),(6,-2.75)])
inside=[]
for j,p in enumerate(outer):
    previous,current,following=Vector(outer[j-1]),Vector(p),Vector(outer[(j+1)%len(outer)])
    a,b=(current-previous).normalized(),(following-current).normalized()
    na,nb=Vector((-a.y,a.x)),Vector((-b.y,b.x));bisector=(na+nb).normalized()
    inside.append(tuple(current+bisector*(.18/max(.3,bisector.dot(na)))))
dense,inner=[],[]
for j,p in enumerate(outer):
    k=(j+1)%len(outer);a,b=Vector(p),Vector(outer[k]);ia,ib=Vector(inside[j]),Vector(inside[k])
    count=max(1,math.ceil((b-a).length/.12))
    for q in range(count):dense.append(tuple(a.lerp(b,q/count)));inner.append(tuple(ia.lerp(ib,q/count)))
vertices,faces=[],[]
for (x,z),(ix,iz) in zip(dense,inner):
    bottom=shell_bottom(x) if z>1.9 else 4.78
    vertices.extend(((x,bottom,z),(x,5.8,z),(ix,5.8,iz),(ix,bottom,iz)))
for j in range(len(dense)):
    for q in range(4):faces.append((j*4+q,((j+1)%len(dense))*4+q,((j+1)%len(dense))*4+(q+1)%4,j*4+(q+1)%4))
ob=patch_mesh("Projection Booth V4 | deep sweeping black fascia and chamfered returns",vertices,faces,FASCIA)
for face in ob.data.polygons:face.use_smooth=False
depths=[.58+.66*math.sin(j/(len(ARCH_PATH)-1)*math.pi)**.55 for j in range(len(ARCH_PATH))]
sharp_sweep("Projection Booth V4 | substantial integrated black arch",[p-Vector((0,0,.04)) for p in ARCH_PATH],
    [w+.10 for w in ARCH_WIDTHS],[d+.12 for d in depths],BLACK)
sharp_sweep("Projection Booth V4 | broad continuous champagne arch and soffit",ARCH_PATH,ARCH_WIDTHS,depths,CHAMPAGNE)
seam=[]
for j,p in enumerate(ARCH_PATH):
    tangent=ARCH_PATH[min(j+1,len(ARCH_PATH)-1)]-ARCH_PATH[max(0,j-1)]
    seam.append((p+Vector((-tangent.y,tangent.x,0)).normalized()*ARCH_WIDTHS[j]/2+Vector((0,0,.007)),.005))
sweep("Projection Booth V4 | fine warm edge of sweeping arch",seam,WHITE,7)

# A single connected fold replaces overlapping flat quads. The raised crease
# gives the glossy emerald two real reflection directions, with a level crown.
points=[(-5.99,5.794,.40),(-3.85,5.794,2.183),(-3.85,5.04,2.183),
    (-5.10,3.18,1.14),(-5.10,4.75,1.27),(-5.99,4.75,.40)]
fold_faces=[(0,1,4),(1,2,4),(2,3,4),(3,5,4),(0,4,5)]
patch_mesh("Projection Booth V4 | broad creased emerald corner",points,fold_faces,DEEP_GREEN)
back=[(x,y,z-.10) for x,y,z in points]
perimeter=[0,1,2,3,5]
patch_mesh("Projection Booth V4 | folded emerald real metal return",points+back,
    [tuple(index+6 for index in reversed(face)) for face in fold_faces]+
    [(perimeter[j],perimeter[(j+1)%5],perimeter[(j+1)%5]+6,perimeter[j]+6) for j in range(5)],DEEP_GREEN)
line(points[0],points[1],.006,TEAL);line(points[2],points[3],.006,TEAL)

green=[]
for j,p in enumerate(ARCH_PATH):
    tangent=ARCH_PATH[min(j+1,len(ARCH_PATH)-1)]-ARCH_PATH[max(0,j-1)]
    edge=p+Vector((-tangent.y,tangent.x,0)).normalized()*ARCH_WIDTHS[j]/2
    if .35<edge.x<5.05:
        top=shell_bottom(edge.x)-.014;bottom=max(edge.y+.006,top-.52)
        if top>bottom+.015:green.append((Vector((edge.x,top,2.166)),Vector((edge.x,bottom,edge.z+.009))))
v,f=[],[]
for a,b in green:v.extend((a,b,b-Vector((0,0,.20)),a-Vector((0,0,.20))))
for j in range(len(green)-1):
    for k in range(4):f.append((j*4+k,(j+1)*4+k,(j+1)*4+(k+1)%4,j*4+(k+1)%4))
f.extend(((3,2,1,0),tuple(range((len(green)-1)*4,len(green)*4))))
patch_mesh("Projection Booth V4 | exposed emerald right shoulder below crown",v,f,DEEP_GREEN)

box("Projection Booth V4 | continuous left outer service wall",(-5.925,2.42,-1.20),(.15,4.64,3.10),WALL,.008)
box("Projection Booth V4 | continuous right deep black return",(5.925,2.45,-.30),(.15,4.70,4.90),WALL,.008)
box("Projection Booth V4 | right integral front branding return",(5.65,2.91,2.09),(.69,5.56,.15),BLACK,.008)
for side in(-1,1):
    box("Projection Booth V4 | recessed gallery graphite wall",(-3.65 if side<0 else 4.25,2.50,-1.12),(2.15,4.80,.12),WALL,.008)
    for j in range(15):
        box("Projection Booth V4 | champagne black fluted inner gallery return",(side*(2.56+j*.036)+(.65 if side>0 else 0),2.53,-1.33),(.015,4.76,.14),CHAMPAGNE if j%5==0 else BLACK,.002)
box("Projection Booth V4 | rear charcoal fluted backing",(0,2.60,-2.64),(5.88,5.0,.12),WALL,.006)
for j in range(37):
    box("Projection Booth V4 | fine rear charcoal wall flute",(-2.82+j*.157,2.58,-2.54),(.025,4.94,.06),BLACK,.003)

# Eight real LED cabinets, each with its own live content and physical caption.
GALLERY_CAPTIONS=["ARCHITECTURAL MAPPING","STAGE EXPERIENCES","PRODUCT MAPPING","INTERACTIVE SPACES",
    "LANDMARKS","BRAND EXPERIENCES","INTERIORS","EVENTS & EXHIBITIONS"]
for side in(-1,1):
    yaw=-.08 if side<0 else -.04
    gallery_x=-3.60 if side<0 else 4.25
    for row,y in enumerate((4.15,3.35,2.55,1.75)):
        index=row if side<0 else row+4
        aperture("projection-application-"+str(index),(gallery_x,y,-.985),1.65,.68,
            "projection-application-"+str(index),yaw=yaw,frame=.018)
        readable_label(GALLERY_CAPTIONS[index],(gallery_x,y-.45,-.952),.09,max_width=1.72,centered=True,yaw=yaw)

# Genuine concave cylindrical backdrop. Its cabinet is 8 mm behind the live
# emitting radius; inward-facing viewing requires the runtime flipU metadata.
BACKDROP_RADIUS=6.70;BACKDROP_ARC=2*math.asin(2.95/BACKDROP_RADIUS)
BACKDROP_CENTER=Vector((0,3.05,4.35));BACKDROP_HEIGHT=2.35
v,f=[],[]
for j in range(97):
    a=-BACKDROP_ARC/2+BACKDROP_ARC*j/96
    for radius,dy in ((6.708,-BACKDROP_HEIGHT/2),(6.708,BACKDROP_HEIGHT/2),(6.765,BACKDROP_HEIGHT/2),(6.765,-BACKDROP_HEIGHT/2)):
        v.append(BACKDROP_CENTER+Vector((-radius*math.sin(a),dy,-radius*math.cos(a))))
for j in range(96):
    for q in range(4):f.append((j*4+q,(j+1)*4+q,(j+1)*4+(q+1)%4,j*4+(q+1)%4))
f.extend(((3,2,1,0),tuple(range(384,388))))
patch_mesh("Projection Booth V4 | concave cosmic backdrop real cylindrical cabinet",v,f,BACK)
for dy in(-BACKDROP_HEIGHT/2-.016,BACKDROP_HEIGHT/2+.016):
    points=[]
    for j in range(97):
        a=-BACKDROP_ARC/2+BACKDROP_ARC*j/96
        points.append((BACKDROP_CENTER+Vector((-6.70*math.sin(a),dy,-6.70*math.cos(a))),.009))
    sweep("Projection Booth V4 | fine cosmic backdrop curved champagne trim",points,CHAMPAGNE,6)
SCREENS.append({"id":"projection-backdrop","type":"curved","x":0,"y":3.05,"z":4.35,
    "w":BACKDROP_RADIUS*BACKDROP_ARC,"h":BACKDROP_HEIGHT,"radius":BACKDROP_RADIUS,"arc":BACKDROP_ARC,
    "rotation":[0,math.pi,0],"mediaHint":"projection-backdrop","flipU":True,"chordWidth":5.90})

# One broad cosmic roof zone, with two nested solid champagne rings beneath.
roof_center=Vector((0,5.12,-.35));rx,rz=4.12,2.22;pitch=-.16
before=set(bpy.context.scene.objects)
ellipse_annulus("Projection Booth V4 | broad cosmic outer canopy backing",(rx,rz),(rx*.28,rz*.28),0,0,.035,.12,BACK,144)
pose_meshes(set(bpy.context.scene.objects)-before,roof_center,Matrix.Rotation(pitch,4,"X"))
surface=roof_center+Vector((0,-math.cos(pitch),-math.sin(pitch)))*.055
SCREENS.append({"id":"projection-ceiling-outer","type":"ellipse","x":surface.x,"y":surface.y,"z":surface.z,
    "w":rx*2,"h":rz*2,"radiusX":rx,"radiusZ":rz,"innerFraction":.28,"rotation":[math.pi/2+pitch,0,0],"mediaHint":"projection-ceiling"})
ring_geometry("Projection Booth V4 | outer common ceiling ring",(0,4.96,-1.00),2.90,1.50,-.16)
ring_geometry("Projection Booth V4 | inner concentric ceiling ring",(0,4.75,-1.00),1.92,1.12,-.14,inset=True)
for z in(-2.15,1.85):
    rod("Projection Booth V4 | black roof lighting track",(-5.55,5.52,z),(5.55,5.52,z),.014,BRUSHED,8)
for x in(-5.3,-4.2,-3.1,-2,-.9,.2,1.3,2.4,3.5,4.6,5.5):
    for z in(-2.0,1.73):
        rod("Projection Booth V4 | small warm recessed practical",(x,5.48,z),(x,5.30,z),.041,BLACK,10)
        disk("Projection Booth V4 | real warm practical optic",x,z,.027,5.292,5.305,WHITE)

# Crystal stage, exact contract shared with the independent sculpture asset.
stage_outline=[(x,z-.50) for x,z in round_outline(4.70,2.00,.09,12)]
extruded_outline("Projection Booth V4 | recessed crystal demonstration plinth",stage_outline,.10,.72,COUNTER)
outline_tube("Projection Booth V4 | crystal plinth champagne upper edge",stage_outline,.72,.008,CHAMPAGNE)
outline_tube("Projection Booth V4 | crystal plinth green lower cove",stage_outline,.19,.009,TEAL)

# Main wordmarks and actual physical service copy.
before=set(bpy.context.scene.objects)
logo((-2.20,5.29,2.166),.38,max_width=2.20)
for ob in set(bpy.context.scene.objects)-before:
    if ob.type=="MESH":
        for slot in ob.material_slots:
            if slot.material==TEAL_BRAND:slot.material=HEADER_MINT
line((.65,5.25,2.17),(.65,5.65,2.17),.003,BRAND)
readable_label("PROJECTION MAPPING",(.90,5.37,2.17),.16,max_width=3.30)
readable_label("TRANSFORM SPACES INTO STORIES",(.91,5.15,2.17),.10,max_width=3.25,mat=TEAL_BRAND)
for j,copy in enumerate(("ANY","SURFACE","A CANVAS")):
    readable_label(copy,(5.22,5.32-j*.20,2.18),.12,max_width=.66)
line((5.23,4.61,2.18),(5.48,4.61,2.18),.0025,BRAND)
for j,copy in enumerate(("IDEAS","MAPPED","BIGGER")):
    readable_label(copy,(5.35,3.95-j*.20,2.179),.11,max_width=.56)
line((5.35,3.28,2.179),(5.60,3.28,2.179),.0025,BRAND)
for j,copy in enumerate(("BUILDINGS","STAGES","PRODUCTS","INTERIORS","EXPERIENCES")):
    readable_label(copy,(5.35,2.88-j*.20,2.179),.095,max_width=.57)

service_start=Vector((-5.98,.10,.367));service_end=Vector((-5.10,.10,1.106))
service_u=(service_end-service_start).normalized();service_normal=Vector((-service_u.z,0,service_u.x));service_yaw=-math.atan2(service_u.z,service_u.x)
front=[service_start,service_end,service_end+Vector((0,4.64,0)),service_start+Vector((0,4.64,0))]
back=[p-service_normal*.13 for p in front]
patch_mesh("Projection Booth V4 | broad integrated diagonal service wall",front+back,
    [(0,1,2,3),(7,6,5,4)]+[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)],BLACK)
def service_label(body,y):
    p=service_start+service_u*.05+service_normal*.018;p.y=y
    readable_label(body,p,.12,max_width=.51 if body in("SOLUTIONS","EXPERIENCES") else .58,yaw=service_yaw)
for j,copy in enumerate(("SPACES","PEOPLE","BRANDS","EMOTIONS")):service_label(copy,3.72-j*.21)
for j,copy in enumerate(("RENTAL","SOLUTIONS","EXPERIENCES")):service_label(copy,2.57-j*.21)
for y in(2.82,1.77):
    a=service_start+service_u*.05+service_normal*.02;b=service_start+service_u*.33+service_normal*.02;a.y=b.y=y;line(a,b,.0025,BRAND)
for j,copy in enumerate(("MORE","THAN PROJECTION","A HIGHER PERSPECTIVE")):
    readable_label(copy,(5.835,2.76-j*.18,-1.32),.09,max_width=1.00,yaw=-math.pi/2)

# The climbing foliage uses closed, folded leaf blades with woody branching.
# Every blade is bounded to its narrow planted strip, away from LED cabinets.
previous_source=PREVIOUS.read_text(encoding="utf-8")
def folded_leaf(vertices,faces,palette,base,direction,half_width,rng,bounds=None):
    axis=Vector(direction);length=axis.length;axis.normalize()
    across=Vector((-axis.y,axis.x,rng.uniform(-.28,.28))).normalized()
    normal=axis.cross(across).normalized()
    if normal.z<0:normal=-normal
    base=Vector(base)
    rim=[base,base+axis*length*.27+across*half_width*.80,
        base+axis*length*.68+across*half_width,base+axis*length+normal*length*.035,
        base+axis*length*.68-across*half_width,base+axis*length*.27-across*half_width*.80]
    ridge=base+axis*length*.48+normal*length*.13
    front=rim+[ridge]
    if bounds:
        front=[Vector((max(bounds[0],min(bounds[1],p.x)),max(bounds[2],min(bounds[3],p.y)),max(bounds[4],min(bounds[5],p.z)))) for p in front]
    start=len(vertices);vertices.extend(front+[p-normal*.0014 for p in front])
    color=rng.randrange(3)
    for j in range(6):
        k=(j+1)%6
        faces.extend(((start+j,start+6,start+k),(start+7+k,start+13,start+7+j),
            (start+j,start+k,start+7+k,start+7+j)))
        palette.extend((color,color,color))

def leaf_mesh(name,vertices,faces,palette):
    ob=patch_mesh(name,vertices,faces,LEAVES[0])
    for mat in LEAVES[1:]:ob.data.materials.append(mat)
    for polygon,color in zip(ob.data.polygons,palette):polygon.material_index=color
    return ob

def living_strip(name,x,z,bottom=.55,top=4.45,width=.22,seed=0):
    rng=random.Random(seed)
    box(name+" | recessed planted backing",(x,(bottom+top)/2,z),(width,top-bottom,.045),BLACK,.006)
    vertices,faces,palette=[],[],[]
    bounds=(x-width*.49,x+width*.49,bottom,top,z+.024,z+.110)
    def stem(t,branch):
        return Vector((x+math.sin(t*16+branch*2.1)*width*.19+(branch-1)*width*.12,
            bottom+(top-bottom)*t,z+.043+math.sin(t*11+branch)*.009))
    for branch in range(3):
        sweep(name+" | naturally branching climbing stem",[(stem(j/36,branch),.0031) for j in range(37)],TIMBER,5)
    for j in range(210):
        t=(j+rng.random())/210;branch=j%3;base=stem(t,branch)
        a=rng.uniform(-math.pi,math.pi)
        length=rng.uniform(.072,.125)
        direction=Vector((math.cos(a),math.sin(a)*.77,rng.uniform(-.08,.18))).normalized()*length
        petiole=base+direction*.25
        if j%3==0:rod(name+" | forked green petiole",base,petiole,.0018,TIMBER,5)
        folded_leaf(vertices,faces,palette,petiole,direction,rng.uniform(.021,.036),rng,bounds)
    leaf_mesh(name+" | dense closed curved climbing leaves",vertices,faces,palette)

for side in(-1,1):
    living_strip("Projection Booth V4 | outer gallery living wall",-4.77 if side<0 else 5.42,-1.00,.42,4.78,.30 if side<0 else .25,17 if side<0 else 39)
    living_strip("Projection Booth V4 | inner gallery climbing greenery",-2.55 if side<0 else 3.20,-1.35,.45,4.55,.23,29 if side<0 else 47)

def broadleaf_entrance_tree():
    name="Projection Booth V4 | full broadleaf entrance tree";rng=random.Random(121)
    x,z=-5.82,1.25
    lathe(name+" | champagne planter",x,z,[(.156,.10),(.173,.12),(.173,.68),(.160,.70)],CHAMPAGNE,24)
    disk(name+" | dark planted soil",x,z,.158,.682,.686,TIMBER)
    trunk=[(Vector((x,.685,z)),.022),(Vector((x+.08,1.05,z)),.019),
        (Vector((x+.20,1.40,z+.015)),.014),(Vector((x+.30,1.79,z-.02)),.006)]
    sweep(name+" | living branched trunk",trunk,TIMBER,8)
    vertices,faces,palette=[],[],[]
    bounds=(-5.98,-4.75,1.05,2.10,.75,1.85)
    for cluster in range(12):
        a=cluster*2.39996
        center=Vector((-5.48+math.cos(a)*.31,1.50+math.sin(cluster*1.73)*.30,1.25+math.sin(a)*.26))
        start=Vector((x+.15,1.22+cluster*.035,z))
        rod(name+" | ascending woody branch",start,center,.007-rng.random()*.003,TIMBER,6)
        for j in range(23):
            phi=rng.uniform(0,math.tau);v=rng.uniform(-1,1);radial=math.sqrt(1-v*v)
            base=center+Vector((math.cos(phi)*radial*.18,v*.17,math.sin(phi)*radial*.14))
            direction=Vector((math.cos(phi)*.65,rng.uniform(-.3,.8),math.sin(phi)*.45+.35)).normalized()*rng.uniform(.105,.175)
            folded_leaf(vertices,faces,palette,base,direction,rng.uniform(.032,.054),rng,bounds)
    leaf_mesh(name+" | full dimensional glossy broadleaf crown",vertices,faces,palette)

broadleaf_entrance_tree()

def scaled_prop(builder,position,scale=(1,1,1),yaw=0):
    global FLOOR_TOP
    before=set(bpy.context.scene.objects);FLOOR_TOP=0;builder();FLOOR_TOP=PHYSICAL_FLOOR
    pose_meshes(set(bpy.context.scene.objects)-before,position,Matrix.Rotation(yaw,4,"Y")@Matrix.Diagonal((*scale,1)))

seating=[{"id":"right-left","position":[3.25,.10,1.15],"yaw":1.25},
    {"id":"right-right","position":[4.95,.10,.40],"yaw":-1.25},
    {"id":"right-rear","position":[4.15,.10,.08],"yaw":0}]
for seat in seating:
    scaled_prop(lambda:lounge_chair(0,0,0,1.35),seat["position"],(.58,.55,.55),seat["yaw"])
    seat.update(seatTop=.584,width=.783,depth=.792,height=.886)
for x,z,yaw in((-3.15,-.1,-.2),(-4.15,-.40,.3)):
    scaled_prop(lambda:lounge_chair(0,0,0,1.35),(x,.10,z),(.58,.55,.55),yaw)
scaled_prop(lambda:sofa_v2(0,0,2.10,0),(-3.55,.10,-1.55),(.66,.46,.55),.05)
for x,z in((4.15,1.15),(-3.50,.48)):
    scaled_prop(lambda:cafe_table(0,0),(x,.10,z),(.37,.38,.37));flowers(x,.65,z,.09);water_glass(x+.11,.65,z)

# Three visible projector casings suspended below, and in front of, the rings.
projector_source=helper_source[helper_source.index("def projector("):helper_source.index("def kiosk(")].replace("10.16","5.65")
exec(compile(projector_source,"physical-v4-projector-helper","exec"))
for name,lens,target,scale,radius in(
    ("Projection central projector",(0,4.35,1.25),(-.20,2.90,-.65),.27,.75),
    ("Projection left projector",(-1.85,4.05,1.10),(-1.20,2.10,-.30),.25,.58),
    ("Projection right projector",(1.85,4.05,1.10),(1.20,2.10,-.30),.25,.58)):
    projector(name,lens,target,scale);PROJECTORS[-1].update(radius=radius,opacity=.075,width=radius*2,height=3.30)

# Wider reception with a real emerald chevron end, laptop, flowers and glass.
reception={"center":[-3.95,.10,1.92],"width":3.60,"height":1.10,"depth":.80,"top":1.20}
before=set(bpy.context.scene.objects);outline=round_outline(3.58,.80,.045,10)
extruded_outline("Projection Booth V4 | broad black premium reception",outline,0,1.045,COUNTER)
extruded_outline("Projection Booth V4 | thin charcoal stone reception top",round_outline(3.60,.82,.05,10),1.045,1.10,TOP)
outline_tube("Projection Booth V4 | fine warm reception toe",outline,.018,.007,WHITE)
outline_tube("Projection Booth V4 | crisp champagne reception top seam",round_outline(3.60,.82,.05,10),1.095,.003,CHAMPAGNE)
emblem_before=set(bpy.context.scene.objects)
triangle_emblem((-1.47,.49,.413),.43)
for ob in set(bpy.context.scene.objects)-emblem_before:
    if ob.type=="MESH":
        for slot in ob.material_slots:slot.material=HEADER_MINT
glyph("livegrid AV",(-.96,.55,.416),.31,semibold=True,max_width=1.75)
readable_label("RENTAL  |  SOLUTIONS  |  EXPERIENCES",(-1.46,.255,.416),.085,max_width=2.35)
chevron=[(1.78,.02,.425),(.87,.55,.425),(1.78,1.045,.425)]
CHEVRON_FILL=material("Projection Booth V4 | emerald metallic reception chevron fill",(.004,.28,.15),.25,.30,.45)
chevron_back=[(x,y,z-.035) for x,y,z in chevron]
patch_mesh("Projection Booth V4 | reception solid illuminated emerald chevron",chevron+chevron_back,
    [(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],CHEVRON_FILL)
sweep("Projection Booth V4 | reception integrated teal chevron edge",[(Vector(p),.006) for p in chevron],TEAL,7)
box("Projection Booth V4 | real silver laptop base",(-.95,1.116,-.02),(.55,.024,.34),SILVER,.007)
soft_box("Projection Booth V4 | silver laptop upright screen",(-.95,1.29,-.13),(.54,.34,.025),SILVER,.008)
flowers(.72,1.10,-.02,.11);water_glass(.30,1.10,-.04)
group("Projection Booth V4 | entire reception assembly",before,reception["center"])
patch_mesh("Projection Booth V4 | emerald left entrance toe",[(-5.96,.11,1.96),(-5.30,.11,1.96),(-5.96,.82,1.96)],[(0,1,2)],DEEP_GREEN)
line((-5.96,.11,1.97),(-5.30,.11,1.97),.007,TEAL)

kiosk_source=previous_source[previous_source.index("def physical_kiosk("):previous_source.index('physical_kiosk("projection-kiosk-wide"')]
exec(compile(kiosk_source.replace("Projection Booth V3","Projection Booth V4"),"projection-v4-kiosk-helper","exec"))
physical_kiosk("projection-kiosk-wide",(2.45,.10,2.08),1.40,1.32,.67,-.12)

# Dense, varied live greenery frames each gallery without hiding its images.
for name,x,z,h,r,seed in(("left rear palm",-2.70,-1.90,2.35,.44,24),("left gallery pot",-4.98,-.75,1.70,.30,35),
    ("right entrance palm",5.45,1.82,1.65,.45,47),("right inner palm",2.80,-1.85,2.12,.39,59),
    ("right gallery pot",5.55,-.75,1.60,.22,67),("crystal front left",-1.95,.72,1.15,.32,78),
    ("crystal front right",1.65,.72,1.08,.30,89)):
    feather_palm("Projection Booth V4 | "+name,x,z,h,r,seed)

# Material batching retains physical meshes and small modeled text, then bakes
# consistent ambient occlusion. Imported scenes and shared assets are untouched.
bpy.context.view_layer.update()
for ob,record in SIGNAGE_OBJECTS:
    p=[ob.matrix_world@v.co for v in ob.data.vertices];q=[[v.x,v.z,-v.y] for v in p];origin=ob.matrix_world@Vector((0,0,0))
    record["position"]=[origin.x,origin.z,-origin.y]
    record["bounds"]={"min":[min(v[i] for v in q) for i in range(3)],"max":[max(v[i] for v in q) for i in range(3)]}
batch_source=STALL_HELPER_SOURCE[STALL_HELPER_SOURCE.index("def material_batch("):STALL_HELPER_SOURCE.index("main_meshes = material_batch(")]
batch_source=batch_source.replace('startswith("Projection Booth")','startswith("Projection Booth V4")').replace('"Projection Booth | "','"Projection Booth V4 | "')
exec(compile(batch_source,"projection-v4-export-helpers","exec"))
meshes=material_batch(list(bpy.context.scene.objects))
ao_helper=Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_helper.read_text(encoding="utf-8"),str(ao_helper),"exec"))
AO_STATS=bake_technical_ao(meshes,samples=32,max_distance=.32,max_seconds=100)
stats=export(OUT,meshes)
layout={"version":4,"authoringScale":1,"runtimeScale":3,"root":ROOT_POSITION,"worldAnchor":ROOT_POSITION,"rootRotation":ROOT_ROTATION,
    "floorTop":.10,"deckPolygonXZ":deck,"architecture":{"width":12,"depth":5.5,"height":5.8,
    "dimensions":{"width":12,"depth":5.5,"height":5.8},"deckPolygonXZ":deck,"reception":reception,
    "stage":{"center":[0,.72,-.50],"width":4.70,"depth":2.00,"top":.72,"min":[-2.35,.10,-1.5],"max":[2.35,.72,.5]},
    "seating":seating,"rightTable":{"position":[4.15,.10,1.15],"top":.65},
    "kiosk":{"position":[2.45,.10,2.08],"width":1.40,"height":1.32}},
    "modelPlacement":{"position":[0,.72,-.45],"scale":[1,1,1],"targetWidth":4.30,"targetHeight":3.30,"bottom":.72},
    "apertures":SCREENS,"screens":SCREENS,"projectors":PROJECTORS,
    "interaction":{"position":[-3.95,.65,2.35],"rotation":[0,0,0],"w":3.45,"h":1.0},
    "typography":SIGNAGE_METRICS,"ambientOcclusion":AO_STATS,"stats":{"main":stats}}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding="utf-8")
print("PROJECTION_MAPPING_STALL_V4 "+json.dumps(stats),flush=True)
