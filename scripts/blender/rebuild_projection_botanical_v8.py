"""Native botanical planting for the V8 projection pavilion.

Original procedural geometry and PBR maps, authored specifically for this
booth. Leaves are curved pointed meshes, not alpha cards or flat discs.
No downloaded models, photographic booth overlays, or reference pixels.
Blender 5.2 --background --python this-file.py [-- --preview]
"""
from pathlib import Path
import bpy,math,json,hashlib,random,sys
import numpy as np
from mathutils import Vector,Matrix

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/expo/projection-botanical-v8.glb'
LAYOUT=ROOT/'public/models/expo/projection-botanical-v8-layout.json'
TEX=ROOT/'public/media/projection-mapping-v8/botanical'
QA=ROOT/'qa/projection-mapping-v8'
TEX.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
GEOMETRY={};MATERIALS={};PLANTS=[];LEAF_COUNT=0

def xyz(p):return(p[0],-p[2],p[1])

def image(name,rgb,noncolor=False):
    rgb=np.asarray(rgb,dtype=np.float32);h,w=rgb.shape[:2]
    rgba=np.ones((h,w,4),np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
    ob=bpy.data.images.new(name,width=w,height=h,alpha=False)
    if noncolor:ob.colorspace_settings.name='Non-Color'
    ob.pixels.foreach_set(rgba.ravel());ob.filepath_raw=str(TEX/(name+'.png'))
    ob.file_format='PNG';ob.save();ob.pack();return ob

def tangent_normal(height,strength=.035):
    dy,dx=np.gradient(height)
    dx*=height.shape[1]*strength;dy*=height.shape[0]*strength
    n=np.stack((-dx,-dy,np.ones_like(dx)),axis=-1)
    n/=np.linalg.norm(n,axis=-1,keepdims=True)
    return n*.5+.5

def make_maps():
    rng=np.random.default_rng(61821);w,h=1024,512;tw=w//8
    yy,xx=np.mgrid[0:h,0:tw];u=xx/(tw-1);v=yy/(h-1)
    palettes=np.asarray([(67,92,48),(77,100,52),(84,109,56),(106,126,66),
        (65,98,58),(84,111,54),(57,92,49),(116,131,72)],np.float32)/255
    colors=[];normals=[]
    for index,palette in enumerate(palettes):
        mid=np.exp(-((u-.5)/.014)**2)
        # Veins curve outwards from the raised midrib; each tiny leaflet has
        # a coherent fine cellular network rather than a uniform green fill.
        phase=v*10+1.7*np.abs(u-.5)+.14*np.sin(v*9)
        d=np.abs(phase-np.round(phase))
        veins=np.exp(-(d/.029)**2)*(1-np.exp(-((u-.5)/.028)**2))
        cells=np.sin(u*65+v*31)*np.sin(v*95-u*13)
        patch=np.sin(u*15+index)*np.sin(v*19+index*.7)
        noise=rng.normal(0,.016,(h,tw))
        brightness=.92+.08*patch+.034*cells+noise+.12*mid+.045*veins
        # Restrained irregular yellow-green flecks, without neon edges.
        age=np.maximum(0,np.sin(u*13+index)*np.cos(v*11-index)-.65)*.045
        c=palette[None,None,:]*brightness[:,:,None]
        c[:,:,0]+=age;c[:,:,1]+=age*.45
        colors.append(c)
        height=.16*mid+.055*veins+.004*cells
        normals.append(tangent_normal(height,.018))
    leaf=image('leaf-atlas-basecolor',np.concatenate(colors,axis=1))
    leafnormal=image('leaf-atlas-normal',np.concatenate(normals,axis=1),True)
    w,h=512,1024;yy,xx=np.mgrid[0:h,0:w];u=xx/w;v=yy/h
    ridges=.5+.22*np.sin(u*115+np.sin(v*8)*.9)+.11*np.sin(u*267+v*3)
    cracks=np.maximum(0,np.cos(u*183+np.sin(v*15)*.7)-.81)*2.0
    barkheight=ridges*.11-cracks*.07+rng.normal(0,.009,(h,w))
    barkrgb=np.asarray((.32,.265,.205))[None,None,:]*(.74+ridges[:,:,None]*.43-cracks[:,:,None]*.35)
    barkrgb+=rng.normal(0,.011,(h,w,1))
    bark=image('bark-basecolor',barkrgb);barknormal=image('bark-normal',tangent_normal(barkheight,.028),True)
    w=h=256;yy,xx=np.mgrid[0:h,0:w]
    grain=rng.normal(0,.03,(h,w))+.025*np.sin(xx*.91)
    brush=image('champagne-brushing-normal',tangent_normal(grain,.0014),True)
    soilnoise=rng.random((256,256));soilrgb=np.asarray((.105,.079,.051))[None,None,:]*(.58+soilnoise[:,:,None]*.7)
    soil=image('soil-basecolor',soilrgb)
    return leaf,leafnormal,bark,barknormal,brush,soil

LEAF_IMAGE,LEAF_NORMAL,BARK_IMAGE,BARK_NORMAL,BRUSH_NORMAL,SOIL_IMAGE=make_maps()

def material(name,rgb,metal=0,rough=.6,color_image=None,normal_image=None,normal_strength=.4,double=False):
    mat=bpy.data.materials.new('Projection Botanical V8 | '+name);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*rgb,1)
    bsdf.inputs['Metallic'].default_value=metal;bsdf.inputs['Roughness'].default_value=rough
    bsdf.inputs['Specular IOR Level'].default_value=.30 if 'foliage' in name else .45
    if color_image:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=color_image;node.extension='REPEAT'
        mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    if normal_image:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=normal_image;node.extension='REPEAT'
        normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=normal_strength
        mat.node_tree.links.new(node.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
    mat.use_backface_culling=not double;mat.diffuse_color=(*rgb,1)
    MATERIALS[name]=mat;return name

FICUS=material('foliage mature ficus with fine reticulated veins',(.10,.16,.06),rough=.49,color_image=LEAF_IMAGE,normal_image=LEAF_NORMAL,double=True)
PALM=material('foliage slender areca and bamboo',(.10,.16,.065),rough=.55,color_image=LEAF_IMAGE,normal_image=LEAF_NORMAL,double=True)
VINE=material('foliage small climbing leaves',(.085,.14,.055),rough=.60,color_image=LEAF_IMAGE,normal_image=LEAF_NORMAL,double=True)
FERN=material('foliage fine fern pinnae',(.065,.13,.055),rough=.61,color_image=LEAF_IMAGE,normal_image=LEAF_NORMAL,double=True)
BARK=material('bark textured natural warm grey trunks',(.23,.19,.13),rough=.83,color_image=BARK_IMAGE,normal_image=BARK_NORMAL,normal_strength=.6)
TWIG=material('bark slender olive brown stems',(.115,.135,.055),rough=.78,color_image=BARK_IMAGE,normal_image=BARK_NORMAL,normal_strength=.3)
GOLD=material('planter champagne brushed metal',(.52,.43,.29),metal=.91,rough=.29,normal_image=BRUSH_NORMAL,normal_strength=.30)
CHARCOAL=material('planter dark charcoal ceramic',(.026,.032,.029),metal=.06,rough=.57)
SOIL=material('soil dark coarse planting substrate',(.10,.075,.045),rough=.96,color_image=SOIL_IMAGE)
PETAL=material('ivory thin porcelain orchid petals',(.80,.79,.71),rough=.45,double=True)
POLLEN=material('orchid quiet ochre throat',(.37,.245,.075),rough=.64)
BROAD=material('foliage broad glossy tropical understory',(.14,.21,.075),rough=.46,color_image=LEAF_IMAGE,normal_image=LEAF_NORMAL,double=True)

def append(role,vertices,faces,uv=None):
    group=GEOMETRY.setdefault(role,{'vertices':[],'faces':[],'uv':[]})
    offset=len(group['vertices']);group['vertices'].extend(tuple(v) for v in vertices)
    group['faces'].extend(tuple(offset+i for i in face) for face in faces)
    group['uv'].extend(uv if uv is not None else [(0,0)]*len(vertices))

def tube(path,radii,role=TWIG,sides=6):
    path=[Vector(p) for p in path];vertices=[];uv=[];faces=[];distance=0
    for j,p in enumerate(path):
        if j:distance+=(p-path[j-1]).length
        tangent=(path[min(j+1,len(path)-1)]-path[max(0,j-1)]).normalized()
        helper=Vector((0,0,1)) if abs(tangent.z)<.85 else Vector((1,0,0))
        a=tangent.cross(helper).normalized();b=tangent.cross(a).normalized()
        radius=radii[j] if hasattr(radii,'__len__') else radii
        for k in range(sides+1):
            angle=k*math.tau/sides;vertices.append(p+(a*math.cos(angle)+b*math.sin(angle))*radius)
            uv.append((k/sides,distance/.18))
        if j:
            for k in range(sides):
                o=(j-1)*(sides+1)+k;n=j*(sides+1)+k;faces.append((o,o+1,n+1,n))
    faces.append(tuple(range(sides-1,-1,-1)))
    faces.append(tuple((len(path)-1)*(sides+1)+k for k in range(sides)))
    append(role,vertices,faces,uv)

def curve(a,b,c,d,n=9):
    a,b,c,d=map(Vector,(a,b,c,d))
    return [a*(1-t)**3+b*(3*(1-t)**2*t)+c*(3*(1-t)*t*t)+d*t**3 for t in [j/n for j in range(n+1)]]

def leaf(base,axis,length,width,role,tile,rng,normal=None,segments=5,accept=None):
    global LEAF_COUNT
    base=Vector(base);axis=Vector(axis).normalized()
    if normal is None:normal=Vector((rng.uniform(-.5,.5),rng.uniform(.2,.9),rng.uniform(.2,.8)))
    normal=Vector(normal);normal-=axis*normal.dot(axis)
    if normal.length<.05:normal=Vector((0,0,1))-axis*axis.z
    normal.normalize();across=axis.cross(normal).normalized()
    twist=rng.uniform(-.55,.55);curl=rng.uniform(.035,.12);vertices=[];uv=[];faces=[]
    for j in range(segments+1):
        t=j/segments;shape=max(.003,math.sin(math.pi*t)**.78)*(1-.18*t)
        half=width*.5*shape;side=Matrix.Rotation(twist*(t-.3),3,axis)@across
        bend=normal*(length*(.075*math.sin(math.pi*t)-curl*t*t))
        center=base+axis*(length*t)+bend
        for sign in(-1,0,1):
            vertices.append(center+side*(sign*half)-normal*(abs(sign)*length*.055*math.sin(math.pi*t)))
            uv.append(((tile+(sign+1)*.5)/8,.015+.97*t))
        if j:
            for k in range(2):
                o=(j-1)*3+k;n=j*3+k;faces.append((o,o+1,n+1,n))
    # Whole leaves are omitted at the installation boundary, never sliced into
    # rectangular cut-offs. Remaining tips preserve their natural silhouette.
    if any(not(-7.17<p.x<7.17 and -4.45<p.z<4.95) for p in vertices):return
    if role==FICUS and any(p.x> -5.28 or p.y>3.52 or p.z<3.14 for p in vertices):return
    if role==PALM and any(p.x>6.98 and p.z<3.06 for p in vertices):return
    if role==PALM and 3.0<base.x<4.0 and base.z<0 and any(p.x>3.79 for p in vertices):return
    # Two isolated edge leaves crossed a camera ray to an emitting picture.
    # Omit each whole organic blade, preserving the surrounding irregular mass.
    if role==VINE:
        screen_edge_points=((-5.66595,5.92151,.58788),(-5.65746,2.68392,.65326))
        if any(all(min(p[a] for p in vertices)-.003<q[a]<max(p[a] for p in vertices)+.003
            for a in range(3)) for q in screen_edge_points):return
    if accept and any(not accept(p) for p in vertices):return
    append(role,vertices,faces,uv);LEAF_COUNT+=1

def planter(name,x,z,radius,height,champagne=True):
    bottom=.10;profile=[(radius*.88,bottom),(radius*.96,bottom+.012),(radius,bottom+height-.02),
        (radius*.995,bottom+height),(radius*.94,bottom+height),(radius*.935,bottom+height-.055),
        (radius*.90,bottom+height-.10)]
    vertices=[];uv=[];faces=[];sides=56
    for j,(r,y) in enumerate(profile):
        for k in range(sides+1):
            a=k*math.tau/sides;vertices.append((x+math.cos(a)*r,y,z+math.sin(a)*r));uv.append((k/sides,j/(len(profile)-1)))
        if j:
            for k in range(sides):
                a=(j-1)*(sides+1)+k;b=j*(sides+1)+k;faces.append((a+1,a,b,b+1))
    append(GOLD if champagne else CHARCOAL,vertices,faces,uv)
    sy=bottom+height-.065;verts=[(x,sy,z)];uv=[(.5,.5)]
    for k in range(49):
        a=k*math.tau/48;verts.append((x+math.cos(a)*radius*.94,sy,z+math.sin(a)*radius*.94));uv.append((.5+.5*math.cos(a),.5+.5*math.sin(a)))
    append(SOIL,verts,[(0,k+2,k+1) for k in range(48)],uv)
    return sy

def record(name,kind,anchor,before,height,y=.10):
    counts={key:len(value['faces']) for key,value in GEOMETRY.items()}
    PLANTS.append({'name':name,'speciesType':kind,'anchor':[anchor[0],y,anchor[1]],
        'targetHeight':height,'newPolygonCount':sum(counts.values())-before})

def ficus(x,z,height=2.9,seed=17):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    soil=planter('entrance ficus',x,z,.29,.80)
    trunks=[]
    for stem in range(3):
        dx=(-.06,.035,.095)[stem];dz=(.025,-.025,.065)[stem]
        trunk=[(x+dx,soil,z+dz),(x+dx+.025,soil+.46,z+dz),
            (x+dx+.10,soil+.89,z+dz+.025),(x+dx+.15,soil+1.26,z+dz+.04),
            (x+dx+.20,soil+1.67,z+dz+.06)]
        tube(trunk,[.026-stem*.003,.024-stem*.003,.020,.014,.007],BARK,8);trunks.append(trunk)
    crown_start={role:len(group['vertices']) for role,group in GEOMETRY.items()}
    for branch in range(16):
        trunk=trunks[branch%3];start=Vector(trunk[1+branch%3]);angle=branch*2.399+rng.uniform(-.25,.25)
        endpoint=Vector((x+.24+math.cos(angle)*rng.uniform(.43,.73),.1+height-rng.uniform(.04,.83),z+.12+math.sin(angle)*rng.uniform(.32,.65)))
        endpoint.x=min(-5.42,max(-7.03,endpoint.x))
        endpoint.z=max(3.24,endpoint.z)
        path=curve(start,start+Vector((-.06,.35,0)),endpoint-Vector((.03,.20,.04)),endpoint,9)
        tube(path,[.014*(1-j/len(path))+.002 for j in range(len(path))],BARK,7)
        for shoot in range(14):
            t=.17+.83*(shoot/14);root=path[min(8,int(t*9))]
            az=angle+rng.uniform(-1.5,1.5);out=Vector((math.cos(az),rng.uniform(.18,.75),math.sin(az))).normalized()
            tip=root+out*rng.uniform(.15,.36);tip.x=min(-5.40,max(-7.06,tip.x));tip.y=min(.1+height-.04,tip.y)
            tip.z=max(3.24,tip.z)
            twig=curve(root,root+Vector((0,.07,0)),tip-out*.04,tip,4)
            tube(twig,[.0035,.003,.0022,.0015,.0008],TWIG,5)
            for j in range(18):
                p=twig[min(3,int(j/18*4))].lerp(tip,rng.uniform(.05,.85))
                azimuth=az+(j%2*2-1)*rng.uniform(.65,1.5)
                direction=Vector((math.cos(azimuth),rng.uniform(-.16,.55),math.sin(azimuth)))
                length=rng.uniform(.060,.122);base=p+direction.normalized()*.015
                if not(-7.12<base.x<-5.34 and .1+height*.34<base.y<.1+height-.025 and base.z>3.22):continue
                tube([p,base],[.0011,.00055],TWIG,4)
                leaf(base,direction,length,length*rng.uniform(.43,.62),FICUS,rng.choice((0,1,1,2,3,7)),rng,segments=4)
    for role in (FICUS,BARK,TWIG):
        group=GEOMETRY.get(role)
        if not group:continue
        for index in range(crown_start.get(role,0),len(group['vertices'])):
            vx,vy,vz=group['vertices'][index]
            group['vertices'][index]=(x+(vx-x)*.80,vy,z+(vz-z)*.85)
    record('taller rounded multi stem entrance ficus','Ficus microcarpa inspired vertically clustered crown',(x,z),before,height)

def bamboo(name,x,z,height=2.55,seed=37,pot_radius=.23,pot_height=.55):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    soil=planter(name,x,z,pot_radius,pot_height)
    for stem in range(7):
        az=rng.uniform(0,math.tau);base=Vector((x+math.cos(az)*pot_radius*.36,soil,z+math.sin(az)*pot_radius*.36))
        tip=base+Vector((rng.uniform(-.19,.19),height-pot_height-rng.uniform(.05,.40),rng.uniform(-.15,.15)))
        points=[base.lerp(tip,j/9)+Vector((.025*math.sin(j*.7+stem),0,.018*math.sin(j*.8))) for j in range(10)]
        tube(points,[.010*(1-j/13) for j in range(10)],BARK,6)
        for node in range(3,10):
            origin=points[node];azimuth=az+node*1.8
            outward=Vector((math.cos(azimuth),rng.uniform(.10,.42),math.sin(azimuth))).normalized()
            endpoint=origin+outward*rng.uniform(.20,.42)
            if x>6:endpoint.x=max(6.36,min(7.08,endpoint.x))
            branch=curve(origin,origin+outward*.06,endpoint-Vector((0,.08,0)),endpoint,5)
            tube(branch,[.0026*(1-j/7) for j in range(6)],TWIG,5)
            for k in range(9):
                p=branch[min(4,k//2)];side=-1 if k%2 else 1
                across=Vector((-outward.z,0,outward.x))*side
                direction=(outward*.36+across*.8+Vector((0,rng.uniform(-.12,.25),0))).normalized()
                leaf(p,direction,rng.uniform(.09,.15),rng.uniform(.013,.022),PALM,rng.choice((2,4,5)),rng,segments=5)
    record(name,'fine stemmed bamboo',(x,z),before,height)

def areca(name,x,z,height=2.6,seed=53,pot_radius=.245,pot_height=.56,culms=5,fronds=5):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    soil=planter(name,x,z,pot_radius,pot_height)
    for culm in range(culms):
        angle=culm*2.4;base=Vector((x+math.cos(angle)*.08,soil,z+math.sin(angle)*.08))
        crown=Vector((x+rng.uniform(-.23,.17),.1+height-rng.uniform(.34,.62),z+rng.uniform(-.17,.17)))
        if x>6:crown.z=max(z+.14,crown.z)
        if x<0:crown.z=max(z+.65,crown.z)
        stem=curve(base,base+Vector((0,.43,0)),crown-Vector((0,.28,0)),crown,9)
        tube(stem,[.011*(1-j/13) for j in range(10)],BARK,6)
        # Rhapis / bamboo-like branching sprays remain leafy all the way up,
        # rather than radiating thin hanging strands from one umbrella crown.
        for level in range(2,10):
            origin=stem[level];az=angle+level*2.10+rng.uniform(-.25,.25)
            outward=Vector((math.cos(az),rng.uniform(.26,.55),math.sin(az))).normalized()
            endpoint=origin+outward*rng.uniform(.12,.28)
            if x>6:endpoint.z=max(z+.14,endpoint.z);endpoint.x=min(6.98,max(6.18,endpoint.x))
            if x<0:endpoint.x=min(-2.96,max(-3.50,endpoint.x));endpoint.z=max(-.05,endpoint.z)
            shoot=curve(origin,origin+Vector((0,.075,0)),endpoint-Vector((0,.025,0)),endpoint,4)
            tube(shoot,[.0026,.0022,.0017,.0012,.0007],TWIG,5)
            for blade in range(4):
                p=shoot[min(3,blade)]
                azimuth=az+(blade-1.5)*.66
                direction=Vector((math.cos(azimuth)*.80,rng.uniform(.42,.82),math.sin(azimuth)*.62)).normalized()
                if x>6:direction.z=abs(direction.z)+.24
                if x<0:direction.x*=.75;direction.z=abs(direction.z)+.12
                length=rng.uniform(.25,.46)*(1-.10*level/9)
                endpoint=p+direction.normalized()*length
                if x>6 and min(p.z,endpoint.z)<3.23:continue
                if x<0 and not(-3.72<endpoint.x<-2.68):continue
                leaf(p,direction,length,length*rng.uniform(.20,.29),PALM,rng.choice((0,1,2,3,5,7)),rng,
                    normal=Vector((math.cos(azimuth)*.15,.25,1)),segments=5)
    record(name,'upright multi stem areca bamboo leaf sprays',(x,z),before,height)

def vine_band(name,cx,cz,yaw,side,seed,center_abs=1.18,spread=.085,wave=.025,
              min_abs=1.06,front=.202,leaf_scale=.85,y0=.42,step=.125,x_range=None):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values());c,s=math.cos(yaw),math.sin(yaw)
    def transform(p):return Vector((cx+c*p[0]+s*p[2],p[1],cz-s*p[0]+c*p[2]))
    def admissible(p):
        local_x=c*(p.x-cx)-s*(p.z-cz)
        return abs(local_x)>min_abs and (not x_range or x_range[0]<p.x<x_range[1])
    for stem in range(14):
        sx=side*center_abs+rng.uniform(-spread,spread);phase=rng.uniform(0,math.tau)
        local=[Vector((sx+wave*math.sin(j*.37+phase),y0+j*step+rng.uniform(-.038,.038),front+.025*math.sin(j*.59+phase))) for j in range(45)]
        tube([transform(p) for p in local],[.0043*(1-j/65) for j in range(45)],BARK,5)
        for j in range(2,44):
            origin=local[j]
            for sign in(-1,1):
                direction=Vector((sign*rng.uniform(.4,.9),rng.uniform(.1,.65),rng.uniform(.25,.8))).normalized()
                base=origin+direction*rng.uniform(.012,.028)
                length=rng.uniform(.065,.115)*leaf_scale
                # Keep every leaf outside the true 2.25m gallery aperture.
                if abs(base.x+direction.x*length)<min_abs:continue
                tube([transform(origin),transform(base)],[.0010,.0005],TWIG,4)
                worlddir=Vector((c*direction.x+s*direction.z,direction.y,-s*direction.x+c*direction.z))
                leaf(transform(base),worlddir,length,length*rng.uniform(.52,.76),VINE,rng.choice((0,1,2,3,7)),rng,
                    normal=Vector((s,.20,c)),segments=4,accept=admissible)
    record(name,'fine climbing evergreen vine',(cx,cz),before,6.0)
    PLANTS[-1]['attachment']={'galleryCenter':[cx,0,cz],'galleryYaw':yaw,'side':side,
        'localCenterX':side*center_abs,'localFront':front,'minimumApertureAbsX':min_abs,
        'nativeXRange':x_range,'startY':y0,'topY':y0+44*step+.1}

def climbing_mass(name,cx,cz,width,depth,bottom,top,seed,leaders=7,levels=20,density=9,avoid_box=None):
    """Irregular three-dimensional branching foliage around a real support.

    Separate woody leaders branch into leaf clusters at uneven heights and
    depths. There are no identical parallel leaf rows or rectangular cut edges.
    """
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    def outside_support(p):
        if avoid_box and p.x>6.95 and p.z>.98:return False # preserve the side wall after its mounting recess
        return not avoid_box or not(avoid_box[0]-.02<p.x<avoid_box[1]+.02 and avoid_box[2]-.02<p.z<avoid_box[3]+.02)
    def wrap(p):
        if avoid_box and avoid_box[0]-.055<p.x<avoid_box[1]+.055 and avoid_box[2]-.055<p.z<avoid_box[3]+.055:
            p.z=avoid_box[3]+.065
        return p
    for leader in range(leaders):
        phase=rng.uniform(0,math.tau);end_y=top-rng.uniform(.02,.30)
        start_y=bottom+rng.uniform(-.06,.20)
        spine=[]
        for j in range(30):
            t=j/29;y=start_y+(end_y-start_y)*t
            spine.append(wrap(Vector((cx+width*(.12*math.sin(t*7+phase)+rng.uniform(-.025,.025)),
                y,cz+depth*(.15*math.sin(t*6+phase)+rng.uniform(-.035,.035))))))
        tube(spine,[.0062*(1-j/42) for j in range(30)],BARK,5)
        for level in range(levels):
            t=(level+rng.uniform(.1,.9))/levels
            origin=spine[min(28,int(t*29))]
            # Vary the mass into lobes with gaps, rather than a straight hedge.
            lobe=.66+.20*math.sin(origin.y*2.17+seed)+.14*math.sin(origin.y*4.31+phase)
            for fork in range(2):
                dx=rng.uniform(-.48,.48)*width*lobe
                dz=rng.uniform(-.46,.46)*depth
                tip=Vector((cx+dx,origin.y+rng.uniform(.04,.23),cz+dz))
                twig=[wrap(p) for p in curve(origin,origin+Vector((dx*.25,.05,dz*.2)),tip-Vector((0,.045,0)),tip,5)]
                tube(twig,[.0027,.0023,.0019,.0014,.0009,.0005],TWIG,4)
                for blade in range(density+rng.randrange(-2,3)):
                    q=rng.uniform(.16,1);p=twig[min(4,int(q*5))].lerp(tip,rng.uniform(0,.55))
                    side=-1 if blade%2 else 1
                    axis=Vector((side*rng.uniform(.25,.90),rng.uniform(.12,.80),rng.uniform(.20,.90))).normalized()
                    length=rng.uniform(.055,.125)*(1.24 if rng.random()<.24 else 1)
                    leaf(p,axis,length,length*rng.uniform(.42,.74),VINE,rng.choice((0,1,1,2,3,5,7)),rng,
                        normal=Vector((rng.uniform(-.35,.35),rng.uniform(.10,.45),1)),segments=4,accept=outside_support)
    record(name,'irregular branching mixed climbing foliage mass',(cx,cz),before,top)
    PLANTS[-1]['attachment']={'nativeCenterXZ':[cx,cz],'massWidth':width,'massDepth':depth,
        'bottomY':bottom,'topY':top,'branchLeaders':leaders,'irregularClusterLevels':levels}

def fern(name,x,z,height=.68,radius=.18,pot_height=.36,seed=75):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    soil=planter(name,x,z,radius,pot_height,champagne=True)
    for frond in range(12):
        az=frond*2.399+rng.uniform(-.15,.15);direction=Vector((math.cos(az),0,math.sin(az)))
        length=(height-pot_height)*rng.uniform(.72,1.2)
        start=Vector((x,soil,z));end=start+direction*(length*.88)+Vector((0,length*.62,0))
        if name.startswith('stage'):
            end.z=max(z-.15,end.z)
            end.x=max(x-.08,end.x) if x>0 else min(x+.08,end.x)
        if name=='left entrance low fern':end.z=max(z-.03,end.z)
        path=curve(start,start+Vector((0,length*.86,0)),end+Vector((0,length*.25,0)),end,10)
        tube(path,[.0025*(1-j/13) for j in range(11)],TWIG,4)
        across=Vector((-direction.z,0,direction.x))
        for j in range(2,10):
            t=j/10;p=path[j];ll=length*.28*math.sin(math.pi*t)
            for sign in(-1,1):
                out=(across*sign*.75+direction*.55+Vector((0,.15,0))).normalized()
                safe=(lambda q:abs(q.x)>2.44) if name.startswith('stage') else None
                leaf(p,out,ll,ll*.33,FERN,6,rng,segments=4,accept=safe)
    record(name,'fine pinnate fern',(x,z),before,height)

def broad_spray(name,x,z,soil,height,seed,kind='interior'):
    """Layered real curved blades and upright petioles in an existing pot."""
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    for shoot in range(12):
        az=shoot*2.399+rng.uniform(-.20,.20)
        side=math.cos(az);depth=math.sin(az)
        origin=Vector((x+side*.07,soil,z+depth*.07))
        tip=Vector((x+side*rng.uniform(.10,.22),soil+(height-soil)*rng.uniform(.46,.82),z+depth*rng.uniform(.10,.30)))
        if kind=='right-front':tip.z=max(z+.14,tip.z);tip.x=min(6.95,max(6.25,tip.x))
        if kind=='left-inner':tip.x=min(-3.05,max(-3.40,tip.x))
        if kind=='right-inner':tip.x=min(3.63,max(3.15,tip.x));tip.z=min(-.25,tip.z)
        if kind=='stage':
            tip.z=max(z+.04,tip.z)
            tip.x=x+(1 if x>0 else -1)*abs(side)*rng.uniform(.10,.22)
        path=curve(origin,origin+Vector((0,.28,0)),tip-Vector((0,.10,0)),tip,6)
        tube(path,[.0038*(1-j/9) for j in range(7)],TWIG,5)
        for blade in range(3):
            p=path[3+blade]
            direction=Vector((side*rng.uniform(.12,.40),rng.uniform(.45,.90),depth*rng.uniform(.15,.65)))
            if kind=='right-front':direction.z=abs(direction.z)+.12
            if kind=='left-inner':direction.x=side*.10
            if kind=='right-inner':direction.x=side*.11;direction.z=-abs(direction.z)-.04
            if kind=='stage':
                direction.z=abs(direction.z)+.12
                direction.x=(1 if x>0 else -1)*(abs(direction.x)+.15)
            length=rng.uniform(.24,.41);width=length*rng.uniform(.27,.42)
            leaf(p,direction,length,width,BROAD,rng.choice((0,1,2,3,7)),rng,normal=Vector((side*.25,.20,1)),segments=6)
    record(name,'layered broad tropical understory leaf sprays',(x,z),before,height)

def flowers(name,x,y,z,scale=.30,seed=113):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    # Closed, softly tapered champagne bud vase with a true inset neck.
    profile=[(.055,y),(.065,y+.018),(.070,y+.082),(.030,y+.125),(.025,y+.137),(.020,y+.137),(.020,y+.115)]
    vertices=[];uv=[];faces=[]
    for j,(radius,yy) in enumerate(profile):
        for k in range(33):
            a=k*math.tau/32;vertices.append((x+math.cos(a)*radius,yy,z+math.sin(a)*radius));uv.append((k/32,j/6))
        if j:
            for k in range(32):a=(j-1)*33+k;b=j*33+k;faces.append((a+1,a,b,b+1))
    append(GOLD,vertices,faces,uv)
    for stem in range(7):
        az=stem*2.4;tip=Vector((x+math.cos(az)*scale*.25,y+scale*rng.uniform(.70,1),z+math.sin(az)*scale*.25))
        base=Vector((x,y+.12,z));tube(curve(base,base+Vector((0,.07,0)),tip-Vector((0,.05,0)),tip,5),.0014,TWIG,5)
        for petal in range(5):
            a=petal*math.tau/5;axis=Vector((math.cos(a),math.sin(a)*.65,.32)).normalized()
            verts=[];uv=[];fs=[]
            for j in range(5):
                t=j/4;center=tip+axis*(.033*t)+Vector((0,0,.010*math.sin(math.pi*t)))
                across=axis.cross(Vector((0,0,1))).normalized()
                for sign in(-1,0,1):verts.append(center+across*(sign*.017*math.sin(math.pi*t)));uv.append(((sign+1)/2,t))
                if j:
                    for k in range(2):o=(j-1)*3+k;n=j*3+k;fs.append((o,n,n+1,o+1))
            append(PETAL,verts,fs,uv)
        tube([tip,tip+Vector((0,0,.009))],[.004,.003],POLLEN,7)
    record(name,'small ivory orchid arrangement',(x,z),before,scale,y)

def blossom(tip,rng,size=.022):
    tip=Vector(tip)
    for petal in range(5):
        a=petal*math.tau/5+rng.uniform(-.08,.08)
        axis=Vector((math.cos(a),math.sin(a)*.7,.45)).normalized()
        leaf(tip,axis,size,size*.72,PETAL,0,rng,normal=Vector((0,.15,1)),segments=3)
    tube([tip,tip+Vector((0,0,size*.16))],[size*.16,size*.10],POLLEN,6)

def shrub_in_vessel(name,x,z,soil,top,seed,flowering=False,small=False):
    """Planting only: the coordinated hospitality addon owns the real vessel."""
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    height=top-soil;spread=.07 if small else .20
    for stem in range(7 if small else 12):
        az=stem*2.399+rng.uniform(-.20,.20)
        base=Vector((x+rng.uniform(-.025,.025),soil,z+rng.uniform(-.025,.025)))
        tip=Vector((x+math.cos(az)*spread*rng.uniform(.4,1),top-rng.uniform(.02,height*.24),z+math.sin(az)*spread*rng.uniform(.4,1)))
        path=curve(base,base+Vector((0,height*.3,0)),tip-Vector((0,height*.15,0)),tip,7)
        tube(path,[.0030*(1-j/10) for j in range(8)],TWIG,5)
        for node in range(2,7):
            for side in(-1,1):
                axis=Vector((math.cos(az+side*.75),rng.uniform(.25,.75),math.sin(az+side*.75))).normalized()
                length=rng.uniform(.045,.080) if small else rng.uniform(.085,.18)
                leaf(path[node],axis,length,length*rng.uniform(.30,.52),BROAD,rng.choice((0,1,2,3,7)),rng,segments=4)
        if flowering:
            for offset in(-1,0,1):blossom(tip+Vector((offset*.018,abs(offset)*-.014,.012*offset)),rng,.014 if small else .023)
    record(name,'flowering mixed foliage in coordinated vessel' if flowering else 'broadleaf shrub in coordinated vessel',(x,z),before,top,soil)

def miniature_conifer(name,x,z,soil,top,seed,radius=.13):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values());height=top-soil
    def needle(base,axis,length,width):
        global LEAF_COUNT
        axis=axis.normalized();normal=Vector((0,1,.25));normal-=axis*normal.dot(axis)
        if normal.length<.01:normal=Vector((1,0,0))
        normal.normalize();across=axis.cross(normal).normalized()
        mid=base+axis*(length*.48);tip=base+axis*length+normal*(length*.025)
        vertices=[base,mid-across*(width*.5),mid+normal*(length*.09),mid+across*(width*.5),tip]
        tile=rng.choice((0,1,6));uv=[((tile+.5)/8,.02),(tile/8,.50),((tile+.5)/8,.50),((tile+1)/8,.50),((tile+.5)/8,.98)]
        append(FERN,vertices,[(0,1,2),(0,2,3),(1,4,2),(2,4,3)],uv);LEAF_COUNT+=1
    tube([(x,soil,z),(x,top-.02,z)],[.010 if height>.6 else .007,.0015],BARK,6)
    for tier in range(11):
        t=.06+tier*.08;y=soil+height*t;branch_radius=radius*(1-t)**.64
        for spoke in range(8):
            az=spoke*math.tau/8+tier*1.31+rng.uniform(-.16,.16)
            outward=Vector((math.cos(az),.22,math.sin(az))).normalized()
            origin=Vector((x,y,z));tip=origin+outward*(branch_radius*rng.uniform(.86,1.08))
            branch=curve(origin,origin+Vector((0,.012,0)),tip-Vector((0,.008,0)),tip,4)
            tube(branch,[.0022,.0018,.0013,.0008,.0004],TWIG,4)
            for node in range(1,5):
                p=branch[node]
                for side in(-1,1):
                    axis=Vector((math.cos(az+side*.72),rng.uniform(.65,1.10),math.sin(az+side*.72))).normalized()
                    for index in range(3):
                        length=rng.uniform(.026,.045)*(1.10 if height>.6 else 1)
                        needle(p+outward*(index*.005),axis,length,length*.20)
    record(name,'true branched miniature conifer with individual curved needles',(x,z),before,top,soil)

# Main reference planting, arranged outside the gallery image apertures.
ficus(-6.60,3.40,3.38,17)
areca('inner left full layered areca',-3.20,-.60,2.95,53,.245,.56,10,7)
broad_spray('inner left broad leaf layer',-3.20,-.60,.595,2.35,153,'left-inner')
bamboo('inner right fine bamboo',3.40,-.55,2.65,37)
broad_spray('inner right broad leaf layer',3.40,-.55,.585,2.35,157,'right-inner')
areca('right entrance layered palm',6.70,3.25,2.15,59,.29,.66,9,8)
broad_spray('right entrance broad leaf layer',6.70,3.25,.695,1.85,159,'right-front')
climbing_mass('left gallery outer lush branching mass',-5.98,.65,.78,.38,.35,6.28,297,8,22,9)
climbing_mass('left inner scattered lower column growth',-3.86,.0,.24,.25,.45,1.95,319,3,7,6)
climbing_mass('right inner restrained back return growth',5.04,-1.65,.40,.25,.40,6.23,354,6,20,9)
climbing_mass('right outer full depth foliage mass',6.84,.65,.60,.30,1.50,6.23,376,8,21,9,
    avoid_box=(6.965,7.22,.55,.93))
fern('stage left fine fern',-2.60,.55,1.05,.21,.53,75)
broad_spray('stage left mixed broad greenery',-2.60,.55,.565,1.15,175,'stage')
fern('stage right fine fern',2.60,.55,.98,.20,.50,79)
broad_spray('stage right mixed broad greenery',2.60,.55,.535,1.12,179,'stage')
fern('reception side low fern',-2.85,1.45,.60,.15,.31,81)
fern('left entrance low fern',-6.00,3.72,.57,.13,.28,83)
fern('right lounge low fern',6.65,.75,.58,.15,.31,87)
flowers('counter ivory orchids',-3.15,1.20,3.05,.32,113)
flowers('cafe ivory orchids',5.15,.75,3.05,.26,119)

# Additive reference hospitality plants; vessels are authored by the media
# agent's independent addon, so no pot or furniture is duplicated here.
shrub_in_vessel('center forecourt flowering shrub',-.48,2.65,.64,1.30,431,True)
miniature_conifer('center forecourt conifer',.52,2.48,.73,1.45,433,.17)
shrub_in_vessel('right forecourt broadleaf',2.32,1.48,.62,1.18,437)
for x,top,seed in((-.95,1.92,441),(.50,1.87,443),(1.80,1.95,447)):
    miniature_conifer('stage miniature conifer '+str(x),x,-.04,1.37,top,seed,.115)
shrub_in_vessel('hospitality table ivory flowers',0,1.52,1.21,1.42,451,True,True)

def build_objects():
    objects=[]
    for role,group in GEOMETRY.items():
        name='Projection Botanical V8 | '+role
        data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in group['vertices']],[],group['faces']);data.update()
        uv=data.uv_layers.new(name='Botanical PBR UV')
        for poly in data.polygons:
            poly.use_smooth=True
            for index in poly.loop_indices:uv.data[index].uv=group['uv'][data.loops[index].vertex_index]
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);data.materials.append(MATERIALS[role])
        ob['botanical_role']=role;ob['original_procedural_asset']=True;objects.append(ob)
    return objects

OBJECTS=build_objects();bpy.context.view_layer.update()
points=[ob.matrix_world@v.co for ob in OBJECTS for v in ob.data.vertices]
triangles=sum(len(poly.vertices)-2 for ob in OBJECTS for poly in ob.data.polygons)
if triangles>500000:raise RuntimeError('Botanical triangle budget exceeded: '+str(triangles))
ao_helper=Path(__file__).with_name('bake_technical_ao.py')
exec(compile(ao_helper.read_text(encoding='utf-8'),str(ao_helper),'exec'))
# This generator owns every opaque PBR mesh, including its authored image maps.
# Unlike imported characters, these textured botanical receivers need local AO.
def _opaque_static_material(mat):return mat in MATERIALS.values()
AO_STATS=bake_technical_ao(OBJECTS,samples=16,max_distance=.085,min_factor=.70,normal_bias=.001,max_seconds=0)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=True,export_apply=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,
    export_extras=True,export_tangents=True,export_image_format='AUTO',
    export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
bounds={'min':[min(p.x for p in points),min(p.z for p in points),min(-p.y for p in points)],
    'max':[max(p.x for p in points),max(p.z for p in points),max(-p.y for p in points)]}
layout={'version':8,'asset':'projection-botanical-v8.glb','authoringAxes':'native Three XYZ front +Z',
    'provenance':'Original procedural botanical meshes and native mathematical PBR maps; no external assets or attachment pixels.',
    'nativeBoothDomain':{'min':[-7.2,.10,-4.5],'max':[7.2,7.8,5]},'bounds':bounds,
    'plants':PLANTS,'leafCount':LEAF_COUNT,'materialBatches':len(OBJECTS),'triangles':triangles,'ambientOcclusion':AO_STATS,
    'vertices':sum(len(ob.data.vertices) for ob in OBJECTS),'bytes':OUT.stat().st_size,
    'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'materials':[MATERIALS[k].name for k in GEOMETRY],
    'maps':[{'file':str(Path(im.filepath_raw).relative_to(ROOT)),'sha256':hashlib.sha256(Path(im.filepath_raw).read_bytes()).hexdigest()}
        for im in(LEAF_IMAGE,LEAF_NORMAL,BARK_IMAGE,BARK_NORMAL,BRUSH_NORMAL,SOIL_IMAGE)],
    'apertureProtection':'Irregular depth-based planting placement preserves central image and caption sightlines; small natural corner intrusions are reference-appropriate.',
    'runtimeGuidance':'Preserve exported standard PBR textures, metalness, roughness, normal maps and opaque double-sided leaf materials.'}
LAYOUT.write_text(json.dumps(layout,indent=2));print('BOTANICAL_V8_READY '+json.dumps(layout),flush=True)

def preview():
    # Full planting overview at the booth's viewing direction; no reference
    # photograph is present in either the exported asset or this render.
    bpy.ops.mesh.primitive_plane_add(size=40,location=(0,0,.095))
    mat=bpy.data.materials.new('QA charcoal floor');mat.use_nodes=True
    mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.038,.045,.043,1)
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.52
    bpy.context.object.data.materials.append(mat)
    for position,power,color,size in [((-5,7,7),1400,(1,.89,.70),6),((7,5,3),1100,(.78,.88,1),5),((0,6,-3),1500,(1,.95,.82),5)]:
        data=bpy.data.lights.new('QA planting softbox','AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(position)
        ob.rotation_euler=(Vector(xyz((0,2,1)))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('QA botanical overview');cam=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(cam)
    cam.location=xyz((-4.6,3.4,17));cam.rotation_euler=(Vector(xyz((0,2.9,.8)))-cam.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=17.6
    scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
    try:
        pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices();gpu=False
        for device in pref.devices:device.use=device.type=='OPTIX';gpu=gpu or device.use
        if gpu:scene.cycles.device='GPU'
    except Exception:pass
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.045,.058,.052,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.32
    scene.render.resolution_x=1900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.render.filepath=str(QA/'botanical-overview.png');bpy.ops.render.render(write_still=True)
    # Detail uses the same geometry/materials, large enough to inspect veins,
    # leaf silhouette, airy branching and the real brushed planter lip.
    cam.location=xyz((-8.6,2.35,7.2));cam.rotation_euler=(Vector(xyz((-6.60,1.55,3.4)))-cam.location).to_track_quat('-Z','Y').to_euler()
    data.ortho_scale=3.55;scene.render.resolution_x=1200;scene.render.resolution_y=1400
    scene.render.filepath=str(QA/'ficus-detail.png');bpy.ops.render.render(write_still=True)
    print('BOTANICAL_V8_PREVIEWS_READY',flush=True)

if '--preview' in sys.argv:preview()


