"""Actual LED Rental Solutions pavilion and independently rotating DNA chassis.

Blender 5.2 --background --factory-startup --python this-file.py
All coordinates are Three-space XYZ; +Z faces the visitor. Emitting displays
are deliberately absent from the GLBs and described in the aperture manifest.
"""
from pathlib import Path
from mathutils import Matrix

HELPERS=Path(__file__).with_name("rebuild_reception_gallery.py")
source=HELPERS.read_text(encoding="utf-8").split("# The hero cylinder rises")[0]
exec(compile(source,str(HELPERS),"exec"))
# Use the analytic rounded cuboid; avoid the old BMesh cushion bevel miters.
technical=Path(__file__).with_name("rebuild_technical_showcase.py").read_text(encoding="utf-8")
exec(compile(technical[technical.index("def soft_box("):technical.index("def technical_armchair(")],"rounded-cuboid-helper","exec"))

OUT=ROOT/"public/models/expo/led-rental-showcase.glb"
DNA_OUT=ROOT/"public/models/expo/led-rental-dna.glb"
LAYOUT_OUT=ROOT/"public/models/expo/led-rental-showcase-layout.json"
SCREENS=[]
DNA_SCREENS=[]
ROOT_POSITION=[-10.2,0,-168]
ROOT_ROTATION=[0,math.pi/2,0]
HERO={"position":[-2,4.25,25],"look":[0,6.6,0],"verticalFov":41}
CROWN={"rx":11.0,"rz":6.10,"z":1.10,"bottom":10.3,"top":12.5}
OVAL={"x":-.649902,"y":10.137382,"z":3.722049,"rx":6.462677,"rz":4.770561,"height":.25}
FLOOR_TOP=1.0
PLATFORM_FRONT={"x":.248042,"rx":12.791314,"z":4.800736,"rz":3.368319}
STAGE={"x":-.4385,"z":.3076,"radius":4.70,"lower":1.70,"top":2.64,"upperRadius":4.32,"upperTop":2.83985}
DNA_POSITION=[-.4499,0,1.3756]
DNA_ROTATION=[0,.622,0]
DNA_BOTTOM,DNA_TOP=3.9552,8.9722
RNG=random.Random(20261018)
FONT=bpy.data.fonts.load("C:/Windows/Fonts/segoeui.ttf")
SEMIBOLD=bpy.data.fonts.load("C:/Windows/Fonts/seguisb.ttf")

BLACK=material("LED Rental | rich black lacquered aluminium",(.006,.008,.011),.48,.35)
WALL=material("LED Rental | graphite satin architectural panel",(.008,.011,.015),.24,.53)
BRUSHED=material("LED Rental | graphite brushed aluminium cabinet",(.027,.034,.042),.72,.32)
BACK=material("LED Rental | dark ventilated LED cabinet",(.007,.009,.012),.20,.61)
FLOOR=material("LED Rental | charcoal honed pathway stone",(.052,.054,.052),.13,.37)
BRAND=material("LED Rental | porcelain brand lettering",(.85,.91,.93),.08,.42,.12)
TEAL=material("LED Rental | concealed mint cyan LED cove",(.026,.79,.65),.04,.35,2.1)
WHITE=material("LED Rental | neutral pearl white LED trim",(.81,.91,.91),0,.35,1.65)
CABLE=material("LED Rental | fine stainless suspension cable",(.12,.14,.15),.82,.39)
SILVER=material("LED Rental | brushed satin stainless steel",(.36,.40,.42),.82,.29)
IVORY=material("LED Rental | pale grey wool round upholstery",(.43,.43,.40),0,.86)
LEAF=material("LED Rental | olive deep green leaf",(.048,.079,.029),0,.88)
LEAVES=[LEAF,material("LED Rental | olive light green leaf",(.11,.145,.052),0,.87),
    material("LED Rental | olive shadow leaf",(.025,.047,.018),0,.94)]
TIMBER=material("LED Rental | olive warm natural stem",(.063,.043,.025),0,.88)
ROOF=material("LED Rental | black pearl canopy underside",(.0045,.006,.007),.08,.78)
TRUSS=material("LED Rental | overhead grey production truss",(.11,.12,.125),.72,.45,.012)
TOP=material("LED Rental | honed charcoal reception worktop",(.11,.125,.13),.15,.34)
STONE=BLACK
TAUPE_LEATHER=IVORY
SMOKED_GLASS=material("LED Rental | smoked rear architectural glass",(.014,.022,.024),.05,.19)
SMOKED_GLASS.node_tree.nodes.get("Principled BSDF").inputs["Alpha"].default_value=.13
SMOKED_GLASS.diffuse_color=(.014,.022,.024,.13)
SMOKED_GLASS.surface_render_method="DITHERED"


def group(name,before,p=(0,0,0),yaw=0):
    root=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(root)
    root.location=xyz(p)
    root.rotation_euler[2]=yaw
    for ob in set(bpy.context.scene.objects)-before:
        if ob!=root and ob.parent is None:ob.parent=root
    return root


def text(body,p,size,yaw=0,mat=BRAND,centered=False,semibold=False,tracking=1,width=None):
    global FONT
    previous=FONT
    if semibold:FONT=SEMIBOLD
    before=set(bpy.context.scene.objects)
    ob=lettering(body,(0,0,0),size,centered,tracking)
    FONT=previous
    ob.data.materials[0]=mat
    if width is not None:
        actual=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
        if actual>width:
            for vertex in ob.data.vertices:vertex.co.x*=width/actual
    group("LED Rental | lettering placement",before,p,yaw)
    return ob


def triangle_emblem(p,size=1,yaw=0):
    before=set(bpy.context.scene.objects)
    # The reference uses an open asymmetric triangular folded ribbon.
    polygons=[[(0,0),(0,1.0),(.18,.88),(.18,.30)],
        [(.18,.88),(.72,.49),(.72,.31),(.35,.52)],
        [(0,0),(.72,.31),(.72,.49),(.18,.25)]]
    for poly in polygons:
        verts=[(x*size,y*size,z) for z in (-.018,.018) for x,y in poly]
        n=len(poly)
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
        faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
        ob=patch_mesh("LED Rental | folded triangular emblem",verts,faces,BRAND)
        for face in ob.data.polygons:face.use_smooth=False
    group("LED Rental | triangular brand icon",before,p,yaw)


def wordmark(p,size=1,yaw=0,word_scale=1):
    before=set(bpy.context.scene.objects)
    triangle_emblem((0,-.04,0),size*1.08)
    text("livegrid AV",(size*.94,.04,.015),size*word_scale,semibold=True)
    return group("LED Rental | triangular Livegrid AV wordmark",before,p,yaw)


def round_outline(w,d,r,steps=14):
    points=[]
    for cx,cz,start in ((w/2-r,d/2-r,0),(-w/2+r,d/2-r,math.pi/2),
        (-w/2+r,-d/2+r,math.pi),(w/2-r,-d/2+r,math.pi*1.5)):
        for j in range(steps+1):
            a=start+j*math.pi/2/steps
            points.append((cx+math.cos(a)*r,cz+math.sin(a)*r))
    return points


def extruded_outline(name,points,y0,y1,mat):
    n=len(points)
    verts=[(x,y,z) for y in (y0,y1) for x,z in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    ob=patch_mesh(name,verts,faces,mat)
    for face in ob.data.polygons:face.use_smooth=False
    return ob


def outline_tube(name,points,y,r,mat):
    path=[(Vector((x,y,z)),r) for x,z in points]
    path.append(path[0])
    return sweep(name,path,mat,8)


def ellipse_points(rx,rz,cx=0,cz=0,steps=144,start=0,end=math.tau):
    return [(cx+rx*math.sin(start+(end-start)*i/steps),
        cz+rz*math.cos(start+(end-start)*i/steps)) for i in range(steps+1)]


def ellipse_band(name,rx,rz,cx,cz,y0,y1,mat,thickness=.06,start=0,end=math.tau,steps=144):
    verts,faces=[],[]
    for i in range(steps+1):
        a=start+(end-start)*i/steps
        for rrx,rrz,y in ((rx,rz,y0),(rx,rz,y1),(rx-thickness,rz-thickness,y1),(rx-thickness,rz-thickness,y0)):
            verts.append((cx+rrx*math.sin(a),y,cz+rrz*math.cos(a)))
    for i in range(steps):
        for j in range(4):faces.append((i*4+j,(i+1)*4+j,(i+1)*4+(j+1)%4,i*4+(j+1)%4))
    faces.extend([(3,2,1,0),tuple(steps*4+j for j in range(4))])
    return patch_mesh(name,verts,faces,mat)


def ellipse_annulus(name,outer,inner,cx,cz,y0,y1,mat,steps=144):
    verts,faces=[],[]
    for i in range(steps):
        a=i*math.tau/steps
        for rx,rz,y in ((outer[0],outer[1],y0),(outer[0],outer[1],y1),
            (inner[0],inner[1],y1),(inner[0],inner[1],y0)):
            verts.append((cx+math.sin(a)*rx,y,cz+math.cos(a)*rz))
    for i in range(steps):
        ni=(i+1)%steps
        for j in range(4):faces.append((i*4+j,ni*4+j,ni*4+(j+1)%4,i*4+(j+1)%4))
    return patch_mesh(name,verts,faces,mat)


def perimeter_band(name,outer,inner,y0,y1,mat):
    verts,faces=[],[]
    for a,b in zip(outer,inner):
        verts.extend([(a[0],y0,a[1]),(a[0],y1,a[1]),(b[0],y1,b[1]),(b[0],y0,b[1])])
    for i in range(len(outer)):
        ni=(i+1)%len(outer)
        for j in range(4):faces.append((i*4+j,ni*4+j,ni*4+(j+1)%4,i*4+(j+1)%4))
    return patch_mesh(name,verts,faces,mat)


def curved_text(body,left_x,y,size,rx,rz,cz,mat=BRAND):
    ob=text(body,(0,0,0),size,mat=mat)
    bpy.context.view_layer.update()
    matrix=ob.matrix_world.copy()
    ob.parent=None
    for vertex in ob.data.vertices:
        p=matrix@vertex.co
        x=left_x+p.x
        yy=y+p.z
        theta=math.asin(max(-.995,min(.995,(x-STAGE["x"])/rx)))
        z=cz+rz*math.cos(theta)+.032-p.y
        vertex.co=Vector(xyz((x,yy,z)))
    ob.matrix_world=Matrix.Identity(4)
    return ob


def aperture(id,p,w,h,hint,yaw=0,frame=.035,rotation=None,transparent=False):
    before=set(bpy.context.scene.objects)
    if not transparent:box(id+" | recessed thin LED cabinet",(0,0,-.075),(w+.10,h+.10,.12),BACK,.012)
    for side in (-1,1):
        box(id+" | precision vertical trim",(side*(w/2+.017),0,-.007),(.034,h+.068,.03),BRUSHED,.004)
        box(id+" | precision horizontal trim",(0,side*(h/2+.017),-.007),(w,.034,.03),BRUSHED,.004)
    root=group(id+" | screen housing placement",before,p,yaw)
    rot=[0,yaw,0] if rotation is None else rotation
    if rotation is not None:
        # Three Euler XYZ converted to Blender's Z-up coordinate basis.
        basis=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
        from mathutils import Euler
        root.rotation_euler=(basis@Euler(rotation,"XYZ").to_matrix()@basis.inverted()).to_euler()
    SCREENS.append({"id":id,"type":"plane","x":p[0],"y":p[1],"z":p[2],
        "w":w,"h":h,"width":w,"height":h,"rotation":rot,"mediaHint":hint,
        **({"transparent":True} if transparent else {})})
    return root


def cable_to(p,top=None):
    top=CROWN["bottom"]-.17 if top is None else top
    rod("LED Rental | taut stainless suspension cable",(p[0],p[1],p[2]),(p[0],top,p[2]),.008,CABLE,6)
    rod("LED Rental | cable ceiling ferrule",(p[0],top-.025,p[2]),(p[0],top+.045,p[2]),.024,SILVER,10)


def product_label(body,p,w=1.8):
    text(body,p,.36,centered=True,semibold=True,width=w*1.20)


