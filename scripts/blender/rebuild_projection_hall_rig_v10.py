"""Native exhibition-hall context, independently modeled above the pavilion.

Mount at [0,1.6,0] inside the projection root. The roof is an actual ribbed
industrial ceiling above two crossing levels of triangulated box trusses.
No photographic backdrop, walls, visitor imagery or other booths are used.
"""
from pathlib import Path
import hashlib,sys

HELPERS=Path(__file__).with_name("rebuild_projection_mapping_stall.py")
UTILITY=HELPERS.read_text(encoding="utf-8")
exec(compile(UTILITY.split("# A broad island")[0],str(HELPERS),"exec"))
OUT=ROOT/"public/models/expo/projection-hall-rig-v10.glb"
QA=ROOT/"qa/projection-mapping-v10";QA.mkdir(parents=True,exist_ok=True)
PREFIX="Projection Hall V10 | "
ALUMINIUM=material(PREFIX+"brushed charcoal aluminium triangulated lattice",(.085,.098,.110),.70,.42)
JOINT=material(PREFIX+"satin dark steel rigging and fixture chassis",(.012,.015,.019),.40,.47)
PANEL=material(PREFIX+"neutral charcoal industrial ceiling panels",(.027,.029,.031),.08,.85)
PURLIN=material(PREFIX+"dark grey rolled roof purlins",(.042,.047,.052),.36,.64)
WARM_OPTIC=material(PREFIX+"restrained warm white optical lens",(.94,.82,.65),0,.30,3.8)
COOL_OPTIC=material(PREFIX+"neutral white distant optical lens",(.75,.83,.94),0,.30,2.7)
LIGHTS=[]

def lattice(name,a,b,width=.46,height=.58,bay=.84):
    """Four continuous chords with alternating Warren webs on four faces."""
    a,b=Vector(a),Vector(b);direction=(b-a).normalized()
    transverse=Vector((0,0,1)) if abs(direction.x)>.9 else Vector((1,0,0))
    up=Vector((0,1,0));count=max(1,round((b-a).length/bay))
    def corner(p,h,s):return p+up*height*.5*h+transverse*width*.5*s
    for h in(-1,1):
        for s in(-1,1):rod(PREFIX+name+" continuous rounded chord",corner(a,h,s),corner(b,h,s),.028,ALUMINIUM,8)
    for j in range(count):
        p=a.lerp(b,j/count);q=a.lerp(b,(j+1)/count);flip=1 if j%2 else-1
        for s in(-1,1):
            rod(PREFIX+name+" side Warren diagonal",corner(p,-flip,s),corner(q,flip,s),.0135,ALUMINIUM,6)
        for h in(-1,1):
            rod(PREFIX+name+" top and bottom cross web",corner(p,h,-flip),corner(q,h,flip),.010,ALUMINIUM,6)
        if j%3==0:
            for s in(-1,1):rod(PREFIX+name+" vertical node tie",corner(p,-1,s),corner(p,1,s),.012,ALUMINIUM,6)
            for h in(-1,1):rod(PREFIX+name+" transverse node tie",corner(p,h,-1),corner(p,h,1),.012,ALUMINIUM,6)

# Deep main spans and a separately elevated longitudinal grid. The crossing
# levels have physical junctions rather than intersecting at one wire plane.
primary_z=(-7.20,-4.50,-1.80,.90,3.60,6.30,9.00)
secondary_x=(-12.0,-7.30,-2.60,2.10,6.80,11.50)
for row,z in enumerate(primary_z):
    lattice(f"main span {row}",(-13,7.48,z),(13,7.48,z),.46,.60,.86)
for index,x in enumerate(secondary_x):
    lattice(f"longitudinal span {index}",(x,8.08,-8.0),(x,8.08,10.0),.34,.42,.92)
for x in secondary_x:
    for z in primary_z:
        box(PREFIX+"black bolted intersection saddle",(x,7.85,z),(.43,.14,.48),JOINT,.014)
        for zz in(z-.17,z+.17):rod(PREFIX+"steel node attachment pin",(x-.22,7.81,zz),(x+.22,7.81,zz),.023,ALUMINIUM,8)
for x in(-11.0,-5.4,.2,5.8,11.4):
    for z in(-6.8,-1.4,4.0,9.0):
        rod(PREFIX+"tensioned vertical roof suspension",(x,7.78,z),(x,9.10,z),.0075,JOINT,6)
        box(PREFIX+"roof suspension clevis",(x,9.04,z),(.08,.14,.065),ALUMINIUM,.007)
for x in(-12,-6,0,6):
    for z in(-6.8,-1.4,4.0):
        rod(PREFIX+"diagonal roof stability tie",(x,8.90,z),(x+6,8.90,z+5.4),.008,JOINT,6)
        rod(PREFIX+"opposed diagonal roof stability tie",(x+6,8.90,z),(x,8.90,z+5.4),.008,JOINT,6)

# Individual shallow pans, true panel joints and corrugated underside ribs.
# Every ceiling panel is above native Y8.8, clear of the show roof and fixtures.
for xi in range(13):
    for zi in range(7):
        x=-12.0+xi*2.0;z=-6.65+zi*2.70
        box(PREFIX+"industrial acoustic ceiling pan",(x,9.19,z),(1.982,.18,2.682),PANEL,.008)
for z in(-7.99,-6.64,-5.29,-3.94,-2.59,-1.24,.11,1.46,2.81,4.16,5.51,6.86,8.21,9.56):
    box(PREFIX+"rolled ceiling purlin",(0,9.035,z),(26.0,.12,.075),PURLIN,.006)
for x in(-12.95,-8.95,-4.95,-.95,3.05,7.05,11.05):
    box(PREFIX+"longitudinal ceiling panel rail",(x,9.045,.40),(.055,.10,18.0),PURLIN,.004)

def pendant(x,z,angle=-.10,warm=True):
    """Vented black cylinder, yoke, visible recessed optics and safety wire."""
    top=7.14;bottom=6.89
    rod(PREFIX+"pendant clamp spindle",(x,7.48,z),(x,7.16,z),.012,JOINT,8)
    for side in(-1,1):
        box(PREFIX+"folded pendant yoke arm",(x+side*.082,7.125,z),(.018,.19,.035),JOINT,.004)
    rod(PREFIX+"ventilated downward fixture barrel",(x,top,z),(x,bottom,z),.070,JOINT,14)
    rod(PREFIX+"spotlight aluminium optical bezel",(x,bottom-.008,z),(x,bottom+.014,z),.074,ALUMINIUM,16)
    rod(PREFIX+"black recessed lens baffle",(x,bottom-.016,z),(x,bottom-.008,z),.061,JOINT,16)
    optic=WARM_OPTIC if warm else COOL_OPTIC
    rod(PREFIX+"actual downward warm fixture optic",(x,bottom-.022,z),(x,bottom-.015,z),.047,optic,16)
    for y in(7.005,7.07):
        path=[(Vector((x+math.cos(j*math.tau/12)*.071,y,z+math.sin(j*math.tau/12)*.071)),.0035)for j in range(13)]
        sweep(PREFIX+"fine fixture cooling ring",path,ALUMINIUM,6)
    rod(PREFIX+"curved fixture safety cable",(x+.09,7.22,z),(x+.13,7.48,z+.05),.0035,JOINT,6)
    LIGHTS.append({"position":[x,bottom-.023,z],"warm":warm,"radius":.047})
for row,z in enumerate((-6.60,-3.90,-1.20,1.50,4.20,6.90,9.60)):
    for col,x in enumerate((-10.8,-6.5,-2.2,2.1,6.4,10.7)):
        pendant(x+(.28 if row%2 else 0),z,warm=(row+col)%5!=0)

# Batch by true physical finish while preserving all authored curved normals.
bpy.context.view_layer.update();groups={}
for ob in list(bpy.context.scene.objects):
    if ob.type=="MESH":groups.setdefault(ob.data.materials[0].name,[]).append(ob)
objects=[]
for name,items in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    ob=bpy.context.view_layer.objects.active;ob.name=name;ob["projectionHallContext"]=True
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if not ob.data.uv_layers:
        uv=ob.data.uv_layers.new(name="UVMap")
        for loop in ob.data.loops:
            p=ob.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*.3,p.y*.3+p.z*.1)
    objects.append(ob)

# Vertex AO is useful on bracket/roof junctions, subtle at this viewing range.
ao=Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao.read_text(encoding="utf-8"),str(ao),"exec"))
ao_stats=bake_technical_ao(objects,samples=16,max_distance=.22,max_seconds=35)
export_source=UTILITY[UTILITY.index("def export("):UTILITY.index("main_meshes = material_batch(")]
export_source=export_source.replace("export_apply=True, export_materials=","export_apply=True, export_extras=True, export_materials=")
exec(compile(export_source,"hall-v10-export","exec"))
stats=export(OUT,objects)
report={"file":OUT.name,"sha256":hashlib.sha256(OUT.read_bytes()).hexdigest(),"mount":[0,1.6,0],"stats":stats,"primaryRows":len(primary_z),"secondarySpans":len(secondary_x),"fixtures":LIGHTS,"ceilingPanelBottom":9.10,"ambientOcclusion":ao_stats}
(ROOT/"public/models/expo/projection-hall-rig-v10-layout.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print("PROJECTION_HALL_V10 "+json.dumps(report),flush=True)

if "--preview" in sys.argv:
    # Actual geometry context, with the booth merely imported for scale proof.
    basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
    for ob in objects:ob.location+=Vector((0,0,1.6))
    bpy.ops.import_scene.gltf(filepath=str(ROOT/"public/models/expo/projection-mapping-stall-v10.glb"))
    scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=20;scene.cycles.use_denoising=True
    scene.world.color=(.12,.13,.15);scene.render.resolution_x=1450;scene.render.resolution_y=816;scene.render.resolution_percentage=100
    for p,power,size in(((0,10,5),2600,12),((-8,7,12),1500,8),((8,8,6),1800,8)):
        bpy.ops.object.light_add(type="AREA",location=xyz(p));light=bpy.context.object;light.data.energy=power;light.data.shape="DISK";light.data.size=size
        light.rotation_euler=(Vector(xyz((0,5,0)))-light.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=xyz((-4,1.65,15.6)));camera=bpy.context.object
    camera.rotation_euler=(Vector(xyz((.17,4.0,0)))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.sensor_fit="VERTICAL";camera.data.sensor_height=24;camera.data.lens=24/(2*math.tan(math.radians(43)/2));scene.camera=camera
    scene.render.filepath=str(QA/"hall-rig-context.png");bpy.ops.render.render(write_still=True)
