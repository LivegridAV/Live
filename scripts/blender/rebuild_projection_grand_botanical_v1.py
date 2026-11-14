"""Native detailed planting and climbing leaves for the grand projection shell."""
from pathlib import Path
import json,hashlib,sys
HERE=Path(__file__).resolve().parent
OLD=HERE/'rebuild_projection_botanical_v11.py'
source=OLD.read_text(encoding='utf-8')
prefix=source.split('# Main reference planting')[0].replace('projection-botanical-v11','projection-grand-botanical-v1').replace('projection-mapping-v11','projection-grand-v1').replace('Projection Botanical V11','Projection Grand Botanical V1')
# The earlier ficus was deliberately cropped to its one fixed reference
# location. Make those acceptance bounds relative to its anchor before using
# the constructor for two independent trees in this larger room.
prefix=prefix.replace('min(-5.42,max(-7.03,endpoint.x))','min(x+1.18,max(x-.43,endpoint.x))')
prefix=prefix.replace('max(3.24,endpoint.z)','max(z-.16,endpoint.z)')
prefix=prefix.replace('min(-5.40,max(-7.06,tip.x))','min(x+1.20,max(x-.46,tip.x))')
prefix=prefix.replace('max(3.24,tip.z)','max(z-.16,tip.z)')
prefix=prefix.replace('-7.12<base.x<-5.34','x-.52<base.x<x+1.26').replace('base.z>3.22','base.z>z-.18')
prefix=prefix.replace('not(-7.17<p.x<7.17 and -1.7615<p.z<4.2333)','not(-11.75<p.x<11.75 and -7.5<p.z<7.5)')
prefix=prefix.replace('elif any(p.x> -5.28 or p.y>3.52 or p.z<3.14 for p in vertices):return','elif False:return')
prefix=prefix.replace('if role==PALM and any(p.x>6.98 and p.z<3.06 for p in vertices):return','if False:return')
prefix=prefix.replace('if role==PALM and 3.0<base.x<4.0 and base.z<0 and any(p.x>3.79 for p in vertices):return','if False:return')
exec(compile(prefix,str(OLD),'exec'))

# Reusable unconstrained indoor plants. The older functions carried optical
# masks foronepreviousplacement; these branches and leaves grow around their
# actual pot anchors, with onlythe current room boundary applied byleaf().
def areca(name,x,z,height=3.2,seed=53,pot_radius=.31,pot_height=.69,culms=8,fronds=6):
    rng=random.Random(seed);before=sum(len(g['faces'])for g in GEOMETRY.values())
    soil=planter(name,x,z,pot_radius,pot_height)
    for stem in range(culms):
        a=stem*2.399;root=Vector((x+math.cos(a)*.09,soil,z+math.sin(a)*.09))
        crown=Vector((x+math.cos(a)*.24,.10+height-rng.uniform(.38,.70),z+math.sin(a)*.24))
        tube(curve(root,root+Vector((0,.6,0)),crown-Vector((0,.45,0)),crown,10),[.016*(1-j/16)for j in range(11)],BARK,6)
        for branch in range(fronds):
            az=a+branch*2.399;out=Vector((math.cos(az),0,math.sin(az)))
            tip=crown+out*rng.uniform(.60,.92)+Vector((0,-rng.uniform(.16,.45),0))
            path=curve(crown,crown+out*.22+Vector((0,.38,0)),tip+Vector((0,.26,0)),tip,15)
            tube(path,[.004*(1-j/21)for j in range(16)],TWIG,5)
            for node in range(2,15):
                tangent=(path[min(15,node+1)]-path[node-1]).normalized();cross=Vector((-out.z,0,out.x))
                for side in(-1,1):
                    axis=(cross*side*.86+tangent*.32+Vector((0,-.12,0))).normalized()
                    ll=(.12+.15*math.sin(node/15*math.pi))*rng.uniform(.90,1.08)
                    leaf(path[node],axis,ll,ll*.14,PALM,rng.choice((0,1,2,3,5)),rng,normal=Vector((0,.7,.4)),segments=4)
    record(name,'anchor-relative layered areca with individually curved paired pinnae',(x,z),before,height)

def bamboo(name,x,z,height=3.2,seed=37,pot_radius=.27,pot_height=.66):
    rng=random.Random(seed);before=sum(len(g['faces'])for g in GEOMETRY.values())
    soil=planter(name,x,z,pot_radius,pot_height)
    for stem in range(7):
        a=stem*2.399;root=Vector((x+math.cos(a)*.10,soil,z+math.sin(a)*.10))
        tip=root+Vector((rng.uniform(-.14,.14),height-pot_height-rng.uniform(.05,.35),rng.uniform(-.14,.14)))
        tube([root.lerp(tip,j/9)for j in range(10)],[.011*(1-j/14)for j in range(10)],BARK,6)
        for node in range(3,10):
            p=root.lerp(tip,node/9);az=a+node*1.9;out=Vector((math.cos(az),.30,math.sin(az))).normalized()
            end=p+out*rng.uniform(.25,.45);path=curve(p,p+out*.09,end-Vector((0,.05,0)),end,5)
            tube(path,[.0025*(1-j/8)for j in range(6)],TWIG,5)
            for blade in range(10):
                axis=Vector((math.cos(az+blade*.8),rng.uniform(-.10,.25),math.sin(az+blade*.8)))
                leaf(path[min(4,blade//2)],axis,rng.uniform(.15,.22),rng.uniform(.026,.038),PALM,rng.choice((0,1,2,3,5)),rng,segments=4)
    record(name,'anchor-relative fine bamboo with real narrow leaves',(x,z),before,height)

ficus(-10.8,5.8,3.50,17)
ficus(10.75,5.8,3.30,47)
areca('deep left layered areca',-5.55,-3.0,3.40,53,.31,.69,8,6)
areca('deep right layered areca',5.55,-3.0,3.15,59,.31,.69,8,6)
bamboo('right gallery interior bamboo',10.9,1.0,3.2,37,.27,.66)
bamboo('left consultation bamboo',-10.8,.5,2.8,87,.26,.63)
for i,(x,z,w,d,bot,top)in enumerate([(-11.05,-.65,.75,.42,.35,10.45),(-6.38,-1.65,.48,.32,.40,10.35),
    (6.35,-1.65,.48,.32,.40,10.35),(11.05,-.65,.65,.38,.35,10.45)]):
    climbing_mass('integrated gallery climbing column '+str(i),x,z,w,d,bot,top,297+i*31,4,24,5)
for i,(x,z)in enumerate([(-9.7,4.6),(10.4,3.0),(-5.6,1.4),(5.15,1.0)]):
    fern('layered low fern '+str(i),x,z,.85,.23,.44,83+i*7)
flowers('reception ivory orchids',-5.55,1.20,5.9,.28,113)
flowers('right lounge ivory orchids',8.60,.75,3.8,.23,119)
for i,(x,z)in enumerate([(-2.45,-.05),(0,.65),(2.45,-.05)]):
    offsets={role:len(group['vertices']) for role,group in GEOMETRY.items()}
    planter('stage planted pot '+str(i),x,z,.13,.20,champagne=i%2==0)
    for role,group in GEOMETRY.items():
        for j in range(offsets.get(role,0),len(group['vertices'])):
            p=group['vertices'][j];group['vertices'][j]=(p[0],p[1]+.83,p[2])
    miniature_conifer('stage green miniature '+str(i),x,z,1.13,1.95,441+i*7,.20)
# Constructors carry the previous.10datum. Translate independently as planting,
# preserving leaf size and human scale under the shared.12m floor.
builder=source[source.index('def build_objects():'):source.index('OBJECTS=build_objects()')].replace('Projection Botanical V11','Projection Grand Botanical V1')
exec(compile(builder,str(OLD),'exec'))
objects=build_objects()
for ob in objects:
    ob.location.z+=.02;ob['grandRole']='planting'
bpy.context.view_layer.update()
pts=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in objects)
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_extras=True,export_tangents=True,export_image_format='AUTO')
layout={'version':'grand-v1','asset':OUT.name,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'plants':PLANTS,'leafCount':LEAF_COUNT,
    'triangles':triangles,'bytes':OUT.stat().st_size,'bounds':{'min':[min(p.x for p in pts),min(p.z for p in pts),min(-p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),max(-p.y for p in pts)]},
    'provenance':'Original authored procedural plants, curved veined leaves, branching trunks, pots, soil, and packed original mathematical PBR textures. No downloaded plants or reference raster.'}
LAYOUT.write_text(json.dumps(layout,indent=2),encoding='utf-8');print('PROJECTION_GRAND_BOTANICAL_READY '+json.dumps({'triangles':triangles,'leaves':LEAF_COUNT,'bytes':OUT.stat().st_size}),flush=True)
