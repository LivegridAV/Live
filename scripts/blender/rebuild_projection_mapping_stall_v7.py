"""Fresh reference reconstruction: continuous curved pavilion, native metres.

Utility constructors are imported; no V5 architecture or placements are run.
Projection media and organic planting are separate runtime assets. Use
--preview after -- to render a real Blender evidence image without exporting.
"""
from pathlib import Path
import sys

ROOT_SCRIPT=Path(__file__).with_name("rebuild_projection_mapping_stall.py")
UTILITY_SOURCE=ROOT_SCRIPT.read_text(encoding="utf-8")
exec(compile(UTILITY_SOURCE.split("# A broad island")[0],str(ROOT_SCRIPT),"exec"))
OUT=ROOT/"public/models/expo/projection-mapping-stall-v7.glb"
LAYOUT_OUT=ROOT/"public/models/expo/projection-mapping-v7-layout.json"
PREFIX="Projection Booth V7 | "
FLOOR_TOP=.10
ROOT_POSITION=[10.2,0,-189];ROOT_ROTATION=[0,-math.pi/2,0]
SCREENS=[];PROJECTORS=[];SIGNAGE=[];SIGNAGE_OBJECTS=[];LIGHT_POINTS=[]
for mat in bpy.data.materials:
    if mat.name.startswith("Projection Booth"):
        mat.name=PREFIX+mat.name.split(" | ")[-1]
FASCIA=material(PREFIX+"satin black curved fascia",(.006,.008,.010),.40,.32)
CHAMPAGNE=material(PREFIX+"soft satin champagne metal returns",(.39,.31,.205),.72,.29)
DEEP_GREEN=material(PREFIX+"sculpted deep green metallic accent",(.003,.12,.070),.55,.28)
MINT=material(PREFIX+"mint cyan illuminated header emblem",(.003,.38,.23),.10,.35,1.15)
CHANNEL=material(PREFIX+"dark recessed LED channel",(.0015,.002,.0025),.18,.39)
REAR_BLACK=material(PREFIX+"matte black architectural rear lightwell",(.002,.003,.004),.02,.78)
WORKTOP=material(PREFIX+"warm white quartz reception worktop",(.58,.55,.50),.03,.28)
WEDGE=material(PREFIX+"deep green illuminated folded reception wedge",(.003,.24,.105),.28,.28,.45)
PROP_SCREEN=material(PREFIX+"muted blue demonstration laptop screen",(.009,.035,.065),.02,.35,.12)
WHITE=material(PREFIX+"warm pearl concealed LED",(.93,.94,.91),0,.38,3.2)
TEAL=material(PREFIX+"concealed thin teal LED reveal",(.002,.61,.37),0,.35,2.2)
COUNTER_BRANDING=[]


def place(objects,position=(0,0,0),yaw=0,scale=(1,1,1),rotation=None):
    """Bake the exact affine transform, preserving geometry and UV alignment."""
    basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
    pose=Matrix.Translation(Vector(position))@(rotation if rotation is not None else Matrix.Rotation(yaw,4,"Y"))@Matrix.Diagonal((*scale,1))
    pose=basis@pose@basis.inverted();bpy.context.view_layer.update()
    for ob in objects:
        if ob.type!="MESH":continue
        matrix=pose@ob.matrix_world.copy();ob.parent=None
        for vertex in ob.data.vertices:vertex.co=matrix@vertex.co
        ob.matrix_world=Matrix.Identity(4)


def label(body,p,height,width=None,yaw=0,centered=False,mat=BRAND,semibold=False,tracking=1.12):
    before=set(bpy.context.scene.objects)
    ob=text(body,(0,0,0),1,mat=mat,centered=centered,semibold=semibold,tracking=tracking)
    lo=min(v.co.y for v in ob.data.vertices);hi=max(v.co.y for v in ob.data.vertices)
    factor=height/(hi-lo);natural=(max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices))*factor
    fit=min(1,width/natural) if width else 1
    for vertex in ob.data.vertices:
        vertex.co.y-=lo;vertex.co*=factor*fit
    place(set(bpy.context.scene.objects)-before,p,yaw)
    record={"body":body,"position":list(p),"yaw":yaw,"capHeight":height*fit,"width":natural*fit,"uniformFit":fit,"horizontalAspectRatio":1}
    SIGNAGE.append(record);SIGNAGE_OBJECTS.append((ob,record));return ob


def uv_mesh(name,vertices,faces,mat,uvs=None,smooth=True):
    ob=patch_mesh(PREFIX+name,vertices,faces,mat)
    for polygon in ob.data.polygons:polygon.use_smooth=smooth
    uv=ob.data.uv_layers.new(name="UVMap")
    for polygon in ob.data.polygons:
        for li in polygon.loop_indices:
            index=ob.data.loops[li].vertex_index
            point=vertices[index]
            uv.data[li].uv=uvs[index] if uvs else (point[0]*.25,point[1]*.25+point[2]*.13)
    return ob


def rect_sweep(name,path,widths,depths,mat):
    """A milled eight-sided profile gives curved metal a real bevel highlight."""
    points=[Vector(p) for p in path];sections=[];lengths=[0]
    for a,b in zip(points,points[1:]):lengths.append(lengths[-1]+(b-a).length)
    for j,p in enumerate(points):
        d=points[min(j+1,len(points)-1)]-points[max(j-1,0)]
        n=Vector((-d.y,d.x,0)).normalized();half=widths[j]/2
        bevel=min(.026,widths[j]*.12);depth=depths[j]
        profile=((-half+bevel,0),(half-bevel,0),(half,-bevel),(half,-depth+bevel),
            (half-bevel,-depth),(-half+bevel,-depth),(-half,-depth+bevel),(-half,-bevel))
        sections.append(tuple(p+n*x+Vector((0,0,z)) for x,z in profile))
    vertices=[];faces=[];uvs=[]
    for side in range(8):
        start=len(vertices)
        for j,section in enumerate(sections):
            vertices.extend((section[side],section[(side+1)%8]));uvs.extend(((lengths[j],0),(lengths[j],1)))
        for j in range(len(points)-1):
            a=start+j*2;faces.append((a,a+2,a+3,a+1))
    for end in(0,-1):
        start=len(vertices);vertices.extend(sections[end]);uvs.extend((j/7,0) for j in range(8))
        faces.append(tuple(start+j for j in(range(7,-1,-1) if end==0 else range(8))))
    return uv_mesh(name,vertices,faces,mat,uvs)


def light_channel(name,points,radius=.009,core=WHITE):
    pts=[Vector(p) for p in points]
    sweep(PREFIX+name+" | continuous dark recessed channel",[(p,.024) for p in pts],CHANNEL,8)
    sweep(PREFIX+name+" | continuous pearl optical core",[(p+Vector((0,0,.031)),radius) for p in pts],core,8)


def ellipse(rx,rz,count=192):
    return [(math.cos(j*math.tau/count)*rx,math.sin(j*math.tau/count)*rz) for j in range(count)]


def ring(name,center,rx,rz,pitch,media=False):
    before=set(bpy.context.scene.objects)
    # Solid structural depth, a broad planar metal underside and recessed light.
    ellipse_annulus(PREFIX+name+" | slim continuous champagne structural band",(rx+.125,rz+.125),(rx-.105,rz-.105),0,0,0,.105,CHAMPAGNE,192)
    ellipse_annulus(PREFIX+name+" | slender black upper service return",(rx+.055,rz+.055),(rx-.045,rz-.045),0,0,.105,.055,BLACK,192)
    outline_tube(PREFIX+name+" | recessed dark inner optical channel",ellipse(rx-.095,rz-.095),-.009,.018,CHANNEL)
    outline_tube(PREFIX+name+" | recessed warm white optical core",ellipse(rx-.095,rz-.095),-.034,.009,WHITE)
    if media:
        ellipse_annulus(PREFIX+name+" | inset full cosmic disk backing",(rx-.15,rz-.15),(.04,.04),0,0,-.022,.030,BACK,192)
    place(set(bpy.context.scene.objects)-before,center,rotation=Matrix.Rotation(pitch,4,"X"))
    for a in(.5,2.3,3.8,5.4):
        p=Vector(center)+Matrix.Rotation(pitch,4,"X")@Vector((math.cos(a)*rx,.22,math.sin(a)*rz))
        rod(PREFIX+name+" | suspension cable",p,(p.x,7.70,p.z),.005,CABLE,6)
    if media:
        p=Vector(center)+Vector((0,-math.cos(pitch),-math.sin(pitch)))*.045
        SCREENS.append({"id":"projection-ceiling-inner","type":"ellipse","x":p.x,"y":p.y,"z":p.z,
            "w":(rx-.15)*2,"h":(rz-.15)*2,"radiusX":rx-.15,"radiusZ":rz-.15,"innerFraction":.018,
            "rotation":[math.pi/2+pitch,0,0],"mediaHint":"projection-ceiling"})


# Native eight-metre island with a dominant front-left perspective vertex.
deck=[(-7.2,-4.5),(7.2,-4.5),(7.2,3.40),(6.45,3.78),(-3.00,5.00),(-7.2,3.55)]
extruded_outline(PREFIX+"deep asymmetric honed stone island",deck,.035,FLOOR_TOP,FLOOR)
edge=[(x-math.copysign(.030,x),z-math.copysign(.030,z-1.0)) for x,z in deck]
outline_tube(PREFIX+"platform champagne recessed underside catch",edge,.101,.019,CHAMPAGNE)
outline_tube(PREFIX+"platform continuous dark optical channel",edge,.118,.024,CHANNEL)
outline_tube(PREFIX+"platform complete warm white recessed core",edge,.145,.018,WHITE)

# One new continuous fascia path, including genuine curved side returns.
fascia_path=catmull([(-7.10,0,-4.35),(-7.10,0,.55),(-6.85,0,1.38),(-6.02,0,2.57),(-4.90,0,3.14),
    (-2.0,0,3.22),(1.0,0,3.22),(4.0,0,3.14),(6.35,0,2.97),(6.95,0,2.65),(7.10,0,1.75),(7.10,0,-4.35)],18)
vertices=[];faces=[];uvs=[];length=0
for j,p in enumerate(fascia_path):
    if j:length+=(p-fascia_path[j-1]).length
    tangent=fascia_path[min(j+1,len(fascia_path)-1)]-fascia_path[max(0,j-1)]
    out=Vector((-tangent.z,0,tangent.x)).normalized()
    bottom=6.75+.025*math.cos((p.x+3)*.25);top=7.80
    a=Vector((p.x,bottom,p.z));b=Vector((p.x,top,p.z));c=b-out*.72;d=a-out*.72
    vertices.extend((a,b,c,d));uvs.extend(((length,0),(length,1),(length-.72,1),(length-.72,0)))
for j in range(len(fascia_path)-1):
    for q in range(4):faces.append((j*4+q,(j+1)*4+q,(j+1)*4+(q+1)%4,j*4+(q+1)%4))
faces.extend(((3,2,1,0),tuple(range(len(vertices)-4,len(vertices)))))
fascia_mesh=uv_mesh("gently curved deep black fascia and rounded side returns",vertices,faces,FASCIA,uvs)
bm=bmesh.new();bm.from_mesh(fascia_mesh.data)
bevel_edges=[edge for edge in bm.edges if edge.is_manifold and edge.calc_face_angle()>.45]
bmesh.ops.bevel(bm,geom=bevel_edges,offset=.012,segments=3,affect="EDGES",clamp_overlap=True)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(fascia_mesh.data);bm.free()
for vertex in fascia_mesh.data.vertices:vertex.co.z=min(vertex.co.z,7.80)

# The champagne opening is one tapered sweep, slender at the crown and grounded
# well outboard of furniture. It has depth rather than a glowing tubular edge.
arch_controls=[(-6.12,.12,2.50),(-6.06,2.45,2.65),(-6.06,4.90,2.99),(-5.50,6.15,3.11),
    (-4.70,6.67,3.18),(-2.0,6.65,3.22),(1.0,6.60,3.22),(3.8,6.48,3.14),
    (5.85,6.18,3.02),(6.53,5.25,2.90),(6.75,2.85,2.85),(6.78,.12,2.80)]
arch=catmull(arch_controls,18)
widths=[p.x for p in catmull([(w,0,0) for w in(.30,.34,.36,.34,.23,.20,.20,.22,.29,.34,.34,.30)],18)]
depths=[.65-.23*math.sin(j/(len(arch)-1)*math.pi) for j in range(len(arch))]
rect_sweep("black structural backing of continuous arch",[p-Vector((0,0,.055)) for p in arch],[w*.62 for w in widths],[d+.04 for d in depths],BLACK)
rect_sweep("reference tapered champagne arch and deep soffit",arch,widths,depths,CHAMPAGNE)
gold_edge=[]
for j,p in enumerate(arch):
    d=arch[min(j+1,len(arch)-1)]-arch[max(0,j-1)];n=Vector((-d.y,d.x,0)).normalized()
    gold_edge.append(p+n*widths[j]/2+Vector((0,0,.012)))
light_channel("complete arch edge reveal",gold_edge,.016)

# Narrow, deeply folded emerald reveals follow the arch instead of forming
# the large flat triangular faces that overwhelmed the preceding pavilion.
left=[]
for j,p in enumerate(arch):
    if p.x> -3.8:break
    if p.y<.11:continue
    d=arch[min(j+1,len(arch)-1)]-arch[max(0,j-1)];n=Vector((-d.y,d.x,0)).normalized()
    breadth=.42+.44*math.sin(min(1,p.y/6.7)*math.pi*.75)
    inner=p+n*(widths[j]/2+.015)-Vector((0,0,.12))
    outer=p+n*(widths[j]/2+breadth)-Vector((0,0,.23))
    outer.y=min(outer.y,6.74);outer.x=max(outer.x,-7.15)
    crease=(inner+outer)/2+Vector((0,0,.12))
    left.append((outer,crease,inner))
for strip in(0,1):
    v=[];f=[]
    for section in left:v.extend((section[strip],section[strip+1]))
    for j in range(len(left)-1):f.append((j*2,j*2+2,j*2+3,j*2+1))
    uv_mesh("curved emerald left folded reveal "+str(strip),v,[tuple(reversed(face)) for face in f],DEEP_GREEN)
light_channel("left emerald outer recessed accent",[q[0]+Vector((0,0,.012)) for q in left],.008,TEAL)
right=[]
for j,p in enumerate(arch):
    if not .4<p.x<6.55 or p.y<4.6:continue
    d=arch[min(j+1,len(arch)-1)]-arch[max(0,j-1)];n=Vector((-d.y,d.x,0)).normalized()
    lower=p+n*(widths[j]/2+.01)-Vector((0,0,.08))
    upper=Vector((lower.x,6.73,lower.z-.12))
    if upper.y>lower.y:right.append((upper,(upper+lower)/2+Vector((0,0,.045)),lower))
for strip in(0,1):
    v=[];f=[]
    for section in right:v.extend((section[strip],section[strip+1]))
    for j in range(len(right)-1):f.append((j*2,j*2+2,j*2+3,j*2+1))
    uv_mesh("curved emerald right shoulder "+str(strip),v,[tuple(reversed(face)) for face in f],DEEP_GREEN)

# Matte architecture encloses actual depth, while the single rear LED remains
# uninterrupted behind the crystal rather than being split by black panels.
v=[];f=[]
for z,top in((-4.44,6.75),(.55,6.75),(3.0,6.13)):
    v.extend(((-7.2,.10,z),(-7.2,top,z),(-7.0,top,z),(-7.0,.10,z)))
for j in range(2):
    for k in range(4):f.append((j*4+k,(j+1)*4+k,(j+1)*4+(k+1)%4,j*4+(k+1)%4))
f.extend(((3,2,1,0),(8,9,10,11)))
uv_mesh("left deep return with sloped front shoulder",v,f,BLACK,smooth=False)
box(PREFIX+"right full-depth rear return",(7.10,3.425,-2.82),(.20,6.65,3.24),BLACK,.018)
box(PREFIX+"right full-depth front return",(7.10,3.425,1.45),(.20,6.65,3.10),BLACK,.018)
box(PREFIX+"right gallery mounting recess lower bridge",(7.10,.775,-.65),(.20,1.35,1.10),BLACK,.012)
box(PREFIX+"right gallery mounting recess upper bridge",(7.10,6.625,-.65),(.20,.25,1.10),BLACK,.012)
box(PREFIX+"rear enclosure above wide LED",(0,6.87,-4.44),(14.10,1.70,.12),REAR_BLACK,.012)
box(PREFIX+"rear enclosure below wide LED",(0,1.00,-4.44),(14.10,1.80,.12),REAR_BLACK,.012)

def downlight(x,y,z):
    """A genuinely recessed warm fixture with a dark baffle and metal lip."""
    rod(PREFIX+"recessed ceiling downlight black baffle",(x,y+.065,z),(x,y-.006,z),.064,CHANNEL,14)
    disk(PREFIX+"recessed ceiling downlight champagne lip",x,z,.069,y+.001,y+.009,CHAMPAGNE)
    disk(PREFIX+"recessed ceiling downlight warm optic",x,z,.042,y-.012,y-.006,WHITE)
    LIGHT_POINTS.append({"position":[x,y-.013,z],"kind":"recessed"})

for z in(-3.76,):
    box(PREFIX+"rear floating black recessed light trough",(0,6.37,z),(12.9,.17,.24),REAR_BLACK,.012)
    for x in(-5.95,-4.8,-3.65,-2.5,-1.35,-.2,.95,2.1,3.25,4.4,5.55):downlight(x,6.27,z)
    light_channel("uninterrupted warm rear ceiling cove",[Vector((-6.40,6.245,z-.13)),Vector((6.40,6.245,z-.13))],.008)
for side in(-1,1):
    box(PREFIX+"side recessed ceiling light trough",(side*6.27,6.57,-.30),(.26,.15,6.6),REAR_BLACK,.012)
    for z in(-3.20,-2.10,-1.0,.1,1.2,2.3):downlight(side*6.27,6.48,z)

gallery_specs=[{"side":"left","x":-4.95,"z":-.75,"yaw":.32,"width":1.95,"housingWidth":2.21,"stileX":1.17,"stileWidth":.10},
    {"side":"right","x":6.15,"z":-.75,"yaw":-.30,"width":1.85,"housingWidth":1.98,"stileX":.995,"stileWidth":.08}]
captions=["ARCHITECTURAL MAPPING","STAGE EXPERIENCES","PRODUCT MAPPING","INTERACTIVE SPACES",
    "LANDMARKS","BRAND EXPERIENCES","INTERIORS","EVENTS & EXHIBITIONS"]
for g in gallery_specs:
    before=set(bpy.context.scene.objects)
    box(PREFIX+g["side"]+" slanted monolithic gallery",(0,3.30,-.14),(g["housingWidth"],6.40,.18),BLACK,.015)
    for x in(-g["stileX"],g["stileX"]):
        box(PREFIX+g["side"]+" gallery fluted side stile",(x,3.30,-.06),(g["stileWidth"],6.40,.22),BRUSHED,.004)
        light_channel(g["side"]+" gallery integrated vertical channel",[(x-.045,.20,.072),(x-.045,6.40,.072)],.007)
    place(set(bpy.context.scene.objects)-before,(g["x"],0,g["z"]),g["yaw"])
    for row,y in enumerate((5.85,4.62,3.39,2.16)):
        index=row+(0 if g["side"]=="left" else 4)
        aperture("projection-application-"+str(index),(g["x"],y,g["z"]+.012),g["width"],1.03,"projection-application-"+str(index),yaw=g["yaw"],frame=.020)
        p=Vector((g["x"],y-.655,g["z"]))+Matrix.Rotation(g["yaw"],4,"Y")@Vector((0,0,.050))
        label(captions[index],p,.105,g["width"]+.03,g["yaw"],True,tracking=1.08)

radius=12.00;arc=2*math.asin(5.15/radius);back_center=Vector((0,3.95,7.85));back_h=3.90
v=[];f=[];uv=[]
for j in range(161):
    a=-arc/2+arc*j/160
    for r,dy in((radius+.009,-back_h/2),(radius+.009,back_h/2),(radius+.075,back_h/2),(radius+.075,-back_h/2)):
        v.append(back_center+Vector((-r*math.sin(a),dy,-r*math.cos(a))));uv.append((j/160,1 if dy>0 else 0))
for j in range(160):
    for side in range(4):f.append((j*4+side,(j+1)*4+side,(j+1)*4+(side+1)%4,j*4+(side+1)%4))
uv_mesh("full width concave seamless rear LED cabinet",v,f,BACK,uv)
SCREENS.append({"id":"projection-backdrop","type":"curved","x":0,"y":3.95,"z":7.85,"w":radius*arc,"h":back_h,
    "radius":radius,"arc":arc,"rotation":[0,math.pi,0],"flipU":True,"chordWidth":10.30,"mediaHint":"projection-backdrop"})
for y in(1.985,5.915):
    points=[back_center+Vector((-radius*math.sin(-arc/2+arc*j/160),y-back_center.y,-radius*math.cos(-arc/2+arc*j/160))) for j in range(161)]
    light_channel("rear LED continuous horizontal recessed edge",points,.007)

# One broad cosmic roof area and two genuine nested planar champagne rings.
roof=Vector((.10,6.55,-.25));pitch=-.09;rx,rz=5.20,2.65
before=set(bpy.context.scene.objects)
ellipse_annulus(PREFIX+"large cosmic elliptical canopy substrate",(rx,rz),(rx*.40,rz*.40),0,0,.02,.10,BACK,192)
place(set(bpy.context.scene.objects)-before,roof,rotation=Matrix.Rotation(pitch,4,"X"))
p=roof+Vector((0,-math.cos(pitch),-math.sin(pitch)))*.025
SCREENS.append({"id":"projection-ceiling-outer","type":"ellipse","x":p.x,"y":p.y,"z":p.z,"w":rx*2,"h":rz*2,
    "radiusX":rx,"radiusZ":rz,"innerFraction":.40,"rotation":[math.pi/2+pitch,0,0],"mediaHint":"projection-ceiling"})
ring("outer solid champagne ceiling ring",(.05,6.25,.15),3.45,2.45,-.08)
ring("inner solid champagne ceiling ring",(.05,6.40,.45),2.55,1.85,-.08,True)
for z,y in((-2.65,6.02),(2.90,6.30)):
    rod(PREFIX+"recessed ceiling lighting track",(-4.5,y+.22,z),(3.9,y+.22,z),.017,BLACK,8)
    for x in(-4.5,-3.45,-2.4,-1.35,-.3,.75,1.8,2.85,3.9):
        rod(PREFIX+"visible below canopy black track light",(x,y+.20,z),(x,y+.02,z),.038,BLACK,10)
        disk(PREFIX+"visible below canopy warm track optic",x,z,.029,y,y+.015,WHITE)
        LIGHT_POINTS.append({"position":[x,y-.001,z],"kind":"track"})
    if z<0:
        for x in(-3.45,2.85):rod(PREFIX+"rear lighting track suspension",(x,y+.22,z),(x,6.55,z),.004,CABLE,6)

# Existing crystal anchor stays stable; this is a freshly dimensioned plinth.
stage=[(x,z-1.25) for x,z in round_outline(5.70,2.70,.085,16)]
extruded_outline(PREFIX+"recessed monumental crystal plinth",stage,.10,1.25,COUNTER)
outline_tube(PREFIX+"plinth dark edge channel",stage,.155,.025,CHANNEL)
outline_tube(PREFIX+"plinth concealed pearl edge core",stage,.184,.009,WHITE)
outline_tube(PREFIX+"plinth champagne top reveal",stage,1.25,.008,CHAMPAGNE)

projector_source=UTILITY_SOURCE[UTILITY_SOURCE.index("def projector("):UTILITY_SOURCE.index("def kiosk(")].replace("10.16","7.70")
exec(compile(projector_source,"v7-projector-constructor","exec"))
for name,lens,target,size,r in(("Projection central projector",(0,5.92,1.30),(-.2,4.0,-1.10),.29,.92),
    ("Projection left projector",(-2.10,5.65,1.15),(-1.4,3.4,-.80),.27,.71),
    ("Projection right projector",(2.10,5.65,1.15),(1.4,3.4,-.80),.27,.71)):
    projector(name,lens,target,size);PROJECTORS[-1].update(radius=r,height=4.42,opacity=.075)

# Fresh natural-size reception, normal lounge furniture and a single kiosk.
reception={"center":[-4.10,.10,3.10],"width":4.25,"depth":.82,"height":1.10,"top":1.20}
before=set(bpy.context.scene.objects);o=round_outline(4.23,.82,.04,12)
extruded_outline(PREFIX+"rounded premium reception counter",o,0,1.045,COUNTER)
extruded_outline(PREFIX+"thin warm white quartz reception worktop",round_outline(4.25,.84,.045,12),1.045,1.10,WORKTOP)
soft_box(PREFIX+"raised bone quartz rear laptop rail",(-.40,1.16,-.28),(2.45,.12,.13),WORKTOP,.015)
outline_tube(PREFIX+"counter complete dark toe channel",o,.026,.023,CHANNEL)
outline_tube(PREFIX+"counter recessed pearl toe core",o,.060,.016,WHITE)
brand_before=set(bpy.context.scene.objects)
triangle_emblem((-1.75,.48,.435),.45)
for ob in set(bpy.context.scene.objects)-brand_before:
    if ob.type=="MESH":
        for slot in ob.material_slots:slot.material=MINT
label("livegrid AV",(-1.16,.53,.439),.34,1.90,semibold=True,tracking=1)
label("RENTAL  |  SOLUTIONS  |  EXPERIENCES",(-1.74,.25,.439),.083,2.65,tracking=1.06)
COUNTER_BRANDING=[o for o in set(bpy.context.scene.objects)-brand_before if o.type=="MESH"]
chevron=[(2.10,.025,.448),(1.12,.55,.480),(2.10,1.04,.448)]
wedge_vertices=chevron+[(1.86,.55,.515)]+[(p[0],p[1],.425) for p in chevron]
wedge_faces=[(0,3,1),(1,3,2),(2,3,0),(4,5,6),(0,1,5,4),(1,2,6,5),(2,0,4,6)]
wedge=uv_mesh("solid folded reception emerald illuminated endcap",wedge_vertices,wedge_faces,WEDGE,smooth=False)
color=wedge.data.color_attributes.new(name="Col",type="FLOAT_COLOR",domain="CORNER")
wedge.data.color_attributes.active_color=color
for loop in wedge.data.loops:
    value=(.55,1,.55,.25,.35,.65,.35)[loop.vertex_index]
    color.data[loop.index].color=(value,value,value,1)
light_channel("reception chevron inset luminous edge",[Vector(p) for p in chevron]+[Vector(chevron[0])],.008,TEAL)
box(PREFIX+"silver laptop base",(-1.05,1.117,-.04),(.57,.025,.35),SILVER,.008)
soft_box(PREFIX+"slim silver laptop back",(-1.05,1.2825,-.16),(.56,.315,.025),SILVER,.009)
water_glass(.50,1.10,-.08)
place(set(bpy.context.scene.objects)-before,reception["center"])

def prop(builder,position,scale=(1,1,1),yaw=0):
    global FLOOR_TOP
    before=set(bpy.context.scene.objects);FLOOR_TOP=0;builder();FLOOR_TOP=.10
    place(set(bpy.context.scene.objects)-before,position,yaw,scale)

seating=[{"id":"right-left","position":[4.30,.10,3.05],"yaw":1.15},
    {"id":"right-right","position":[5.832,.10,2.401],"yaw":-.60,"kind":"sofa-seat"},
    {"id":"right-rear","position":[5.072,.10,1.882],"yaw":-.60,"kind":"sofa-seat"}]
for seat in seating:
    if seat["id"]=="right-left":prop(lambda:lounge_chair(0,0,0,1.35),seat["position"],(.58,.55,.55),seat["yaw"])
    seat.update(seatTop=.584,width=.783,depth=.792,height=.886)
sofa={"position":[5.48,.10,2.10],"yaw":-.60,"width":1.94,"depth":.86,"height":.91,"seatTop":.584}
before=set(bpy.context.scene.objects)
soft_box(PREFIX+"two seat settee upholstered low base",(0,.26,0),(1.78,.22,.76),IVORY,.055)
soft_box(PREFIX+"two seat settee rounded rear shell",(0,.635,-.34),(1.80,.55,.14),IVORY,.055)
for side in(-1,1):
    soft_box(PREFIX+"two seat settee rounded arm",(side*.90,.55,0),(.14,.50,.86),IVORY,.045)
    soft_box(PREFIX+"separate tailored sofa seat cushion",(side*.40,.4165,.015),(.79,.135,.64),IVORY,.045)
    soft_box(PREFIX+"separate relaxed sofa back cushion",(side*.40,.69,-.20),(.79,.40,.18),IVORY,.050)
    seam=[(x+side*.40,z+.015) for x,z in round_outline(.77,.62,.04,12)]
    outline_tube(PREFIX+"sofa fine raised cushion seam",seam,.4845,.0013,IVORY)
for x in(-.80,.80):
    for z in(-.28,.28):rod(PREFIX+"sofa slender satin black leg",(x,0,z),(x,.18,z),.018,BRUSHED,10)
place(set(bpy.context.scene.objects)-before,sofa["position"],sofa["yaw"])
for x,z,yaw in((-3.65,1.0,.20),(-4.95,.75,-.20)):
    prop(lambda:lounge_chair(0,0,0,1.35),(x,.10,z),(.58,.55,.55),yaw)
prop(lambda:sofa_v2(0,0,2.10,0),(-4.65,.10,-.65),(.66,.46,.55),.05)
for x,z in((5.15,3.05),(-4.15,1.5)):
    prop(lambda:cafe_table(0,0),(x,.10,z),(.37,.45,.37));water_glass(x+.18,.75,z)

# A real demonstration workbench occupies the forecourt below the crystal base.
# Its slim quartz top and separate laptops naturally interrupt the dark plinth.
soft_box(PREFIX+"demonstration bar warm quartz worktop",(0,.925,.55),(4.80,.050,.42),WORKTOP,.012)
box(PREFIX+"demonstration bar slender black apron",(0,.85,.55),(4.64,.10,.34),BLACK,.009)
for x in(-2.15,2.15):
    for z in(.415,.685):
        rod(PREFIX+"demonstration bar slim black leg",(x,.10,z),(x,.91,z),.023,BRUSHED,10)
light_channel("demonstration bar warm underside",[Vector((-2.34,.865,.735)),Vector((2.34,.865,.735))],.010)
for x in(-1.48,0,1.48):
    soft_box(PREFIX+"demonstration laptop silver base",(x,.965,.55),(.40,.025,.27),SILVER,.007)
    soft_box(PREFIX+"demonstration laptop open silver lid",(x,1.108,.425),(.38,.225,.022),SILVER,.007)
    box(PREFIX+"demonstration laptop true glass display",(x,1.11,.439),(.35,.193,.003),PROP_SCREEN,.002)
    for y,w in((1.16,.25),(1.12,.20),(1.08,.24)):
        box(PREFIX+"demonstration display miniature interface line",(x-.025,y,.442),(w,.007,.002),BRAND,.001)
    box(PREFIX+"demonstration laptop trackpad",(x,.979,.595),(.12,.002,.065),BLACK,.002)
for x in(-1.70,1.70):
    soft_box(PREFIX+"demonstration stool cream tailored seat",(x,.61,1.18),(.46,.10,.42),IVORY,.035)
    soft_box(PREFIX+"demonstration stool low cream backrest",(x,.88,1.35),(.46,.38,.080),IVORY,.035)
    for dx in(-.17,.17):
        for dz in(-.15,.15):
            rod(PREFIX+"demonstration stool thin black leg",(x+dx,.10,1.18+dz),(x+dx,.575,1.18+dz),.016,BRUSHED,8)
    rod(PREFIX+"demonstration stool rear black support",(x-.17,.43,1.35),(x-.17,.91,1.35),.013,BRUSHED,8)
    rod(PREFIX+"demonstration stool rear black support",(x+.17,.43,1.35),(x+.17,.91,1.35),.013,BRUSHED,8)

# Newly authored physical console: one coherent wedge, actual angled aperture.
kp=Vector((1.85,.10,3.25));kw,kh,kd=1.25,1.35,.68;kyaw=-.15
before=set(bpy.context.scene.objects)
front_top=kh-.29;rear_top=kh
v=[(-kw/2,0,-kd/2),(kw/2,0,-kd/2),(kw/2,0,kd/2),(-kw/2,0,kd/2),
    (-kw/2,rear_top,-kd/2),(kw/2,rear_top,-kd/2),(kw/2,front_top,kd/2),(-kw/2,front_top,kd/2)]
uv_mesh("machined angled discovery console",v,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(3,7,6,2),(0,4,7,3),(4,5,6,7)],COUNTER,smooth=False)
label("EXPLORE",(0,.69,kd/2+.008),.105,1.0,centered=True,tracking=1.15)
label("POSSIBILITIES",(0,.51,kd/2+.008),.085,1.04,centered=True,tracking=1.08)
for a,b in(((-kw/2,front_top,kd/2),(kw/2,front_top,kd/2)),((-kw/2,rear_top,-kd/2),(kw/2,rear_top,-kd/2))):
    light_channel("discovery screen recessed border",[Vector(a),Vector(b)],.006)
place(set(bpy.context.scene.objects)-before,kp,kyaw)
angle=math.atan2(kd,rear_top-front_top)
screen_pose=Matrix.Rotation(kyaw,4,"Y")@Matrix.Rotation(-angle,4,"X")
screen_normal=screen_pose@Vector((0,0,1))
screen_center=kp+Vector((0,(front_top+rear_top)/2,0))+screen_normal*.014
# Runtime Three Euler XYZ is Rx @ Ry @ Rz.  Recover that exact rotation
# from the physically modeled Ry @ Rx surface instead of swapping axes.
screen_rotation=[math.atan2(-screen_pose[1][2],screen_pose[2][2]),
    math.asin(max(-1,min(1,screen_pose[0][2]))),math.atan2(-screen_pose[0][1],screen_pose[0][0])]
SCREENS.append({"id":"projection-kiosk-wide","type":"plane","x":screen_center.x,"y":screen_center.y,"z":screen_center.z,
    "w":kw-.12,"h":math.hypot(kd,rear_top-front_top)-.09,"rotation":screen_rotation,"mediaHint":"projection-kiosk"})

# Crisp physical lettering follows the new fascia curvature without stretching.
def header_surface(x):return 3.22-.08*(max(0,x)/6.4)**2
def header_label(body,p,height,width,**kwargs):
    before=set(bpy.context.scene.objects);label(body,(p[0],p[1],0),height,width,**kwargs)
    for ob in set(bpy.context.scene.objects)-before:
        if ob.type!="MESH":continue
        for v in ob.data.vertices:v.co.y=-(header_surface(v.co.x)+.028-v.co.y)

before=set(bpy.context.scene.objects);triangle_emblem((-3.52,6.96,0),.70)
bpy.context.view_layer.update()
HEADER_EMBLEM_MESHES=[ob for ob in set(bpy.context.scene.objects)-before if ob.type=="MESH"]
for ob in set(bpy.context.scene.objects)-before:
    if ob.type!="MESH":continue
    for slot in ob.material_slots:slot.material=MINT
    matrix=ob.matrix_world.copy();ob.parent=None
    for v in ob.data.vertices:
        p=matrix@v.co;p.y=-(header_surface(p.x)+.035-p.y);v.co=p
    ob.matrix_world=Matrix.Identity(4)
header_label("livegrid AV",(-2.65,7.15),.47,2.80,tracking=1,semibold=True)
line((.50,6.95,header_surface(.5)+.03),(.50,7.58,header_surface(.5)+.03),.003,BRAND)
header_label("PROJECTION MAPPING",(.88,7.28),.19,3.90,tracking=1.30)
header_label("TRANSFORM SPACES INTO STORIES",(.90,6.99),.12,3.85,mat=MINT,tracking=1.25)
for j,copy in enumerate(("ANY","SURFACE","A CANVAS")):
    header_label(copy,(6.05,7.31-j*.23),.125,.80,tracking=1.12)

# Service returns are integral, slanted walls rather than freestanding posts.
service_start=Vector((-7.15,.1,3.11));service_end=Vector((-6.38,.1,3.08));u=(service_end-service_start).normalized()
normal=Vector((-u.z,0,u.x));yaw=-math.atan2(u.z,u.x)
v=[service_start,service_end,service_end+Vector((0,6.03,0)),service_start+Vector((0,6.03,0))]
v+= [p-Vector((0,0,.14)) for p in v]
uv_mesh("left diagonal integral service wall",v,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],BLACK,smooth=False)
for copies,y,step in((("SPACES","PEOPLE","BRANDS","EMOTIONS"),4.70,.25),(("RENTAL","SOLUTIONS","EXPERIENCES"),3.70,.22)):
    for j,copy in enumerate(copies):
        p=service_start+u*.08+normal*.018;p.y=y-j*step
        label(copy,p,.145,.70,yaw,tracking=1.12)
box(PREFIX+"right integral narrow branding return",(6.90,3.425,1.20),(.55,6.65,.20),BLACK,.018)
box(PREFIX+"attached forward upper service face",(6.90,4.275,3.15),(.55,4.95,.040),BLACK,.010)
for copies,y,step,cap in((("IDEAS","MAPPED","BIGGER"),4.45,.25,.13),
    (("BUILDINGS","STAGES","PRODUCTS","INTERIORS","EXPERIENCES"),3.20,.23,.105)):
    for j,copy in enumerate(copies):label(copy,(6.67,y-j*step,3.178),cap,.48,tracking=1.05)
for j,copy in enumerate(("MORE","THAN PROJECTION","A HIGHER PERSPECTIVE")):
    p=Vector((6.15,1.40-j*.11,-.75))+Matrix.Rotation(-.30,4,"Y")@Vector((0,0,.050))
    label(copy,p,.065,1.78,yaw=-.30,centered=True,tracking=1.12)

PLANTING={"galleryFrames":gallery_specs,"vineLocalX":[-1.40,1.40],"vineLocalZ":.05,"vineY":[.65,6.0],
    "tree":[-6.60,.10,3.40],"innerPalms":[[-3.2,.10,-.60],[3.4,.10,-.55]],
    "rightOuter":[6.70,.10,3.25],"stageFlanks":[[-2.60,.10,.55],[2.60,.10,.55]],
    "counterFlowers":[-3.15,1.20,3.05],"tableFlowers":[5.15,.75,3.05]}


def preview():
    """Real native camera evidence; only approved media becomes screen texture."""
    def emission(name,path):
        mat=bpy.data.materials.new(name);mat.use_nodes=True;n=mat.node_tree.nodes;n.clear()
        output=n.new("ShaderNodeOutputMaterial");shader=n.new("ShaderNodeEmission");shader.inputs["Strength"].default_value=.75
        if path and path.exists():
            tex=n.new("ShaderNodeTexImage");tex.image=bpy.data.images.load(str(path),check_existing=True)
            mat.node_tree.links.new(tex.outputs["Color"],shader.inputs["Color"])
        else:shader.inputs["Color"].default_value=(.015,.12,.24,1)
        mat.node_tree.links.new(shader.outputs[0],output.inputs[0]);return mat
    assets=ROOT/"public/media/projection-mapping-v4"
    for a in SCREENS:
        hint=a["mediaHint"];path=None
        if hint.startswith("projection-application"):
            index=int(hint.rsplit("-",1)[1]);matches=list(assets.glob("application-"+str(index)+"-*.webp"));path=matches[0] if matches else None
        elif hint=="projection-backdrop":path=assets/"cosmic-panorama.webp"
        elif hint=="projection-ceiling":path=assets/"cosmic-swirl.webp"
        mat=emission("Preview | "+a["id"],path);v=[];f=[];uv=[]
        if a["type"]=="curved":
            for j in range(161):
                t=-a["arc"]/2+a["arc"]*j/160
                for y,yy in((-a["h"]/2,0),(a["h"]/2,1)):
                    v.append((a["x"]-a["radius"]*math.sin(t),a["y"]+y,a["z"]-a["radius"]*math.cos(t)));uv.append((j/160,yy))
            for j in range(160):f.append((2*j,2*j+2,2*j+3,2*j+1))
        elif a["type"]=="ellipse":
            for j in range(193):
                t=j*math.tau/192
                for r in(a.get("innerFraction",0),1):
                    v.append((math.cos(t)*a["radiusX"]*r,math.sin(t)*a["radiusZ"]*r,0));uv.append((.5+math.cos(t)*r*.5,.5+math.sin(t)*r*.5))
            for j in range(192):f.append((2*j,2*j+2,2*j+3,2*j+1))
        else:
            v=[(-a["w"]/2,-a["h"]/2,0),(a["w"]/2,-a["h"]/2,0),(a["w"]/2,a["h"]/2,0),(-a["w"]/2,a["h"]/2,0)]
            f=[(0,1,2,3)];uv=[(0,0),(1,0),(1,1),(0,1)]
        ob=uv_mesh("PREVIEW media "+a["id"],v,f,mat,uv)
        if a["type"]!="curved":
            r=a.get("rotation",[0,0,0]);rot=Matrix.Rotation(r[0],4,"X")@Matrix.Rotation(r[1],4,"Y")@Matrix.Rotation(r[2],4,"Z")
            place([ob],(a["x"],a["y"],a["z"]),rotation=rot)
    crystal_path=ROOT/"public/models/expo/projection-crystals-v7.glb"
    if not crystal_path.exists():crystal_path=ROOT/"public/models/expo/projection-crystals.glb"
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(crystal_path))
    place(set(bpy.context.scene.objects)-before,(0,1.25,-1.25),scale=(1.22,1.34,1.22))
    botanical_path=ROOT/"public/models/expo/projection-botanical-v7.glb"
    if not botanical_path.exists():botanical_path=ROOT/"public/models/expo/projection-botanical-v6.glb"
    for path in(botanical_path,ROOT/"public/models/expo/projection-visitors-v6.glb"):
        if path.exists():bpy.ops.import_scene.gltf(filepath=str(path))
    box("Preview | hall floor",(0,-.04,0),(80,.08,80),FLOOR,.005)
    scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.world.color=(.12,.13,.15)
    for p,power,size,color in(((0,11,4),2300,10,(1,.94,.85)),((-8,7,10),1600,7,(.85,.92,1)),((7,7,5),1800,6,(1,.93,.83)),((0,5,-1),450,5,(.8,.9,1))):
        bpy.ops.object.light_add(type="AREA",location=xyz(p));light=bpy.context.object;light.data.energy=power;light.data.shape="DISK";light.data.size=size;light.data.color=color
        target=Vector(xyz((0,2,.5)))-light.location;light.rotation_euler=target.to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=xyz((-3.6,3.4,16.5)));camera=bpy.context.object
    camera.rotation_euler=(Vector(xyz((0,3.7,0)))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.sensor_fit="VERTICAL";camera.data.sensor_height=24;camera.data.lens=24/(2*math.tan(math.radians(36)/2))
    scene.camera=camera;scene.render.filepath=str(ROOT/"qa/projection-mapping-v7/blender-preview.png")
    Path(scene.render.filepath).parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.render.render(write_still=True)


if "--preview" in sys.argv:
    preview();raise SystemExit(0)

# Material batching and AO follow construction; this generator creates no
# foliage, no reference image overlay and no imported visitors in the asset.
bpy.context.view_layer.update()
for ob,record in SIGNAGE_OBJECTS:
    p=[ob.matrix_world@v.co for v in ob.data.vertices]
    record["bounds"]={"min":[min(q[i] for q in p) for i in range(3)],"max":[max(q[i] for q in p) for i in range(3)]}
batch=UTILITY_SOURCE[UTILITY_SOURCE.index("def material_batch("):UTILITY_SOURCE.index("main_meshes = material_batch(")]
exec(compile(batch,"projection-v7-batching","exec"))
meshes=material_batch(list(bpy.context.scene.objects))
for ob in meshes:
    if not ob.data.uv_layers:
        uv=ob.data.uv_layers.new(name="UVMap")
        for loop in ob.data.loops:
            p=ob.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*.25,p.z*.25-p.y*.13)
ao=Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao.read_text(encoding="utf-8"),str(ao),"exec"))
ao_stats={"draft":True,"samples":0} if "--draft" in sys.argv else bake_technical_ao(meshes,samples=32,max_distance=.32,max_seconds=100)
stats=export(OUT,meshes)
layout={"version":7,"authoringScale":1,"runtimeScale":3,"root":ROOT_POSITION,"worldAnchor":ROOT_POSITION,"rootRotation":ROOT_ROTATION,
    "floorTop":.10,"deckPolygonXZ":deck,"architecture":{"width":14.4,"depth":9.5,"height":7.8,
    "dimensions":{"width":14.4,"depth":9.5,"height":7.8},"center":[0,.10,.25],"deckPolygonXZ":deck,"reception":reception,
    "stage":{"center":[0,1.25,-1.25],"top":1.25,"width":5.70,"depth":2.70,"min":[-2.85,.10,-2.60],"max":[2.85,1.25,.10]},
    "seating":seating,"sofa":sofa,"rightTable":{"position":[5.15,.10,3.05],"top":.75},
    "demonstrationBar":{"center":[0,.95,.55],"width":4.8,"depth":.42,"top":.95,"stools":[[-1.70,.10,1.18],[1.70,.10,1.18]]},
    "kiosk":{"position":list(kp),"width":kw,"height":kh,"yaw":kyaw},"planting":PLANTING},
    "modelPlacement":{"position":[0,1.25,-1.25],"scale":[1.22,1.34,1.22],"targetWidth":5.246,"targetHeight":4.757,"bottom":1.25},
    "apertures":SCREENS,"screens":SCREENS,"projectors":PROJECTORS,"typography":SIGNAGE,"fixtures":LIGHT_POINTS,
    "interaction":{"position":[-4.10,.65,3.56],"rotation":[0,0,0],"w":4.10,"h":1.0},
    "cameraSuggestion":{"position":[-3.6,3.4,16.5],"look":[0,3.7,0],"verticalFov":36},
    "ambientOcclusion":ao_stats,"stats":{"main":stats}}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding="utf-8")
print("PROJECTION_MAPPING_STALL_V7 "+json.dumps(stats),flush=True)
