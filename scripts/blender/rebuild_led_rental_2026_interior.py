"""LED Rental 2026: bespoke furnished interior, living planting and visitors.

Native Three XYZ, front +Z, metres. Architecture and active display faces live
in separate assets. This generator creates actual meshes, never image plates.
Rocketbox photographic human textures/normal maps are MIT licensed Microsoft
assets, reused from the retained, validated projection visitors export.
"""
from pathlib import Path
import bpy, math, random, json, hashlib, sys, bmesh
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
helper=HERE/'projection_architecture_helpers.py'
exec(compile(helper.read_text(encoding='utf-8'),str(helper),'exec'))
QA=ROOT/'qa/led-rental-2026';QA.mkdir(parents=True,exist_ok=True)
MODEL=ROOT/'public/models/expo/led-rental-2026-interior.glb'
PEOPLE=ROOT/'public/models/expo/led-rental-2026-visitors.glb'
FLOOR_Y=.12
PREFIX='LED Rental 2026 | '
ITEMS=[];PLANTS=[];LEAVES=0;BATCH={}

def mat(name,color,metal=0,rough=.5,emission=0):
    return material(PREFIX+name,color,metal,rough,emission)

BLACK26=mat('deep satin black powdercoat',(.008,.012,.016),.46,.34)
FRAME26=mat('charcoal slender seating frame',(.012,.017,.021),.54,.32)
SILVER26=mat('brushed stainless reception metal returns',(.20,.235,.25),.91,.36)
WARM26=mat('concealed warm pearl white perimeter light',(.95,.75,.46),.05,.28,2.25)
TEAL26=mat('fine livegrid teal perimeter reveal',(.007,.73,.56),.05,.26,1.90)
LOGO26=mat('illuminated livegrid teal folded emblem',(.005,.82,.61),.12,.28,1.15)
WHITE26=mat('clean porcelain white brand letters',(.88,.93,.96),.02,.45,.20)
CREAM26=mat('warm ivory finely woven upholstery',(.46,.44,.395),0,.86)
SEAM26=mat('tailored woven upholstery fine welts',(.34,.33,.29),0,.92)
TOP26=mat('honed pale silver stone worktop',(.39,.41,.41),.04,.30)
COFFEE26=mat('dark basalt coffee table tops',(.018,.025,.029),.18,.30)
POT26=mat('black satin ceramic planter',(.008,.013,.014),.18,.31)
SOIL26=mat('natural dark granular potting soil',(.023,.016,.010),0,.96)
STEM26=mat('natural woody olive stems',(.10,.075,.039),0,.88)
LEAF26=mat('varied textured living foliage',(.42,.58,.23),0,.62)
LEAF26.use_backface_culling=False
PETAL26=mat('natural soft ivory blossom petals',(.76,.73,.64),0,.61)
SCREEN26=mat('dark active laptop display glass',(.008,.037,.068),.1,.21,.35)
KEY26=mat('laptop satin silver aluminium',(.24,.29,.32),.82,.29)
WATER26=mat('clear smoked water glass',(.55,.70,.74),0,.15)
wb=WATER26.node_tree.nodes.get('Principled BSDF');wb.inputs['Alpha'].default_value=.29
WATER26.diffuse_color=(.55,.70,.74,.29);WATER26.surface_render_method='DITHERED'

# The retained original botanical atlas supplies coherent leaf veins and
# organic tonal variation. Every leaf remains a curved mesh with real normals.
leaf_dir=ROOT/'public/media/projection-mapping-v11/botanical'
nodes=LEAF26.node_tree.nodes;links=LEAF26.node_tree.links;bs=nodes.get('Principled BSDF')
for file,socket,normal in [('leaf-atlas-basecolor.png','Base Color',False),('leaf-atlas-normal.png','Normal',True)]:
    image=bpy.data.images.load(str(leaf_dir/file),check_existing=True);image.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    if normal:
        image.colorspace_settings.name='Non-Color';nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.27
        links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:links.new(tex.outputs['Color'],bs.inputs[socket])
TROPICAL_LEAF26=LEAF26.copy();TROPICAL_LEAF26.name=PREFIX+'broad tropical waxy living foliage'
TROPICAL_LEAF26.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.43
TROPICAL_STEM26=mat('living tropical green curved petioles',(.035,.095,.024),0,.76)
wool=ROOT/'public/media/technical-showcase/materials/wool-normal.webp'
if wool.exists():
    n=CREAM26.node_tree.nodes;t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(wool),check_existing=True);t.image.colorspace_settings.name='Non-Color';t.image.pack()
    nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.17
    CREAM26.node_tree.links.new(t.outputs['Color'],nm.inputs['Color']);CREAM26.node_tree.links.new(nm.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])

def mesh26(name,vertices,faces,finish,uv=None):
    mesh=bpy.data.meshes.new(PREFIX+name);mesh.from_pydata([xyz(v) for v in vertices],[],faces);mesh.update()
    if uv:
        layer=mesh.uv_layers.new(name='UVMap')
        for face in mesh.polygons:
            for loop in face.loop_indices:layer.data[loop].uv=uv[mesh.loops[loop].vertex_index]
    ob=bpy.data.objects.new(PREFIX+name,mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(finish)
    return ob

def add_leaf(vertices,faces,uv,broad=False):
    global LEAVES
    g=BATCH.setdefault('broad-leaves' if broad else 'leaves',{'v':[],'f':[],'uv':[]});offset=len(g['v'])
    g['v'].extend(vertices);g['f'].extend(tuple(offset+i for i in f) for f in faces);g['uv'].extend(uv);LEAVES+=1

def tube26(name,path,radii,finish,sides=7):
    path=[Vector(p) for p in path];vertices=[];faces=[]
    for j,p in enumerate(path):
        axis=(path[min(j+1,len(path)-1)]-path[max(j-1,0)]).normalized()
        helper=Vector((0,1,0)) if abs(axis.y)<.85 else Vector((1,0,0));across=axis.cross(helper).normalized();up=axis.cross(across).normalized()
        radius=radii[j] if hasattr(radii,'__len__') else radii
        for k in range(sides):a=k*math.tau/sides;vertices.append(p+radius*(across*math.cos(a)+up*math.sin(a)))
        if j:
            for k in range(sides):a=(j-1)*sides+k;b=j*sides+k;faces.append((a,(j-1)*sides+(k+1)%sides,j*sides+(k+1)%sides,b))
    faces.extend((tuple(range(sides-1,-1,-1)),tuple((len(path)-1)*sides+k for k in range(sides))))
    ob=mesh26(name,vertices,faces,finish)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def lathe26(name,x,z,profile,finish,sides=40):
    vertices=[];faces=[]
    for j,(r,y) in enumerate(profile):
        for k in range(sides):a=k*math.tau/sides;vertices.append((x+r*math.cos(a),y,z+r*math.sin(a)))
        if j:
            for k in range(sides):a=(j-1)*sides+k;b=j*sides+k;faces.append((a,(j-1)*sides+(k+1)%sides,j*sides+(k+1)%sides,b))
    ob=mesh26(name,vertices,faces,finish)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def label26(body,p,height,width=None,finish=WHITE26,center=True,tracking=1.08):
    data=bpy.data.curves.new(PREFIX+'precise signage '+body,'FONT');data.body=body;data.font=SEMIBOLD
    data.size=1;data.space_character=tracking;data.align_x='CENTER' if center else 'LEFT';data.extrude=.0013;data.bevel_depth=.00035;data.bevel_resolution=1;data.resolution_u=10
    ob=bpy.data.objects.new(PREFIX+'lettering '+body,data);bpy.context.collection.objects.link(ob)
    ob.rotation_euler=(math.pi/2,0,0);ob.location=xyz(p);ob.data.materials.append(finish)
    bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=ob;ob.select_set(True)
    bpy.ops.object.convert(target='MESH');ob=bpy.context.object;ob.select_set(False)
    # Font dimensions are evaluated in the object's local axes. Measure actual
    # converted glyph Y, rather than its tiny local extrusion Z thickness.
    span_y=max(v.co.y for v in ob.data.vertices)-min(v.co.y for v in ob.data.vertices)
    span_x=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
    factor=height/span_y;ob.scale=(min(factor,width/span_x) if width else factor,factor,factor)
    return ob

def emblem26(x,y,z,h):
    polygons=[[(0,0),(0,1),(.18,.88),(.18,.30)],[(.18,.88),(.72,.49),(.72,.31),(.35,.52)],[(0,0),(.72,.31),(.72,.49),(.18,.25)]]
    for poly in polygons:
        n=len(poly);v=[(x+px*h,y+py*h,z+dz) for dz in(-.01,.01) for px,py in poly]
        f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        mesh26('folded triangular livegrid mark',v,f,LOGO26)

def bounds26(objects):
    bpy.context.view_layer.update();points=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
    return {'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}

def pose26(objects,p,yaw):
    # Native Y yaw is positive Blender Z in the Three -> Blender coordinate basis.
    matrix=Matrix.Translation(Vector(xyz(p)))@Matrix.Rotation(yaw,4,'Z')
    bpy.context.view_layer.update()
    for ob in objects:ob.matrix_world=matrix@ob.matrix_world

def chair26(name,x,z,yaw=0,width=1.0,base=FLOOR_Y):
    before=set(bpy.context.scene.objects)
    soft_box(PREFIX+name+' black recessed base',(0,.27,0),(width-.15,.18,.78),FRAME26,.06)
    soft_box(PREFIX+name+' real padded seat',(0,.43,0),(width-.16,.108,.73),CREAM26,.045)
    soft_box(PREFIX+name+' upholstered back',(0,.73,-.37),(width,.66,.19),CREAM26,.09)
    for side in(-1,1):
        soft_box(PREFIX+name+' upholstered arm',(side*(width/2-.075),.60,0),(.15,.40,.80),CREAM26,.065)
        for zz in(-.31,.31):rod(PREFIX+name+' slender black leg',(side*(width/2-.13),0,zz),(side*(width/2-.17),.32,zz),.015,FRAME26,10)
    # Fine physical welts remain visible in close views.
    for side in(-1,1):tube26(name+' seam',[(side*(width/2-.014),.68,-.30),(side*(width/2-.014),.68,.34)],.002,SEAM26,5)
    pose26(set(bpy.context.scene.objects)-before,(x,base,z),yaw)
    ITEMS.append({'id':name,'kind':'ivory upholstered lounge chair','position':[x,base,z],'yaw':yaw,'seatTopY':base+.484,'bounds':bounds26(set(bpy.context.scene.objects)-before)})

def sofa26(name,x,z,yaw=0,width=2.75):
    before=set(bpy.context.scene.objects)
    soft_box(PREFIX+name+' recessed charcoal frame',(0,.25,0),(width-.12,.22,.82),FRAME26,.055)
    for i in(-1,0,1):soft_box(PREFIX+name+' separate tailored seat',(i*(width-.34)/3,.43,.01),((width-.40)/3,.108,.76),CREAM26,.04)
    for i in(-1,1):
        soft_box(PREFIX+name+' separate padded back',(i*(width-.35)/4,.77,-.37),((width-.40)/2,.64,.21),CREAM26,.09)
        soft_box(PREFIX+name+' soft rectangular arm',(i*(width/2-.085),.60,.015),(.17,.40,.85),CREAM26,.07)
        for zz in(-.32,.32):rod(PREFIX+name+' black feet',(i*(width/2-.19),0,zz),(i*(width/2-.22),.29,zz),.018,FRAME26,10)
    pose26(set(bpy.context.scene.objects)-before,(x,FLOOR_Y,z),yaw)
    ITEMS.append({'id':name,'kind':'three seat ivory lounge sofa','position':[x,FLOOR_Y,z],'yaw':yaw,'seatTopY':.604,'bounds':bounds26(set(bpy.context.scene.objects)-before)})

def coffee26(name,x,z,r=.63,base=FLOOR_Y):
    shift=base-FLOOR_Y
    lathe26(name+' basalt circular tabletop',x,z,[(r0,y+shift) for r0,y in [(0,.61),(r,.61),(r+.018,.625),(r,.65),(0,.65)]],COFFEE26,56)
    lathe26(name+' round satin pedestal',x,z,[(r0,y+shift) for r0,y in [(0,.12),(r*.65,.12),(r*.65,.155),(r*.56,.18),(r*.42,.60)]],FRAME26,40)
    ITEMS.append({'id':name,'kind':'low black basalt circular coffee table','position':[x,base,z],'radius':r,'topY':.65+shift})

def leaf26(base,direction,length,width,rng,top,tile=None,broad=False):
    base=Vector(base);axis=Vector(direction).normalized();normal=Vector((rng.uniform(-.5,.5),rng.uniform(.3,.9),rng.uniform(-.5,.5)))
    normal-=axis*axis.dot(normal)
    if normal.length<.1:normal=Vector((0,0,1))-axis*axis.z
    normal.normalize();side=axis.cross(normal).normalized()
    # Living olive/deep green specimens dominate; occasional young light tips
    # remain. The earlier equal atlas weighting overused yellow-green tiles.
    tile=rng.choice((0,0,1,1,2,4,4,5,6,6,6,7)) if tile is None else tile
    vertices=[];uv=[];faces=[];segments=10 if broad else 5;curl=rng.uniform(.12,.24) if broad else rng.uniform(.10,.30)
    for j in range(segments+1):
        t=j/segments;mid=base+axis*(length*t)+normal*length*(.14*math.sin(math.pi*t)-curl*t*t)
        across=Matrix.Rotation(rng.uniform(-.25,.25)*t,3,axis)@side;half=width*.5*math.sin(math.pi*t)**(.56 if broad else .72)
        for sign in(-1,0,1):vertices.append(mid+across*(sign*half)-normal*abs(sign)*half*.18);uv.append(((tile+(sign+1)*.5)/8,.02+.96*t))
        if j:
            for col in range(2):a=(j-1)*3+col;b=j*3+col;faces.append((a,a+1,b+1,b))
    if any(v.y>top or abs(v.x)>10.75 for v in vertices):return
    add_leaf(vertices,faces,uv,broad)

def plant26(name,x,z,total=1.2,pot_h=.40,r=.22,kind='bush',base=FLOOR_Y,metal=False,seed=1):
    rng=random.Random(seed);before=set(bpy.context.scene.objects);start_leaves=LEAVES
    finish=SILVER26 if metal else POT26;soil=base+pot_h-.035;top=base+total
    lathe26(name+' open planter',x,z,[(0,base),(r*.86,base),(r*.98,base+.02),(r,base+pot_h-.012),(r*.97,base+pot_h),(r*.91,base+pot_h),(r*.90,base+pot_h-.05)],finish,36)
    lathe26(name+' inset natural soil',x,z,[(0,soil),(r*.90,soil),(r*.9,soil-.012),(0,soil-.012)],SOIL26,32)
    foliage_h=top-soil
    if kind=='broadleaf':
        # Bespoke Strelitzia/large philodendron inspired plants have long
        # curved petioles and wide cupped, veined blades. Their unequal fans
        # provide a completely different silhouette from the fine ferns.
        for j in range(17):
            a=j*2.399+rng.uniform(-.24,.24)
            upright=j%5==0
            rank=(j%6)/5
            lift=foliage_h*(.47+.28*rank)
            side_reach=rng.uniform(.12,.25) if upright else rng.uniform(.27,.43)
            petiole_top=Vector((x+math.cos(a)*side_reach,soil+lift,z+math.sin(a)*side_reach*.80))
            # Tall plants at the reception edge keep their whole crowns on
            # the physical island and away from the exterior guide blade.
            petiole_top.x=max(-10.50,min(10.50,petiole_top.x))
            petiole_top.z=max(-4.20,min(5.03,petiole_top.z))
            start=Vector((x+math.cos(a)*r*.25,soil-.015,z+math.sin(a)*r*.25))
            mid=start.lerp(petiole_top,.60)+Vector((math.cos(a)*.05,.045,math.sin(a)*.05))
            tube26(name+' arched living green petiole',[start,start.lerp(mid,.55),mid,petiole_top],[.014,.012,.009,.005],TROPICAL_STEM26,8)
            blade_length=min(rng.uniform(.62,.91),max(.42,(top-petiole_top.y)/.82))
            direction=Vector((math.cos(a)*(.14 if upright else .62),.91 if upright else .50,math.sin(a)*(.14 if upright else .48)))
            # A subset curls slightly downward while the high center blades
            # rise upright; no repeated umbrella plane is introduced.
            if j%4==2:direction.y=.24
            leaf26(petiole_top,direction,blade_length,blade_length*rng.uniform(.31,.44),rng,top,
                tile=rng.choice((0,1,1,4,4,6,6)),broad=True)
            if j%3==0:
                lateral=petiole_top+Vector((math.cos(a+1.1)*.045,-.11,math.sin(a+1.1)*.045))
                leaf26(lateral,(math.cos(a+1.1)*.65,.25,math.sin(a+1.1)*.65),blade_length*.72,blade_length*.29,rng,top,
                    tile=rng.choice((0,1,4,6)),broad=True)
    elif kind=='palm':
        for stem in range(5):
            a=stem*2.399;start=Vector((x+math.cos(a)*r*.30,soil,z+math.sin(a)*r*.30));tip=start+Vector((math.cos(a)*.08,foliage_h*(.52+.045*(stem%3)),math.sin(a)*.08))
            tube26(name+' ringed slender palm cane',[start,start.lerp(tip,.45),tip],[.015,.012,.006],STEM26,7)
            for frond in range(3):
                a=stem*2.399+frond*2.0;out=Vector((math.cos(a),0,math.sin(a)));reach=foliage_h*rng.uniform(.37,.52)
                # Outward fronds shorten organically at a real wall, while
                # inward crowns remain broad. No sliced/bare rachises protrude.
                if tip.x*out.x>0 and abs(out.x)>.01:reach=min(reach,max(.035,(10.68-abs(tip.x))/abs(out.x)))
                if out.z<-.01:reach=min(reach,max(.035,(tip.z+4.65)/-out.z))
                if out.z>.01:reach=min(reach,max(.035,(5.20-tip.z)/out.z))
                def frond_rise(t):
                    # One upright spear and two softly drooping arches per
                    # cane produce the layered palm crowns in the reference.
                    return (.40*math.sin(t*math.pi/2)-.08*t*t) if frond==0 else (.24*math.sin(t*math.pi)-(.16 if frond==1 else .24)*t*t)
                points=[tip+out*(reach*t)+Vector((0,foliage_h*frond_rise(t),0)) for t in[j/8 for j in range(9)]]
                tube26(name+' arched palm rachis',points,[.004*(1-j/10) for j in range(9)],STEM26,5)
                side=Vector((-out.z,0,out.x))
                for j in range(1,18):
                    t=j/18;p=points[min(7,int(t*8))].lerp(points[min(8,int(t*8)+1)],t*8-int(t*8))
                    for sign in(-1,1):leaf26(p,out*.3+side*sign*.85+Vector((0,.12+.30*(1-t) if frond==0 else -.03,0)),reach*.45*math.sin(t*math.pi)**.5,.040+rng.random()*.020,rng,top)
    elif kind=='fern':
        for frond in range(11):
            a=frond*2.399;out=Vector((math.cos(a),0,math.sin(a)));start=Vector((x,soil,z));length=foliage_h*rng.uniform(.75,1)
            points=[start+out*(length*.6*t)+Vector((0,length*(.98*t-.45*t*t),0)) for t in[j/7 for j in range(8)]]
            tube26(name+' curved fern rachis',points,.0025,STEM26,5);side=Vector((-out.z,0,out.x))
            for j in range(1,13):
                t=j/13;p=points[min(6,int(t*7))].lerp(points[min(7,int(t*7)+1)],t*7-int(t*7))
                for sign in(-1,1):leaf26(p,out*.35+side*sign*.8+Vector((0,.15,0)),length*.30*math.sin(t*math.pi)**.6,.025,rng,top)
    else:
        # Irregular multi-stem ficus/philodendron crowns mix sizes and leaf rolls.
        for stem in range(5 if total>1.8 else 3):
            a=stem*2.399;start=Vector((x+math.cos(a)*r*.24,soil,z+math.sin(a)*r*.24));tip=start+Vector((math.cos(a)*.12,foliage_h*.73,math.sin(a)*.12))
            tube26(name+' natural branching stem',[start,start.lerp(tip,.5),tip],[.017,.012,.005] if total>1.8 else[.008,.005,.002],STEM26,7)
            for branch in range(12):
                az=a+branch*2.399;origin=start.lerp(tip,.35+.60*(branch%4)/3);reach=foliage_h*rng.uniform(.25,.38)
                target=origin+Vector((math.cos(az)*reach,rng.uniform(.07,.23)*foliage_h,math.sin(az)*reach))
                target.x=max(-10.65,min(10.65,target.x));target.z=max(-4.65,min(5.2,target.z))
                tube26(name+' curved living branch',[origin,origin.lerp(target,.6)+Vector((0,.06,0)),target],[.004,.0025,.001],STEM26,5)
                for j in range(12):
                    t=.10+j*.075;p=origin.lerp(target,t);angle=az+(-1 if j%2 else 1)*rng.uniform(.7,1.5)
                    length=rng.uniform(.12,.19) if total>1.8 else rng.uniform(.08,.14)
                    leaf26(p,(math.cos(angle),rng.uniform(-.2,.45),math.sin(angle)),length,length*rng.uniform(.35,.55),rng,top)
                    if j%2==0:leaf26(target+Vector((rng.uniform(-.05,.05),0,rng.uniform(-.05,.05))),(math.cos(angle+.5),.2,math.sin(angle+.5)),length*.8,length*.40,rng,top)
    PLANTS.append({'id':name,'type':kind,'position':[x,base,z],'totalHeight':total,'potHeight':pot_h,'potRadius':r,'leafCount':LEAVES-start_leaves,'targetTop':top,'finish':'brushed stainless' if metal else 'satin black ceramic'})

def water26(name,x,y,z):
    lathe26(name+' glass water tumbler',x,z,[(0,y),(.033,y),(.037,y+.012),(.035,y+.13),(.031,y+.131),(.029,y+.02)],WATER26,24)

def flowers26(name,x,y,z):
    lathe26(name+' satin bud vase',x,z,[(0,y),(.045,y),(.044,y+.12),(.026,y+.17),(.025,y+.18)],SILVER26,28)
    rng=random.Random(len(name)*17)
    for j in range(9):
        a=j*2.399;top=Vector((x+math.cos(a)*.075,y+.24+(j%3)*.045,z+math.sin(a)*.075))
        tube26(name+' fine flower stems',[(x,y+.15,z),top],.0015,STEM26,5)
        for k in range(5):
            aa=a+k*math.tau/5;origin=top+Vector((math.cos(aa)*.012,0,math.sin(aa)*.012))
            vertices=[origin+Vector((math.cos(aa)*d,h,math.sin(aa)*d))+Vector((-math.sin(aa)*w,0,math.cos(aa)*w)) for d,w,h in[(0,0,0),(.014,-.008,.003),(.024,0,.006),(.014,.008,.003)]]
            mesh26(name+' cupped ivory petals',vertices,[(0,1,2,3)],PETAL26)

def laptop26(name,x,z):
    soft_box(PREFIX+name+' slim aluminium laptop base',(x,1.257,z),(.57,.023,.37),KEY26,.012)
    soft_box(PREFIX+name+' dark keyboard inset',(x,1.271,z+.015),(.49,.004,.24),FRAME26,.008)
    before=set(bpy.context.scene.objects)
    soft_box(PREFIX+name+' aluminium display back',(0,.18,0),(.57,.36,.022),KEY26,.015)
    soft_box(PREFIX+name+' real active display aperture',(0,.18,.014),(.52,.31,.004),SCREEN26,.004)
    for ob in set(bpy.context.scene.objects)-before:
        ob.location=Vector(xyz((x,1.27,z-.165)))+Matrix.Rotation(-.18,3,'X')@ob.location;ob.rotation_euler[0]=-.18

# Left low display/garden plinth and exact physical front copy.
soft_box(PREFIX+'left product garden black raised platform',(-7,.27,2.5),(7.4,.30,2.0),BLACK26,.055)
soft_box(PREFIX+'left product garden teal lower reveal',(-7,.145,3.496),(7.28,.026,.022),TEAL26,.008)
soft_box(PREFIX+'left product garden white upper edge',(-7,.411,3.494),(7.26,.018,.022),WARM26,.005)
label26('SMALL MODULES. BIG POSSIBILITIES.',(-7,.245,3.516),.115,6.5,tracking=1.28)
ITEMS.append({'id':'left-product-garden','position':[-7,.12,2.5],'size':[7.4,.30,2.0],'bounds':{'min':[-10.7,.12,1.5],'max':[-3.3,.42,3.5]}})

# Reception: actual rounded end returns, brushed vertical fins, continuous
# pearl light, true vector lettering, laptop stations and supported glassware.
soft_box(PREFIX+'right reception rounded satin black carcass',(7.8,.66,3.5),(5.2,1.04,1.15),BLACK26,.17)
soft_box(PREFIX+'right reception grounded recessed charcoal foot',(7.8,.16,3.5),(4.96,.08,.94),FRAME26,.025)
soft_box(PREFIX+'right reception pale silver stone countertop',(7.8,1.222,3.5),(5.23,.036,1.18),TOP26,.045)
soft_box(PREFIX+'right reception warm recessed toe',(7.8,.154,4.070),(5.01,.023,.025),WARM26,.006)
soft_box(PREFIX+'right reception white fine upper reveal',(7.8,1.198,4.079),(4.96,.014,.017),WARM26,.004)
for side in(-1,1):
    x=7.8+side*2.54
    for j in range(15):
        z=3.5-.46+j*.064
        rod(PREFIX+'reception individually brushed metal return fin',(x,.18,z),(x,1.20,z),.013,SILVER26,8)
    tube26('reception wraparound warm end light',[(x,.157,2.99),(x,.157,3.5),(x,.157,4.00)],.011,WARM26,8)
emblem26(6.23,.51,4.086,.55)
label26('livegrid AV',(7.98,.55,4.093),.345,3.25,tracking=.98)
laptop26('reception left workstation',6.65,3.38);laptop26('reception right workstation',8.85,3.38)
flowers26('reception fresh ivory flower arrangement',5.72,1.244,3.49)
for i,x in enumerate((7.45,9.54)):water26('reception water glass '+str(i),x,1.24,3.65)
soft_box(PREFIX+'reception tablet resting slab',(8.0,1.254,3.65),(.31,.023,.22),FRAME26,.018)
ITEMS.append({'id':'front-right-reception','position':[7.8,.12,3.5],'size':[5.2,1.12,1.15],'countertopY':1.24,'bounds':{'min':[5.185,.12,2.91],'max':[10.415,1.24,4.09]}})

# Two clear central seating groups, left-middle discussion and application cafe.
sofa26('rear central left sofa',-.70,-2.90,0,2.60)
sofa26('rear central right sofa',3.60,-2.90,0,2.60)
chair26('central left inward lounge chair',-1.00,.05,math.pi)
chair26('central right inward lounge chair',3.80,.05,math.pi)
coffee26('central left round table',-.55,-1.45,.55)
coffee26('central right round table',3.42,-1.45,.55)
chair26('left middle discussion chair',-5.25,-.42,-math.pi/2,1.02)
chair26('left middle guest chair',-6.80,-.42,math.pi/2,1.02)
coffee26('left middle discussion table',-6.03,-.42,.39)
chair26('product plinth discussion chair left',-8.10,2.15,math.pi/2,.94,base=.42)
chair26('product plinth discussion chair right',-5.40,2.15,-math.pi/2,.94,base=.42)
coffee26('product plinth discussion coffee table',-6.75,2.15,.47,base=.42)
flowers26('product plinth discussion fresh flowers',-6.75,.95,2.15)
chair26('right applications cafe chair left',7.50,-1.82,-math.pi/2,.94)
chair26('right applications cafe chair right',9.00,-1.82,math.pi/2,.94)
coffee26('right applications cafe table',8.25,-1.82,.38)
for i,(x,z) in enumerate(((-.55,-1.45),(3.42,-1.45),(-6.03,-.42),(8.25,-1.82))):
    flowers26('lounge table fresh flowers '+str(i),x,.65,z);water26('lounge water '+str(i),x+.18,.65,z+.07)

# Dense low mixed living garden against the product base; none obscures the
# product caption rows. Tall feature plants occur only outside that gallery.
for i,(x,z) in enumerate(((-10.20,2.05),(-9.35,2.95),(-8.45,3.13),(-7.50,3.13),(-6.50,3.13),(-5.50,3.13),(-4.45,2.95),(-3.75,2.0))):
    plant26('low left product garden '+str(i),x,z,.78+(i%3)*.045,.25,.18,'fern' if i%2 else 'bush',base=.42,metal=i%3==0,seed=170+i)
for i,(x,z,h) in enumerate(((-10.55,-1.7,2.65),(-10.48,1.12,2.35),(-2.65,-3.65,3.05),(5.62,-3.64,3.15),(10.35,-3.70,2.60),(10.40,.2,2.70),(10.42,4.53,2.55),(-2.75,.76,1.3),(5.35,.90,1.5))):
    kind='broadleaf' if i in(2,3,5,6) else 'palm' if i%2==0 else 'bush'
    # Original vessel dimensions stay fixed even when foliage grows taller.
    plant26('tall architectural feature planting '+str(i),x,z,h,.52 if i<=5 else .42,.27 if i<=5 else .24,kind,metal=i%3==0,seed=260+i)
for i,(x,z) in enumerate(((-2.0,-3.78),(.90,-3.75),(2.1,-3.8),(4.98,-3.8),(-2.5,-1.65),(1.25,-1.35),(5.3,-1.8),(9.85,-1.5),(6.8,-3.4),(-8.25,.45),(-4.15,-1.2))):
    plant26('interior layered green planter '+str(i),x,z,1.20+(i%3)*.17,.45,.24,'fern' if i%3 else 'bush',metal=i%4==0,seed=340+i)
g=BATCH['leaves'];leaves=mesh26('all individually curved live leaves',g['v'],g['f'],LEAF26,g['uv'])
for p in leaves.data.polygons:p.use_smooth=True
if 'broad-leaves' in BATCH:
    g=BATCH['broad-leaves'];leaves=mesh26('broad curved tropical waxy leaf blades',g['v'],g['f'],TROPICAL_LEAF26,g['uv'])
    for p in leaves.data.polygons:p.use_smooth=True

# Freeze architecture/interior transforms then batch by semantic material.
interior=[ob for ob in bpy.context.scene.objects if ob.type=='MESH']
for ob in interior:
    ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4)
groups={}
for ob in interior:groups.setdefault(ob.data.materials[0].name,[]).append(ob)
batched=[]
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    ob=bpy.context.view_layer.objects.active;ob.name=name;batched.append(ob)
ao_path=HERE/'bake_technical_ao.py';exec(compile(ao_path.read_text(encoding='utf-8'),str(ao_path),'exec'))
ao=bake_technical_ao(batched,samples=12,max_distance=.12,min_factor=.67,max_seconds=180)
if ao['budgetReached']:raise RuntimeError('Interior AO budget incomplete')
bpy.ops.object.select_all(action='DESELECT')
for ob in batched:ob.select_set(True)
MODEL.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(MODEL),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
interior_stats={'bytes':MODEL.stat().st_size,'sha256':hashlib.sha256(MODEL.read_bytes()).hexdigest(),'meshes':len(batched),'vertices':sum(len(ob.data.vertices) for ob in batched),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in batched),'bounds':bounds26(batched)}
layout={'version':2026,'asset':MODEL.name,'authoringAxes':'native Three XYZ front +Z','floorTopY':FLOOR_Y,'interior':ITEMS,'plants':PLANTS,'leafCount':LEAVES,'ambientOcclusion':ao,'materialRoles':list(groups),'stats':interior_stats,'sha256':interior_stats['sha256'],'provenance':'Original bespoke Blender reception, furniture, curved leaf meshes and live floral geometry; retained original botanical PBR atlas and CC0 fabric normal map embedded.'}
(MODEL.with_name('led-rental-2026-interior-layout.json')).write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('LED_RENTAL_2026_INTERIOR '+json.dumps(interior_stats),flush=True)

if '--interior-only' in sys.argv:
    # Keep existing visitor bytes and poses untouched during botanical revisions.
    if '--preview' in sys.argv:
        for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
        bpy.ops.import_scene.gltf(filepath=str(PEOPLE))
else:
    # Import actual photographic business visitors once, retain their original UV,
    # normals, material atlases, and validated static sitting/contact poses.
    for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
    source=ROOT/'public/models/expo/projection-visitors-v10.glb'
    bpy.ops.import_scene.gltf(filepath=str(source));bpy.context.view_layer.update()
    original_objects=list(bpy.context.scene.objects)
    templates={ob.get('visitor_role'):ob for ob in original_objects if ob.get('visitor_role')}
    placements=[
     ('reception host','reception-host',8.05,2.28,0,1),
     ('reception colleague','reception-colleague',6.32,2.25,.05,1),
     ('reception adviser','interior-left-conversation',9.45,2.25,-.18,.99),
     ('reception guest','conversation-left',9.12,4.78,math.pi,1),
     ('left front visitor with backpack','kiosk-guest',-10.13,5.08,2.9,.98),
     ('left front conversation man','conversation-left',-8.32,4.66,-1.1,1),
     ('left front ivory trousers visitor','crystal-observer',-7.29,4.85,2.85,1),
     ('left middle visitor','deep-right-gallery',-3.87,1.08,-1.7,1),
     ('left middle conversation','conversation-right',-2.82,1.12,1.4,1),
     ('right interior visitor','left-gallery-browser',5.35,-.38,-.8,.99),
     ('right interior conversation','interior-left-conversation',4.72,.66,2.4,.99),
     ('central left sofa seated guest','cafe-left',-.65,-2.86,0,1),
     ('central right sofa seated guest','cafe-rear',3.62,-2.86,0,1),
     ('central left chair seated guest','cafe-right',-1.00,.05,math.pi,1),
     ('central right chair seated guest','cafe-left',3.80,.05,math.pi,1),
     ('left middle seated guest','cafe-rear',-5.25,-.42,-math.pi/2,1),
     ('right application seated guest','cafe-left',7.50,-1.82,-math.pi/2,1),
     ('product plinth seated adviser','cafe-rear',-8.10,2.15,math.pi/2,1),
     ('product plinth seated guest','cafe-left',-5.40,2.15,-math.pi/2,1),
    ]
    records=[];created=[]
    for role,key,x,z,yaw,scale in placements:
        template=templates[key];root=bpy.data.objects.new('LED Rental 2026 visitor | '+role,None);bpy.context.collection.objects.link(root)
        # Original root scale remains a normal human proportion; only location/yaw
        # changes. Seated template floor moves +20mm with the new raised floor.
        person_floor=.42 if role.startswith('product plinth') else FLOOR_Y
        root.location=xyz((x,person_floor,z));root.rotation_euler[2]=yaw
        original_scale=template.get('normal_human_scale',1.0);root.scale=(original_scale*scale,)*3
        for child in template.children_recursive:
            if child.type!='MESH':continue
            ob=bpy.data.objects.new(root.name+' mesh',child.data);bpy.context.collection.objects.link(ob);ob.parent=root
            ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=template.matrix_world.inverted()@child.matrix_world
            created.append(ob)
        root['visitor_role']=role;root['source_avatar_pose']=template.name;root['license']='MIT - Copyright (c) 2020 Microsoft'
        bpy.context.view_layer.update();bb=bounds26(root.children_recursive)
        records.append({'role':role,'template':key,'position':[x,person_floor,z],'yaw':yaw,'scale':original_scale*scale,'seated':key.startswith('cafe-'),'bounds':bb})
    for ob in original_objects:
        if ob.name in bpy.data.objects:bpy.data.objects.remove(ob,do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in created:
        ob.select_set(True)
        if ob.parent:ob.parent.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(PEOPLE),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_extras=True,export_image_format='AUTO',export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
    people_stats={'bytes':PEOPLE.stat().st_size,'sha256':hashlib.sha256(PEOPLE.read_bytes()).hexdigest(),'count':len(records),'vertices':sum(len(ob.data.vertices) for ob in created),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in created),'bounds':bounds26(created)}
    people_layout={'version':2026,'asset':PEOPLE.name,'authoringAxes':'native Three XYZ front +Z','count':len(records),'placements':records,'source':source.name,'license':'Microsoft Rocketbox Avatar Library; MIT; Copyright (c) 2020 Microsoft','licenseNotice':'/models/expo/technical-humans-LICENSE.txt','photographicTextureMapsPreserved':True,'normalHumanProportionsPreserved':True,'floorTopY':FLOOR_Y,'seatTopY':.604,'stats':people_stats,'sha256':people_stats['sha256']}
    PEOPLE.with_name('led-rental-2026-visitors-layout.json').write_text(json.dumps(people_layout,indent=2),encoding='utf-8')
    print('LED_RENTAL_2026_VISITORS '+json.dumps(people_stats),flush=True)
if '--preview' in sys.argv:
    bpy.ops.import_scene.gltf(filepath=str(MODEL))
    floor=mat('QA only neutral stone floor',(.13,.15,.16),.15,.30)
    box('QA only floor',(0,.06,0),(23,.12,12),floor,0)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
        for device in prefs.devices:device.use=device.type=='OPTIX'
        scene.cycles.device='GPU'
    except Exception:pass
    scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.24,.29,.35,1);bg.inputs[1].default_value=.45
    for p,power,size in (((-5,9,3),1700,8),((5,8,0),1800,8),((0,4,10),1900,10)):
        bpy.ops.object.light_add(type='AREA',location=xyz(p));ob=bpy.context.object;ob.data.energy=power;ob.data.shape='DISK';ob.data.size=size
        ob.rotation_euler=(Vector(xyz((0,1,0)))-ob.location).to_track_quat('-Z','Y').to_euler()
    for name,eye,target,lens in [('interior-front',(-14,8,25),(0,1.4,0),45),('interior-top',(0,25,16),(0,.8,0),48)]:
        bpy.ops.object.camera_add(location=xyz(eye));camera=bpy.context.object;camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=lens;scene.camera=camera
        scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(QA/(name+'.png'))
        bpy.ops.render.render(write_still=True)
