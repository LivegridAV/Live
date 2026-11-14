"""Three-bay rectilinear LED rental pavilion, matching the TOP reference photo.

Blender 5.2 --background --factory-startup --python this-file.py
Authoring is Three XYZ / front+Z. Runtime mounts at scale 1. Lower moodboard
panels are detail references only; no oval-booth geometry or photo plates.
"""
from pathlib import Path

HELPERS=Path(__file__).with_name("projection_base_helpers.py")
source=HELPERS.read_text(encoding="utf-8").split("# A bowed continuous platform")[0]
exec(compile(source,str(HELPERS),"exec"))
OUT=ROOT/"public/models/expo/led-rental-pavilion-v2.glb"
DNA_OUT=ROOT/"public/models/expo/led-rental-dna-v2.glb"
LAYOUT_OUT=ROOT/"public/models/expo/led-rental-pavilion-v2-layout.json"
SCREENS=[]
DNA_SCREENS=[]
ROOT_POSITION=[-10.2,0,-171]
ROOT_ROTATION=[0,math.pi/2,0]
HERO={"position":[0,3.65,26.5],"look":[0,4.15,0],"verticalFov":38}
FLOOR_TOP=.22
BAYS={"left":[-14,-4.0],"center":[-4.0,4.6],"right":[4.6,14]}
FASCIA={"bottom":7.80,"top":9.40,"centerTop":9.65,"frontZ":2.4,"centerZ":-1.0}
DNA_POSITION=[-5.8886,1.9225,1.80]
DNA_ROTATION=[0,.22,0]
DNA_HEIGHT=1.8398
HEIGHT_FIT=.87
CUBE_EDGE=1.3847
CURVED_CHORD=2.2259
CURVED_ARC=math.radians(150)
CURVED_RADIUS=CURVED_CHORD/(2*math.sin(CURVED_ARC/2))
CURVED_ROTATION=[-.20,.10,0]
PRODUCT_ASSEMBLIES=[]
RNG=random.Random(20261019)

BLACK=material("LED Rental V2 | matte black architectural aluminium",(.005,.007,.009),.10,.73)
WALL=material("LED Rental V2 | satin graphite wall panels",(.008,.010,.013),.12,.64)
BRUSHED=material("LED Rental V2 | brushed dark aluminium cabinet",(.024,.031,.036),.76,.31)
BACK=material("LED Rental V2 | black LED module housing",(.006,.009,.012),.18,.65)
COUNTER=material("LED Rental V2 | satin black reception face",(.006,.010,.012),.30,.42)
CHAMPAGNE=material("LED Rental V2 | brushed champagne metal returns",(.34,.29,.215),.82,.29)
SILVER=material("LED Rental V2 | fine satin stainless trim",(.36,.39,.41),.80,.30)
WOOD=material("LED Rental V2 | warm walnut timber slats",(.16,.075,.029),0,.64)
WOOD_LIGHT=material("LED Rental V2 | walnut lighter grain slat",(.21,.10,.041),0,.65)
FLOOR=material("LED Rental V2 | glossy charcoal honed pathway stone",(.083,.085,.080),.06,.36)
BRAND=material("LED Rental V2 | clean ivory brand lettering",(.84,.89,.91),0,.46,.08)
TEAL_BRAND=material("LED Rental V2 | livegrid teal folded emblem",(.012,.69,.56),.13,.38,.48)
TEAL=material("LED Rental V2 | concealed thin teal LED reveal",(.012,.70,.57),0,.36,1.80)
WHITE=material("LED Rental V2 | warm pearl concealed LED",(.88,.84,.73),0,.40,1.45)
CABLE=material("LED Rental V2 | dark fine suspension wire",(.028,.035,.038),.65,.43)
IVORY=material("LED Rental V2 | ivory woven sofa upholstery",(.48,.45,.395),0,.88)
PIPING=material("LED Rental V2 | sofa fine warmgrey piping",(.28,.26,.22),0,.85)
ROOF=material("LED Rental V2 | matte pearl black canopy soffit",(.006,.008,.010),.08,.78)
TRUSS=material("LED Rental V2 | production roof truss steel",(.095,.104,.115),.72,.46,.012)
TOP=material("LED Rental V2 | honed black stone counter and coffee top",(.027,.033,.034),.08,.34)
POT=material("LED Rental V2 | brushed graphite planter",(.029,.034,.032),.52,.37)
LEAF=material("LED Rental V2 | rich green foliage",(.037,.087,.023),0,.90)
LEAVES=[LEAF,material("LED Rental V2 | green leaf light variation",(.090,.151,.038),0,.87),
    material("LED Rental V2 | green leaf shadow variation",(.017,.048,.012),0,.95)]
TIMBER=material("LED Rental V2 | natural plant stem",(.065,.044,.026),0,.88)


def glyph(body,p,height,yaw=0,centered=False,mat=BRAND,max_width=None,semibold=False,tracking=1):
    """Size by actual glyph bounds, so the intended cap height survives glTF."""
    ob=text(body,p,1,yaw,mat=mat,centered=centered,semibold=semibold,tracking=tracking)
    bounds=[v.co for v in ob.data.vertices]
    lo=min(v.y for v in bounds)
    hi=max(v.y for v in bounds)
    factor=height/(hi-lo)
    for vertex in ob.data.vertices:vertex.co*=factor
    width=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
    if max_width and width>max_width:
        for vertex in ob.data.vertices:vertex.co.x*=max_width/width
    return ob


def teal_icon(p,height,yaw=0):
    global BRAND
    previous=BRAND
    BRAND=TEAL_BRAND
    triangle_emblem(p,height,yaw)
    BRAND=previous


def logo(p,height,yaw=0,max_width=None):
    before=set(bpy.context.scene.objects)
    teal_icon((0,-.045,0),height*1.30)
    glyph("livegrid AV",(height*1.32,0,.022),height,semibold=True,max_width=max_width)
    return group("LED Rental V2 | teal triangle and white livegrid AV",before,p,yaw)


def line(a,b,r=.018,mat=TEAL,name="LED Rental V2 | precise concealed edge light"):
    return rod(name,a,b,r,mat,8)


def chamfered_rectangle(w,d,c):
    return [(-w/2+c,-d/2),(w/2-c,-d/2),(w/2,-d/2+c),(w/2,d/2-c),
        (w/2-c,d/2),(-w/2+c,d/2),(-w/2,d/2-c),(-w/2,-d/2+c)]


def label(body,p,width=2.5):
    return glyph(body,p,.20,centered=True,max_width=width,semibold=True)


def preserve_product(before,center):
    PRODUCT_ASSEMBLIES.append({"objects":set(bpy.context.scene.objects)-before,"center":list(center)})


def pedestal(x,z,w,d,top,label_text):
    box("LED Rental V2 | individual satin black product pedestal",(x,(1.0+top)/2,z),(w,top-1.0,d),COUNTER,.016)
    box("LED Rental V2 | thin product pedestal top",(x,top+.015,z),(w+.03,.03,d+.03),TOP,.008)
    label(label_text,(x,1.26,z+d/2+.019),w-.05)


def palm(name,x,z,height=3.4,radius=.65,seed=0):
    """Branched dracaena stems and dense, outward arching leaf rosettes."""
    rng=random.Random(seed)
    potheight=height*.24
    lathe(name+" | satin graphite planter",x,z,[(radius*.39,FLOOR_TOP),(radius*.54,FLOOR_TOP+.06),
        (radius*.55,FLOOR_TOP+potheight),(radius*.50,FLOOR_TOP+potheight+.035)],POT,28)
    disk(name+" | dark planted soil",x,z,radius*.48,FLOOR_TOP+potheight-.02,FLOOR_TOP+potheight+.012,BLACK)
    verts,faces,indices=[],[],[]
    clusters=5 if height>1 else 2
    for cluster in range(clusters):
        a0=cluster*2.39996+seed*.12
        head=Vector((x+math.cos(a0)*radius*.28,
            FLOOR_TOP+potheight+(height-potheight)*(.44+.39*cluster/max(1,clusters-1)),
            z+math.sin(a0)*radius*.28))
        root=Vector((x,FLOOR_TOP+potheight-.025,z))
        stem=[(root,.021 if height>1 else .009),
            (root.lerp(head,.62)+Vector((math.cos(a0)*radius*.09,0,math.sin(a0)*radius*.09)),.015 if height>1 else .006),
            (head,.010 if height>1 else .004)]
        sweep(name+" | naturally branched slender plant stem",stem,TIMBER,8)
        count=13 if height>1 else 9
        for i in range(count):
            a=i*2.39996+a0
            reach=radius*rng.uniform(.95,1.62)
            arch=height*rng.uniform(.105,.18)
            drop=-height*rng.uniform(.04,.15)
            pts=[]
            for j in range(9):
                t=j/8
                along=math.sin(t*math.pi/2)*reach
                center=head+Vector((math.cos(a)*along,math.sin(t*math.pi)*arch+drop*t,
                    math.sin(a)*along))
                side=Vector((-math.sin(a),.04,math.cos(a)))
                half=(math.sin(math.pi*t)**.72)*radius*.155*rng.uniform(.90,1.10)
                idx=len(verts)
                verts.extend([center-side*half,center+Vector((0,.018,0)),center+side*half])
                if j:
                    old=idx-3
                    faces.extend([(old,idx,idx+1,old+1),(old+1,idx+1,idx+2,old+2)])
                    indices.extend([(i+cluster)%3]*2)
                pts.append((center,.004 if height>1 else .0025))
            sweep(name+" | fine green leaf midrib",pts,LEAVES[2],5)
    ob=patch_mesh(name+" | lush layered green leaves",verts,faces,LEAF)
    for material in LEAVES[1:]:ob.data.materials.append(material)
    for face,index in zip(ob.data.polygons,indices):face.material_index=index


def sofa_v2(x,z,width=2.8,yaw=0):
    before=set(bpy.context.scene.objects)
    soft_box("LED Rental V2 | sofa upholstered lower frame",(0,.52,0),(width,.36,1.35),IVORY,.10)
    soft_box("LED Rental V2 | sofa soft continuous back",(0,1.155,-.52),(width-.12,1.63,.28),IVORY,.10)
    for side in (-1,1):
        soft_box("LED Rental V2 | sofa generous padded arm",(side*(width/2-.14),1.00,.02),(.28,1.26,1.39),IVORY,.105)
        soft_box("LED Rental V2 | sofa deep loose seat cushion",(side*(width-.55)/4,.87,.08),((width-.60)/2,.29,1.03),IVORY,.09)
        pillow=soft_box("LED Rental V2 | sofa loose back cushion",(side*(width-.55)/4,1.43,-.29),((width-.58)/2,.80,.28),IVORY,.09)
        pillow.rotation_euler[0]=-.12
        for zz in (-.46,.46):
            rod("LED Rental V2 | sofa fine dark foot",(side*(width/2-.30),.015,zz),(side*(width/2-.30),.40,zz),.025,BRUSHED,10)
    root=group("LED Rental V2 | real ivory two cushion sofa",before,(x,FLOOR_TOP,z),yaw)
    root.scale=(1,1,.85)
    return root


def bar_stool(x,z,yaw=0):
    before=set(bpy.context.scene.objects)
    soft_box("LED Rental V2 | cafe chair pale seat",(0,.75,0),(.79,.14,.69),IVORY,.07)
    back=soft_box("LED Rental V2 | cafe chair curved low back",(0,1.15,-.28),(.79,.60,.105),IVORY,.052)
    back.rotation_euler[0]=-.10
    for side in (-1,1):
        for zz in (-.24,.24):
            rod("LED Rental V2 | cafe chair slender black leg",(side*.36,.02,zz*1.18),(side*.29,.72,zz),.022,BLACK,8)
        rod("LED Rental V2 | cafe chair slim stretchers",(side*.31,.31,-.24),(side*.31,.31,.24),.019,BRUSHED,8)
    return group("LED Rental V2 | slim ivory cafe chair",before,(x,FLOOR_TOP,z),yaw)


