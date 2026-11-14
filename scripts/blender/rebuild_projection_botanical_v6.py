"""Native botanical planting for the V6 projection pavilion.

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
OUT=ROOT/'public/models/expo/projection-botanical-v6.glb'
LAYOUT=ROOT/'public/models/expo/projection-botanical-v6-layout.json'
TEX=ROOT/'public/media/projection-mapping-v6/botanical'
QA=ROOT/'qa/projection-mapping-v6'
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
    palettes=np.asarray([(54,79,38),(63,87,43),(75,96,49),(83,104,55),
        (60,85,49),(65,91,47),(45,76,40),(58,82,42)],np.float32)/255
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
    mat=bpy.data.materials.new('Projection Botanical V6 | '+name);mat.use_nodes=True
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

def leaf(base,axis,length,width,role,tile,rng,normal=None,segments=5):
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
    if any(not(-7.17<p.x<7.17 and -2.95<p.z<4.95) for p in vertices):return
    if role==FICUS and any(p.x> -5.55 or p.y>3.02 or p.z<3.12 for p in vertices):return
    if role==PALM and any(p.x>6.98 and p.z<3.06 for p in vertices):return
    if role==PALM and 3.0<base.x<4.0 and base.z<0 and any(p.x>3.79 for p in vertices):return
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
    trunk=[(x,z*0+soil,z),(x+.035,soil+.48,z-.015),(x-.055,soil+.95,z-.04),(x-.09,soil+1.32,z-.05),(x-.06,soil+1.70,z-.08)]
    tube(trunk,[.032,.029,.024,.018,.009],BARK,9)
    for branch in range(8):
        start=Vector(trunk[1+branch%3]);angle=branch*2.399+rng.uniform(-.25,.25)
        endpoint=Vector((x-.03+math.cos(angle)*rng.uniform(.42,.76),.1+height-rng.uniform(.05,.62),z+math.sin(angle)*rng.uniform(.38,.70)))
        endpoint.x=min(x+.82,max(-7.05,endpoint.x))
        endpoint.z=max(3.24,endpoint.z)
        path=curve(start,start+Vector((-.06,.35,0)),endpoint-Vector((.03,.20,.04)),endpoint,9)
        tube(path,[.014*(1-j/len(path))+.002 for j in range(len(path))],BARK,7)
        for shoot in range(12):
            t=.25+.75*(shoot/12);root=path[min(8,int(t*9))]
            az=angle+rng.uniform(-1.5,1.5);out=Vector((math.cos(az),rng.uniform(.18,.75),math.sin(az))).normalized()
            tip=root+out*rng.uniform(.18,.36);tip.x=min(-5.66,max(-7.09,tip.x));tip.y=min(.1+height-.025,tip.y)
            tip.z=max(3.24,tip.z)
            twig=curve(root,root+Vector((0,.07,0)),tip-out*.04,tip,4)
            tube(twig,[.0035,.003,.0022,.0015,.0008],TWIG,5)
            for j in range(13):
                p=twig[min(3,int(j/13*4))].lerp(tip,rng.uniform(.05,.8))
                azimuth=az+(j%2*2-1)*rng.uniform(.65,1.5)
                direction=Vector((math.cos(azimuth),rng.uniform(-.16,.55),math.sin(azimuth)))
                length=rng.uniform(.052,.095);base=p+direction.normalized()*.015
                if not(-7.13<base.x<-5.58 and .1+height*.40<base.y<.1+height-.02 and base.z>3.20):continue
                tube([p,base],[.0011,.00055],TWIG,4)
                leaf(base,direction,length,length*rng.uniform(.39,.53),FICUS,rng.choice((0,1,1,2,3)),rng,segments=6)
    record('airy left entrance ficus','Ficus microcarpa inspired branched specimen',(x,z),before,height)

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
        angle=culm*2.4;base=Vector((x+math.cos(angle)*.07,soil,z+math.sin(angle)*.07))
        crown=Vector((x+rng.uniform(-.10,.10),height-rng.uniform(.30,.65),z+rng.uniform(-.12,.12)))
        if x>6:crown.z=max(z+.03,crown.z)
        tube(curve(base,base+Vector((0,.5,0)),crown-Vector((0,.3,0)),crown,7),[.016-j*.0014 for j in range(8)],BARK,6)
        for frond in range(fronds):
            az=angle+frond*1.25+rng.uniform(-.25,.25)
            outward=Vector((math.cos(az)*.56,0,math.sin(az)))
            end=crown+outward*rng.uniform(.58,.83)+Vector((0,rng.uniform(-.45,-.15),0))
            if x>6:
                end.x=min(6.97,max(6.12,end.x));end.y=max(1.23,end.y)
                end.z=max(z+.05,end.z)
            if x<0:end.x=max(-3.43,end.x)
            path=curve(crown,crown+Vector((0,.35,0)),end+Vector((0,.28,0)),end,12)
            tube(path,[.004*(1-j/15) for j in range(13)],TWIG,5)
            for j in range(2,12):
                p=path[j];t=j/12;tangent=(path[j+1]-path[j-1]).normalized()
                across=Vector((-outward.z,0,outward.x)).normalized()
                for sign in(-1,1):
                    length=(.10+.16*math.sin(math.pi*t))*rng.uniform(.8,1.1)
                    direction=(across*sign*.68+tangent*.38+Vector((0,-.38,0))).normalized()
                    endpoint=p+direction*length
                    if x>6 and min(p.z,endpoint.z)<3.23:continue
                    if x<0 and min(p.x,endpoint.x)<-3.48:continue
                    leaf(p,direction,length,length*.11,PALM,rng.choice((0,1,4,5)),rng,segments=4)
    record(name,'multi stem areca palm',(x,z),before,height)

def vine_band(name,cx,cz,yaw,side,seed):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values());c,s=math.cos(yaw),math.sin(yaw)
    def transform(p):return Vector((cx+c*p[0]+s*p[2],p[1],cz-s*p[0]+c*p[2]))
    for stem in range(10):
        sx=side*1.40+rng.uniform(-.055,.055);phase=rng.uniform(0,math.tau)
        local=[Vector((sx+.025*math.sin(j*.47+phase),.42+j*.141+rng.uniform(-.045,.045),.167+.018*math.sin(j*.69+phase))) for j in range(39)]
        tube([transform(p) for p in local],[.0044*(1-j/55) for j in range(39)],BARK,5)
        for j in range(2,38):
            origin=local[j]
            for sign in(-1,1):
                direction=Vector((sign*rng.uniform(.4,.9),rng.uniform(.1,.65),rng.uniform(.25,.8))).normalized()
                base=origin+direction*rng.uniform(.012,.028)
                length=rng.uniform(.040,.080)
                # Keep every leaf outside the true 2.25m gallery aperture.
                if abs(base.x+direction.x*length)<1.205:continue
                tube([transform(origin),transform(base)],[.0010,.0005],TWIG,4)
                worlddir=Vector((c*direction.x+s*direction.z,direction.y,-s*direction.x+c*direction.z))
                leaf(transform(base),worlddir,length,length*rng.uniform(.48,.70),VINE,rng.choice((0,1,2,7)),rng,
                    normal=Vector((s,.20,c)),segments=5)
    record(name,'fine climbing evergreen vine',(cx,cz),before,6.0)

def fern(name,x,z,height=.68,radius=.18,pot_height=.36,seed=75):
    rng=random.Random(seed);before=sum(len(g['faces']) for g in GEOMETRY.values())
    soil=planter(name,x,z,radius,pot_height,champagne=True)
    for frond in range(12):
        az=frond*2.399+rng.uniform(-.15,.15);direction=Vector((math.cos(az),0,math.sin(az)))
        length=(height-pot_height)*rng.uniform(.72,1.2)
        start=Vector((x,soil,z));end=start+direction*(length*.88)+Vector((0,length*.62,0))
        if name.startswith('stage'):end.z=max(z-.15,end.z)
        if name=='left entrance low fern':end.z=max(z-.03,end.z)
        path=curve(start,start+Vector((0,length*.86,0)),end+Vector((0,length*.25,0)),end,10)
        tube(path,[.0025*(1-j/13) for j in range(11)],TWIG,4)
        across=Vector((-direction.z,0,direction.x))
        for j in range(2,10):
            t=j/10;p=path[j];ll=length*.28*math.sin(math.pi*t)
            for sign in(-1,1):
                out=(across*sign*.75+direction*.55+Vector((0,.15,0))).normalized()
                leaf(p,out,ll,ll*.33,FERN,6,rng,segments=4)
    record(name,'fine pinnate fern',(x,z),before,height)

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

# Main reference planting, arranged outside the gallery image apertures.
ficus(-6.60,3.40,2.9,17)
areca('inner left airy areca',-3.20,-.60,2.60,53)
bamboo('inner right fine bamboo',3.40,-.55,2.60,37)
areca('right entrance layered palm',6.70,3.25,2.10,59,.29,.66,7,6)
for cx,cz,yaw,label in [(-4.95,.15,.32,'left'),(5.15,.15,-.30,'right')]:
    for side in(-1,1):vine_band(label+' gallery '+('outer' if side<0 else 'inner')+' fine vine',cx,cz,yaw,side,97+(side+1)*11+(0 if cx<0 else 57))
fern('stage left fine fern',-2.60,1.45,1.05,.21,.53,75)
fern('stage right fine fern',2.60,1.45,.98,.20,.50,79)
fern('reception side low fern',-2.85,1.45,.60,.15,.31,81)
fern('left entrance low fern',-6.00,3.72,.57,.13,.28,83)
fern('right lounge low fern',6.65,.75,.58,.15,.31,87)
flowers('counter ivory orchids',-3.15,1.20,3.05,.32,113)
flowers('cafe ivory orchids',5.15,.75,3.05,.26,119)

def build_objects():
    objects=[]
    for role,group in GEOMETRY.items():
        name='Projection Botanical V6 | '+role
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
if triangles>250000:raise RuntimeError('Botanical triangle budget exceeded: '+str(triangles))
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=True,export_apply=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,
    export_extras=True,export_tangents=True,export_image_format='AUTO')
bounds={'min':[min(p.x for p in points),min(p.z for p in points),min(-p.y for p in points)],
    'max':[max(p.x for p in points),max(p.z for p in points),max(-p.y for p in points)]}
layout={'version':6,'asset':'projection-botanical-v6.glb','authoringAxes':'native Three XYZ front +Z',
    'provenance':'Original procedural botanical meshes and native mathematical PBR maps; no external assets or attachment pixels.',
    'nativeBoothDomain':{'min':[-7.2,.10,-3],'max':[7.2,7.8,5]},'bounds':bounds,
    'plants':PLANTS,'leafCount':LEAF_COUNT,'materialBatches':len(OBJECTS),'triangles':triangles,
    'vertices':sum(len(ob.data.vertices) for ob in OBJECTS),'bytes':OUT.stat().st_size,
    'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'materials':[MATERIALS[k].name for k in GEOMETRY],
    'maps':[{'file':str(Path(im.filepath_raw).relative_to(ROOT)),'sha256':hashlib.sha256(Path(im.filepath_raw).read_bytes()).hexdigest()}
        for im in(LEAF_IMAGE,LEAF_NORMAL,BARK_IMAGE,BARK_NORMAL,BRUSH_NORMAL,SOIL_IMAGE)],
    'apertureProtection':'Gallery leaves restricted to local absX>1.205 outside panel half-width1.125.',
    'runtimeGuidance':'Preserve exported standard PBR textures, metalness, roughness, normal maps and opaque double-sided leaf materials.'}
LAYOUT.write_text(json.dumps(layout,indent=2));print('BOTANICAL_V6_READY '+json.dumps(layout),flush=True)

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
    print('BOTANICAL_V6_PREVIEWS_READY',flush=True)

if '--preview' in sys.argv:preview()
