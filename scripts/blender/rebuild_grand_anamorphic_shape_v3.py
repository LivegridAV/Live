"""Reference-shaped Content Studio, architectural LED cutaway revision.

Native Three XYZ metres. New assets only; selected sculpture artwork, folded
LED, basin and gallery identity are retained. The real cabinet and emitting
surface have the same six-point open lower-left profile. No photo planes.
"""
from pathlib import Path
import hashlib

OLD=Path(__file__).with_name('rebuild_anamorphic_stall.py')
exec(compile(OLD.read_text(encoding='utf-8').split('# Tall convex L-corner')[0],str(OLD),'exec'))
HUMAN_HELPER=Path(__file__).with_name('technical_humans.py')
exec(compile(HUMAN_HELPER.read_text(encoding='utf-8'),str(HUMAN_HELPER),'exec'))
CFG=json.loads((ROOT/'public/models/expo/grand-dimensions.json').read_text())
M=CFG['master'];F=M['floor'];TOP=M['fasciaTop'];OUTDIR=ROOT/'public/models/expo'
ROOT_ANCHOR=CFG['placements']['anamorphic']['root'];ROOT_YAW=CFG['placements']['anamorphic']['yaw']
APERTURES=[];JETS=[];ROLE_BOUNDS=[];EXPORTS={};SIGNS=[];PLANTS=[]
FOLD=(7.00,1.70);LW=14.00;RW=8.70;BOTTOM=.80;LED_TOP=11.70
LEFT_CUTOUT={'right':-5.70,'top':8.25}
CABINET_DEPTH=.24
# Clockwise as seen from the front. The lower-left region is genuinely absent.
LEFT_OUTLINE=[[-LW,LEFT_CUTOUT['top']],[-LW,LED_TOP],[0,LED_TOP],
              [0,BOTTOM],[LEFT_CUTOUT['right'],BOTTOM],
              [LEFT_CUTOUT['right'],LEFT_CUTOUT['top']]]
RIGHT_OUTLINE=[[0,BOTTOM],[0,LED_TOP],[-RW,LED_TOP],[-RW,BOTTOM]]
STUDIO_TOP=11.55;PORTAL_UNDERSIDE=9.26;ROOM_ROOF=8.34;GALLERY_TOP=10.38
INTERIOR_CEILING_TOP=8.20
ROOM_XMIN=-11.70;ROOM_XMAX=1.33;ROOM_WIDTH=ROOM_XMAX-ROOM_XMIN
PORTAL_B=(-7.50,7.70);PORTAL_A=(-6.00,0.00)
PORTAL_WIDTH=math.hypot(PORTAL_A[0]-PORTAL_B[0],PORTAL_A[1]-PORTAL_B[1])
PORTAL_YAW=math.atan2(PORTAL_B[1]-PORTAL_A[1],PORTAL_A[0]-PORTAL_B[0])
BOTANIC=material('Content Studio | natural varied olive foliage',(.055,.105,.030),0,.74)
SOIL=material('Content Studio | granular dark potting soil',(.018,.012,.007),0,.97)
STEM=material('Content Studio | natural branch bark',(.11,.075,.039),0,.86)
leaf_maps=ROOT/'public/media/projection-mapping-v11/botanical'
for filename,socket,normal in(('leaf-atlas-basecolor.png','Base Color',False),('leaf-atlas-normal.png','Normal',True)):
    image=bpy.data.images.load(str(leaf_maps/filename),check_existing=True);image.pack()
    image_node=BOTANIC.node_tree.nodes.new('ShaderNodeTexImage');image_node.image=image
    bsdf=BOTANIC.node_tree.nodes.get('Principled BSDF')
    if normal:
        image.colorspace_settings.name='Non-Color'
        detail=BOTANIC.node_tree.nodes.new('ShaderNodeNormalMap');detail.inputs['Strength'].default_value=.20
        BOTANIC.node_tree.links.new(image_node.outputs['Color'],detail.inputs['Color']);BOTANIC.node_tree.links.new(detail.outputs['Normal'],bsdf.inputs['Normal'])
    else:BOTANIC.node_tree.links.new(image_node.outputs['Color'],bsdf.inputs[socket])

def bounds(objects):
    bpy.context.view_layer.update();pts=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    return {'min':[min(p.x for p in pts),min(p.z for p in pts),-max(p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),-min(p.y for p in pts)]} if pts else None

def record(role,before,overhead=False):
    objects=set(bpy.context.scene.objects)-before
    for ob in objects:
        if ob.type=='MESH':ob['grandRole']='section-wall' if role=='gallery-wall' else role;ob['grandOverhead']=overhead
    ROLE_BOUNDS.append({'role':role,'bounds':bounds(objects),'overhead':overhead});return objects

def lift_native(before):
    objects=set(bpy.context.scene.objects)-before
    for ob in objects:
        if ob.parent not in objects:ob.location.z+=F

def batch_export(name,objects):
    bpy.context.view_layer.update();meshes=[ob for ob in objects if ob.type=='MESH']
    for ob in meshes:
        matrix=ob.matrix_world.copy();ob.data=ob.data.copy();ob.parent=None;ob.matrix_world=matrix
    groups={}
    for ob in meshes:
        key=(ob.get('grandRole','detail'),ob.get('grandOverhead',False),ob.data.materials[0].name)
        groups.setdefault(key,[]).append(ob)
    result=[]
    for (role,overhead,finish),items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in items:ob.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        ob=bpy.context.view_layer.objects.active;ob.name=f'{name} | {role} | {finish}';ob['grandRole']=role;ob['grandOverhead']=overhead
        ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4);ob.data.update();result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:ob.select_set(True)
    path=OUTDIR/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
    EXPORTS[name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'bounds':bounds(result)}

SIGNAGE_MODULE=premium_signage();SIGNAGE_MODULE.SIGN_LOG.clear()

def flat_label(body,p,height,width,yaw=0,tracking=1.05,centered=False):
    # Existing lettering is a genuine font mesh. Fit uniformly to real width.
    ob=text(body,p,height,yaw,centered,tracking)
    natural=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
    factor=min(1,width/max(natural,.001))
    for v in ob.data.vertices:v.co*=factor
    return ob,natural,factor

def sign_point(p,yaw,u,y,front):
    # A point in a sign's own frame (u along, y up, front toward the visitor),
    # the frame text() and transform() place glyphs in.
    return(p[0]+math.cos(yaw)*u+math.sin(yaw)*front,p[1]+y,p[2]-math.sin(yaw)*u+math.cos(yaw)*front)

def label(body,p,height,width,yaw=0,tracking=1.05,centered=False,*,logo=False,halo_face=None,slogan=True):
    """Every sign here is a premium sign. Copy is built as today and deepened in
    place before batch_export bakes it (local +Z still faces the visitor); the
    wordmark becomes premium_wordmark in today's ink box, or with `logo` the
    grid logo + wordmark fitted to today's wordmark width (premium_lockup's
    rule). `halo_face` (the panel's front, in the sign frame) adds the stall's
    one halo behind the logo and wordmark."""
    if SIGNAGE_MODULE.is_wordmark(body):return label_wordmark(p,height,width,yaw,tracking,logo,halo_face)
    ob,natural,factor=flat_label(body,p,height,width,yaw,tracking,centered)
    SIGNAGE_MODULE.premiumize_lettering([ob],body,slogan=slogan,position=p)
    SIGNS.append({'body':body,'position':list(p),'yaw':yaw,'availableWidth':width,'measuredWidth':natural*factor,'uniformFit':factor,'horizontalAspectRatio':1,'premium':True})
    return ob

def label_wordmark(p,height,width,yaw,tracking,logo,halo_face):
    signs=SIGNAGE_MODULE
    # Today's flat Segoe wordmark, fitted as before, gives the ink box (sign frame).
    old,natural,factor=flat_label('LivegridAV',p,height,width,yaw,tracking)
    x0=min(v.co.x for v in old.data.vertices);x1=max(v.co.x for v in old.data.vertices)
    y0=min(v.co.y for v in old.data.vertices);y1=max(v.co.y for v in old.data.vertices)
    back=min(v.co.z for v in old.data.vertices)
    pivot=old.parent;mesh=old.data
    bpy.data.objects.remove(old,do_unlink=True);bpy.data.meshes.remove(mesh)
    if pivot:bpy.data.objects.remove(pivot,do_unlink=True)
    if logo:
        # premium_lockup's rule (Ruling 10): the pair spans today's ink width,
        # never taller than today's ink, left-aligned, centred on it vertically.
        aspect=_wordmark_aspect(signs)
        h=min(y1-y0,(x1-x0)/(1+LOCKUP_GAP+aspect));total=h*(1+LOCKUP_GAP+aspect)
        left=x0;bottom=(y0+y1-h)/2;eh=h/.80
        signs.premium_emblem(sign_point(p,yaw,left,bottom-.10*eh,back),eh,yaw)
        word_u=left+h*(1+LOCKUP_GAP);word_at=sign_point(p,yaw,word_u,bottom,back)
        obs=signs.premium_wordmark(word_at,h,width=total-h*(1+LOCKUP_GAP),yaw=yaw)
    else:
        word_u=x0;bottom=y0;word_at=sign_point(p,yaw,x0,y0,back)
        obs=signs.premium_wordmark(word_at,y1-y0,width=x1-x0,yaw=yaw)
    bpy.context.view_layer.update()
    along=Vector(xyz((math.cos(yaw),0,-math.sin(yaw))));up=Vector((0,0,1))
    pts=[v.co for ob in obs for v in ob.data.vertices]
    word_w=max(q.dot(along) for q in pts)-min(q.dot(along) for q in pts)
    word_h=max(q.dot(up) for q in pts)-min(q.dot(up) for q in pts)
    if halo_face is not None:
        # The stall's one halo, sized from the fitted wordmark ink as in the
        # approved test: -1.25 h to the wordmark end + .30 h, -.30 h to 1.30 h.
        # premium_halo sits HALO_OFFSET behind its anchor plane, so the anchor
        # plane is the panel face + offset + 4 mm: the wash lies on the panel.
        signs.premium_halo(sign_point(p,yaw,word_u-1.25*word_h,bottom-.30*word_h,halo_face+signs.HALO_OFFSET+.004),
            word_w+1.55*word_h,1.60*word_h,yaw)
    SIGNS.append({'body':'livegridAV','position':list(word_at),'yaw':yaw,'availableWidth':width,'measuredWidth':word_w,'inkHeight':word_h,'uniformFit':1,'horizontalAspectRatio':1,'premium':True,'logo':logo,
        'replaces':{'position':list(p),'inkWidth':x1-x0,'inkHeight':y1-y0,'uniformFit':factor}})
    return obs

def portal_p(u,y,front=0):
    return(PORTAL_B[0]+math.cos(PORTAL_YAW)*u+math.sin(PORTAL_YAW)*front,y,
        PORTAL_B[1]-math.sin(PORTAL_YAW)*u+math.cos(PORTAL_YAW)*front)

def portal_box(name,u,y,w,h,d,mat,front=0,bevel=.012):
    ob=box(name,portal_p(u,y,front),(w,h,d),mat,bevel);ob.rotation_euler[2]=PORTAL_YAW;return ob

def mitred_profile(name,outline,side,depth,mat):
    """Solid native cabinet, cut to its emitting outline, with a 45-degree fold.

    Both leaves share the same outer vertical edge and the same inner diagonal
    edge. Their volumes meet on the mitre plane instead of overlapping cubes or
    exposing a black corner post between the two emitting faces.
    """
    front=[];back=[]
    for u,y in outline:
        if side=='left':
            front.append((FOLD[0]+u,y,FOLD[1]))
            back.append((FOLD[0]+u-(depth if abs(u)<1e-7 else 0),y,FOLD[1]-depth))
        else:
            front.append((FOLD[0],y,FOLD[1]+u))
            back.append((FOLD[0]-depth,y,FOLD[1]+u-(depth if abs(u)<1e-7 else 0)))
    n=len(front);verts=front+back
    faces=[tuple(range(n)),tuple(range(n*2-1,n-1,-1))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    ob=patch_mesh(name,verts,faces,mat)
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    for polygon in ob.data.polygons:polygon.use_smooth=False
    ob['profileSide']=side;ob['profileContour']=json.dumps(outline);ob['foldMitreDegrees']=45
    return ob

def terminate_portal_at_led(ob):
    """Physical joinery trim around the actual profiled LED cabinet only.

    The older portal ran through the widened upper LED wing. Trim its fascia,
    connecting shoulder and soffit to a clearance envelope around the real
    six-point cabinet. The occupied cutaway, separate blade and lettering are
    untouched; this is a mesh Boolean, independent of the display camera.
    """
    gap=.018
    contour=[[-LW-gap,LEFT_CUTOUT['top']-gap],[-LW-gap,LED_TOP+gap],
             [gap,LED_TOP+gap],[gap,BOTTOM-gap],
             [LEFT_CUTOUT['right']-gap,BOTTOM-gap],
             [LEFT_CUTOUT['right']-gap,LEFT_CUTOUT['top']-gap]]
    n=len(contour)
    verts=[(FOLD[0]+x,y,z) for z in(FOLD[1]-CABINET_DEPTH-gap,FOLD[1]+gap) for x,y in contour]
    faces=[tuple(range(n)),tuple(range(n*2-1,n-1,-1))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    cutter=patch_mesh('Temporary actual LED profiled joinery clearance',verts,faces,BLACK)
    bm=bmesh.new();bm.from_mesh(cutter.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cutter.data);bm.free()
    bpy.context.view_layer.update();bpy.context.view_layer.objects.active=ob
    modifier=ob.modifiers.new('Terminate portal behind actual LED cabinet','BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    ob['ledJoineryClearance']=gap
    return ob

def inner_notch_lintel():
    # Native joinery connects the actual portal to the inner screen cut. Its
    # foreground silhouette tapers down toward the opening jamb, while the
    # emitting wing keeps the reference's strict horizontal lower boundary.
    start=Vector(PORTAL_A);end=Vector((FOLD[0]+LEFT_CUTOUT['right'],FOLD[1]))
    along=(end-start).normalized();back=Vector((along.y,-along.x))*.24
    front=[(start.x,9.26,start.y),(start.x,9.50,start.y),
           (end.x,8.24,end.y),(end.x,8.20,end.y)]
    rear=[(x+back.x,y,z+back.y) for x,y,z in front]
    ob=patch_mesh('Content Studio tapered lintel to inner LED cut',front+rear,
        [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],WALL)
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    for polygon in ob.data.polygons:polygon.use_smooth=False
    terminate_portal_at_led(ob)
    reveal=rod('Content Studio tapered lintel quiet warm underside',
        (start.x,9.248,start.y),(end.x,8.188,end.y),.012,COVE,8)
    terminate_portal_at_led(reveal)

# A maximum-height corner display, a lower entrance pavilion and a still lower
# perpendicular application gallery are three distinct joined masses. The
# 24 x 16 m floor reservation is not filled by an arbitrary full-height box.
shell_start=set(bpy.context.scene.objects)
before=set(bpy.context.scene.objects)
box('Content Studio shared 24m x16m mineral platform',(0,F/2,0),(24,F,16),STUDIO_FLOOR,.015)
record('platform',before)
before=set(bpy.context.scene.objects)
box('Content Studio lower full-depth left return',(-11.85,(ROOM_ROOF+F)/2,-.10),(.30,ROOM_ROOF-F,15.8),WALL,.018)
record('side-left',before)
before=set(bpy.context.scene.objects)
box('Content Studio occupied-room rear enclosure',((ROOM_XMIN+ROOM_XMAX)/2,(ROOM_ROOF+F)/2,-7.85),(ROOM_WIDTH,ROOM_ROOF-F,.30),WALL,.018)
record('rear-boundary',before)
before=set(bpy.context.scene.objects)
terminate_portal_at_led(portal_box('Content Studio oblique upper entrance fascia',PORTAL_WIDTH/2,(STUDIO_TOP+PORTAL_UNDERSIDE)/2,PORTAL_WIDTH,STUDIO_TOP-PORTAL_UNDERSIDE,.45,WALL))
label('livegridAV',portal_p(.43,STUDIO_TOP-1.14,.244),1.47,PORTAL_WIDTH-.86,PORTAL_YAW,logo=True,halo_face=.225-.244)
label('CONTENT STUDIO',portal_p(.45,STUDIO_TOP-1.90,.248),.52,PORTAL_WIDTH-.90,PORTAL_YAW,tracking=1.18,slogan=False)
terminate_portal_at_led(portal_box('Content Studio oblique entrance thin warm reveal',PORTAL_WIDTH/2,PORTAL_UNDERSIDE-.018,PORTAL_WIDTH-.12,.024,.025,COVE,.24))
inner_notch_lintel()
record('fascia-brand',before,True)
before=set(bpy.context.scene.objects)
box('Content Studio interior right enclosure',(1.45,(INTERIOR_CEILING_TOP+F)/2,-3.25),(.24,INTERIOR_CEILING_TOP-F,8.90),WALL,.014)
record('studio-return',before)
before=set(bpy.context.scene.objects)
portal_box('Content Studio right entrance portal post',PORTAL_WIDTH-.10,(PORTAL_UNDERSIDE+F)/2,.30,PORTAL_UNDERSIDE-F,.34,BLACK)
portal_box('Content Studio left full-height portal edge',.10,(STUDIO_TOP+F)/2,.30,STUDIO_TOP-F,.34,BLACK)
box('Content Studio thin inner LED opening jamb',(1.21,(INTERIOR_CEILING_TOP+F)/2,1.30),(.18,INTERIOR_CEILING_TOP-F,.80),BLACK,.005)
rod('Content Studio right post canopy bearing',(PORTAL_A[0],7.97,PORTAL_A[1]),(-4.95,7.97,0),.075,BLACK,8)
record('entrance-portal-post',before)
before=set(bpy.context.scene.objects)
portal_box('Content Studio oblique front-left display blade',1.25,(PORTAL_UNDERSIDE+F)/2,2.25,PORTAL_UNDERSIDE-F,.28,WALL)
for i,line in enumerate(('IDEAS','CONTENT','EXPERIENCES','REALITY')):label(line,portal_p(.30,8.25-i*.47,.16),.42,1.84,PORTAL_YAW,tracking=1.08)
portal_box('Content Studio blade quiet underline',.58,6.05,.40,.015,.009,BRAND,.163)
aperture('studio-front-portrait',portal_p(1.25,3.65,.17),2.02,3.78,'studio-coastal-portrait',PORTAL_YAW)
record('entry-brand-blade',before)

# Two perpendicular profiled cabinets with an actual open architectural notch.
# The upper left wing is suspended over the studio entrance; no emitter or
# black backing exists under it. The lower vertical leaf starts at X=1.30m.
before=set(bpy.context.scene.objects)
mitred_profile('Anamorphic six-point left cutaway structural cabinet',LEFT_OUTLINE,'left',CABINET_DEPTH,BLACK)
mitred_profile('Anamorphic perpendicular full right structural cabinet',RIGHT_OUTLINE,'right',CABINET_DEPTH,BLACK)
mitred_profile('Anamorphic short left foundation',[[LEFT_CUTOUT['right'],F],[LEFT_CUTOUT['right'],BOTTOM],[0,BOTTOM],[0,F]],'left',.40,BLACK)
mitred_profile('Anamorphic continuous right foundation',[[0,F],[0,BOTTOM],[-RW,BOTTOM],[-RW,F]],'right',.40,BLACK)
record('corner-display-cabinets',before)
before=set(bpy.context.scene.objects)
mitred_profile('Anamorphic continuous left mitred crown',[[-LW,LED_TOP],[-LW,TOP],[0,TOP],[0,LED_TOP]],'left',.40,WALL)
mitred_profile('Anamorphic continuous right mitred crown',[[0,LED_TOP],[0,TOP],[-RW,TOP],[-RW,LED_TOP]],'right',.40,WALL)
record('corner-crown',before,True)

# The application gallery turns from the RIGHT LED end toward the rear-right
# corner, rather than floating parallel to the left portal or filling a tower.
gallery_start=set(bpy.context.scene.objects)
GX,GZ=FOLD[0],FOLD[1]-RW-.06;GW=4.30;GYAW=math.radians(8)
def gallery_p(u,y,front=.04):return(GX+math.cos(GYAW)*u+math.sin(GYAW)*front,y,GZ-math.sin(GYAW)*u+math.cos(GYAW)*front)
def gallery_box(name,u,y,w,h,d,mat,front=0):
    ob=box(name,gallery_p(u,y,front),(w,h,d),mat,.014);ob.rotation_euler[2]=GYAW;return ob
gallery_box('Content Gallery connected oblique backing',GW/2,(GALLERY_TOP+F)/2,GW,GALLERY_TOP-F,.30,WALL,-.15)
gallery_box('Content Gallery lower wordmark crown',GW/2,GALLERY_TOP-.96,GW,1.92,.53,WALL,.005)
label('livegridAV',gallery_p(.32,GALLERY_TOP-.92,.282),.88,GW-.64,GYAW,logo=True)
label('VISUALS FOR A BRIGHTER TOMORROW',gallery_p(.30,GALLERY_TOP-1.49,.285),.25,GW-.60,GYAW,tracking=1.04)
aperture('gallery-upper-portrait',gallery_p(.90,7.06,.282),1.46,2.54,'gallery-ice-vortex',GYAW)
for i,line in enumerate(('CONTENT','PRODUCTION','VIRTUAL PRODUCTION','LIVE EXPERIENCES','LED SOLUTIONS')):
    label(line,gallery_p(1.88,8.02-i*.40,.29),.26,2.22,GYAW)
for col,hint in enumerate(('gallery-human','gallery-silver-object','gallery-landscape')):
    aperture('gallery-middle-'+str(col),gallery_p(.74+col*1.42,4.67,.282),1.28,1.40,hint,GYAW)
aperture('gallery-lower-orb',gallery_p(.79,3.12,.282),1.38,1.40,'gallery-orb',GYAW)
aperture('gallery-lower-landscape',gallery_p(2.32,3.12,.282),1.50,1.40,'gallery-alpine',GYAW)
for i,line in enumerate(('STORIES','THAT MOVE','PEOPLE')):
    label(line,gallery_p(3.24,3.62-i*.34,.29),.23,.94,GYAW,tracking=1.08)
for i,line in enumerate(('CREATIVE','TECHNOLOGY','HUMAN IMPACT')):
    label(line,gallery_p(2.72,1.65-i*.31,.29),.23,1.48,GYAW,tracking=1.12)
gallery_box('Content Gallery continuous warm toe',GW/2,F+.055,GW-.10,.025,.022,COVE,.29)
record('gallery-wall',gallery_start)

# Layered entrance soffits sit close to the projecting oval canopy. The rear
# consultation zone has a lower ceiling and continuous coves, while the full
# room remains a connected 15.2 m-deep occupied interior.
before=set(bpy.context.scene.objects)
terminate_portal_at_led(portal_box('Content Studio oblique entrance soffit',PORTAL_WIDTH/2,PORTAL_UNDERSIDE-.06,PORTAL_WIDTH,.12,2.46,ROOF,-1.10))
# Independent room wall/roof datum stays 8.34m. This recessed acoustic panel
# stops at 8.20m, leaving .05m below the suspended LED wing cut at 8.25m.
# Keep the established occupied-room panel over its original footprint. The
# extra closure behind the relocated right wall stops at Z=1.20, behind the
# LED cabinet. Extending that closure to the front canopy would create an
# unreferenced projecting roof wedge across the suspended screen wing.
terminate_portal_at_led(box('Content Studio stepped interior acoustic ceiling',(-7.40,INTERIOR_CEILING_TOP-.06,-.99),(8.50,.12,12.56),ROOF,.012))
terminate_portal_at_led(box('Content Studio recessed right ceiling closure',
    ((-3.15+ROOM_XMAX)/2,INTERIOR_CEILING_TOP-.06,(-7.27+1.20)/2),
    (ROOM_XMAX+3.15,.12,1.20+7.27),ROOF,.012))
box('Content Studio low rear consultation soffit',(-7.40,6.67,-6.66),(8.50,.14,2.08),ROOF,.012)
box('Content Studio rear service soffit warm lip',(-7.40,6.585,-5.605),(8.35,.026,.028),COVE,.004)
# A second occupied consultation bay faces the oblique exterior sightline.
# It is genuine side-wall architecture, not a camera-facing room photograph.
box('Content Studio visible left consultation soffit',(-10.20,6.18,4.00),(3.00,.16,6.70),ROOF,.014)
box('Content Studio left consultation front cove',(-10.20,6.085,7.365),(2.90,.026,.025),COVE,.004)
box('Content Studio left consultation inner cove',(-8.685,6.085,4.00),(.026,.026,6.60),COVE,.004)
box('Content Studio left consultation back cove',(-10.20,6.085,.635),(2.90,.026,.025),COVE,.004)
# The blade occupies the front end of the oblique facade (Z>=5.34 m).
# Keep the complete oval behind it, with a measured .44m physical gap, and
# vertically clear below the suspended hero wing by .28m. Its lower cutaway
# edge is X=1.30m, so the existing occupied portal/canopy remains fully open.
CC=(-7.25,.80)
ellipse_band('Studio projecting broad oval black acoustic canopy',CC,(4.18,4.10),.43,7.73,7.97,BLACK)
ellipse_band('Studio continuous inner champagne cove',CC,(4.05,3.97),.026,7.712,7.744,COVE)
ellipse_disk('Studio upper inset oval ceiling',CC,(3.72,3.64),7.88,7.95,ROOF)
ellipse_band('Studio upper island cove',CC,(3.10,3.02),.023,7.83,7.86,COVE)
ellipse_disk('Studio lower offset recessed ceiling island',(-7.25,-.36),(2.70,1.86),7.57,7.71,WALL)
ellipse_band('Studio lower island warm reveal',(-7.25,-.36),(2.67,1.83),.024,7.552,7.578,COVE)
for ring in range(3):
    for i in range(112):
        a=i*math.tau/112+ring*.014;rx,rz=4.00-ring*.17,3.92-ring*.17
        x=CC[0]+math.sin(a)*rx;z=CC[1]+math.cos(a)*rz
        if math.cos(a)<-.55 and abs(math.sin(a))<.65:continue
        bottom=6.72+.34*(.5+.5*math.sin(i*1.71+ring*.8))
        rod('Studio dense varying satin black hanging reed',(x,bottom,z),(x,7.73,z),.0135,BLACK,6)
        if (i+ring)%9==0:rod('Studio reed champagne collar',(x,7.61,z),(x,7.72,z),.018,CHAMPAGNE,6)
for z in(-6,-2,2,6):
    for x in(-10.6,-7.1,-3.8):
        yy=6.57 if z==-6 else PORTAL_UNDERSIDE-.12 if z==6 else ROOM_ROOF-.12
        rod('Studio recessed soffit warm optic',(x,yy,z),(x,yy-.03,z),.055,LENS,12)
record('studio-canopy',before,True)
before=set(bpy.context.scene.objects)
for x in(-11.65,1.20):
    box('Studio full depth concealed side cove',(x,ROOM_ROOF-.18,-1.0),(.024,.024,12.5),COVE,.003)
box('Studio rear recessed warm cove',(-7.45,6.56,-7.66),(8.20,.022,.024),COVE,.003)
record('architectural-lighting',before,True)
batch_export('grand-anamorphic-shape-v3-shell',set(bpy.context.scene.objects)-shell_start)

# Occupied room: rear service/gallery and consultation at distinctly separated
# real depths. A 2m central entry route is kept free of actual furniture bounds.
interior_start=set(bpy.context.scene.objects)
before=set(bpy.context.scene.objects)
aperture('studio-rear-landscape',(-11.66,4.12,4.10),5.60,2.80,'studio-brighter-reality',math.pi/2)
record('rear-gallery-screen',before)
before=set(bpy.context.scene.objects)
aperture('studio-rear-service-landscape',(-7.40,4.12,-7.66),5.60,2.80,'studio-brighter-reality')
record('rear-service-gallery-screen',before)
before=set(bpy.context.scene.objects)
aperture('studio-left-small-screen',(-11.66,3.05,-3.9),1.60,2.20,'studio-forest',math.pi/2)
record('side-gallery-screen',before)
before=set(bpy.context.scene.objects)
box('Studio rear consultation counter',(-7.2,.62,-6.6),(5.8,1.0,.94),BLACK,.035)
box('Studio rear stone countertop',(-7.2,1.1475,-6.6),(5.86,.055,1.0),STUDIO_STONE,.015)
box('Studio rear service desk concealed toe',(-7.2,.15,-6.11),(5.65,.023,.020),COVE,.003)
label('livegridAV',(-9.55,.72,-6.11),.55,4.7)
flowers(-5.10,1.18,-6.6,.36)
for xx in(-8.6,-7.9):drinking_glass(xx,1.18,-6.5,mat=CLEAR_GLASS)
record('rear-service-counter',before)
before=set(bpy.context.scene.objects)
sofa(-10.65,.50,2.45,90);chair(-6.60,-.25,-90);chair(-6.60,-2.0,-90);cocktail_table(-10.15,-1.45)
lift_native(before)
record('rear-lounge',before)
before=set(bpy.context.scene.objects)
sofa(-5.20,-3.25,1.80,0);chair(-4.45,-.65,170);cocktail_table(-4.40,-1.55)
lift_native(before)
record('inner-consultation',before)
before=set(bpy.context.scene.objects)
box('Studio left-wall consultation counter',(-10.35,.62,4.20),(.94,1.0,3.60),BLACK,.035)
box('Studio left-wall honed consultation top',(-10.35,1.1475,4.20),(1.00,.055,3.66),STUDIO_STONE,.015)
box('Studio left-wall counter warm toe',(-9.870,.155,4.20),(.020,.024,3.48),COVE,.003)
label('livegridAV',(-9.866,.72,5.75),.53,3.12,math.pi/2)
flowers(-10.35,1.18,3.12,.34)
for zz in(4.10,4.65):drinking_glass(-10.24,1.18,zz,mat=CLEAR_GLASS)
record('left-consultation-service',before)
before=set(bpy.context.scene.objects);front_sign_start=len(SIGNS);front_log_start=len(SIGNAGE_MODULE.SIGN_LOG)
box('Studio native scale front reception black carcass',(-9.20,.62,6.78),(3.30,1.0,.95),BLACK,.045)
box('Studio native scale front honed countertop',(-9.20,1.1475,6.78),(3.36,.055,1.01),STUDIO_STONE,.018)
box('Studio reception recessed warm toe',(-9.20,.155,7.264),(3.20,.024,.019),COVE,.003)
label('livegridAV',(-10.65,.71,7.269),.66,2.90)
flowers(-8.15,1.18,6.75,.34);drinking_glass(-9.75,1.18,6.90,mat=CLEAR_GLASS)
box('Studio slim tablet on reception',(-9.1,1.29,6.75),(.28,.22,.025),BLACK,.011)
desk_objects=set(bpy.context.scene.objects)-before
desk_origin=Vector(xyz((-9.20,0,6.78)));desk_target=Vector(xyz(portal_p(1.85,0,1.85)))
desk_fit=Matrix.Translation(desk_target)@Matrix.Rotation(PORTAL_YAW,4,'Z')@Matrix.Translation(-desk_origin)
bpy.context.view_layer.update()
for ob in desk_objects:
    if ob.parent not in desk_objects:ob.matrix_world=desk_fit@ob.matrix_world
for sign in SIGNS[front_sign_start:]:
    pp=desk_fit@Vector(xyz(sign['position']));sign['position']=[pp.x,pp.z,-pp.y];sign['yaw']+=PORTAL_YAW
# The premium sign log moves with the reception desk, as the typography does.
for sign in SIGNAGE_MODULE.SIGN_LOG[front_log_start:]:
    pp=desk_fit@Vector(xyz(sign['position']));sign['position']=[round(pp.x,4),round(pp.z,4),round(-pp.y,4)]
record('front-reception',before)

# Basin with deliberate L outline, a narrow continuous lip and actual fractured
# strata. All pieces occupy the forecourt outside the studio entry route.
before=set(bpy.context.scene.objects)
BASIN=[(-.80,1.82),(-.80,7.50),(9.20,7.50),(9.20,-7.15),(7.25,-7.15),(7.25,1.82)]
n=len(BASIN);verts=[(x,y,z) for y in(F,.51) for x,z in BASIN]
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
patch_mesh('Anamorphic closed L basin structural base',verts,faces,BLACK)
for i,a in enumerate(BASIN):
    b=BASIN[(i+1)%n];dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);yaw=math.atan2(-dz,dx)
    lip=box('Anamorphic basalt basin fine raised lip',((a[0]+b[0])/2,.58,(a[1]+b[1])/2),(length+.012,.14,.075),BLACK,.012);lip.rotation_euler[2]=yaw
    light=box('Anamorphic continuous basin recessed warm toe',((a[0]+b[0])/2,.17,(a[1]+b[1])/2),(length+.008,.022,.018),COVE,.003);light.rotation_euler[2]=yaw
label('LIVE IDEAS   LIVING WORLDS',(.55,.28,7.545),.26,5.60,tracking=1.15)
record('basin',before)
before=set(bpy.context.scene.objects)
# Retain the selected interlocking diagonal granite form with actual irregular
# silhouettes; move its native structure into this genuine front basin.
start=set(bpy.context.scene.objects);fractured_diagonal_slab()
for ob in set(bpy.context.scene.objects)-start:
    ob.location+=Vector(xyz((3.15,.12,.90)))
for i,(p,r) in enumerate((((8.25,.85,6.48),(.56,.42,.51)),((8.15,.74,-1.6),(.50,.33,.55)),((.14,.70,6.85),(.45,.31,.38)),((4.18,.79,3.65),(.60,.45,.45)))):
    rock('Basin naturally fractured granite fragment',p,r,130+i,4)
record('natural-rocks',before)

def living_tree(x,z,height,seed,pot_radius=.28):
    before=set(bpy.context.scene.objects);rng=random.Random(seed);pot_h=.58
    lathe('Studio brushed planter',x,z,[(pot_radius*.84,F),(pot_radius,F+.06),(pot_radius*.93,F+pot_h)],ALLOY,32)
    disk('Studio visible potting soil',x,z,pot_radius*.85,F+pot_h-.025,F+pot_h-.01,SOIL)
    rod('Studio living woody trunk',(x,F+pot_h,z),(x+.05,F+height*.86,z),.030,STEM,9)
    vertices=[];faces=[];leaf_count=0
    # Irregular secondary twigs form a rounded, full crown instead of regularly
    # spaced thin fronds. Leaf surfaces remain individually curved native meshes.
    for branch in range(19):
        a=branch*2.399+rng.uniform(-.45,.45);t=branch/18
        yy=F+height*(.35+.50*t)+rng.uniform(-.04,.04)
        reach=height*(.15+.095*math.sin(t*math.pi))*rng.uniform(.82,1.10)
        base=Vector((x+.035*t,yy,z));tip=Vector((x+math.cos(a)*reach,yy+height*rng.uniform(.08,.16),z+math.sin(a)*reach))
        rod('Studio irregular natural branch',base,tip,.007,STEM,6)
        for twig in range(4):
            q=.35+twig*.19;origin=base.lerp(tip,q);ta=a+(-1 if twig%2 else 1)*rng.uniform(.40,1.15)
            end=origin+Vector((math.cos(ta)*height*.075,height*rng.uniform(.015,.075),math.sin(ta)*height*.075))
            rod('Studio fine crown twig',origin,end,.0035,STEM,5)
            for j in range(14):
                center=origin.lerp(end,.10+j*.065);la=ta+(-1 if j%2 else 1)*rng.uniform(.60,1.35)
                length=rng.uniform(.13,.22);direction=Vector((math.cos(la),rng.uniform(-.22,.43),math.sin(la))).normalized()
                across=direction.cross(Vector((0,1,0))).normalized();normal=across.cross(direction).normalized();off=len(vertices)
                for row in range(6):
                    tt=row/5;mid=center+direction*length*tt+normal*math.sin(tt*math.pi)*length*.13;half=math.sin(tt*math.pi)**.8*length*.24
                    vertices.extend((mid-across*half-normal*half*.13,mid+normal*half*.10,mid+across*half-normal*half*.13))
                for row in range(5):
                    for col in range(2):q=off+row*3+col;faces.append((q,q+1,q+4,q+3))
                leaf_count+=1
    leaves=patch_mesh('Studio individually curved olive living leaves',vertices,faces,BOTANIC)
    uv=leaves.data.uv_layers.new(name='Native leaf atlas')
    for loop in leaves.data.loops:
        index=loop.vertex_index;leaf=index//18;point=index%18
        uv.data[loop.index].uv=((leaf%8+(point%3)/2)/8,(point//3)/5)
    for poly in leaves.data.polygons:poly.use_smooth=True
    BOTANIC.use_backface_culling=False
    record('botanical',before);PLANTS.append({'position':[x,F,z],'height':height,'potRadius':pot_radius,'leaves':leaf_count})

for i,(x,z,h) in enumerate(((-11.0,6.1,3.35),(-10.8,-4.8,3.2),(-10.8,-6.75,2.7),(-3.8,-6.7,2.65),(10.6,-6.35,3.3),(10.65,-3.7,3.0),(10.8,-1.2,2.0))):living_tree(x,z,h,212+i)
batch_export('grand-anamorphic-shape-v3-interior',set(bpy.context.scene.objects)-interior_start)

people_start=set(bpy.context.scene.objects)
front_staff=portal_p(1.85,F,.65)
for i,(x,z,turn,female,pose) in enumerate(((front_staff[0],front_staff[2],math.degrees(PORTAL_YAW),True,0),(-8.6,-7.25,0,False,0),(-4.8,-5.7,25,True,1),(-11.10,4.20,90,False,1),(-10.8,2.0,-70,True,1),(8.8,2.8,-70,False,0),(10.2,3.0,50,True,0))):
    person_before=set(bpy.context.scene.objects)
    human(x,z,.97+(i%3)*.025,turn,female,NAVY,i%3,pose,root_y=F)
    HUMAN_PLACEMENTS[-1]['bounds']=bounds(set(bpy.context.scene.objects)-person_before)
record('visitors',people_start);batch_export('grand-anamorphic-shape-v3-visitors',set(bpy.context.scene.objects)-people_start)

def world(p):
    co,si=math.cos(ROOT_YAW),math.sin(ROOT_YAW);return [ROOT_ANCHOR[0]+co*p[0]+si*p[2],p[1],ROOT_ANCHOR[2]-si*p[0]+co*p[2]]
views={'entry':{'position':[-2.8,1.77,8.8],'look':[-10.8,3.7,3.0]},
       'interior':{'position':[-8.5,1.77,-.30],'look':[-10.8,3.7,3.0]},
       'out':{'position':[-8.5,1.77,-.3],'look':[-2.8,1.77,8.8]}}
for v in views.values():v.update(worldPosition=world(v['position']),worldLook=world(v['look']))
clear_underside=min(r['bounds']['min'][1] for r in ROLE_BOUNDS if r['overhead'] and r['bounds'])
layout={'version':'reference-led-cutaway-v3-20261019','assetNames':list(EXPORTS),'assets':EXPORTS,'units':'metres','root':ROOT_ANCHOR,'rootRotation':[0,ROOT_YAW,0],
 'bounds':{'min':[-12,0,-8],'max':[12,TOP,8]},'architecturalDimensions':{'width':24,'depth':16,'height':TOP-F,'floor':F,'fasciaTop':TOP,'lowestOverheadUnderside':clear_underside,'clearHeight':clear_underside-F},
 'mainCorner':{'fold':[FOLD[0],0,FOLD[1]],'leftWidth':LW,'rightWidth':RW,'bottom':BOTTOM,'top':LED_TOP,'headerTop':TOP,
    'leftCutout':LEFT_CUTOUT,'contours':{'leftXY':LEFT_OUTLINE,'rightZY':RIGHT_OUTLINE},
    'cabinetDepth':CABINET_DEPTH,'foldAngleDegrees':90,'cabinetJoint':'45 degree mitre; coincident outer edge; no corner post',
    'cutoutGlobal':{'xMin':FOLD[0]-LW,'xMax':FOLD[0]+LEFT_CUTOUT['right'],'yMin':BOTTOM,'yMax':LEFT_CUTOUT['top'],'z':FOLD[1]},
    'perimeterEdges':{'horizontalCutY':LEFT_CUTOUT['top'],'verticalCutRelativeX':LEFT_CUTOUT['right'],'cutWidth':LW+LEFT_CUTOUT['right'],'cutHeight':LEFT_CUTOUT['top']-BOTTOM}},
 'contentStudio':{'bounds':{'min':[ROOM_XMIN,F,-7.70],'max':[ROOM_XMAX,ROOM_ROOF,7.50]},'actualInteriorDepth':15.20,'actualInteriorWidth':ROOM_WIDTH,'floorTop':F,'canopyBottom':6.72,'ceilingTop':INTERIOR_CEILING_TOP,'roomWallRoofDatum':ROOM_ROOF,'ledWingCeilingClearance':LEFT_CUTOUT['top']-INTERIOR_CEILING_TOP,'entranceFasciaTop':STUDIO_TOP,'entranceLintelUnderside':PORTAL_UNDERSIDE,'rearSoffitUnderside':6.60,
    'acousticCeilingPlan':{'mainPanelXZ':[-11.65,-3.15,-7.27,5.29],'rearClosureXZ':[-3.15,ROOM_XMAX,-7.27,1.20],'top':INTERIOR_CEILING_TOP,'trim':'Both panels physically clipped to actual LED cabinet profile plus 18mm clearance'},
    'innerLedJoin':{'returnWallCenterX':1.45,'returnWallInteriorX':ROOM_XMAX,'returnWallFrontZ':1.20,'jamb':{'center':[1.21,(INTERIOR_CEILING_TOP+F)/2,1.30],'size':[.18,INTERIOR_CEILING_TOP-F,.80]},'lintelFromXZ':list(PORTAL_A),'lintelToXZ':[FOLD[0]+LEFT_CUTOUT['right'],FOLD[1]],'lintelStartBottomTop':[9.26,9.50],'lintelEndBottomTop':[8.20,8.24],'physicalTrim':'actual six-point cabinet profile plus 18mm clearance','scope':'Only opening joinery and room right/rear closure moved; native furniture, people, oval canopy and all room screens preserved'}},
 'shapeHierarchy':{'heroCrownTop':TOP,'leftPortalTop':STUDIO_TOP,'galleryTop':GALLERY_TOP,'galleryPlane':'oblique connected return from right LED end within 16m reservation','galleryYaw':GYAW,'galleryFrontX':GX,'galleryFromZ':GZ,'galleryToZ':GZ-math.sin(GYAW)*GW,'galleryEndX':GX+math.cos(GYAW)*GW,'occupiedRoof':ROOM_ROOF,'portalPlane':{'left':list(PORTAL_B),'right':list(PORTAL_A),'yaw':PORTAL_YAW,'width':PORTAL_WIDTH,'normal':[math.sin(PORTAL_YAW),0,math.cos(PORTAL_YAW)]},'canopyClearance':{'centerXZ':list(CC),'outerRadiiXZ':[4.18,4.10],'frontmostZ':CC[1]+4.10,'bladeMinimumZ':PORTAL_B[1]-math.sin(PORTAL_YAW)*2.375-math.cos(PORTAL_YAW)*.14,'bladeGapZ':PORTAL_B[1]-math.sin(PORTAL_YAW)*2.375-math.cos(PORTAL_YAW)*.14-(CC[1]+4.10),'heroCutoutGapX':FOLD[0]+LEFT_CUTOUT['right']-(CC[0]+4.18),'heroWingVerticalGap':LEFT_CUTOUT['top']-7.97},'reference':'ChatGPT Image Sep 23, 2026, 12_29_33 AM (4).png'},
 'apertures':APERTURES,'screens':APERTURES,'water':{'y':.595,'polygonXZ':BASIN,'outerPolygonXZ':BASIN},'waterJets':[],
 'typography':SIGNS,'signage':[dict(sign) for sign in SIGNAGE_MODULE.SIGN_LOG],'roles':ROLE_BOUNDS,'humans':HUMAN_PLACEMENTS,'plants':PLANTS,'views':views,
 'routes':[{'id':'studio-oblique-occupied-entry','width':2,'centerline':[[-2.8,F,8.8],[-2.8,F,3],[-8.5,F,3],[-8.5,F,-4.8]],
 'clearEnvelopesXZ':[[-3.8,-1.8,3,8.8],[-9.5,-1.8,2,4],[-9.5,-7.5,-4.8,3]],
 'measurement':'2m L-shaped principal route reaches the genuine oblique side portal, then the occupied room, without passing through LED or reception'}],
 'provenance':{'architecture':'Original bespoke Blender geometry; selected corner artwork remains runtime media','humans':'Microsoft Rocketbox MIT; technical-humans-LICENSE.txt','plants':'Original branch and curved-leaf geometry; no downloaded models'},
 'notes':['Main LED has a real six-point lower-left architectural cutaway, a suspended upper wing and a 90 degree mitred emitting corner','Lower-left opening measures 8.30m wide by 7.45m high; no display, cabinet backing or foundation occupies this opening','Original 79 degree side-entry portal, dense reed oval and native room are preserved; gallery reoriented 8 degrees to accommodate the wider right LED within 16m depth','Same-volume studio interior; no camera-ray or nonuniform room-depth compression','Native staff heights ~1.74–1.83m; counter top 1.175m','Reference is a perspective image; geometry is an authored reconstruction, not recovered CAD']}
(OUTDIR/'grand-anamorphic-shape-v3-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_ANAMORPHIC '+json.dumps({'assets':EXPORTS,'screens':len(APERTURES),'roles':len(ROLE_BOUNDS),'people':len(HUMAN_PLACEMENTS)}),flush=True)
