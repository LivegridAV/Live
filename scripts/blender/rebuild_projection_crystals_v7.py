"""V7 actual fractured crystal maquette: native Three XYZ, front +Z.

Run Blender 5.2 --background --factory-startup --python this-file.py.
The seven inherited material-role suffixes are the existing runtime shader API.
Every slanted plane, cut peak, dark fault and small shard is real closed geometry.
"""
from pathlib import Path
import random
import sys
import shutil

AUTHOR=Path(__file__).with_name('rebuild_projection_crystals.py')
SOURCE=AUTHOR.read_text(encoding='utf-8')
exec(compile(SOURCE.split('# Begin crystal skyline construction')[0],str(AUTHOR),'exec'))
OUT=ROOT/'public/models/expo/projection-crystals-v7.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-crystals-v7-layout.json'
QA=ROOT/'qa/projection-mapping-v7'
MEDIA=ROOT/'public/media/projection-mapping-v7'
RNG=random.Random(2026101707)
DOMAIN={'min':[-2.15,0],'max':[2.15,3.55]}
DETAILS=[]


def solid(name,points,faces,roles,bevel=.002):
    ob=mesh('V7 | '+name,points,faces,FACE)
    for mat in MATERIALS:
        if mat!=FACE:ob.data.materials.append(mat)
    for polygon,mat in zip(ob.data.polygons,roles):
        polygon.material_index=list(ob.data.materials).index(mat)
    return bevel_solid(ob,bevel) if bevel else ob


def blade(name,x,z,width,depth,height,lean=(0,0),spin=0,gold=False,seed=0):
    """A kinked, tapered, multi-level hexagonal crystal with a true pointed top.

    Successive cross-sections translate, rotate and narrow. Its broken front
    patches have different physical normals, rather than a blank extruded quad.
    """
    rng=random.Random(2700+seed)
    shape=[(-.50,.15),(-.24,.49),(.32,.43),(.50,-.10),(.17,-.48),(-.43,-.35)]
    levels=[(.036,.72),(height*.36,1.0),(height*.71,.88),(height*.91,.66)]
    points=[]
    for level,(y,scale) in enumerate(levels):
        t=0 if level==0 else y/height
        angle=spin+(level-1.5)*.025
        dx=lean[0]*t+(.012*math.sin(seed+level*1.8) if level else 0)
        dz=lean[1]*t+(.012*math.cos(seed+level*1.3) if level else 0)
        for j,(sx,sz) in enumerate(shape):
            px=sx*width*scale;pz=sz*depth*scale
            jitter=(rng.random()-.5)*height*.025 if level else 0
            points.append((x+dx+px*math.cos(angle)-pz*math.sin(angle),y+jitter,
                z+dz+px*math.sin(angle)+pz*math.cos(angle)))
    faces=[tuple(range(5,-1,-1))];roles=[JOINT]
    for level in range(3):
        for side in range(6):
            corners=[level*6+side,level*6+(side+1)%6,(level+1)*6+(side+1)%6,(level+1)*6+side]
            centre=sum((Vector(points[i]) for i in corners),Vector())/4
            normal=(Vector(points[corners[1]])-Vector(points[corners[0]])).cross(Vector(points[corners[3]])-Vector(points[corners[0]])).normalized()
            centre+=normal*(.012+width*.045)*(1 if (level+side+seed)%2 else -.65)
            centre.y+=height*(.012 if (side+level)%2 else -.010)
            ci=len(points);points.append(tuple(centre))
            for part in range(4):
                faces.append((corners[part],corners[(part+1)%4],ci))
                if side in(0,1):
                    role=ICE if (side*2+part+level+seed)%5 in(0,1) else FACE
                elif side==2:
                    role=GOLD if gold and part in(0,3) else ICE if part%2 else SILVER
                elif side==3:
                    role=SILVER if (part+level)%3 else JOINT
                elif side==4:
                    role=RETURN if (part+level)%3==0 else SILVER
                else:
                    role=ICE if part%3 else FACE
                roles.append(role)
    truncated=seed in(1,2,4,8)
    if truncated:
        cap_factor=.50 if seed==1 else .42 if seed==2 else .62
        cap_width=width*cap_factor;cap_depth=depth*.45
        drops=[height*(.045*(sx+.5)+.025*(sz+.48)) for sx,sz in shape]
        least=min(drops);cap_start=len(points)
        for (sx,sz),drop in zip(shape,drops):
            px=sx*cap_width;pz=sz*cap_depth
            points.append((x+lean[0]+px*math.cos(spin)-pz*math.sin(spin),height-drop+least,
                z+lean[1]+px*math.sin(spin)+pz*math.cos(spin)))
        cap_centre=sum((Vector(points[cap_start+i]) for i in range(6)),Vector())/6
        cap_centre.y+=.005;cap_centre_index=len(points);points.append(tuple(cap_centre))
        for side in range(6):
            k=(side+1)%6
            faces.extend([(18+side,18+k,cap_start+k,cap_start+side),(cap_start+side,cap_start+k,cap_centre_index)])
            roles.extend([FACE if side in(0,1,5) else ICE if side==2 else SILVER,
                FACE if side in(0,1,5) else GOLD if gold and side==2 else SILVER])
        tip=max(points[cap_start:cap_start+6],key=lambda p:p[1])
    else:
        cap_width=0;tip=(x+lean[0]-width*.10,height,z+lean[1]-depth*.06)
        pi=len(points);points.append(tip)
        for side in range(6):
            faces.append((18+side,18+(side+1)%6,pi))
            roles.append(FACE if side in(0,1,5) else GOLD if gold and side==2 else SILVER)
    ob=solid(name,points,faces,roles,.0028 if height>1.5 else .0018)
    DETAILS.append({'name':name,'kind':'fractured pointed blade','centreXZ':[x,z],
        'width':width,'depth':depth,'height':height,'lean':list(lean),'tip':list(tip),
        'spin':spin,'crossSections':4,'frontFaces':'true noncoplanar triangulated folds',
        'topMode':'short oblique truncated cap' if truncated else 'pointed splinter','capWidth':cap_width})
    return ob


def plate(name,outline,thickness=.075,front_roles=(FACE,ICE,SILVER),ridge=.035):
    """A closed irregular lamella with a folded front and dimensional dark edges."""
    n=len(outline);points=list(outline)+[(x,y,z-thickness) for x,y,z in outline]
    centre=sum((Vector(p) for p in outline),Vector())/n;centre.z+=ridge
    ci=len(points);points.append(tuple(centre));faces=[tuple(range(n*2-1,n-1,-1))];roles=[SILVER]
    for j in range(n):
        k=(j+1)%n;faces.extend([(j,k,ci),(j,j+n,k+n,k)])
        roles.extend([front_roles[j%len(front_roles)],SILVER if j%3 else JOINT])
    ob=solid(name,points,faces,roles,.002)
    DETAILS.append({'name':name,'kind':'closed off-axis folded lamella','outline':outline,'thickness':thickness})
    return ob


def construct():
    box('V7 | thin neutral maquette foot',(0,.016,0),(4.30,.032,1.60),RETURN,.003)
    # The only very tall peaks are slim, layered and set back from the lens.
    blade('slender highest rear crystal',-.265,-.335,.355,.45,3.55,(-.065,-.025),-.12,False,1)
    blade('central rising blue folded blade',.115,-.005,.465,.43,3.22,(.185,-.06),-.17,False,2)
    blade('narrow secondary rear spear',.415,-.48,.245,.32,2.98,(-.025,.015),.13,False,3)
    blade('left broken champagne and ice spire',-.94,-.175,.46,.43,2.49,(.09,-.045),.10,True,4)
    blade('left layered rear splinter',-1.23,-.43,.24,.30,2.22,(.055,.01),-.14,False,5)
    blade('left leaning fractured ice',-1.465,.10,.32,.35,1.94,(-.105,-.065),-.24,False,6)
    blade('outer left low jagged spear',-1.83,.11,.27,.32,1.32,(.035,-.02),.18,False,7)
    blade('right high faceted silver spire',.86,-.34,.42,.45,2.73,(-.055,-.015),.20,False,8)
    blade('right narrow golden cleft',1.28,-.015,.37,.34,2.27,(.085,-.07),-.12,True,9)
    blade('outer right rising ice spur',1.665,-.15,.29,.32,1.90,(.065,-.02),.18,False,10)
    # Staggered slender ribs create depth between the major opaque crystals.
    for i,(x,z,w,h,lx) in enumerate([
        (-.61,-.49,.15,2.76,-.035),(-.72,.10,.19,2.16,.075),
        (.55,-.15,.16,2.50,.025),(.665,-.52,.16,2.34,-.045),
        (-1.61,-.21,.14,1.63,-.025),(1.49,-.48,.17,1.96,.03),
        (1.91,.08,.16,1.23,-.055),(-1.96,.20,.15,.91,.025)]):
        blade('layered fine shard %02d'%i,x,z,w,.23,h,(lx,-.025),.12*math.sin(i),i in(1,5),30+i)
    # Larger oblique folds interrupt every broad foreground surface.
    plate('central diagonal fractured ivory slab',[
        (-.64,1.43,.40),(-.40,1.56,.35),(.68,.13,.76),(.40,.055,.78)],.09,(FACE,SILVER,ICE,FACE),.045)
    plate('near central split crystalline shield',[
        (-.56,.07,.72),(-.60,1.25,.43),(-.30,1.89,.23),(-.10,1.67,.40),(.17,.58,.69),(.07,.055,.77)],.095,(ICE,FACE,SILVER,ICE,FACE),.055)
    plate('right tilted broken icy sail',[
        (.53,.05,.74),(.49,1.05,.46),(.79,1.71,.24),(1.01,1.43,.35),(1.18,.65,.61),(1.03,.05,.75)],.10,(SILVER,ICE,FACE,FACE,ICE),.045)
    plate('left intermediate ascending lamella',[
        (-1.63,.11,.60),(-1.58,1.27,.20),(-1.35,1.61,.12),(-1.10,.87,.53),(-1.14,.07,.69)],.085,(FACE,ICE,SILVER,FACE),.035)
    plate('right outer folded pointed plate',[
        (1.45,.055,.62),(1.47,.49,.49),(1.95,1.32,.22),(2.035,1.35,.16),(1.87,.33,.58)],.09,(FACE,ICE,FACE,SILVER),.035)
    plate('left crossing low silver blade',[
        (-1.68,.93,.47),(-1.08,.75,.68),(-.83,.37,.73),(-1.46,.60,.66)],.075,(FACE,SILVER,ICE),.035)
    # Jagged low clusters keep the sides intricate rather than a regular row.
    for i,(x,z,w,h,lx) in enumerate([
        (-1.97,.50,.23,.58,.045),(-1.74,.61,.27,.91,-.065),
        (-1.40,.60,.25,.71,.07),(-1.02,.56,.30,1.08,-.08),
        (-.74,.63,.23,.64,.03),(-.18,.66,.24,.78,-.08),
        (.21,.66,.29,.54,.06),(.89,.58,.26,.92,.05),
        (1.31,.55,.28,1.05,-.07),(1.72,.54,.28,.73,.06),(1.98,.52,.20,.53,-.02)]):
        blade('low fractured cluster %02d'%i,x,z,w,.20,h,(lx,-.015),.22*math.cos(i),i==8,60+i)
    # A compact real champagne grille references the photographed lower cleft.
    box('V7 | narrow dark cleft behind champagne reeds',(.76,.61,.575),(.20,1.13,.016),JOINT,.001)
    for i in range(7):
        box('V7 | fine dimensional champagne reed',(.675+i*.028,.61,.587),(.009,1.13,.016),GOLD,.001)
    for i,path_points in enumerate([
        [(-.42,2.56,-.07),(-.35,3.02,-.13),(-.36,3.48,-.19)],
        [(-1.12,.57,.61),(-.94,1.22,.34),(-.82,1.96,.04)],
        [(1.08,.42,.62),(1.23,1.30,.24),(1.28,2.10,-.02)]]):
        tube('V7 | selected narrow light-catching arris %d'%i,path_points,.0014,EDGE,5)


def export_model():
    batch_source='def batch_materials():'+SOURCE.split('def batch_materials():')[1].split('objects=batch_materials()')[0]
    exec(compile(batch_source,str(AUTHOR),'exec'),globals())
    objects=batch_materials()
    ao_file=Path(__file__).with_name('bake_technical_ao.py');exec(compile(ao_file.read_text(encoding='utf-8'),str(ao_file),'exec'),globals())
    ao=bake_technical_ao(objects,samples=32,max_distance=.105,min_factor=.50,max_seconds=100)
    OUT.parent.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,
        export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,
        export_animations=False,export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
    points=[v.co for ob in objects for v in ob.data.vertices]
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    stats={'file':OUT.name,'bytes':OUT.stat().st_size,'meshes':len(objects),
        'vertices':sum(len(ob.data.vertices) for ob in objects),
        'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects),
        'bounds':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}}
    layout={'version':7,'authoringScale':1,'authoringSpace':'Three XYZ, front +Z, bottom Y0',
        'reference':'codex-clipboard-9b0cc574-b6fa-41e9-afc8-1133772084b9.png',
        'placement':{'position':[0,1.25,-1.25],'scale':[1.22,1.34,1.22],'parentRuntimeScale':3},
        'projectionDomain':DOMAIN,'materialRoles':[ob.data.materials[0].name for ob in objects],
        'crystals':DETAILS,'ambientOcclusion':ao,'stats':stats,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
        'designNotes':['Slim rear highest apex; off-axis kinked cross-sections.','True folded foreground lamellae and dense low side shards.','No uninterrupted broad front quads or previous regular-prism geometry.']}
    LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
    print('V7_CRYSTALS_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)


def preview():
    QA.mkdir(parents=True,exist_ok=True);MEDIA.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    try:
        pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices();gpu=False
        for device in pref.devices:device.use=device.type=='OPTIX';gpu=gpu or device.use
        if gpu:scene.cycles.device='GPU'
    except Exception as error:print('GPU_PREVIEW_FALLBACK '+str(error),flush=True)
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.15
    scene.world.use_nodes=True;world=scene.world.node_tree.nodes.get('Background');world.inputs['Color'].default_value=(.006,.012,.024,1);world.inputs['Strength'].default_value=.20
    floor=role('QA V7 navy floor',(.008,.014,.022),.20,.40)
    box('QA V7 isolated floor',(0,-.045,0),(40,.06,40),floor,0)
    def area(name,p,power,color,size,target):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(p);ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
    area('V7 warm restrained key',(-3,5.2,6),420,(1,.87,.68),4,(0,1.8,0))
    area('V7 ice-blue facet fill',(4,3.5,5),280,(.58,.77,1),3.5,(0,1.8,0))
    area('V7 champagne rear grazing',(-1,4,-3),580,(1,.70,.37),3,(0,1.8,0))
    camera=bpy.data.cameras.new('V7 isolated crystal camera');cam=bpy.data.objects.new(camera.name,camera);bpy.context.collection.objects.link(cam)
    cam.location=xyz((-3.8,1.65,14.5));cam.rotation_euler=(Vector(xyz((0,1.76,0)))-cam.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=6.9;scene.camera=cam
    scene.render.filepath=str(QA/'crystals-v7-clay.png');bpy.ops.render.render(write_still=True)
    texture=bpy.data.images.load(str(ROOT/'public/media/projection-mapping-v6/crystal-caustic.webp'),check_existing=True)
    for mat in(FACE,ICE,RETURN,GOLD,SILVER):
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
        pos=nodes.new('ShaderNodeNewGeometry');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(pos.outputs['Position'],sep.inputs[0])
        mx=nodes.new('ShaderNodeMath');mx.operation='MULTIPLY_ADD';mx.inputs[1].default_value=1/4.3;mx.inputs[2].default_value=.5
        my=nodes.new('ShaderNodeMath');my.operation='DIVIDE';my.inputs[1].default_value=3.55;links.new(sep.outputs['X'],mx.inputs[0]);links.new(sep.outputs['Z'],my.inputs[0])
        uv=nodes.new('ShaderNodeCombineXYZ');links.new(mx.outputs[0],uv.inputs[0]);links.new(my.outputs[0],uv.inputs[1])
        image=nodes.new('ShaderNodeTexImage');image.image=texture;image.extension='EXTEND';links.new(uv.outputs[0],image.inputs[0])
        tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1
        tint.inputs[2].default_value=(.58,.78,.96,1) if mat==ICE else (.92,.94,.96,1) if mat==FACE else (.65,.47,.25,1) if mat==GOLD else (.38,.48,.59,1) if mat==SILVER else (.75,.72,.65,1)
        links.new(image.outputs['Color'],tint.inputs[1]);links.new(tint.outputs[0],bsdf.inputs['Emission Color'])
        if mat in(FACE,ICE):links.new(tint.outputs[0],bsdf.inputs['Base Color'])
        bsdf.inputs['Emission Strength'].default_value=.35 if mat==FACE else .27 if mat==ICE else .07
    scene.render.filepath=str(QA/'crystals-v7-mapped.png');bpy.ops.render.render(write_still=True)
    shutil.copyfile(scene.render.filepath,MEDIA/'crystals-hero.png')
    print('V7_CRYSTALS_PREVIEW_READY '+str(QA/'crystals-v7-mapped.png'),flush=True)


if '--render-only' in sys.argv:
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    for ob in bpy.context.scene.objects:
        if ob.type!='MESH':continue
        for mat in ob.data.materials:
            if 'pale blue secondary facet' in mat.name:ICE=mat
            elif 'white projected sculpted facade' in mat.name:FACE=mat
            elif 'ivory sculpted return' in mat.name:RETURN=mat
            elif 'champagne gold facet' in mat.name:GOLD=mat
            elif 'brushed silver facet' in mat.name:SILVER=mat
            elif 'warm narrow architectural rib' in mat.name:EDGE=mat
            elif 'dark crystal recessed joint' in mat.name:JOINT=mat
else:
    construct();export_model()
if '--geometry-only' not in sys.argv:preview()
