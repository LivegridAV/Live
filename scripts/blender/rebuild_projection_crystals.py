"""Actual faceted projection skyline from the October 16 21:32 reference.

Blender 5.2 --background --factory-startup --python this-file.py -- --geometry-only
Native Three XYZ, front +Z, bottom Y0, 4.30W x 3.30H x 1.60D.
The pavilion places the maquette at [0,.72,-.45] before its shared 3x scale.
Every prism, bevel, folded facet and arris is actual opaque 3D geometry.
The previous portal/stair/moon maquette is intentionally not read or modified.
"""
from pathlib import Path
import hashlib

HELPER=Path(__file__).with_name('rebuild_projection_palace.py')
helper_code=HELPER.read_text(encoding='utf-8').split('# A broad low three-level')[0]
exec(compile(helper_code,str(HELPER),'exec'))
OUT=ROOT/'public/models/expo/projection-crystals.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-crystals-layout.json'
QA=ROOT/'qa/projection-mapping-v4'
HERO=ROOT/'public/media/projection-mapping-v4/crystals-hero.png'
RAW_MESH=mesh
RAW_BOX=box
CRYSTALS=[]


def mesh(name,points,faces,mat,smooth=False):
    ob=RAW_MESH(name,points,faces,mat,smooth)
    ob.name='Projection Crystals | '+name
    return ob


def box(name,p,size,mat,bevel=.004):
    ob=RAW_BOX(name,p,size,mat,bevel)
    ob.name='Projection Crystals | '+name
    return ob


def role(name,rgb,metal,rough,emission=0):
    mat=material(name,rgb,rough)
    mat.name='Projection Crystals | '+name
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value=metal
    if emission:
        bsdf.inputs['Emission Color'].default_value=(*rgb,1)
        bsdf.inputs['Emission Strength'].default_value=emission
    return mat


FACE=role('white projected sculpted facade',(.65,.68,.72),.14,.43)
ICE=role('white projected sculpted facade | pale blue secondary facet',(.50,.61,.72),.20,.39)
RETURN=role('ivory sculpted return',(.69,.68,.63),.20,.39)
GOLD=role('crystal champagne gold facet',(.52,.34,.145),.74,.34)
SILVER=role('crystal brushed silver facet',(.49,.54,.59),.78,.31)
EDGE=role('warm narrow architectural rib',(.88,.87,.81),.32,.28,.16)
JOINT=role('dark crystal recessed joint',(.020,.026,.034),.20,.66)
MATERIALS=[FACE,ICE,RETURN,GOLD,SILVER,EDGE,JOINT]


def bevel_solid(ob,width=.0035):
    """Small physical chamfers on real silhouette creases; retain flat facets."""
    bm=bmesh.new();bm.from_mesh(ob.data)
    bm.normal_update()
    edges=[e for e in bm.edges if len(e.link_faces)==2 and e.calc_face_angle(0)>.20]
    if edges:
        bmesh.ops.bevel(bm,geom=edges,offset=width,segments=2,affect='EDGES',clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(ob.data);bm.free();ob.data.update()
    for p in ob.data.polygons:p.use_smooth=False
    return ob


def crystal(name,x,z,w,d,height,cuts=(.17,.08,.25,.12,.19),gold_side=None,
            front=FACE,side=SILVER,peak_dx=-.08,peak_dz=-.06,fold=.013):
    """Closed pentagonal cut prism with real folded front planes and pitched top."""
    bottom=.039
    ring=[(x-w/2,z+d/2-w*.075),(x+w*.035,z+d/2),
          (x+w/2,z+d/2-w*.075),(x+w/2,z-d/2),(x-w/2,z-d/2)]
    pts=[(px,bottom,pz) for px,pz in ring]
    tops=[(px,max(bottom+.12,height-cuts[j]),pz) for j,(px,pz) in enumerate(ring)]
    pts+=tops
    faces=[(4,3,2,1,0)];mats=[JOINT]
    for j in range(5):
        k=(j+1)%5
        if j<2:
            corners=[j,k,k+5,j+5]
            center=sum((Vector(pts[i]) for i in corners),Vector())/4
            center.y+=height*(.035 if j==0 else -.025)
            center.z+=fold
            ci=len(pts);pts.append(tuple(center))
            for q in range(4):
                faces.append((corners[q],corners[(q+1)%4],ci))
                selected=gold_side==j and q in(0,1,3)
                mats.append(GOLD if selected else ICE if q==2 and j==1 else front)
        else:
            faces.append((j,k,k+5,j+5))
            mats.append(RETURN if j==4 else side)
    peak=(x+w*peak_dx,height,z+d*peak_dz)
    pi=len(pts);pts.append(peak)
    for j in range(5):
        faces.append((5+j,5+(j+1)%5,pi))
        mats.append(RETURN if j in(0,4) else SILVER if j in(2,3) else FACE)
    ob=mesh(name,pts,faces,FACE)
    for mat in MATERIALS:
        if mat!=FACE:ob.data.materials.append(mat)
    for p,mat in zip(ob.data.polygons,mats):p.material_index=list(ob.data.materials).index(mat)
    bevel_solid(ob,.0035 if height>1 else .0027)
    # Selected physical cut edges catch light without becoming a wireframe.
    if height>1.0:
        for j in(0,1):
            a=(pts[j][0],bottom+.004,pts[j][2]+.0018)
            b=(tops[j][0],tops[j][1]-.003,tops[j][2]+.0018)
            tube(name+' | fine illuminated vertical arris',[a,b],.0019,EDGE,6)
        tube(name+' | bright angled top cut',[(p[0],p[1]+.001,p[2]+.001) for p in tops[:3]],.0021,EDGE,6)
    CRYSTALS.append({'name':name,'centerXZ':[x,z],'width':w,'depth':d,'peak':list(peak),
        'bottom':bottom,'goldFrontSide':gold_side,'frontFold':fold})
    return ob


def folded_shard(name,outline,depth=.15,front_mat=RETURN,side_mat=SILVER):
    """Closed irregular folded plate; each face has a physically different normal."""
    n=len(outline);pts=outline+[(x,y,z-depth) for x,y,z in outline]
    center=sum((Vector(p) for p in outline),Vector())/n
    center.z+=.025
    ci=len(pts);pts.append(tuple(center))
    faces=[tuple(range(n*2-1,n-1,-1))]
    mats=[side_mat]
    for j in range(n):
        k=(j+1)%n
        faces.append((j,k,ci));mats.append(front_mat if j%3 else FACE)
        faces.append((j,j+n,k+n,k));mats.append(side_mat if j%2 else RETURN)
    ob=mesh(name,pts,faces,front_mat)
    for mat in MATERIALS:
        if mat!=front_mat:ob.data.materials.append(mat)
    for p,mat in zip(ob.data.polygons,mats):p.material_index=list(ob.data.materials).index(mat)
    return bevel_solid(ob,.003)


def render_preview(mapped=True):
    """An isolated render of this actual model; never a full-booth photograph."""
    QA.mkdir(parents=True,exist_ok=True);HERO.parent.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES'
    scene.cycles.samples=48;scene.cycles.use_denoising=True
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.012,.023,.038,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.25
    ground=role('QA navy floor',(.007,.012,.022),.28,.35)
    box('QA isolated floor',(0,-.05,0),(40,.06,40),ground,0)
    def area(name,p,power,color,size,target):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(p)
        ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
    area('warm white crystalline key',(-3,5,5),760,(1,.83,.60),4,(0,1.7,0))
    area('cool silver facet fill',(4,4,3),440,(.66,.83,1),3.4,(0,1.7,0))
    area('champagne rim behind skyline',(-1,4,-4),1050,(1,.65,.28),3,(0,1.6,0))
    area('restrained warm grazing model foot',(0,.5,2),95,(1,.58,.22),2.5,(0,1.1,0))
    camera=bpy.data.cameras.new('isolated crystalline skyline camera');cam=bpy.data.objects.new(camera.name,camera)
    bpy.context.collection.objects.link(cam);cam.location=xyz((-5.2,2.85,14))
    cam.rotation_euler=(Vector(xyz((0,1.61,-.03)))-cam.location).to_track_quat('-Z','Y').to_euler()
    camera.type='ORTHO';camera.ortho_scale=6.9;scene.camera=cam
    if mapped:
        field=ROOT/'public/media/projection-mapping-v4/crystal-light.webp'
        if not field.exists():
            raise FileNotFoundError('Wait for native crystal light-field media: '+str(field))
        texture=bpy.data.images.load(str(field),check_existing=True)
        for mat in(FACE,ICE,GOLD,SILVER):
            nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
            pos=nodes.new('ShaderNodeNewGeometry');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(pos.outputs['Position'],sep.inputs[0])
            x=nodes.new('ShaderNodeMath');x.operation='MULTIPLY_ADD';x.inputs[1].default_value=1/4.3;x.inputs[2].default_value=.5
            y=nodes.new('ShaderNodeMath');y.operation='DIVIDE';y.inputs[1].default_value=3.30
            links.new(sep.outputs['X'],x.inputs[0]);links.new(sep.outputs['Z'],y.inputs[0])
            uv=nodes.new('ShaderNodeCombineXYZ');links.new(x.outputs[0],uv.inputs[0]);links.new(y.outputs[0],uv.inputs[1])
            image=nodes.new('ShaderNodeTexImage');image.image=texture;image.extension='EXTEND';image.interpolation='Linear'
            links.new(uv.outputs[0],image.inputs['Vector'])
            if mat in(FACE,ICE):
                # Keep projected blue distinct under the warm photographic key.
                # White light stays white; static champagne/ivory finishes use
                # their own untouched material roles below.
                icy=nodes.new('ShaderNodeHueSaturation')
                icy.inputs['Saturation'].default_value=1.35
                icy.inputs['Value'].default_value=1.0
                links.new(image.outputs['Color'],icy.inputs['Color'])
                links.new(icy.outputs['Color'],bsdf.inputs['Base Color'])
                links.new(icy.outputs['Color'],bsdf.inputs['Emission Color'])
                bsdf.inputs['Emission Strength'].default_value=.85 if mat==FACE else .68
            else:
                mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
                mix.inputs[2].default_value=(.68,.40,.16,1) if mat==GOLD else (.35,.49,.66,1)
                links.new(image.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bsdf.inputs['Emission Color'])
                bsdf.inputs['Emission Strength'].default_value=.35 if mat==GOLD else .12
    # Code-authored dark teal clouds and faint stars, independent of the source image.
    backdrop=bpy.data.materials.new('QA native cosmic teal');backdrop.use_nodes=True
    nt=backdrop.node_tree;nt.nodes.clear();nodes=nt.nodes;links=nt.links
    out=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');links.new(em.outputs[0],out.inputs[0])
    geo=nodes.new('ShaderNodeNewGeometry');noise=nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value=.44;noise.inputs['Detail'].default_value=3.5
    links.new(geo.outputs['Position'],noise.inputs['Vector'])
    color=nodes.new('ShaderNodeValToRGB');color.color_ramp.elements[0].position=.22;color.color_ramp.elements[0].color=(.002,.007,.015,1)
    color.color_ramp.elements[1].position=.80;color.color_ramp.elements[1].color=(.007,.032,.041,1)
    links.new(noise.outputs['Fac'],color.inputs[0])
    stars=nodes.new('ShaderNodeTexVoronoi');stars.feature='F1';stars.inputs['Scale'].default_value=9
    links.new(geo.outputs['Position'],stars.inputs['Vector'])
    pin=nodes.new('ShaderNodeValToRGB');pin.color_ramp.elements[0].position=.010;pin.color_ramp.elements[0].color=(.25,.36,.45,1)
    pin.color_ramp.elements[1].position=.025;pin.color_ramp.elements[1].color=(0,0,0,1);links.new(stars.outputs['Distance'],pin.inputs[0])
    add=nodes.new('ShaderNodeMixRGB');add.blend_type='ADD';add.inputs[0].default_value=.65
    links.new(color.outputs[0],add.inputs[1]);links.new(pin.outputs[0],add.inputs[2]);links.new(add.outputs[0],em.inputs['Color'])
    mesh('QA distant cosmic backdrop',[(-18,-8,-8),(18,-8,-8),(18,12,-8),(-18,12,-8)],[(0,1,2,3)],backdrop)
    scene.render.filepath=str(HERO if mapped else QA/'crystals-clay.png')
    bpy.ops.render.render(write_still=True)
    print('CRYSTALS_RENDER_READY '+scene.render.filepath,flush=True)


# Begin crystal skyline construction. Preview-only wrappers stop before here.
box('thin ivory maquette foundation',(0,.018,0),(4.30,.036,1.60),RETURN,.006)

# The tallest slender prism sits beneath the central projector, just left of
# center. Its cut roof is a true multi-plane volume, not a triangular image.
crystal('highest central rear crystal',-.335,-.32,.46,.52,3.30,
        (.10,.19,.26,.13,.17),front=FACE,side=SILVER,peak_dx=-.10,peak_dz=-.15)
crystal('central broad blue blade',.105,.015,.64,.57,2.99,
        (.34,.22,.03,.24,.36),front=FACE,side=SILVER,peak_dx=.40,peak_dz=.05,fold=.017)
crystal('central narrow rear ivory spur',.20,-.44,.30,.49,2.80,
        (.20,.16,.10,.22,.14),front=ICE,side=RETURN,peak_dx=.15)

# Staggered side monoliths alternate projection planes and real champagne metal.
crystal('left high gold and blue tower',-.995,-.175,.57,.50,2.30,
        (.16,.04,.25,.10,.22),gold_side=0,front=FACE,side=GOLD,peak_dx=.04)
crystal('left middle pale diagonal tower',-1.365,.065,.40,.43,1.89,
        (.29,.15,.06,.19,.27),front=ICE,side=RETURN,peak_dx=.32)
crystal('right rear tall satin silver tower',.875,-.345,.48,.51,2.56,
        (.15,.04,.25,.12,.17),front=ICE,side=SILVER,peak_dx=.05)
crystal('right middle split gold projection tower',1.395,-.01,.57,.50,2.12,
        (.30,.16,.05,.27,.22),gold_side=1,front=FACE,side=GOLD,peak_dx=-.28)
crystal('right outer ivory pointed blade',1.78,-.22,.34,.45,1.79,
        (.24,.08,.20,.21,.12),front=ICE,side=RETURN,peak_dx=-.25)
crystal('left outer low prism',-1.775,.105,.43,.44,1.49,
        (.08,.16,.25,.12,.20),front=FACE,side=RETURN,peak_dx=-.18)

# Closer folded blocks form a dense jagged lower skyline without any old
# staircase, curved portal, onion dome or moon geometry.
crystal('front center champagne folded monolith',-.295,.365,.60,.42,1.93,
        (.20,.02,.35,.13,.28),gold_side=1,front=SILVER,side=GOLD,peak_dx=-.25,fold=.019)
crystal('front left fractured icy block',-1.105,.425,.64,.39,1.22,
        (.07,.26,.15,.22,.09),front=FACE,side=SILVER,peak_dx=-.27)
crystal('front right mid icy gold block',.875,.385,.64,.44,1.61,
        (.31,.10,.03,.24,.15),gold_side=1,front=FACE,side=GOLD,peak_dx=.28)
crystal('foreground angular blue pedestal',.22,.605,.75,.35,.91,
        (.06,.19,.30,.12,.04),front=FACE,side=RETURN,peak_dx=-.32)
crystal('far left low white splinter',-1.95,.43,.30,.32,.66,
        (.22,.07,.18,.12,.04),front=RETURN,side=RETURN,peak_dx=.16)
crystal('far right low white splinter',1.945,.41,.31,.33,.76,
        (.21,.06,.18,.12,.10),front=RETURN,side=SILVER,peak_dx=.24)

folded_shard('left crossing ivory fractured slab',[
    (-1.56,1.04,.625),(-.94,.89,.735),(-.72,.49,.710),(-1.39,.76,.660)],.12,RETURN,SILVER)
folded_shard('central sharp white diagonal blade',[
    (-.59,1.06,.750),(-.43,1.13,.760),(.65,.18,.780),(.38,.10,.770)],.14,RETURN,SILVER)
folded_shard('right upward jagged ivory slab',[
    (1.50,.42,.56),(1.96,1.13,.42),(2.055,1.15,.34),(1.83,.34,.60)],.15,RETURN,SILVER)
folded_shard('left low angled footprint shard',[
    (-2.10,.039,.65),(-1.79,.64,.54),(-1.62,.53,.67),(-1.71,.039,.77)],.13,RETURN,RETURN)
folded_shard('right low angled footprint shard',[
    (1.75,.039,.68),(1.89,.58,.57),(2.095,.29,.65),(2.115,.039,.73)],.14,RETURN,SILVER)

# Fine physical metal reeds on the nearer champagne block catch the projector
# and warm grazing lights. Dark, shallow gaps between them retain their depth.
box('front champagne recessed fluted joint',(-.11,.665,.590),(.28,1.25,.016),JOINT,.002)
for j in range(11):
    x=-.245+j*.025
    box('front champagne narrow dimensional reed',(x,.665,.603),(.012,1.25,.018),GOLD,.0016)
    if j in(0,5,10):
        tube('front fluted bright edge',[(x,.044,.615),(x,1.282,.615)],.0015,EDGE,6)


def batch_materials():
    """Bake every transform and merge to one runtime primitive per finish."""
    bpy.context.view_layer.update()
    objects=[]
    for ob in list(bpy.context.scene.objects):
        if ob.type!='MESH':continue
        # Split the genuine multi-material polyhedra into material batches.
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        if len(ob.data.materials)>1:
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
    groups={}
    for ob in list(bpy.context.scene.objects):
        if ob.type!='MESH' or not ob.data.polygons:continue
        matrix=ob.matrix_world.copy()
        for v in ob.data.vertices:v.co=matrix@v.co
        ob.matrix_world=Matrix.Identity(4)
        used=ob.data.polygons[0].material_index
        mat=ob.data.materials[used]
        ob.data.materials.clear();ob.data.materials.append(mat)
        for p in ob.data.polygons:p.material_index=0
        groups.setdefault(mat.name,[]).append(ob)
    for name,items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in items:ob.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        ob=bpy.context.view_layer.objects.active;ob.name=name;objects.append(ob)
    return objects


objects=batch_materials()
ao_helper=Path(__file__).with_name('bake_technical_ao.py')
exec(compile(ao_helper.read_text(encoding='utf-8'),str(ao_helper),'exec'))
AO=bake_technical_ao(objects,samples=32,max_distance=.13,min_factor=.62,max_seconds=100)
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,
    export_lights=False,export_animations=False,export_vertex_color='NAME',
    export_vertex_color_name='Col',export_all_vertex_colors=False)
points=[v.co for ob in objects for v in ob.data.vertices]
lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
high=[p for p in points if p.z>2.65]
stats={'file':OUT.name,'bytes':OUT.stat().st_size,'meshes':len(objects),
    'vertices':sum(len(ob.data.vertices) for ob in objects),
    'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects),
    'bounds':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}}
layout={'version':1,'authoringScale':1,'authoringSpace':'Three XYZ, front +Z, bottom Y0',
    'reference':'ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png',
    'placement':{'position':[0,.72,-.45],'scale':1,'parentRuntimeScale':3},
    'projectionDomain':{'min':[-2.15,0],'max':[2.15,3.30]},
    'crystals':CRYSTALS,'materialRoles':[ob.data.materials[0].name for ob in objects],
    'highFootprint':{'aboveY':2.65,'min':[min(p.x for p in high),min(p.z for p in high),min(-p.y for p in high)],
        'max':[max(p.x for p in high),max(p.z for p in high),max(-p.y for p in high)]},
    'ambientOcclusion':AO,'stats':stats,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('PROJECTION_CRYSTALS '+json.dumps(stats),flush=True)
if '--geometry-only' not in __import__('sys').argv:
    render_preview('--clay-only' not in __import__('sys').argv)
