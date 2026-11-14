"""Grand 14.4 x 8.0 x 7.2 m projection pavilion, authored in physical metres.

Physical authoring is native Three XYZ metres. The website applies its approved
uniform 3x installation scale. No visitors or photographic overlays are baked.
"""
from pathlib import Path

PREVIOUS = Path(__file__).with_name("rebuild_projection_mapping_stall_v3.py")
prefix = PREVIOUS.read_text(encoding="utf-8").split("# Exact physical")[0]
prefix = prefix.replace("Projection Booth V3", "Projection Booth V5").replace("10.13", "7.05")
exec(compile(prefix, str(PREVIOUS), "exec"))
OUT = ROOT / "public/models/expo/projection-mapping-stall-v5.glb"
LAYOUT_OUT = ROOT / "public/models/expo/projection-mapping-v5-layout.json"
SCALE, OFFSET = Vector((1, 1, 1)), Vector((0, 0, 0))
FLOOR_TOP = PHYSICAL_FLOOR = .10
SCREENS, PROJECTORS, SIGNAGE_METRICS, SIGNAGE_OBJECTS = [], [], [], []

ARCH_CONTROLS = [(-6.50,.12,2.68),(-6.23,2.60,2.75),(-6.00,5.25,2.84),
    (-5.34,6.25,2.93),(-4.32,6.50,3.02),(-1.80,6.42,3.10),
    (.72,6.33,3.12),(3.12,6.18,3.08),(5.70,5.92,2.98),
    (6.22,4.88,2.85),(6.38,2.60,2.76),(6.38,.12,2.68)]
ARCH_PATH = catmull(ARCH_CONTROLS, 12)
ARCH_WIDTHS = [p.x*.75 for p in catmull([(w,0,0) for w in
    (.35,.38,.44,.40,.28,.24,.25,.28,.42,.56,.53,.46)],12)]
ARCH_WIDTHS=[w*(.80 if p.x<-4.30 else 1.0) for p,w in zip(ARCH_PATH,ARCH_WIDTHS)]
for p in ARCH_PATH:
    weight=max(0,min(1,(p.y-4.80)/1.10))
    p.y-=.16*weight*weight*(3-2*weight)
ARCH_UPPER_CROWN = []
for j in range(36, 100):
    tangent = ARCH_PATH[j+1] - ARCH_PATH[j-1]
    p = ARCH_PATH[j] + Vector((-tangent.y,tangent.x,0)).normalized()*ARCH_WIDTHS[j]/2
    ARCH_UPPER_CROWN.append((p.x,p.y+.012))

def shell_bottom(x):
    if x < ARCH_UPPER_CROWN[0][0]:
        return interpolate(x,[(-7.2,5.98),ARCH_UPPER_CROWN[0]])
    if x > ARCH_UPPER_CROWN[-1][0]:
        return interpolate(x,[ARCH_UPPER_CROWN[-1],(7.2,5.78)])
    return interpolate(x,ARCH_UPPER_CROWN)

# Keep a genuine green shoulder below the black crown and above the gold arch.
for p in ARCH_PATH:
    rise=max(0,min(1,(p.x-.30)/3.72));fall=1-max(0,min(1,(p.x-5.58)/1.02))
    p.y-=.34*(rise*rise*(3-2*rise))*(fall*fall*(3-2*fall))

deck=[(-7.2,-4),(7.2,-4),(7.2,3.15),(6.55,3.25),(-3.00,4.00),(-7.00,2.65),(-7.2,2.40)]
extruded_outline("Projection Booth V5 | angular honed stone island",deck,.035,FLOOR_TOP,FLOOR)
deck_trim=[(x-math.copysign(.025,x),z-math.copysign(.025,z+.3)) for x,z in deck]
outline_tube("Projection Booth V5 | continuous fine warm platform edge",deck_trim,.117,.010,WHITE)
outline_tube("Projection Booth V5 | machined champagne platform joint",deck_trim,.103,.007,CHAMPAGNE)

# Real deep, chamfered perimeter crown. Its lower edge follows the gold sweep.
outer=[(6.78+.42*math.cos(a*math.pi/24),2.58+.42*math.sin(a*math.pi/24)) for a in range(13)]
outer.extend([(-4.62,3.00),(-7.2,.48),(-7.2,-4),(7.2,-4)])
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
    bottom=shell_bottom(x) if z>2.8 else 5.98
    vertices.extend(((x,bottom,z),(x,7.2,z),(ix,7.2,iz),(ix,bottom,iz)))
for j in range(len(dense)):
    for q in range(4):faces.append((j*4+q,((j+1)%len(dense))*4+q,((j+1)%len(dense))*4+(q+1)%4,j*4+(q+1)%4))
ob=patch_mesh("Projection Booth V5 | deep sweeping black fascia and chamfered returns",vertices,[tuple(reversed(face)) for face in faces],FASCIA)
for face in ob.data.polygons:face.use_smooth=False
depths=[.66+.80*math.sin(j/(len(ARCH_PATH)-1)*math.pi)**.55 for j in range(len(ARCH_PATH))]
sharp_sweep("Projection Booth V5 | substantial integrated black arch",[p-Vector((0,0,.04)) for p in ARCH_PATH],
    [w+.10 for w in ARCH_WIDTHS],[d+.12 for d in depths],BLACK)
sharp_sweep("Projection Booth V5 | broad continuous champagne arch and soffit",ARCH_PATH,ARCH_WIDTHS,depths,CHAMPAGNE)
seam=[]
for j,p in enumerate(ARCH_PATH):
    tangent=ARCH_PATH[min(j+1,len(ARCH_PATH)-1)]-ARCH_PATH[max(0,j-1)]
    seam.append((p+Vector((-tangent.y,tangent.x,0)).normalized()*ARCH_WIDTHS[j]/2+Vector((0,0,.007)),.005))
sweep("Projection Booth V5 | fine warm edge of sweeping arch",seam,WHITE,7)

# A single connected fold replaces overlapping flat quads. The raised crease
# gives the glossy emerald two real reflection directions, with a level crown.
points=[(-7.19,7.194,.53),(-4.62,7.194,3.033),(-4.62,6.24,3.033),
    (-6.12,3.98,1.63),(-6.12,5.90,1.78),(-7.19,5.90,.53)]
fold_faces=[(4,1,0),(4,2,1),(4,3,2),(4,5,3),(5,4,0)]
patch_mesh("Projection Booth V5 | broad creased emerald corner",points,fold_faces,DEEP_GREEN)
back=[(x,y,z-.10) for x,y,z in points]
perimeter=[0,1,2,3,5]
patch_mesh("Projection Booth V5 | folded emerald real metal return",points+back,
    [tuple(index+6 for index in reversed(face)) for face in fold_faces]+
    [(perimeter[j],perimeter[(j+1)%5],perimeter[(j+1)%5]+6,perimeter[j]+6) for j in range(5)],DEEP_GREEN)
line(points[0],points[1],.006,TEAL);line(points[2],points[3],.006,TEAL)

green=[]
for j,p in enumerate(ARCH_PATH):
    tangent=ARCH_PATH[min(j+1,len(ARCH_PATH)-1)]-ARCH_PATH[max(0,j-1)]
    edge=p+Vector((-tangent.y,tangent.x,0)).normalized()*ARCH_WIDTHS[j]/2
    if .42<edge.x<6.06:
        top=shell_bottom(edge.x)-.014;bottom=max(edge.y+.006,top-.62)
        if top>bottom+.015:green.append((Vector((edge.x,top,3.016)),Vector((edge.x,bottom,edge.z+.009))))
v,f=[],[]
for a,b in green:v.extend((a,b,b-Vector((0,0,.20)),a-Vector((0,0,.20))))
for j in range(len(green)-1):
    for k in range(4):f.append((j*4+k,(j+1)*4+k,(j+1)*4+(k+1)%4,j*4+(k+1)%4))
f.extend(((3,2,1,0),tuple(range((len(green)-1)*4,len(green)*4))))
patch_mesh("Projection Booth V5 | exposed emerald right shoulder below crown",v,[tuple(reversed(face)) for face in f],DEEP_GREEN)

box("Projection Booth V5 | continuous left outer service wall",(-7.125,3.03,-1.76),(.15,5.86,4.48),WALL,.008)
box("Projection Booth V5 | continuous right deep black return",(7.125,3.05,-.50),(.15,5.90,7.0),WALL,.008)
box("Projection Booth V5 | right integral front branding return",(6.78,3.61,2.94),(.83,6.96,.15),BLACK,.008)
for side in(-1,1):
    box("Projection Booth V5 | recessed gallery graphite wall",(-4.18 if side<0 else 5.25,3.08,-2.43),(2.38,5.96,.14),WALL,.008)
    for j in range(15):
        box("Projection Booth V5 | champagne black fluted inner gallery return",((-3.05+j*.038) if side<0 else (3.70+j*.038),3.10,-2.58),(.015,5.92,.14),CHAMPAGNE if j%5==0 else BLACK,.002)
box("Projection Booth V5 | rear charcoal fluted backing",(0,3.28,-3.88),(7.70,6.36,.12),WALL,.006)
for j in range(37):
    box("Projection Booth V5 | fine rear charcoal wall flute",(-3.70+j*.206,3.26,-3.78),(.025,6.30,.06),BLACK,.003)

# Eight real LED cabinets, each with its own live content and physical caption.
GALLERY_CAPTIONS=["ARCHITECTURAL MAPPING","STAGE EXPERIENCES","PRODUCT MAPPING","INTERACTIVE SPACES",
    "LANDMARKS","BRAND EXPERIENCES","INTERIORS","EVENTS & EXHIBITIONS"]
for side in(-1,1):
    yaw=-.08 if side<0 else -.04
    gallery_x=-4.18 if side<0 else 5.25
    for row,y in enumerate((5.35,4.25,3.15,2.05)):
        index=row if side<0 else row+4
        aperture("projection-application-"+str(index),(gallery_x,y,-2.30),2.05,.92,
            "projection-application-"+str(index),yaw=yaw,frame=.018)
        readable_label(GALLERY_CAPTIONS[index],(gallery_x,y-.57,-2.267),.105,max_width=2.10,centered=True,yaw=yaw)

# Genuine concave cylindrical backdrop. Its cabinet is 8 mm behind the live
# emitting radius; inward-facing viewing requires the runtime flipU metadata.
BACKDROP_RADIUS=8.50;BACKDROP_ARC=2*math.asin(3.85/BACKDROP_RADIUS)
BACKDROP_CENTER=Vector((0,3.65,5.00));BACKDROP_HEIGHT=3.00
v,f=[],[]
for j in range(97):
    a=-BACKDROP_ARC/2+BACKDROP_ARC*j/96
    for radius,dy in ((8.508,-BACKDROP_HEIGHT/2),(8.508,BACKDROP_HEIGHT/2),(8.565,BACKDROP_HEIGHT/2),(8.565,-BACKDROP_HEIGHT/2)):
        v.append(BACKDROP_CENTER+Vector((-radius*math.sin(a),dy,-radius*math.cos(a))))
for j in range(96):
    for q in range(4):f.append((j*4+q,(j+1)*4+q,(j+1)*4+(q+1)%4,j*4+(q+1)%4))
f.extend(((3,2,1,0),tuple(range(384,388))))
patch_mesh("Projection Booth V5 | concave cosmic backdrop real cylindrical cabinet",v,f,BACK)
for dy in(-BACKDROP_HEIGHT/2-.016,BACKDROP_HEIGHT/2+.016):
    points=[]
    for j in range(97):
        a=-BACKDROP_ARC/2+BACKDROP_ARC*j/96
        points.append((BACKDROP_CENTER+Vector((-8.50*math.sin(a),dy,-8.50*math.cos(a))),.009))
    sweep("Projection Booth V5 | fine cosmic backdrop curved champagne trim",points,CHAMPAGNE,6)
SCREENS.append({"id":"projection-backdrop","type":"curved","x":0,"y":3.65,"z":5.00,
    "w":BACKDROP_RADIUS*BACKDROP_ARC,"h":BACKDROP_HEIGHT,"radius":BACKDROP_RADIUS,"arc":BACKDROP_ARC,
    "rotation":[0,math.pi,0],"mediaHint":"projection-backdrop","flipU":True,"chordWidth":7.70})

# One broad cosmic roof zone, with two nested solid champagne rings beneath.
roof_center=Vector((0,6.55,-.55));rx,rz=5.05,3.28;pitch=-.16
before=set(bpy.context.scene.objects)
ellipse_annulus("Projection Booth V5 | broad cosmic outer canopy backing",(rx,rz),(rx*.28,rz*.28),0,0,.035,.12,BACK,144)
pose_meshes(set(bpy.context.scene.objects)-before,roof_center,Matrix.Rotation(pitch,4,"X"))
surface=roof_center+Vector((0,-math.cos(pitch),-math.sin(pitch)))*.055
SCREENS.append({"id":"projection-ceiling-outer","type":"ellipse","x":surface.x,"y":surface.y,"z":surface.z,
    "w":rx*2,"h":rz*2,"radiusX":rx,"radiusZ":rz,"innerFraction":.28,"rotation":[math.pi/2+pitch,0,0],"mediaHint":"projection-ceiling"})
ring_geometry("Projection Booth V5 | outer common ceiling ring",(0,6.25,-1.00),3.85,2.40,-.16)
ring_geometry("Projection Booth V5 | inner concentric ceiling ring",(0,5.98,-1.00),2.45,1.65,-.14,inset=True)
for z in(-3.45,2.65):
    rod("Projection Booth V5 | black roof lighting track",(-6.65,6.94,z),(6.65,6.94,z),.014,BRUSHED,8)
for x in(-6.35,-5.05,-3.75,-2.45,-1.15,.15,1.45,2.75,4.05,5.35,6.55):
    for z in(-3.25,2.52):
        rod("Projection Booth V5 | small warm recessed practical",(x,6.90,z),(x,6.72,z),.041,BLACK,10)
        disk("Projection Booth V5 | real warm practical optic",x,z,.027,6.712,6.725,WHITE)

# Crystal stage, exact contract shared with the independent sculpture asset.
stage_outline=[(x,z-1.25) for x,z in round_outline(5.70,2.70,.09,12)]
extruded_outline("Projection Booth V5 | recessed crystal demonstration plinth",stage_outline,.10,1.10,COUNTER)
outline_tube("Projection Booth V5 | crystal plinth champagne upper edge",stage_outline,1.10,.008,CHAMPAGNE)
outline_tube("Projection Booth V5 | crystal plinth green lower cove",stage_outline,.19,.009,TEAL)

# Main wordmarks and actual physical service copy.
before=set(bpy.context.scene.objects)
logo((-2.64,6.62,3.016),.48,max_width=2.75)
for ob in set(bpy.context.scene.objects)-before:
    if ob.type=="MESH":
        for slot in ob.material_slots:
            if slot.material==TEAL_BRAND:slot.material=HEADER_MINT
line((.78,6.55,3.02),(.78,7.05,3.02),.003,BRAND)
readable_label("PROJECTION MAPPING",(1.08,6.72,3.02),.20,max_width=3.95)
readable_label("TRANSFORM SPACES INTO STORIES",(1.09,6.43,3.02),.125,max_width=3.90,mat=TEAL_BRAND)
for j,copy in enumerate(("ANY","SURFACE","A CANVAS")):
    readable_label(copy,(6.28,6.78-j*.25,3.03),.145,max_width=.78)
line((6.29,5.89,3.03),(6.59,5.89,3.03),.0025,BRAND)
for j,copy in enumerate(("IDEAS","MAPPED","BIGGER")):
    readable_label(copy,(6.45,4.95-j*.25,3.029),.135,max_width=.66)
line((6.45,4.12,3.029),(6.75,4.12,3.029),.0025,BRAND)
for j,copy in enumerate(("BUILDINGS","STAGES","PRODUCTS","INTERIORS","EXPERIENCES")):
    readable_label(copy,(6.45,3.67-j*.25,3.029),.115,max_width=.67)

service_start=Vector((-7.18,.10,.497));service_end=Vector((-6.12,.10,1.596))
service_u=(service_end-service_start).normalized();service_normal=Vector((-service_u.z,0,service_u.x));service_yaw=-math.atan2(service_u.z,service_u.x)
front=[service_start,service_end,service_end+Vector((0,5.86,0)),service_start+Vector((0,5.86,0))]
back=[p-service_normal*.13 for p in front]
patch_mesh("Projection Booth V5 | broad integrated diagonal service wall",front+back,
    [(0,1,2,3),(7,6,5,4)]+[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)],BLACK)
def service_label(body,y):
    p=service_start+service_u*.05+service_normal*.018;p.y=y
    readable_label(body,p,.145,max_width=.65 if body in("SOLUTIONS","EXPERIENCES") else .72,yaw=service_yaw)
for j,copy in enumerate(("SPACES","PEOPLE","BRANDS","EMOTIONS")):service_label(copy,4.50-j*.23)
for j,copy in enumerate(("RENTAL","SOLUTIONS","EXPERIENCES")):service_label(copy,3.52-j*.18)
for y in(3.68,3.00):
    a=service_start+service_u*.05+service_normal*.02;b=service_start+service_u*.33+service_normal*.02;a.y=b.y=y;line(a,b,.0025,BRAND)
for j,copy in enumerate(("MORE","THAN PROJECTION","A HIGHER PERSPECTIVE")):
    readable_label(copy,(7.035,3.42-j*.21,-1.95),.105,max_width=1.20,yaw=-math.pi/2)

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
    for j in range(240):
        t=(j+rng.random())/240;branch=j%3;base=stem(t,branch)
        a=rng.uniform(-math.pi,math.pi)
        length=rng.uniform(.072,.125)
        direction=Vector((math.cos(a),math.sin(a)*.77,rng.uniform(-.08,.18))).normalized()*length
        petiole=base+direction*.25
        if j%3==0:rod(name+" | forked green petiole",base,petiole,.0018,TIMBER,5)
        folded_leaf(vertices,faces,palette,petiole,direction,rng.uniform(.021,.036),rng,bounds)
    leaf_mesh(name+" | dense closed curved climbing leaves",vertices,faces,palette)

for side in(-1,1):
    living_strip("Projection Booth V5 | outer gallery living wall",-5.46 if side<0 else 6.55,-2.31,.42,6.02,.30 if side<0 else .25,17 if side<0 else 39)
    living_strip("Projection Booth V5 | inner gallery climbing greenery",-3.05 if side<0 else 3.70,-2.60,.45,5.80,.23,29 if side<0 else 47)

def broadleaf_entrance_tree():
    name="Projection Booth V5 | full broadleaf entrance tree";rng=random.Random(121)
    x,z=-6.98,1.75
    lathe(name+" | champagne planter",x,z,[(.182,.10),(.200,.12),(.200,.78),(.185,.80)],CHAMPAGNE,24)
    disk(name+" | dark planted soil",x,z,.183,.782,.786,TIMBER)
    trunk=[(Vector((x,.785,z)),.025),(Vector((x+.04,1.45,z)),.022),
        (Vector((x+.12,2.00,z+.015)),.016),(Vector((x+.19,2.58,z-.02)),.007)]
    sweep(name+" | living branched trunk",trunk,TIMBER,8)
    vertices,faces,palette=[],[],[]
    bounds=(-7.12,-6.15,2.04,3.08,.80,2.45)
    for cluster in range(16):
        a=cluster*2.39996
        center=Vector((-6.66+math.cos(a)*.30,2.53+math.sin(cluster*1.73)*.26,1.60+math.sin(a)*.48))
        start=Vector((x+.12,1.82+cluster*.035,z))
        rod(name+" | ascending woody branch",start,center,.007-rng.random()*.003,TIMBER,6)
        for j in range(23):
            phi=rng.uniform(0,math.tau);v=rng.uniform(-1,1);radial=math.sqrt(1-v*v)
            base=center+Vector((math.cos(phi)*radial*.17,v*.20,math.sin(phi)*radial*.20))
            direction=Vector((math.cos(phi)*.65,rng.uniform(-.3,.8),math.sin(phi)*.45+.35)).normalized()*rng.uniform(.125,.195)
            folded_leaf(vertices,faces,palette,base,direction,rng.uniform(.032,.054),rng,bounds)
    leaf_mesh(name+" | full dimensional glossy broadleaf crown",vertices,faces,palette)

broadleaf_entrance_tree()

def scaled_prop(builder,position,scale=(1,1,1),yaw=0):
    global FLOOR_TOP
    before=set(bpy.context.scene.objects);FLOOR_TOP=0;builder();FLOOR_TOP=PHYSICAL_FLOOR
    pose_meshes(set(bpy.context.scene.objects)-before,position,Matrix.Rotation(yaw,4,"Y")@Matrix.Diagonal((*scale,1)))

seating=[{"id":"right-left","position":[4.25,.10,2.15],"yaw":1.25},
    {"id":"right-right","position":[6.40,.10,.90],"yaw":-1.25},
    {"id":"right-rear","position":[5.10,.10,.95],"yaw":0}]
for seat in seating:
    scaled_prop(lambda:lounge_chair(0,0,0,1.35),seat["position"],(.58,.55,.55),seat["yaw"])
    seat.update(seatTop=.584,width=.783,depth=.792,height=.886)
for x,z,yaw in((-3.70,.30,-.2),(-4.90,-.10,.3)):
    scaled_prop(lambda:lounge_chair(0,0,0,1.35),(x,.10,z),(.58,.55,.55),yaw)
scaled_prop(lambda:sofa_v2(0,0,2.10,0),(-4.40,.10,-2.05),(.66,.46,.55),.05)
for x,z in((5.10,2.15),(-4.15,.85)):
    scaled_prop(lambda:cafe_table(0,0),(x,.10,z),(.37,.45,.37));flowers(x,.75,z,.09);water_glass(x+.11,.75,z)

# Three visible projector casings suspended below, and in front of, the rings.
projector_source=helper_source[helper_source.index("def projector("):helper_source.index("def kiosk(")].replace("10.16","7.05")
exec(compile(projector_source,"physical-v5-projector-helper","exec"))
for name,lens,target,scale,radius in(
    ("Projection central projector",(0,5.42,1.55),(-.20,3.80,-1.05),.29,.92),
    ("Projection left projector",(-2.35,5.20,1.42),(-1.45,3.00,-.80),.27,.71),
    ("Projection right projector",(2.35,5.20,1.42),(1.45,3.00,-.80),.27,.71)):
    projector(name,lens,target,scale);PROJECTORS[-1].update(radius=radius,opacity=.075,width=radius*2,height=4.42)

# Wider reception with a real emerald chevron end, laptop, flowers and glass.
reception={"center":[-4.65,.10,2.17],"width":4.20,"height":1.10,"depth":.82,"top":1.20}
before=set(bpy.context.scene.objects);outline=round_outline(4.18,.82,.045,10)
extruded_outline("Projection Booth V5 | broad black premium reception",outline,0,1.045,COUNTER)
extruded_outline("Projection Booth V5 | thin charcoal stone reception top",round_outline(4.20,.84,.05,10),1.045,1.10,TOP)
outline_tube("Projection Booth V5 | fine warm reception toe",outline,.018,.007,WHITE)
outline_tube("Projection Booth V5 | crisp champagne reception top seam",round_outline(4.20,.84,.05,10),1.095,.003,CHAMPAGNE)
counter_branding_before=set(bpy.context.scene.objects)
emblem_before=set(bpy.context.scene.objects)
triangle_emblem((-1.42,.49,.423),.43)
for ob in set(bpy.context.scene.objects)-emblem_before:
    if ob.type=="MESH":
        for slot in ob.material_slots:slot.material=HEADER_MINT
counter_wordmark=glyph("livegrid AV",(-.87,.55,.426),.34,semibold=True)
counter_wordmark_width=max(v.co.x for v in counter_wordmark.data.vertices)-min(v.co.x for v in counter_wordmark.data.vertices)
if counter_wordmark_width>1.80:
    for vertex in counter_wordmark.data.vertices:vertex.co*=1.80/counter_wordmark_width
readable_label("RENTAL  |  SOLUTIONS  |  EXPERIENCES",(-1.41,.255,.426),.085,max_width=2.50)
COUNTER_BRANDING_MESHES=[ob for ob in set(bpy.context.scene.objects)-counter_branding_before if ob.type=="MESH"]
chevron=[(2.08,.02,.435),(1.12,.55,.435),(2.08,1.045,.435)]
CHEVRON_FILL=material("Projection Booth V5 | emerald metallic reception chevron fill",(.004,.28,.15),.25,.30,.45)
chevron_back=[(x,y,z-.035) for x,y,z in chevron]
patch_mesh("Projection Booth V5 | reception solid illuminated emerald chevron",chevron+chevron_back,
    [(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],CHEVRON_FILL)
sweep("Projection Booth V5 | reception integrated teal chevron edge",[(Vector(p),.006) for p in chevron],TEAL,7)
box("Projection Booth V5 | real silver laptop base",(-1.15,1.116,-.02),(.55,.024,.34),SILVER,.007)
soft_box("Projection Booth V5 | silver laptop upright screen",(-1.15,1.29,-.13),(.54,.34,.025),SILVER,.008)
flowers(.92,1.10,-.02,.11);water_glass(.40,1.10,-.04)
group("Projection Booth V5 | entire reception assembly",before,reception["center"])
patch_mesh("Projection Booth V5 | emerald left entrance toe",[(-7.16,.11,2.28),(-6.36,.11,2.28),(-7.16,1.02,2.28)],[(0,1,2)],DEEP_GREEN)
line((-7.16,.11,2.29),(-6.36,.11,2.29),.007,TEAL)

kiosk_source=previous_source[previous_source.index("def physical_kiosk("):previous_source.index('physical_kiosk("projection-kiosk-wide"')]
exec(compile(kiosk_source.replace("Projection Booth V3","Projection Booth V5"),"projection-v5-kiosk-helper","exec"))
physical_kiosk("projection-kiosk-wide",(1.65,.10,2.90),1.40,1.32,.67,-.12)

# Dense, varied live greenery frames each gallery without hiding its images.
for name,x,z,h,r,seed in(("left rear palm",-3.30,-3.10,2.65,.44,24),("left gallery pot",-6.14,-2.05,1.90,.30,35),
    ("right entrance palm",6.72,2.58,1.85,.45,47),("right inner palm",3.40,-3.10,2.40,.39,59),
    ("right gallery pot",6.68,-2.05,1.80,.22,67),("crystal front left",-2.45,.55,1.25,.32,78),
    ("crystal front right",2.10,.55,1.18,.30,89)):
    feather_palm("Projection Booth V5 | "+name,x,z,h,r,seed)

# Material batching retains physical meshes and small modeled text, then bakes
# consistent ambient occlusion. Imported scenes and shared assets are untouched.
bpy.context.view_layer.update()
for ob,record in SIGNAGE_OBJECTS:
    p=[ob.matrix_world@v.co for v in ob.data.vertices];q=[[v.x,v.z,-v.y] for v in p];origin=ob.matrix_world@Vector((0,0,0))
    record["position"]=[origin.x,origin.z,-origin.y]
    record["bounds"]={"min":[min(v[i] for v in q) for i in range(3)],"max":[max(v[i] for v in q) for i in range(3)]}
batch_source=STALL_HELPER_SOURCE[STALL_HELPER_SOURCE.index("def material_batch("):STALL_HELPER_SOURCE.index("main_meshes = material_batch(")]
batch_source=batch_source.replace('startswith("Projection Booth")','startswith("Projection Booth V5")').replace('"Projection Booth | "','"Projection Booth V5 | "')
exec(compile(batch_source,"projection-v5-export-helpers","exec"))
meshes=material_batch(list(bpy.context.scene.objects))
ao_helper=Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_helper.read_text(encoding="utf-8"),str(ao_helper),"exec"))
AO_STATS=bake_technical_ao(meshes,samples=32,max_distance=.32,max_seconds=100)
stats=export(OUT,meshes)
layout={"version":5,"authoringScale":1,"runtimeScale":3,"root":ROOT_POSITION,"worldAnchor":ROOT_POSITION,"rootRotation":ROOT_ROTATION,
    "floorTop":.10,"deckPolygonXZ":deck,"architecture":{"width":14.4,"depth":8.0,"height":7.2,
    "dimensions":{"width":14.4,"depth":8.0,"height":7.2},"deckPolygonXZ":deck,"reception":reception,
    "stage":{"center":[0,1.10,-1.25],"width":5.70,"depth":2.70,"top":1.10,"min":[-2.85,.10,-2.6],"max":[2.85,1.10,.1]},
    "seating":seating,"rightTable":{"position":[5.10,.10,2.15],"top":.75},
    "kiosk":{"position":[1.65,.10,2.90],"yaw":-.12,"width":1.40,"height":1.32}},
    "modelPlacement":{"position":[0,1.10,-1.20],"scale":[1.22,1.34,1.22],"targetWidth":5.246,"targetHeight":4.422,"bottom":1.10},
    "apertures":SCREENS,"screens":SCREENS,"projectors":PROJECTORS,
    "interaction":{"position":[-4.65,.65,2.61],"rotation":[0,0,0],"w":4.05,"h":1.0},
    "typography":SIGNAGE_METRICS,"ambientOcclusion":AO_STATS,"stats":{"main":stats}}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding="utf-8")
print("PROJECTION_MAPPING_STALL_V5 "+json.dumps(stats),flush=True)

