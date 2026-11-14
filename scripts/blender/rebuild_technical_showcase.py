"""Connected Technical Showcase, authored as actual exhibition architecture.

Blender 5.2: --background --factory-startup --python this-file.py
Three-space XYZ coordinates: front is +Z. Website owns every emitting display.
"""
from pathlib import Path
from mathutils import Matrix

HELPERS=Path(__file__).with_name("rebuild_reception_gallery.py")
source=HELPERS.read_text(encoding="utf-8").split("# The hero cylinder rises")[0]
exec(compile(source,str(HELPERS),"exec"))
human_helper=Path(__file__).with_name("technical_humans.py")
exec(compile(human_helper.read_text(encoding="utf-8"),str(human_helper),"exec"))
SEMIBOLD_FONT=bpy.data.fonts.load("C:/Windows/Fonts/seguisb.ttf")
OUT=ROOT/"public/models/expo/technical-showcase.glb"
LAYOUT_OUT=ROOT/"public/models/expo/technical-showcase-layout.json"
SCREENS=[]
ROOT_ANCHOR=[-10.2,0,-142]
ROOT_YAW=math.pi/2
WORKTOP=.98
STATION_FACTORS={"av":.711962,"show":.698310,"live":.772719}
HERO_XZ=Vector((3.224784,18))
RNG=random.Random(20261017)
TYPOGRAPHY=[]

STEEL=material("Technical | rich black powdercoat",(.003,.0037,.0046),.25,.53)
PANEL=material("Technical | charcoal architectural panel",(.0045,.0052,.0066),.12,.72)
SILVER=material("Technical | brushed champagne stainless",(.37,.375,.38),.82,.27)
BLUE=material("Technical | faceted ice blue metallic emblem",(.19,.42,.65),.72,.25)
BLUE_LIGHT=material("Technical | emblem pale blue facet",(.53,.70,.85),.78,.22)
BLUE_DARK=material("Technical | emblem dark blue facet",(.052,.14,.26),.75,.29)
WHITE_COVE=material("Technical | concealed warm white LED",(.98,.82,.61),0,.35,2.1)
NEUTRAL_COVE=material("Technical | acrylic white edge light",(.74,.86,.96),0,.32,1.9)
EQUIPMENT=material("Technical | graphite equipment housing",(.009,.012,.016),.22,.49)
KEYS=material("Technical | black molded keycaps",(.023,.027,.034),.05,.67)
SMALL_LABEL=material("Technical | equipment ivory legends",(.44,.49,.55),0,.64,.05)
STATUS_GREEN=material("Technical | small green equipment status",(.17,.55,.32),0,.3,1.2)
STATUS_BLUE=material("Technical | small blue equipment status",(.15,.32,.52),0,.3,1.0)
COUNTER_FACE=material("Technical | rough cast black metal counter",(.012,.014,.019),.42,.62)
FLOOR=material("Technical | warm charcoal honed pathway stone",(.065,.060,.052),.08,.44)
RUG=material("Technical | charcoal woven oval lounge rug",(.038,.037,.035),0,.98)
ACRYLIC=material("Technical | lightly frosted clear acrylic",(.025,.032,.040),0,.14)
acrylic_shader=ACRYLIC.node_tree.nodes.get("Principled BSDF")
acrylic_shader.inputs["Alpha"].default_value=.055
acrylic_shader.inputs["Transmission Weight"].default_value=0
ACRYLIC.surface_render_method="DITHERED"
ACRYLIC.diffuse_color=(.025,.032,.040,.055)
LOUNGE_GREY=material("Technical | soft warm grey lounge upholstery",(.31,.29,.265),0,.84)
COUNTER_SILVER=material("Technical | reception polished brushed silver facet",(.52,.54,.55),.90,.22)
CANOPY_PEARL=material("Technical | warm pearl canopy diffuser",(.38,.34,.28),.15,.40,.22)
OVERHEAD_STEEL=material("Technical | overhead truss steel",(.095,.090,.082),.65,.47,.018)
# Reuse identical finishes for small shared parts to control material batches.
BLACK=STEEL
WALL=PANEL
ALLOY=STEEL
CHAMPAGNE=SILVER
SATIN=SILVER
SHOES=EQUIPMENT
EYE=HAIR
SHIRT=SMALL_LABEL
TAUPE_LEATHER=LOUNGE_GREY

def group(name,before,p=(0,0,0),yaw=0):
    root=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(root)
    root.location=xyz(p)
    root.rotation_euler[2]=yaw
    for ob in set(bpy.context.scene.objects)-before:
        if ob!=root and ob.parent is None:
            ob.parent=root
    return root


def text(body,p,size,yaw=0,mat=BRAND,tracking=1,centered=False,semibold=False):
    global FONT
    before=set(bpy.context.scene.objects)
    previous_font=FONT
    if semibold:FONT=SEMIBOLD_FONT
    ob=lettering(body,(0,0,0),size,centered,tracking)
    FONT=previous_font
    ob.data.materials[0]=mat
    group("Technical lettering placement",before,p,yaw)
    return ob


def caption_text(body,p,size,yaw=0,max_width=None,tracking=1,centered=False):
    """Architectural copy uses semibold outlines with uniform width fitting."""
    ob=text(body,p,size,yaw,tracking=tracking,centered=centered,semibold=True)
    natural_width=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
    fit=min(1,max_width/natural_width) if max_width else 1
    if fit<1:
        for vertex in ob.data.vertices:vertex.co*=fit
    width=natural_width*fit
    height=max(v.co.y for v in ob.data.vertices)-min(v.co.y for v in ob.data.vertices)
    assert not max_width or width<=max_width+1e-6
    TYPOGRAPHY.append({"text":body,"position":list(p),"requestedFontSize":size,
        "fontSize":size*fit,"capHeight":height,"width":width,"maxWidth":max_width,
        "uniformFit":fit,"font":"Segoe UI Semibold"})
    return ob


def cuboids(name,items,mat):
    vertices,faces=[],[]
    for p,s in items:
        base=len(vertices)
        for dx,dy,dz in ((-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                         (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)):
            vertices.append((p[0]+dx*s[0]/2,p[1]+dy*s[1]/2,p[2]+dz*s[2]/2))
        faces.extend(tuple(base+i for i in face) for face in ((0,3,2,1),(4,5,6,7),
            (0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)))
    ob=patch_mesh(name,vertices,faces,mat)
    for poly in ob.data.polygons:poly.use_smooth=False
    return ob


def soft_box(name,p,size,mat,bevel=.08):
    """Analytic rounded cuboid; avoids intersecting BMesh bevel miters."""
    half=[s/2 for s in size]
    radius=min(bevel,min(half)*.93)
    coords=[]
    for h in half:
        coords.append(sorted(set((-h,-h+radius*.25,-h+radius*.5,-h+radius*.75,
            -h+radius,0,h-radius,h-radius*.75,h-radius*.5,h-radius*.25,h))))
    vertices,faces=[],[]
    for axis in range(3):
        u,v=(axis+1)%3,(axis+2)%3
        for side in (-1,1):
            base=len(vertices)
            for uu in coords[u]:
                for vv in coords[v]:
                    point=Vector((0,0,0))
                    point[axis]=side*half[axis]
                    point[u],point[v]=uu,vv
                    core=Vector([max(-half[k]+radius,min(half[k]-radius,point[k])) for k in range(3)])
                    direction=point-core
                    vertices.append(tuple(core+direction.normalized()*radius))
            rows,cols=len(coords[u]),len(coords[v])
            for i in range(rows-1):
                for j in range(cols-1):
                    face=(base+i*cols+j,base+(i+1)*cols+j,base+(i+1)*cols+j+1,base+i*cols+j+1)
                    faces.append(face if side>0 else tuple(reversed(face)))
    ob=patch_mesh(name,vertices,faces,mat)
    bm=bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(ob.data)
    bm.free()
    ob.location=xyz(p)
    return ob


def technical_armchair(x,z):
    before=set(bpy.context.scene.objects)
    soft_box("Technical armchair low upholstered frame",(0,.27,0),(.87,.20,.85),LOUNGE_GREY,.070)
    soft_box("Technical armchair deep seat cushion",(0,.43,.025),(.65,.17,.69),LOUNGE_GREY,.062)
    soft_box("Technical armchair softly rounded back",(0,.66,-.31),(.82,.42,.18),LOUNGE_GREY,.065)
    for side in (-1,1):
        soft_box("Technical armchair softly padded arm",(side*.365,.49,0),(.15,.35,.84),LOUNGE_GREY,.062)
        for zz in (-.29,.29):rod("Technical armchair recessed dark foot",(side*.31,.015,zz),(side*.31,.20,zz),.018,STEEL,10)
    pillow=soft_box("Technical armchair loose back pillow",(0,.66,-.20),(.63,.36,.17),LOUNGE_GREY,.062)
    pillow.rotation_euler[0]=math.radians(-8)
    return group("Technical compact upholstered lounge armchair",before,(x,0,z))


def aperture(id,p,w,h,hint,yaw=0,frame=.035):
    before=set(bpy.context.scene.objects)
    box(id+" thin display cabinet",(0,0,-.065),(w+.09,h+.09,.09),EQUIPMENT,.014)
    for side in (-1,1):
        box(id+" display edge",(side*(w/2+frame/2),0,-.006),(frame,h+frame*2,.028),ALLOY,.005)
        box(id+" display edge",(0,side*(h/2+frame/2),-.006),(w,frame,.028),ALLOY,.005)
    group(id+" display placement",before,p,yaw)
    face=[p[0]+math.sin(yaw)*.012,p[1],p[2]+math.cos(yaw)*.012]
    SCREENS.append({"id":id,"p":face,"position":face,"x":face[0],"y":face[1],"z":face[2],
        "width":w,"height":h,"w":w,"h":h,"rotation":[0,yaw,0],"mediaHint":hint})


def emblem(p,size=1,yaw=0):
    before=set(bpy.context.scene.objects)
    # Four thick angular ribbons around a diamond-shaped negative space.
    for i,mat in enumerate((BLUE_LIGHT,BLUE,BLUE_DARK,BLUE_LIGHT)):
        a=math.pi/2-i*math.pi/2+.035
        b=a-math.pi/2+.095
        poly=[(math.cos(a)*size,math.sin(a)*size),
            (math.cos(b)*size,math.sin(b)*size),
            (math.cos(b)*size*.46,math.sin(b)*size*.46),
            (math.cos(a)*size*.46,math.sin(a)*size*.46)]
        verts=[(x,y,z) for z in (-.035,.035) for x,y in poly]
        faces=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        ob=patch_mesh("Technical angular diamond emblem facet",verts,faces,mat)
        for f in ob.data.polygons:f.use_smooth=False
    return group("Technical geometric brand emblem",before,p,yaw)


def wordmark(p,size,yaw=0,with_emblem=True,word_scale=1,icon_scale=1,gap=0):
    before=set(bpy.context.scene.objects)
    start=(size*1.45 if with_emblem else 0)+gap
    ob=text("Livegrid",(start,0,.015),size*word_scale)
    # Font side bearings are not the visible glyph edges. Normalize both
    # runs before positioning AV so it cannot overlap the final d.
    left=min(v.co.x for v in ob.data.vertices)
    for vertex in ob.data.vertices:vertex.co.x-=left
    width=max(v.co.x for v in ob.data.vertices)
    cap_top=max(v.co.y for v in ob.data.vertices)
    av=text("AV",(start+width+size*.025,0,.015),size*word_scale,mat=BLUE_LIGHT)
    left=min(v.co.x for v in av.data.vertices)
    for vertex in av.data.vertices:vertex.co.x-=left
    if with_emblem:
        cap_bottom=min(v.co.y for v in av.data.vertices)
        emblem((size*.60,(cap_bottom+cap_top)/2,0),size*.54*icon_scale)
    return group("Technical wordmark assembly",before,p,yaw)


def keyboard(x,y,z,w=.74):
    box("Control keyboard low chassis",(x,y,z),(w,.035,.245),EQUIPMENT,.012)
    items=[]
    for row in range(5):
        for col in range(13):
            items.append(((x-w*.445+col*w*.069,y+.024,z-.093+row*.043),(w*.058,.014,.031)))
    cuboids("Control individual keyboard keycaps",items,KEYS)
    box("Control keyboard ivory spacebar",(x,y+.025,z+.10),(w*.34,.014,.025),SMALL_LABEL,.003)


def monitor(id,x,y,z,w=.96,h=.57,hint="workstation-ui"):
    box("Monitor slim swivel pedestal",(x,WORKTOP+.014,z-.035),(.27,.026,.21),EQUIPMENT,.010)
    rod("Monitor height adjustable stem",(x,WORKTOP+.026,z-.08),(x,y-h*.22,z-.08),.026,SILVER,10)
    aperture(id,(x,y,z),w,h,hint,frame=.018)
    box("Monitor tiny indicator",(x+w*.40,y-h*.5-.015,z+.012),(.017,.005,.003),STATUS_BLUE,0)


def laptop(id,x,y,z):
    box("Open laptop aluminum keyboard deck",(x,y,z),(.62,.025,.42),SILVER,.014)
    keyboard(x,y+.018,z+.025,.53)
    aperture(id,(x,y+.225,z-.19),.55,.33,"laptop-control-ui",frame=.014)
    rod("Laptop continuous fine hinge",(x-.27,y+.022,z-.19),(x+.27,y+.022,z-.19),.013,EQUIPMENT,10)


def console(x,y,z):
    box("Professional control surface wedge",(x,y+.07,z),(1.05,.14,.76),EQUIPMENT,.025)
    for i in range(9):
        xx=x-.43+i*.108
        box("Console fader silver track",(xx,y+.148,z+.035),(.009,.004,.24),SILVER,.002)
        box("Console fader black cap",(xx,y+.16,z-.055+(i%4)*.045),(.043,.025,.055),KEYS,.006)
        for row in range(2):
            rod("Console rotary encoder",(xx,y+.14,z-.18+row*.058),(xx,y+.178,z-.18+row*.058),.024,KEYS,12)
    pads=[]
    for row in range(3):
        for col in range(5):
            pads.append(((x-.43+col*.105,y+.158,z+.22+row*.055),(.072,.013,.036)))
    cuboids("Console backlit tactile action pads",pads,SMALL_LABEL)


def rack(x,z):
    box("Floor production equipment rack",(x,.51,z),(.64,.80,.62),EQUIPMENT,.025)
    vents=[]
    for row in range(7):
        yy=.18+row*.10
        box("Rack individual recessed unit",(x,yy,z+.316),(.57,.105,.018),STEEL,.004)
        for col in range(12):vents.append(((x-.245+col*.037,yy,z+.328),(.023,.038,.004)))
        box("Rack status indicator",(x+.23,yy,z+.331),(.017,.009,.005),STATUS_GREEN,0)
    cuboids("Rack ventilation apertures",vents,KEYS)


def operator_chair(x,z,turn=0):
    before=set(bpy.context.scene.objects)
    soft_box("Control stool upholstered seat",(0,.68,0),(.50,.12,.46),UPHOLSTERY,.07)
    soft_box("Control stool sculpted backrest",(0,1.01,-.19),(.49,.49,.09),UPHOLSTERY,.042)
    rod("Control stool back support",(0,.45,-.18),(0,.96,-.23),.022,SILVER,10)
    rod("Control stool chrome piston",(0,.11,0),(0,.64,0),.040,SILVER,12)
    for i in range(5):
        a=i*math.tau/5
        end=(math.cos(a)*.32,.08,math.sin(a)*.32)
        rod("Control stool five star foot",(0,.16,0),end,.023,STEEL,8)
        rod("Control stool caster",(end[0]-.035,.051,end[2]),(end[0]+.035,.051,end[2]),.041,SHOES,12)
    for side in (-1,1):
        rod("Control stool foot rail",(side*.22,.36,-.13),(side*.22,.36,.22),.018,SILVER,10)
    return group("Technical operator stool",before,(x,0,z),turn)


def acrylic_pylon(p,w,h,lines,yaw=0):
    before=set(bpy.context.scene.objects)
    soft_box("Freestanding clear acrylic brand monolith",(0,h/2,0),(w,h,.15),ACRYLIC,.085)
    # Doubled panel at the right carries the visible exposed acrylic thickness.
    for side in (-1,1):
        rod("Acrylic pylon illuminated cut edge",(side*w/2,.07,.078),(side*w/2,h-.07,.078),.010,NEUTRAL_COVE,8)
    box("Acrylic pylon bottom luminous edge",(0,.055,.075),(w-.05,.016,.012),NEUTRAL_COVE,.002)
    box("Acrylic pylon narrow stainless foot",(0,.035,0),(w+.06,.07,.22),SILVER,.012)
    box("Acrylic pylon concealed grounded support",(0,-.045,0),(w*.75,.09,.13),STEEL,.009)
    leading=(h*.82-.25)/(len(lines)-1)
    size=.145 if len(lines)>5 else .16
    for i,line in enumerate(lines):
        caption_text(line,(-w*.38,h*.82-i*leading,.087),size,max_width=w*.76)
    caption_text("—",(-w*.38,.11,.088),.13,max_width=w*.76)
    group("Technical clear pylon placement",before,p,yaw)


def fern(x,z,seed,size=1):
    rng=random.Random(seed)
    lathe("Fern satin black planter",x,z,[(.28*size,.03),(.34*size,.10),(.33*size,.59*size),(.28*size,.62*size)],STEEL,24)
    verts,faces=[],[]
    leaf_mats=[]
    for i in range(34):
        a=i*2.399
        reach=rng.uniform(.52,.88)*size
        tip=Vector((x+math.cos(a)*reach,.72*size+rng.uniform(.2,.7)*size,z+math.sin(a)*reach))
        base=Vector((x,.48*size,z))
        points=[]
        for j in range(15):
            t=j/14
            c=base.lerp(tip,t)+Vector((0,math.sin(t*math.pi)*.32*size,0))
            points.append((c,.005*size))
            for side in (-1,1):
                direction=Vector((math.cos(a+side*1.05),.1,math.sin(a+side*1.05)))
                length=(.045+.21*math.sin(t*math.pi))*size*rng.uniform(.88,1.12)
                transverse=Vector((-math.sin(a),.25+rng.random()*.45,math.cos(a)))*.032*size
                idx=len(verts)
                verts.extend([c,c+direction*length*.5+transverse,c+direction*length,
                    c+direction*length*.5-transverse,c+direction*length*.54+Vector((0,.018*size,0))])
                faces.extend([(idx,idx+1,idx+4),(idx+1,idx+2,idx+4),(idx+2,idx+3,idx+4),(idx+3,idx,idx+4)])
                leaf_mats.extend([rng.randrange(3)]*4)
        sweep("Fern slender curved frond",points,LEAVES[1],5)
    ob=patch_mesh("Fern full curved layered green pinnae",verts,faces,LEAVES[0])
    for mat in LEAVES[1:]:ob.data.materials.append(mat)
    for polygon,index in zip(ob.data.polygons,leaf_mats):polygon.material_index=index
    return ob


def station_crew(x,z,bay_id,scale,turn,female,coat,tone,pose=0,appearance=None):
    factor=STATION_FACTORS[bay_id]
    p=HERO_XZ+(Vector((x,z))-HERO_XZ)*factor
    human(p.x,p.y,scale,turn,female,coat,tone,pose,root_y=.09,appearance=appearance)


# Shared connected platform, black bays, reflective architectural canopy.
box("Technical connected mineral plinth",(0,.045,2.20),(24.6,.09,12.90),FLOOR,.02)
box("Technical continuous front warm floor reveal",(0,.065,8.655),(24.4,.024,.025),WHITE_COVE,.004)
box("Technical rear solid black structural wall",(0,3.05,-4.10),(24.5,6.1,.25),PANEL,.018)
for x in (-12.1,-4.65,2.15,9.45,12.35):
    box("Technical slender satin steel bay column",(x,3.05,-4.35),(.15,6.1,.22),STEEL,.012)

BAYS=[{"id":"av","center":-7.442564,"z":-2.6,"screenY":2.998184,"screenH":3.789398,"width":6.276266,"yaw":.2,"title":"AV ENGINEERING",
       "subtitle":"DESIGN  |  INTEGRATE  |  DELIVER","main":"av-drafting","hint":"tech-engineering","workstation":"tech-workstation-av"},
      {"id":"show","center":-.360039,"z":-3.8,"screenY":2.783571,"screenH":3.312057,"width":7.252591,"yaw":0,"title":"SHOW CONTROL",
       "subtitle":"CUES  |  TIMELINES  |  AUTOMATION","main":"show-cues","hint":"tech-show-control","workstation":"tech-workstation-cues"},
      {"id":"live","center":6.868688,"z":-2.6,"screenY":2.846261,"screenH":3.272276,"width":6.566310,"yaw":-.2,"title":"LIVE PRODUCTION",
       "subtitle":"CAPTURE  |  SWITCH  |  STREAM  |  DELIVER","main":"live-multiview","hint":"tech-live-production","workstation":"tech-workstation-production"}]
for bay in BAYS:
    before=set(bpy.context.scene.objects)
    first=len(SCREENS)
    w=bay["width"]
    box(bay["id"]+" angled back panel",(0,3.05,-.16),(w+.24,6.10,.18),PANEL,.012)
    box("Bay black inset header",(0,5.51,.075),(w+.22,1.02,.12),STEEL,.012)
    text(bay["title"],(-w/2+.30,5.58,.15),.69,semibold=True)
    subtitle_lines=("CAPTURE | SWITCH","STREAM | DELIVER") if bay["id"]=="live" else (bay["subtitle"].replace("  |  "," | "),)
    for i,line_body in enumerate(subtitle_lines):
        caption_text(line_body,(-w/2+.30,5.22-i*.40,.155),.42,max_width=w-.60)
    aperture(bay["main"],(0,bay["screenY"],0),w,bay["screenH"],bay["hint"],frame=.040)
    station_before=set(bpy.context.scene.objects)
    box("Bay front brushed workbench",(0,WORKTOP-.1175,2.0),(w,.16,1.04),SILVER,.018)
    box("Bay black floating worktop",(0,WORKTOP-.0225,2.0),(w+.03,.045,1.08),EQUIPMENT,.012)
    underheight=WORKTOP-.2575
    box("Bay recessed dark undercounter",(0,.15+underheight/2,1.79),(w-.17,underheight,.69),STEEL,.016)
    box("Bay warm concealed foot light",(0,.15,2.15),(w-.13,.024,.016),WHITE_COVE,.003)
    for side in (-1,1):box("Bay stainless vertical desk cheek",(side*(w/2-.06),(WORKTOP+.12)/2,2.0),(.10,WORKTOP-.12,.98),SILVER,.018)
    for j,xx in enumerate((-2.35,-.85,.73,2.22)):
        monitor(bay["id"]+"-monitor-"+str(j),xx,1.33,1.96,1.20 if j==1 else 1.04,.50,
            bay["workstation"])
        keyboard(xx,WORKTOP+.0325,2.40,.77)
    laptop(bay["id"]+"-laptop",w/2-.50,WORKTOP+.0225,2.43)
    SCREENS[-1]["mediaHint"]="tech-workstation-audio" if bay["id"]=="live" else bay["workstation"]
    console(-.1,WORKTOP+.0225,2.08)
    rack(-w/2+.44,1.80)
    operator_chair(-1.70,3.25)
    operator_chair(1.75,3.25,-.08)
    station_root=group(bay["id"]+" lower station assembly",station_before)
    group(bay["id"]+" complete faceted working bay",before,(bay["center"],0,bay["z"]),bay["yaw"])
    bpy.context.view_layer.update()
    station_factor=STATION_FACTORS[bay["id"]]
    ray_fit=Matrix.Translation(Vector(xyz((HERO_XZ.x,0,HERO_XZ.y)))) @ Matrix.Diagonal((station_factor,station_factor,1,1)) @ Matrix.Translation(-Vector(xyz((HERO_XZ.x,0,HERO_XZ.y))))
    station_root.matrix_world=ray_fit @ station_root.matrix_world
    bay["stationXZScale"]=station_factor
    bay["worktopY"]=WORKTOP
    bay["monitorCenterY"],bay["monitorHeight"]=1.33,.50
    co,si=math.cos(bay["yaw"]),math.sin(bay["yaw"])
    for screen in SCREENS[first:]:
        x,y,z=screen["p"]
        p=[bay["center"]+co*x+si*z,y,bay["z"]-si*x+co*z]
        if screen["id"]!=bay["main"]:
            p[0]=HERO_XZ.x+station_factor*(p[0]-HERO_XZ.x)
            p[2]=HERO_XZ.y+station_factor*(p[2]-HERO_XZ.y)
            screen["width"]*=station_factor
            screen["w"]=screen["width"]
        screen.update(p=p,position=p,x=p[0],y=p[1],z=p[2])
        screen["rotation"][1]+=bay["yaw"]

# Fitted connected V-shaped crown: black logo wing, clear outlined glass wing.
HEADER_A=Vector((-6.556566,2.757683))
HEADER_B=Vector((1.544970,-4.264409))
HEADER_C=Vector((9.667596,.020537))
header_left=HEADER_B-HEADER_A
header_black_yaw=math.atan2(-header_left.y,header_left.x)
header_black_center=(HEADER_A+HEADER_B)*.5
before=set(bpy.context.scene.objects)
box("Technical black upper brand volume",(0,7.4,-.89),(header_left.length,2.4,1.80),PANEL,.022)
brand_left=-header_left.length/2+.66
wordmark((brand_left,7.28,.035),1.35,word_scale=1.50,icon_scale=.77,gap=-.4)
# Align the caption to the emblem's visible left edge. Tracking supplies
# the wide reference lockup while its smaller letters clear the g descender.
caption=caption_text("PEOPLE · TECHNOLOGY · EXTRAORDINARY EVENTS",
    (brand_left+1.35*(.60-.54*.77),6.52,.045),.52,tracking=1.03,max_width=header_left.length-1.0)
caption_left=min(v.co.x for v in caption.data.vertices)
for vertex in caption.data.vertices:vertex.co.x-=caption_left
group("Technical fitted black crown wing",before,(header_black_center.x,0,header_black_center.y),header_black_yaw)
glass_vector=HEADER_C-HEADER_B
glass_yaw=math.atan2(-glass_vector.y,glass_vector.x)
glass_center=(HEADER_B+HEADER_C)*.5
before=set(bpy.context.scene.objects)
glass_x0,glass_x1=-glass_vector.length/2,glass_vector.length/2
glass_y0,glass_y1=6.20,8.60
glass_z0,glass_z1=-1.86,0
box("Technical upper transparent glass front",(0,7.4,glass_z1),(glass_x1-glass_x0,glass_y1-glass_y0,.040),ACRYLIC,.014)
box("Technical upper transparent glass back",(0,7.4,glass_z0),(glass_x1-glass_x0,glass_y1-glass_y0,.025),ACRYLIC,.006)
for x in (glass_x0,glass_x1):
    box("Technical upper transparent glass end",(x,7.4,(glass_z0+glass_z1)/2),(.035,glass_y1-glass_y0,glass_z1-glass_z0),ACRYLIC,.009)
    for z in (glass_z0,glass_z1):
        rod("Technical clear box structural edge",(x,glass_y0,z),(x,glass_y1,z),.025,SILVER,10)
        rod("Technical clear box warm white vertical edge",(x,glass_y0,z+.031),(x,glass_y1,z+.031),.010,WHITE_COVE,8)
for y in (glass_y0,glass_y1):
    for z in (glass_z0,glass_z1):
        rod("Technical glass box brushed horizontal frame",(glass_x0,y,z),(glass_x1,y,z),.026,SILVER,10)
        rod("Technical glass box continuous white highlight",(glass_x0,y,z+.03),(glass_x1,y,z+.03),.010,WHITE_COVE,8)
caption_text("FROM VISION",(.65,7.65,.045),.50,tracking=1.18,max_width=4.8)
caption_text("TO LIVE",(1.88,7.05,.046),.50,tracking=1.18,max_width=3.5)
caption_text("—",(3.84,6.55,.047),.30)
group("Technical fitted transparent crown wing",before,(glass_center.x,0,glass_center.y),glass_yaw)
for start,end,label in ((Vector((-12.230190,-.361307)),HEADER_A,"left"),(HEADER_C,Vector((13.946086,-3.056163)),"right")):
    d=end-start
    p=(start+end)*.5
    yaw=math.atan2(-d.y,d.x)
    before=set(bpy.context.scene.objects)
    box("Technical "+label+" outer black crown return",(0,7.4,-.15),(d.length,2.4,.30),PANEL,.018)
    if label=="right":
        for i,line in enumerate(("TECHNICAL","CREATIVE","HUMAN")):
            caption_text(line,(-d.length*.23,7.85-i*.53,.022),.44,max_width=d.length*.62)
        caption_text("—",(d.length*.20,6.42,.023),.23)
    group("Technical fitted crown side return",before,(p.x,0,p.y),yaw)
# One continuous, planar soffit follows the complete V frontage. Removing the
# independent overlapping bay sheets keeps all junctions shallow and smooth.
soffit_outline=[(-12.230190,-.361307),tuple(HEADER_A),tuple(HEADER_B),tuple(HEADER_C),
    (13.946086,-3.056163),(13.946086,-5.40),(-12.230190,-5.40)]
count=len(soffit_outline)
verts=[(x,y,z) for y in (6.14,6.20) for x,z in soffit_outline]
faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
soffit=patch_mesh("Technical continuous shallow V pearl soffit",verts,faces,CANOPY_PEARL)
bm=bmesh.new()
bm.from_mesh(soffit.data)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(soffit.data)
bm.free()
for face in soffit.data.polygons:face.use_smooth=False
for i in range(4):
    a,b=Vector(soffit_outline[i]),Vector(soffit_outline[i+1])
    d=b-a
    p=(a+b)*.5
    strip=box("Technical continuous recessed warm soffit edge",(p.x,6.125,p.y),(d.length,.017,.022),WHITE_COVE,.003)
    strip.rotation_euler[2]=math.atan2(-d.y,d.x)
aperture("end-concert",(11.775972,4.293797,-1.47),2.542797,3.098394,"tech-concert",-.17,frame=.045)
for i,line in enumerate(("EXTRAORDINARY","EVENTS","REAL RESULTS")):
    caption_text(line,(10.77,2.37-i*.46,-1.18),.36,-.17,max_width=2.50)
box("Technical end portrait black architecture",(11.83,3.05,-1.78),(3.0,6.10,.34),PANEL,.018)
leftwall_a=Vector((-12.230190,-.361307))
leftwall_b=Vector((-10.518,-1.976))
leftwall_d=leftwall_b-leftwall_a
leftwall_p=(leftwall_a+leftwall_b)*.5
before=set(bpy.context.scene.objects)
box("Technical left fullheight black return wall",(0,3.05,-.10),(leftwall_d.length,6.1,.20),PANEL,.012)
for i,line in enumerate(("BIGGER","BRIGHTER","BOLDER","TOGETHER")):
    caption_text(line,(-leftwall_d.length/2+.26,4.50-i*.48,.015),.35,max_width=leftwall_d.length-.52)
caption_text("—",(-leftwall_d.length/2+.26,2.57,.016),.20)
group("Technical fitted left side return wall",before,(leftwall_p.x,0,leftwall_p.y),math.atan2(-leftwall_d.y,leftwall_d.x))

# Long reception control counter: diagonal stainless insert, textured black face.
COUNTER={"center":[2.915522,0,10.878415],"width":4.212027,"depth":1.05,"top":1.35,"yaw":-.0448004}
before=set(bpy.context.scene.objects)
box("Technical reception control counter carcass",(0,.75,0),(4.212027,1.20,1.05),COUNTER_FACE,.035)
box("Technical reception thin stainless countertop",(0,1.3225,0),(4.272027,.055,1.11),SILVER,.014)
box("Technical reception recessed black kick",(0,.13,0),(4.08,.16,.93),STEEL,.014)
box("Technical reception hidden grounded foot",(0,.05,0),(3.85,.10,.80),STEEL,.012)
box("Technical reception continuous warm white toe",(0,.099,.540),(4.14,.025,.023),WHITE_COVE,.004)
patch_mesh("Technical reception diagonal brushed silver front panel",[(-2.10,.18,.532),(-2.10,1.295,.532),
    (-.82,1.295,.532),(-1.68,.18,.532)],[(0,1,2,3)],COUNTER_SILVER)
wordmark((-.91,.98,.548),.27,icon_scale=.70)
caption_text("EVENT TECHNOLOGY",(-.52,.73,.550),.16,max_width=2.5)
caption_text("FOR A BRIGHTER TOMORROW",(-.52,.52,.550),.16,max_width=2.5)
for xx in (-1.5,-.55,.55,1.55):
    box("Reception tablet slim aluminum stand",(xx,1.375,-.10),(.27,.035,.17),SILVER,.010)
    box("Reception tablet dark screen",(xx,1.45,-.10),(.24,.14,.015),EQUIPMENT,.009)
    drinking_glass(xx+.20,1.351,.10,mat=CLEAR_GLASS)
flowers(-1.76,1.351,-.05,.25)
group("Technical fitted foreground reception counter",before,COUNTER["center"],COUNTER["yaw"])
fern(.28,10.32,18,.85)

# Left lounge: actual loose ivory cushions, low oval table, lush plants and rug.
lounge_before=set(bpy.context.scene.objects)
disk("Technical charcoal round lounge rug",-.8,11.45,1.35,.003,.016,RUG)
technical_armchair(-1.30,10.50)
disk("Technical lounge circular black table",-.5159,11.6673,.55,.42,.46,STEEL)
rod("Technical lounge low table pedestal",(-.5159,.055,11.6673),(-.5159,.425,11.6673),.10,STEEL,16)
disk("Technical lounge table recessed base",-.5159,11.6673,.37,.003,.055,STEEL)
before=set(bpy.context.scene.objects)
fern(0,0,92,.37)
group("Technical coffee table planted arrangement",before,(-.5659,.46,11.6673))
group("Technical raised lounge complete assembly",lounge_before,(0,.09,0))
fern(-11.15,1.60,79,1.25)
fern(9.10,2.08,35,1.14)
fern(11.58,2.62,43,1.12)
acrylic_pylon((-1.158494,.09,12.355715),.799984,1.493007,
    ("IDEAS","SYSTEMS","PEOPLE","EVENTS","THAT","MOVE","THE WORLD"),-.025)
acrylic_pylon((4.349704,.09,11.437325),1.290375,1.462345,
    ("CONSULT","DESIGN","ENGINEER","DEPLOY","SUPPORT"),.025)
# Small right kiosk with a light outer shell and sober dark copy.
before=set(bpy.context.scene.objects)
box("Technical right white information kiosk",(0,.647,0),(1.022907,1.113606,.50),SILVER,.045)
box("Technical kiosk dark inset front",(0,.65,.267),(.88,.97,.030),PANEL,.020)
for side in (-1,1):box("Technical kiosk white luminous frame",(side*.47,.65,.257),(.019,1.015,.024),NEUTRAL_COVE,.005)
for i,line in enumerate(("SAME","STAGE","A BRIGHTER","TOMORROW")):
    caption_text(line,(-.40,1.00-i*.21,.285),.16,max_width=.80)
caption_text("—",(-.40,.17,.285),.13,max_width=.80)
box("Technical kiosk floor reveal",(0,.099,.265),(.96,.023,.021),WHITE_COVE,.004)
group("Technical fitted right information kiosk",before,(7.21754,0,9.470769))

# Plausible guests/operators: faces and natural anatomy are authored, not cards.
human(-4.074591,8,(2.317403-.09)/1.793,145,False,NAVY,1,1,root_y=.09,appearance="black-backpack")
human(-3.127856,8.3,(2.029945-.09)/1.793,78,True,CHARCOAL,2,0,root_y=.09)
station_crew(-3.853089,.2,"av",(1.881247-.09)/1.793,-180,False,NAVY,2)
station_crew(-1.347974,.2,"show",(1.856054-.09)/1.793,-180,False,CHARCOAL,1)
station_crew(.435264,.2,"show",(1.859916-.09)/1.793,-180,False,NAVY,0)
station_crew(4.676242,.5,"live",(2.031506-.09)/1.793,-178,False,NAVY,1)
station_crew(7.501689,.2,"live",(1.875223-.09)/1.793,-65,True,CHARCOAL,2,1)
station_crew(8.49,1.17,"live",1.04,85,False,NAVY,1)
station_crew(8.199316,1.17,"live",.95934,-90,True,CHARCOAL,1,1,appearance="white-blouse")

# Dark truss ceiling and restrained practical fixture housings.
for x in (-12,-7,-2,3,8,13):
    box("Technical rich black acoustic ceiling panel",(x,12.22,.5),(4.95,.13,17),ROOF,0)
truss_before=set(bpy.context.scene.objects)
for z in (-6,-1,4,8):truss((-14,11.78,z),(14,11.78,z),.23)
for x in (-12,-5,2,9):truss((x,11.72,-7),(x,11.72,8.5),.23)
for ob in set(bpy.context.scene.objects)-truss_before:
    if ob.type=="MESH":ob.data.materials[0]=OVERHEAD_STEEL
for x in range(-12,13,3):
    rod("Technical ceiling spotlight body",(x,11.64,3),(x,11.39,3.04),.080,OVERHEAD_STEEL,14)
    rod("Technical ceiling warm spotlight optic",(x,11.38,3.04),(x,11.374,3.042),.062,LENS,14)

# Bake parenting and material-batch every real part for predictable draw calls.
bpy.context.view_layer.update()
for ob in list(bpy.context.scene.objects):
    if ob.type=="MESH":
        matrix=ob.matrix_world.copy()
        ob.parent=None
        ob.matrix_world=matrix
for ob in list(bpy.context.scene.objects):
    if ob.type=="EMPTY":bpy.data.objects.remove(ob,do_unlink=True)
groups={}
for ob in bpy.context.scene.objects:
    if ob.type=="MESH":groups.setdefault(ob.data.materials[0].name,[]).append(ob)
for name,objects in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    ob=bpy.context.view_layer.objects.active
    ob.name=name
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
OUT.parent.mkdir(parents=True,exist_ok=True)
ao_helper=Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_helper.read_text(encoding="utf-8"),str(ao_helper),"exec"))
AO_STATS=bake_technical_ao(list(bpy.context.scene.objects))
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",export_yup=True,
    export_apply=True,export_materials="EXPORT",export_cameras=False,export_lights=False,export_animations=False,
    export_vertex_color="NAME",export_vertex_color_name="Col",export_all_vertex_colors=False)
meshes=[ob for ob in bpy.context.scene.objects if ob.type=="MESH"]
points=[ob.matrix_world@Vector(c) for ob in meshes for c in ob.bound_box]
lo=[min(p[i] for p in points) for i in range(3)]
hi=[max(p[i] for p in points) for i in range(3)]
layout={"version":1,"root":ROOT_ANCHOR,"worldAnchor":ROOT_ANCHOR,"rootRotation":[0,ROOT_YAW,0],
    "bounds":{"xMin":lo[0],"xMax":hi[0],"zMin":-hi[1],"zMax":-lo[1],"top":hi[2]},
    "floorTop":.09,"bays":BAYS,"frontCounter":COUNTER,"screens":SCREENS,"apertures":SCREENS,
    "humans":HUMAN_PLACEMENTS,"humanLicense":"technical-humans-LICENSE.txt","typography":TYPOGRAPHY,"ambientOcclusion":AO_STATS,
    "cameraSuggestion":{"position":[3.224784,2.2,18],"look":[.931724,1.946367,-1.866493],"verticalFov":42.54917}}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding="utf-8")
meshes=[ob for ob in bpy.context.scene.objects if ob.type=="MESH"]
points=[ob.matrix_world@Vector(c) for ob in meshes for c in ob.bound_box]
lo=[min(p[i] for p in points) for i in range(3)]
hi=[max(p[i] for p in points) for i in range(3)]
print("TECHNICAL_SHOWCASE "+json.dumps({"bytes":OUT.stat().st_size,"meshes":len(meshes),
    "vertices":sum(len(ob.data.vertices) for ob in meshes),
    "triangles":sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in meshes),
    "threeBounds":{"min":[lo[0],lo[2],-hi[1]],"max":[hi[0],hi[2],-lo[1]]},
    "screens":len(SCREENS),"layout":str(LAYOUT_OUT)}),flush=True)
