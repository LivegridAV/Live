"""V9 projection maquette: broad stepped architectural crystal masses.

Native Three XYZ, front +Z.  No reference pixels or inherited needle skyline.
Use --draft for geometry review before the final contact-occlusion bake.
"""
from pathlib import Path
import json,hashlib,math,sys,shutil

BASE=Path(__file__).with_name('rebuild_projection_crystals_v7.py')
BASE_SOURCE=BASE.read_text(encoding='utf-8')
exec(compile(BASE_SOURCE.split('def construct():')[0],str(BASE),'exec'))
OUT=ROOT/'public/models/expo/projection-crystals-v9.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-crystals-v9-layout.json'
QA=ROOT/'qa/projection-mapping-v9'
MEDIA=ROOT/'public/media/projection-mapping-v9'
DOMAIN={'min':[-2.15,0],'max':[2.15,3.55]}
DETAILS=[]
AMBER=role('mapped amber primary facet',(.68,.61,.43),.14,.43)
MATERIALS.append(AMBER)


def closed_mass(name,x,z,width,depth,roof,*,lean=(0,0),spin=0,
                front_roles=(FACE,ICE),side_role=SILVER,hinge=.58,fold=.035,crown_base=None):
    """Three full-width pentagonal sections create a solid folded building.

    Roof is five corner heights, not a single converging needle. Two broad
    front planes meet at a structural arris and kink once across their height.
    The oblique top remains a substantial cut cap at the full body width.
    """
    upper_names=('highest left of centre slanted silver crown','central notched blue architectural fold',
        'left champagne cut medium block','right rear silver architectural tower',
        'right foreground broad white champagne mass')
    if name in upper_names:x+=.40
    shape=[(-.50,.43),(.055,.54),(.50,.42),(.50,-.50),(-.50,-.50)]
    bottom=.035;points=[]
    angle=spin;c,s=math.cos(angle),math.sin(angle)
    section_count=4 if crown_base is not None else 3
    for level in range(section_count):
        for j,(sx,sz) in enumerate(shape):
            y=bottom if level==0 else roof[j]*hinge if level==1 else crown_base if section_count==4 and level==2 else roof[j]
            t=0 if level==0 else hinge if level==1 else crown_base/max(roof) if section_count==4 and level==2 else 1
            # Width remains architectural all the way to the oblique roof.
            xx=sx*width+lean[0]*t
            zz=sz*depth+lean[1]*t
            if level==1 and j==1:xx+=width*.075;zz+=fold
            points.append((x+c*xx-s*zz,y,z+s*xx+c*zz))
    faces=[(4,3,2,1,0)];roles=[JOINT]
    for level in range(section_count-1):
        for side in range(5):
            k=(side+1)%5
            faces.append((level*5+side,level*5+k,(level+1)*5+k,(level+1)*5+side))
            if side<2:mat=RETURN if crown_base is not None and level==2 else front_roles[side]
            elif side==4:mat=RETURN
            else:mat=side_role
            roles.append(mat)
    # The pitched, slanted cut has only three large cap planes.
    top=(section_count-1)*5
    faces.extend([(top,top+1,top+4),(top+1,top+3,top+4),(top+1,top+2,top+3)])
    roles.extend([RETURN,RETURN if name.startswith('highest') else SILVER,RETURN])
    ob=solid(name,points,faces,roles,.0045 if width>.5 else .003)
    ob.name=ob.name.replace('V7 |','V9 |')
    DETAILS.append({'name':name,'kind':'broad full width folded architectural prism',
        'centreXZ':[x,z],'width':width,'depth':depth,'roofHeights':list(roof),
        'lean':list(lean),'spin':spin,'structuralSections':section_count,'whiteCrownBase':crown_base,
        'frontRoles':[m.name for m in front_roles],'closedSolid':True})
    return ob


def folded_plane(name,outline,thickness=.12,roles=(RETURN,FACE,ICE),ridge=.04):
    ob=plate(name,outline,thickness,roles,ridge)
    ob.name=ob.name.replace('V7 |','V9 |')
    return ob


def construct_v9():
    box('V9 | thin neutral architectural maquette foot',(0,.016,0),(4.30,.032,1.60),RETURN,.003)
    # A stepped asymmetric skyline: one broad highest monolith left of centre,
    # a notched blue fold alongside it, and progressively lower right masses.
    closed_mass('highest left of centre slanted silver crown',-.32,-.29,.67,.66,
        (3.22,3.55,3.33,3.28,3.29),lean=(-.055,-.015),spin=-.045,
        front_roles=(FACE,FACE),hinge=.56,fold=.055,crown_base=3.18)
    closed_mass('central notched blue architectural fold',.27,-.015,.67,.60,
        (3.18,2.87,3.26,3.15,3.05),lean=(.045,-.035),spin=.018,
        front_roles=(ICE,ICE),hinge=.51,fold=.065)
    closed_mass('left champagne cut medium block',-1.01,-.13,.63,.62,
        (2.31,2.62,2.46,2.42,2.49),lean=(-.025,-.02),spin=-.055,
        front_roles=(AMBER,AMBER),hinge=.59,fold=.04)
    closed_mass('right rear silver architectural tower',.87,-.39,.64,.61,
        (2.59,2.78,2.61,2.58,2.70),lean=(-.025,0),spin=.025,
        front_roles=(FACE,SILVER),hinge=.56,fold=.035)
    closed_mass('right foreground broad white champagne mass',1.35,.075,.73,.61,
        (2.00,2.28,1.96,1.91,2.12),lean=(-.035,-.01),spin=-.06,
        front_roles=(AMBER,ICE),hinge=.54,fold=.055)
    closed_mass('left intermediate stepped ice building',-1.47,.015,.55,.54,
        (1.64,1.88,1.70,1.65,1.82),lean=(.005,-.01),spin=-.04,
        front_roles=(ICE,FACE),hinge=.56,fold=.03)
    closed_mass('outer left low broad slanted building',-1.85,.22,.48,.48,
        (1.24,1.48,1.34,1.31,1.41),lean=(.015,0),spin=-.05,
        front_roles=(FACE,ICE),hinge=.58,fold=.03)
    closed_mass('outer right low folded return building',1.86,.10,.40,.48,
        (1.12,1.42,1.26,1.18,1.32),lean=(-.015,.01),spin=.035,
        front_roles=(FACE,RETURN),hinge=.55,fold=.025)
    # Low foreground terraces are substantial bodies rather than small needles.
    closed_mass('left low blue terrace',-1.14,.43,.68,.44,
        (.94,1.18,.85,.90,1.08),lean=(.025,0),spin=-.025,
        front_roles=(ICE,FACE),hinge=.59,fold=.025)
    closed_mass('central low ivory terrace',-.30,.48,.80,.46,
        (.80,1.12,.72,.71,.95),lean=(0,.015),spin=.025,
        front_roles=(FACE,RETURN),hinge=.55,fold=.035)
    closed_mass('right low silver terrace',.79,.40,.77,.49,
        (.91,1.21,.96,.83,1.08),lean=(.02,0),spin=-.025,
        front_roles=(ICE,SILVER),hinge=.57,fold=.04)
    # Five giant folded planes create the angular foreground planes in the
    # reference. They have real returns and .10-.14m physical thickness.
    folded_plane('central diagonal ivory architectural fold',[
        (-.36,1.31,.39),(-.11,1.46,.38),(.76,.15,.75),(.40,.045,.78)],
        .14,(RETURN,FACE,RETURN,FACE),.045)
    folded_plane('left broad crossing blue fold',[
        (-1.86,1.22,.44),(-1.47,.95,.55),(-.82,.44,.75),(-1.13,.21,.76),(-1.79,.78,.60)],
        .12,(RETURN,ICE,FACE,RETURN),.055)
    folded_plane('left central ascending white folded plane',[
        (-.98,.07,.75),(-.93,1.25,.36),(-.69,1.59,.25),(-.45,1.30,.39),(-.58,.17,.75)],
        .13,(ICE,RETURN,FACE,ICE),.06)
    folded_plane('right intermediate broad folded shoulder',[
        (.59,.055,.75),(.57,1.27,.38),(.85,1.63,.24),(1.04,1.44,.32),(1.07,.10,.73)],
        .11,(ICE,FACE,RETURN,FACE),.04)
    folded_plane('outer right low slanted folded plate',[
        (1.57,.055,.71),(1.56,.61,.53),(2.035,1.13,.29),(2.10,1.06,.24),(1.98,.16,.67)],
        .12,(FACE,RETURN,ICE,RETURN),.035)
    # Real recessed dark joints and one warm reeded cleft add believable depth.
    box('V9 | dark narrow joint behind gold fins',(1.39,.59,.625),(.22,1.11,.018),JOINT,.001)
    for i in range(8):
        box('V9 | dimensional champagne cleft fin',(1.296+i*.028,.59,.642),(.0085,1.11,.022),GOLD,.001)
    for i,path in enumerate([
        [(.006,.06,.31),(.04,1.65,.35),(.0,3.15,.29)],
        [(-1.275,.05,.105),(-1.30,1.31,.12),(-1.30,2.30,.09)]
    ]):tube('V9 | selected fine structural arris %d'%i,[(x+.40,y,z) for x,y,z in path],.0016,EDGE,5)


def export_v9():
    batch_source='def batch_materials():'+SOURCE.split('def batch_materials():')[1].split('objects=batch_materials()')[0]
    exec(compile(batch_source,str(AUTHOR),'exec'),globals())
    objects=batch_materials()
    if '--draft' in sys.argv:ao={'draft':True,'samples':0}
    else:
        ao_file=Path(__file__).with_name('bake_technical_ao.py')
        exec(compile(ao_file.read_text(encoding='utf-8'),str(ao_file),'exec'),globals())
        ao=bake_technical_ao(objects,samples=32,max_distance=.10,min_factor=.58,max_seconds=100)
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
    layout={'version':9,'authoringScale':1,'authoringSpace':'Three XYZ, front +Z, bottom Y0',
        'reference':'ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png',
        'placement':{'position':[0,1.25,-1.25],'scale':[1.22,1.34,1.22],'parentRuntimeScale':3},
        'projectionDomain':DOMAIN,'materialRoles':[ob.data.materials[0].name for ob in objects],
        'crystals':DETAILS,'ambientOcclusion':ao,'stats':stats,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
        'designNotes':['Eleven substantial full-width architectural masses, not tapered needle crystals.',
            'Off-centre left high oblique crown, notched central blue mass, stepped descending right side.',
            'Upper five masses and their attached fins shifted +.40X to match measured reference apex; low composition stays fixed.',
            'Five large closed folded planes with actual depth, cut caps and recessed gold fin cleft.',
            'Mapped amber primary facet is projection-compatible and distinct from physical gold.']}
    LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
    print('V9_CRYSTALS_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)


def preview_v9():
    # Reuse the established neutral and geometry-projected preview lighting.
    preview_source='def preview():'+BASE_SOURCE.split('def preview():')[1].split("if '--render-only' in sys.argv:")[0]
    preview_source=preview_source.replace('V7','V9').replace('v7-clay','v9-clay').replace('v7-mapped','v9-mapped')
    preview_source=preview_source.replace("xyz((-3.8,1.65,14.5))","xyz((-3.28,.30,13.81))")
    preview_source=preview_source.replace("camera.type='ORTHO';camera.ortho_scale=6.9", "camera.type='PERSP';camera.lens=72;camera.sensor_width=36")
    preview_source=preview_source.replace('for mat in(FACE,ICE,RETURN,GOLD,SILVER):','for mat in(FACE,ICE,RETURN,GOLD,SILVER,AMBER):')
    preview_source=preview_source.replace("else (.65,.47,.25,1) if mat==GOLD", "else (.80,.57,.22,1) if mat==AMBER else (.65,.47,.25,1) if mat==GOLD")
    preview_source=preview_source.replace("(.58,.78,.96,1) if mat==ICE else (.92,.94,.96,1)","(.25,.55,1.0,1) if mat==ICE else (.62,.78,.96,1)")
    preview_source=preview_source.replace("(.80,.57,.22,1) if mat==AMBER","(.95,.55,.14,1) if mat==AMBER")
    preview_source=preview_source.replace("links.new(image.outputs['Color'],tint.inputs[1])","links.new(preview_signal(nodes,links,image,mat),tint.inputs[1])")
    preview_source=preview_source.replace(".35 if mat==FACE else .27", ".35 if mat in(FACE,AMBER) else .27")
    preview_source=preview_source.replace("if mat in(FACE,ICE):","if mat in(FACE,ICE,AMBER):")
    exec(compile(preview_source,str(BASE),'exec'),globals())
    preview()


def preview_signal(nodes,links,image,mat):
    if mat!=AMBER:return image.outputs['Color']
    # Amber projected light uses the same caustic luminance, not blue multiplied
    # by yellow, which would turn its intended warm face green.
    mono=nodes.new('ShaderNodeRGBToBW');links.new(image.outputs['Color'],mono.inputs[0])
    return mono.outputs[0]


if '--render-only' in sys.argv:
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    for ob in bpy.context.scene.objects:
        if ob.type!='MESH':continue
        for mat in ob.data.materials:
            if 'mapped amber primary facet' in mat.name:AMBER=mat
            elif 'pale blue secondary facet' in mat.name:ICE=mat
            elif 'white projected sculpted facade' in mat.name:FACE=mat
            elif 'ivory sculpted return' in mat.name:RETURN=mat
            elif 'champagne gold facet' in mat.name:GOLD=mat
            elif 'brushed silver facet' in mat.name:SILVER=mat
            elif 'warm narrow architectural rib' in mat.name:EDGE=mat
            elif 'dark crystal recessed joint' in mat.name:JOINT=mat
else:construct_v9();export_v9()
if '--geometry-only' not in sys.argv:preview_v9()
