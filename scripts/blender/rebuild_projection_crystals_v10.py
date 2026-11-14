"""V10 projection maquette: broad stepped architectural crystal masses.

Native Three XYZ, front +Z.  No reference pixels or inherited needle skyline.
Use --draft for geometry review before the final contact-occlusion bake.
"""
from pathlib import Path
import json,hashlib,math,sys,shutil

BASE=Path(__file__).with_name('rebuild_projection_crystals_v7.py')
BASE_SOURCE=BASE.read_text(encoding='utf-8')
exec(compile(BASE_SOURCE.split('def construct():')[0],str(BASE),'exec'))
OUT=ROOT/'public/models/expo/projection-crystals-v10.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-crystals-v10-layout.json'
QA=ROOT/'qa/projection-mapping-v10'
MEDIA=ROOT/'public/media/projection-mapping-v10'
DOMAIN={'min':[-2.15,0],'max':[2.15,3.55]}
DETAILS=[]
FRONT_SECTIONS={}
AMBER=role('mapped amber primary facet',(.68,.61,.43),.14,.43)
MATERIALS.append(AMBER)


def closed_mass(name,x,z,width,depth,roof,*,lean=(0,0),spin=0,
                front_roles=(FACE,ICE),side_role=SILVER,hinge=.58,fold=.035,crown_base=None,
                lower_front_roles=None):
    """Three full-width pentagonal sections create a solid folded building.

    Roof is five corner heights, not a single converging needle. Two broad
    front planes meet at a structural arris and kink once across their height.
    The oblique top remains a substantial cut cap at the full body width.
    """
    upper_names=('highest left of centre slanted silver crown','central notched blue architectural fold',
        'left champagne cut medium block','right rear silver architectural tower',
        'right foreground broad white champagne mass')
    if name in upper_names:x+=.40
    shape=[(-.50,.35),(-.045,.56),(.50,.35),(.46,-.50),(-.46,-.50)]
    bottom=.035;points=[]
    angle=spin;c,s=math.cos(angle),math.sin(angle)
    section_count=4 if crown_base is not None else 3
    for level in range(section_count):
        for j,(sx,sz) in enumerate(shape):
            y=bottom if level==0 else roof[j]*hinge if level==1 else crown_base if section_count==4 and level==2 else roof[j]
            t=0 if level==0 else hinge if level==1 else crown_base/max(roof) if section_count==4 and level==2 else 1
            # Broad fracture sections shift and contract, producing genuine
            # oblique edges without converging to a forest of pointed needles.
            section_width=1.0 if level==0 else 1.08 if level==1 else .78
            section_depth=1.0 if level==0 else 1.02 if level==1 else .80
            xx=sx*width*section_width+lean[0]*t
            zz=sz*depth*section_depth+lean[1]*t
            if name.startswith('highest') and crown_base is not None and level>=2 and j<3:
                zz=.35*depth*.80+lean[1]*t
            if level==1:
                y+=max(roof)*(-.17,.10,-.045,.025,-.075)[j]
                xx+=width*(-.10,.17,.04,0,-.02)[j]
                if j==1:zz+=fold*2.4
            points.append((x+c*xx-s*zz,y,z+s*xx+c*zz))
    FRONT_SECTIONS[name]=[[Vector(points[level*5+j]) for j in range(3)] for level in range(section_count)]
    faces=[(4,3,2,1,0)];roles=[JOINT]
    for level in range(section_count-1):
        for side in range(5):
            k=(side+1)%5
            if crown_base is not None and level==2 and side<2:
                if side==0:
                    faces.append((level*5,level*5+2,(level+1)*5+2,(level+1)*5+1,(level+1)*5))
                    roles.append(RETURN)
                continue
            corners=(level*5+side,level*5+k,(level+1)*5+k,(level+1)*5+side)
            if side<2:
                mat=(RETURN if crown_base is not None and level==2 else
                    lower_front_roles[side] if level==0 and lower_front_roles else front_roles[side])
            elif side==4:mat=RETURN
            else:mat=side_role
            # A few giant noncoplanar triangular folds replace blank quads.
            if side<2 and level==1:
                center=sum((Vector(points[i]) for i in corners),Vector())/4
                center.z+=.035+width*.055;center.x+=width*(.035 if side==0 else -.035)
                ci=len(points);points.append(tuple(center))
                for part in range(4):
                    faces.append((corners[part],corners[(part+1)%4],ci))
                    roles.append(mat if mat in(AMBER,SILVER,RETURN,GOLD) else ICE if part in(0,2) else mat)
            else:faces.append(corners);roles.append(mat)
    # The pitched, slanted cut has only three large cap planes.
    top=(section_count-1)*5
    faces.extend([(top,top+1,top+4),(top+1,top+3,top+4),(top+1,top+2,top+3)])
    roles.extend([RETURN,RETURN if name.startswith('highest') else SILVER,RETURN])
    ob=solid(name,points,faces,roles,.0045 if width>.5 else .003)
    ob.name=ob.name.replace('V7 |','V10 |')
    DETAILS.append({'name':name,'kind':'broad full width folded architectural prism',
        'centreXZ':[x,z],'width':width,'depth':depth,'roofHeights':list(roof),
        'lean':list(lean),'spin':spin,'structuralSections':section_count,'whiteCrownBase':crown_base,
        'frontRoles':[m.name for m in front_roles],
        'lowerFrontRoles':[m.name for m in lower_front_roles] if lower_front_roles else None,
        'closedSolid':True})
    return ob


def compact_rock(name,x,z,width,depth,height,spin=0,warm=False):
    """Closed low irregular rock crystal with offset crown and broad facets."""
    shape=[(-.50,.22),(-.17,.53),(.41,.40),(.51,-.13),(.19,-.50),(-.43,-.34)]
    c,s=math.cos(spin),math.sin(spin);points=[]
    for level in range(3):
        for j,(sx,sz) in enumerate(shape):
            scale=(.90,1.0,.40)[level]
            xx=sx*width*scale+(0,.035,-.11)[level]*width
            zz=sz*depth*scale+(0,.025,-.10)[level]*depth
            yy=.035 if level==0 else height*(.32,.53,.39,.46,.31,.47)[j] if level==1 else height*(.79,.94,.82,1.0,.76,.87)[j]
            points.append((x+c*xx-s*zz,yy,z+s*xx+c*zz))
    faces=[tuple(range(5,-1,-1))];roles=[JOINT]
    for level in range(2):
        for j in range(6):
            k=(j+1)%6;faces.append((level*6+j,level*6+k,(level+1)*6+k,(level+1)*6+j))
            roles.append(AMBER if warm and j in(0,2,5) else ICE if j in(0,1) else FACE if j in(2,5) else SILVER)
    faces.extend([(12,13,17),(13,16,17),(13,14,16),(14,15,16)])
    roles.extend([RETURN,AMBER if warm else FACE,RETURN,SILVER])
    ob=solid(name,points,faces,roles,.004);ob.name=ob.name.replace('V7 |','V10 |')
    DETAILS.append({'name':name,'kind':'compact interlocking faceted rock','centreXZ':[x,z],
        'width':width,'depth':depth,'height':height,'warmFaces':warm})
    return ob


def radial_foot():
    """Low convex footprint follows actual rock bases instead of a rectangle."""
    cloud={(-2.15,0),(2.15,0),(0,1.45),(0,-1.90)}
    for ob in bpy.context.scene.objects:
        if ob.type!='MESH':continue
        for v in ob.data.vertices:
            p=ob.matrix_world@v.co
            if .025<p.z<.085:cloud.add((round(p.x,4),round(-p.y,4)))
    def cross(o,a,b):return(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    ordered=sorted(cloud);low=[];high=[]
    for p in ordered:
        while len(low)>=2 and cross(low[-2],low[-1],p)<=0:low.pop()
        low.append(p)
    for p in reversed(ordered):
        while len(high)>=2 and cross(high[-2],high[-1],p)<=0:high.pop()
        high.append(p)
    outline=low[:-1]+high[:-1]
    # Exact circular-stage containment; only the nearly invisible base edge
    # is inset when it approaches the dais radius.
    bounded=[]
    for x,z in outline:
        length=math.hypot(1.22*x,1.22*z+.20)
        if length>2.885:
            fac=2.885/length;x*=fac;z=((1.22*z+.20)*fac-.20)/1.22
        bounded.append((x,z))
    n=len(bounded);points=[(x,y,z) for y in(0,.032) for x,z in bounded]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces.extend((j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n))
    solid('compact radial dark maquette foot',points,faces,[JOINT]*len(faces),.001)


def folded_plane(name,outline,thickness=.12,roles=(RETURN,FACE,ICE),ridge=.04):
    ob=plate(name,outline,thickness,roles,ridge)
    ob.name=ob.name.replace('V7 |','V10 |')
    return ob


def integral_section_folds(name,section,width=.105,depth=.045):
    """Thin white folded arrises follow the actual prism's two hinge edges.

    Their back faces enter the solid facade by .033m, instead of floating as
    an unrelated diagonal plank in front of the architectural mass.
    """
    for index,(start,end) in enumerate(zip(section,section[1:])):
        direction=(end-start).normalized()
        across=Vector((direction.y,-direction.x,0)).normalized()*width*.5
        out=Vector((0,0,.012))
        outline=[tuple(start-across+out),tuple(start+across+out),
            tuple(end+across+out),tuple(end-across+out)]
        folded_plane(name+' '+str(index),outline,depth,(RETURN,RETURN,RETURN,RETURN),.007)


def construct_v10():
    # A stepped asymmetric skyline: one broad highest monolith left of centre,
    # a notched blue fold alongside it, and progressively lower right masses.
    closed_mass('highest left of centre slanted silver crown',-.32,-.29,.67,.66,
        (3.55,3.29,3.12,3.04,3.34),lean=(-.025,-.015),spin=-.045,
        front_roles=(SILVER,ICE),lower_front_roles=(SILVER,FACE),hinge=.56,fold=.055,crown_base=3.09)
    closed_mass('central notched blue architectural fold',.27,-.015,.67,.60,
        (3.05,2.81,3.12,2.98,3.03),lean=(.105,-.035),spin=-.045,
        front_roles=(ICE,ICE),hinge=.51,fold=.065)
    closed_mass('left champagne cut medium block',-1.01,-.13,.63,.62,
        (2.18,2.62,2.29,2.13,2.42),lean=(-.08,-.02),spin=-.105,
        front_roles=(AMBER,SILVER),lower_front_roles=(FACE,SILVER),hinge=.59,fold=.04)
    closed_mass('right rear silver architectural tower',.87,-.39,.64,.61,
        (2.47,2.78,2.40,2.47,2.60),lean=(-.07,0),spin=.065,
        front_roles=(FACE,SILVER),hinge=.56,fold=.035)
    closed_mass('right foreground broad white champagne mass',1.35,.075,.73,.61,
        (1.86,2.28,1.83,1.84,2.03),lean=(-.11,-.01),spin=-.11,
        front_roles=(AMBER,ICE),lower_front_roles=(SILVER,FACE),hinge=.54,fold=.055)
    closed_mass('left intermediate stepped ice building',-1.47,.015,.55,.54,
        (1.64,1.88,1.70,1.65,1.82),lean=(.005,-.01),spin=-.04,
        front_roles=(ICE,FACE),hinge=.56,fold=.03)
    closed_mass('outer left low broad slanted building',-1.85,.22,.48,.48,
        (1.24,1.48,1.34,1.31,1.41),lean=(.015,0),spin=-.05,
        front_roles=(FACE,ICE),hinge=.58,fold=.03)
    closed_mass('outer right low folded return building',1.86,.10,.40,.48,
        (1.12,1.42,1.26,1.18,1.32),lean=(-.015,.01),spin=.035,
        front_roles=(FACE,RETURN),hinge=.55,fold=.025)
    compact_rock('left low warm interlocking rock',-1.25,.44,.84,.52,1.13,-.10,True)
    compact_rock('central low folded blue rock',-.42,.44,.91,.54,1.02,.12,False)
    compact_rock('right low champagne fractured rock',.66,.43,.86,.50,1.17,-.12,True)
    compact_rock('outer left broken foot rock',-1.85,.49,.43,.43,.63,.22,False)
    compact_rock('outer right broken foot rock',1.80,.46,.51,.48,.78,-.17,True)
    compact_rock('left rear radial ivory crystal',-1.63,-.68,.73,.63,1.30,.29,False)
    compact_rock('left rear rising warm fracture',-.95,-1.03,.80,.68,1.56,-.24,True)
    compact_rock('rear central low blue fracture',-.08,-1.58,.79,.66,1.64,.08,False)
    compact_rock('rear right radial champagne rock',.84,-1.11,.77,.63,1.20,-.22,True)
    compact_rock('right rear outer ivory crystal',1.59,-.73,.57,.65,1.06,-.31,False)
    # The four-angle reference shows a radial maquette with real fractured
    # depth, rather than a shallow skyline arranged across the back of a dais.
    # Only low terraces extend forward; all calibrated upper landmarks stay.
    compact_rock('front left radial blue folded rock',-.45,.98,.70,.75,.72,-.18,False)
    compact_rock('front right radial warm folded rock',.47,1.02,.73,.70,.89,.12,True)
    compact_rock('central foremost low ivory crystal',.02,1.145,.60,.53,.58,0,False)
    # Five giant folded planes create the angular foreground planes in the
    # reference. They have real returns and .10-.14m physical thickness.
    integral_section_folds('central integral diagonal ivory hinge fold',
        FRONT_SECTIONS['highest left of centre slanted silver crown'][1],.105,.045)
    folded_plane('left broad crossing blue fold',[
        (-1.86,1.22,.44),(-1.47,.95,.55),(-.82,.44,.75),(-1.13,.21,.76),(-1.79,.78,.60)],
        .12,(AMBER,ICE,FACE,RETURN),.055)
    folded_plane('left central ascending white folded plane',[
        (-.98,.07,.75),(-.93,1.25,.36),(-.69,1.59,.25),(-.45,1.30,.39),(-.58,.17,.75)],
        .13,(ICE,AMBER,FACE,ICE),.06)
    folded_plane('right intermediate broad folded shoulder',[
        (.59,.055,.75),(.57,1.27,.38),(.85,1.63,.24),(1.04,1.44,.32),(1.07,.10,.73)],
        .11,(ICE,FACE,RETURN,FACE),.04)
    folded_plane('outer right low slanted folded plate',[
        (1.57,.055,.71),(1.56,.61,.53),(2.035,1.13,.29),(2.10,1.06,.24),(1.98,.16,.67)],
        .12,(FACE,RETURN,ICE,RETURN),.035)
    # Real recessed dark joints and one warm reeded cleft add believable depth.
    box('V10 | dark narrow joint behind gold fins',(1.39,.59,.625),(.22,1.11,.018),JOINT,.001)
    for i in range(8):
        box('V10 | dimensional champagne cleft fin',(1.296+i*.028,.59,.642),(.0085,1.11,.022),GOLD,.001)
    hinge=FRONT_SECTIONS['highest left of centre slanted silver crown'][1]
    for i,path in enumerate([
        [tuple(p+Vector((0,0,.014))) for p in hinge],
        [(-1.86,1.22,.442),(-1.47,.95,.552)]
    ]):tube('V10 | selected fine structural arris %d'%i,path,.0016,EDGE,5)
    radial_foot()


def export_v10():
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
    layout={'version':10,'authoringScale':1,'authoringSpace':'Three XYZ, front +Z, bottom Y0',
        'reference':'ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png',
        'fourAngleReference':'ChatGPT Image Oct 17, 2026, 05_54_19 PM-1.png',
        'sourceSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'placement':{'position':[0,1.25,-1.25],'scale':[1.22,1.34,1.22],'parentRuntimeScale':3},
        'projectionDomain':DOMAIN,'materialRoles':[ob.data.materials[0].name for ob in objects],
        'crystals':DETAILS,'ambientOcclusion':ao,'stats':stats,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
        'materialSurfaceAreaNativeSquareMetres':{ob.data.materials[0].name:sum(poly.area for poly in ob.data.polygons) for ob in objects},
        'designNotes':['Eleven substantial full-width architectural masses, not tapered needle crystals.',
            'Off-centre left high oblique crown, notched central blue mass, stepped descending right side.',
            'Upper five masses and their attached fins shifted +.40X to match measured reference apex; low composition stays fixed.',
            'Five large closed folded planes with actual depth, cut caps and recessed gold fin cleft.',
            'Mapped amber primary facet is projection-compatible and distinct from physical gold.',
            'Low central front and rear rocks extend native Z to[-1.90,1.45] within the actual circular dais.',
            'Highest cap is one left-high oblique cut, with a lower adjacent blue fork and unchanged nominal maximum3.55m.',
            'Amber is confined to selected upper facets; physical silver and ivory front facets retain their roles.',
            'Two thin integrated section folds replace the detached diagonal plank; their backs overlap their real structural facade.']}
    LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
    print('V10_CRYSTALS_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)


def preview_v10():
    # Reuse the established neutral and geometry-projected preview lighting.
    preview_source='def preview():'+BASE_SOURCE.split('def preview():')[1].split("if '--render-only' in sys.argv:")[0]
    preview_source=preview_source.replace('V7','V10').replace('v7-clay','v10-clay').replace('v7-mapped','v10-mapped')
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
    # Mirror the agreed native field direction in the isolated monitor render:
    # fine branching light dominates over rounded refractive cells. Both
    # sources are original mathematical light fields, without architecture.
    branches=nodes.new('ShaderNodeTexImage')
    branches.image=bpy.data.images.load(str(ROOT/'public/media/projection-mapping-v3/sculpture-caustics.webp'),check_existing=True)
    branches.extension='EXTEND'
    links.new(image.inputs['Vector'].links[0].from_socket,branches.inputs['Vector'])
    field=nodes.new('ShaderNodeMixRGB');field.blend_type='MIX';field.inputs[0].default_value=.78
    links.new(image.outputs['Color'],field.inputs[1]);links.new(branches.outputs['Color'],field.inputs[2])
    if mat!=AMBER:return field.outputs[0]
    # Amber projected light uses the same caustic luminance, not blue multiplied
    # by yellow, which would turn its intended warm face green.
    mono=nodes.new('ShaderNodeRGBToBW');links.new(field.outputs[0],mono.inputs[0])
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
else:construct_v10();export_v10()
if '--geometry-only' not in sys.argv:preview_v10()
