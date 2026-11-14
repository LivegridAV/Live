"""Entrance finish refinement. F01 remains intact. World geometry is metric/Z up.
Official wordmark glyphs/font and pixel mark come from public/brand/lockup-horizontal.svg.
"""
import bpy, math, random, json, hashlib, tempfile
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/blender/entrance-refinement'
(OUT/'temp').mkdir(parents=True,exist_ok=True)
tempfile.tempdir=str(OUT/'temp')
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/entrance-f01/Livegrid_AV_Entrance_F01.blend'))
M={m.name.split('_')[2]:m for m in bpy.data.materials if m.name.startswith('LG_ENT_M')}
if 'M04' not in M:
    mat=bpy.data.materials.new('LG_ENT_M04_Brushed trim');mat.use_nodes=True;mat.diffuse_color=(.26,.28,.27,1)
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Metallic'].default_value=1;bs.inputs['Roughness'].default_value=.36;M['M04']=mat
def digest(o):
    return hashlib.sha256(json.dumps([list(o.matrix_world@v.co) for v in o.data.vertices]).encode()).hexdigest()
protected={o.name:digest(o) for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(('A','C','F','P','LED-','WATER'))}
def rgb(h):
    def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    return tuple(lin(int(h[i:i+2],16)/255) for i in (1,3,5))
for code,col,rough in [('M01','#20272A',.36),('M02','#1C2325',.4),('M11','#535957',.56),('M12','#3D4440',.65),('M13','#49514D',.47),('M18','#60503B',.83),('M19','#42653B',.5),('M20','#537346',.54),('M21','#405F39',.47),('M07','#1FA093',.32)]:
    mat=M[code];mat.diffuse_color=(*rgb(col),1);bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Roughness'].default_value=rough
def mesh(name,verts,faces,codes):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    for c in codes:me.materials.append(M[c])
    return ob
def apply(ob,mod):
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
def box(name,loc,dims,code,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(M[code])
    if bevel:
        mod=ob.modifiers.new('Machined edge radius','BEVEL');mod.width=bevel;mod.segments=3;apply(ob,mod)
        mod=ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');apply(ob,mod)
    return ob
def bow(x):return -.9*(1-(x/10.6)**2)
for ob in list(bpy.context.scene.objects):
    if not ob.name.startswith('N05'):continue
    mod=ob.modifiers.new('Weathered mineral form','SUBSURF');mod.levels=2;apply(ob,mod)
    tex=bpy.data.textures.new('Quiet rock erosion',type='CLOUDS');tex.noise_scale=.31
    mod=ob.modifiers.new('Small surface erosion','DISPLACE');mod.texture=tex;mod.strength=.07;apply(ob,mod)
    for p in ob.data.polygons:p.use_smooth=True
# Replace the provisional F01 letters/emblem only. Respect official outlines,
# adapting mark/word spacing to the shallow architectural sign band.
for o in list(bpy.context.scene.objects):
    if o.name.startswith(('B01','B02','N01','N02','N03')):bpy.data.objects.remove(o,do_unlink=True)
font=bpy.data.fonts.load(str(OUT/'Official-SpaceGrotesk-600.ttf'))
letters=[]
for i,char in enumerate('livegridAV'):
    cu=bpy.data.curves.new('Official glyph '+char,'FONT');cu.body=char;cu.font=font;cu.size=2.9;cu.extrude=.095;cu.bevel_depth=.007;cu.bevel_resolution=3;cu.resolution_u=10
    ob=bpy.data.objects.new('B10 | official glyph '+str(i)+' '+char,cu);bpy.context.collection.objects.link(ob)
    cu.materials.append(M['M07' if i>=8 else 'M06']);cu.materials.append(M['M08']);bpy.context.view_layer.update()
    letters.append((ob,ob.dimensions.x))
total=sum(w for o,w in letters)+.065*(len(letters)-1)+.22
x=-total/2+1.45
for i,(ob,w) in enumerate(letters):
    if i==8:x+=.22
    ob.location=(x,bow(x)-.18,9.25);ob.rotation_euler=(math.pi/2,0,math.atan(1.8*x/10.6**2));x+=w+.065
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
    for p in ob.data.polygons:p.material_index=0 if p.normal.z>.9 else 1
# Official 5x5 rounded pixel mark from SVG. No substitute hexagonal emblem.
white={(0,0),(1,0),(2,0),(4,0),(0,1),(2,1),(0,2)}
for row in range(5):
    for col in range(5):
        x=-7.05+col*.47;z=11.14-row*.47
        ob=box('B11 | official pixel mark', (x,bow(x)-.25,z),(.39,.16,.39),'M06' if (col,row) in white else 'M07',.055)
        ob.rotation_euler.z=math.atan(1.8*x/10.6**2)
# Fine finish seams, contained small metal crown accents and mounting returns.
for x in (-8,-4,0,4,8):
    box('D01 | fascia panel reveal',(x,bow(x)-.006,10.02),(.008,.009,3.85),'M23')
for side in (-1,1):
    bpy.ops.mesh.primitive_torus_add(major_segments=192,minor_segments=6,location=(side*10.8,.6,9.17),major_radius=1.176,minor_radius=.014)
    ob=bpy.context.object;ob.name='D02 | fine brushed crown lip';ob.data.materials.append(M['M04'])
# Botanical geometry: branched stems, petioles and folded 17-vertex laminae.
# All new planting remains inside existing beds, no envelope/route edits.
random.seed(104)
lv=[];lf=[];lc=[];uvs=[];bv=[];bf=[];buv=[]
def rod(a,b,r0,r1,segments=7):
    a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
    if u.length<.01:u=axis.cross(Vector((1,0,0)))
    u.normalize();v=axis.cross(u);base=len(bv)
    for row,(p,r) in enumerate(((a,r0),(b,r1))):
        for k in range(segments):
            bv.append(tuple(p+r*(u*math.cos(k*math.tau/segments)+v*math.sin(k*math.tau/segments))))
            buv.append((k/segments*math.tau*r/.2,row*(b-a).length/.3))
    for k in range(segments):bf.append((base+k,base+(k+1)%segments,base+segments+(k+1)%segments,base+segments+k))
    bf.append(tuple(base+k for k in reversed(range(segments))));bf.append(tuple(base+segments+k for k in range(segments)))
def leaf(p,length,width,angle,tilt,kind):
    p=Vector(p);u=Vector((math.cos(angle),math.sin(angle),tilt)).normalized();v=Vector((-math.sin(angle),math.cos(angle),0))
    if not 10.98<abs(p.x)<14.26 or not -11.72<p.y<-2.28:return
    base=len(lv);lv.append(tuple(p));uvs.append((.5,0))
    for t in (.15,.35,.55,.75,.9):
        for w in (-1,0,1):
            q=p+u*(t*length)+v*(w*width*math.sin(t*math.pi)**.75)+Vector((0,0,length*(.16*math.sin(t*math.pi)-.09*t*t)-abs(w)*.04*length))
            q.x=math.copysign(min(14.36,max(10.94,abs(q.x))),q.x);q.y=min(-2.2,max(-11.8,q.y))
            lv.append(tuple(q));uvs.append(((w+1)/2,t))
    lv.append(tuple(p+u*length+Vector((0,0,-.09*length))));uvs.append((.5,1))
    faces=[(0,1,2),(0,2,3)]
    for j in range(4):
        a=1+j*3;faces.extend([(a,a+3,a+4,a+1),(a+1,a+4,a+5,a+2)])
    faces.extend([(13,16,14),(14,16,15)])
    lf.extend([tuple(base+i for i in f) for f in faces]);lc.extend([kind]*len(faces))
    rod(p-u*.045,p+u*.12*length,.003,.0015,4)
for side in (-1,1):
    for tree in range(3):
        root=Vector((side*(12.6+random.uniform(-.2,.2)),-10.25+tree*3.35,.4));height=[4.65,3.9,4.35][tree]
        top=root+Vector((side*.12,.08,height*.58))
        rod(root,top,.16,.055,12)
        # Root flare meets mulch; branching junctions overlap, never float.
        for k in range(5):
            a=k*math.tau/5;rod(root+Vector((0,0,.28)),root+Vector((math.cos(a)*.3,math.sin(a)*.3,0)),.06,.018,7)
        for b in range(10):
            a=b*2.4+tree*.7;reach=random.uniform(.6,1.1)
            end=root+Vector((reach*math.cos(a),reach*math.sin(a),height+random.uniform(-1,.1)))
            start=root.lerp(top,random.uniform(.5,.95));rod(start,end,.045,.012,8)
            for j in range(4):
                q=end+Vector((random.uniform(-.32,.32),random.uniform(-.32,.32),random.uniform(-.35,.25)))
                rod(end,q,.012,.004,6)
                for k in range(16):
                    t=random.random();petiole=end.lerp(q,t)+Vector((random.uniform(-.24,.24),random.uniform(-.24,.24),random.uniform(-.16,.18)))
                    rod(q,petiole,.004,.002,4)
                    leaf(petiole,random.uniform(.23,.4),random.uniform(.075,.13),random.random()*math.tau,random.uniform(-.25,.65),0)
    for i in range(30):
        p=Vector((side*random.uniform(11.15,14.05),random.uniform(-11.45,-2.5),.43));height=random.uniform(.45,1)
        for b in range(6):
            a=b*2.4+random.random();end=p+Vector((math.cos(a)*.25,math.sin(a)*.25,height))
            rod(p,end,.016,.004,6)
            for k in range(6):
                q=p.lerp(end,.4+k*.1);leaf(q,random.uniform(.32,.56),random.uniform(.08,.14),a+k*2.4,.3+random.random(),1)
    for i in range(12):
        p=Vector((side*random.uniform(11.15,14),random.uniform(-11.35,-2.65),.44))
        for k in range(7):
            a=k*math.tau/7;prev=p
            for j in range(1,10):
                t=j/10;q=p+Vector((t*.7*math.cos(a),t*.7*math.sin(a),math.sin(t*math.pi*.85)*.65))
                rod(prev,q,.004,.002,4);prev=q
                for d in (-1,1):leaf(q,(1-t)*.28+.04,.035,a+d*1.1,.15,2)
ob=mesh('N10 | layered living canopy, shrubs and fern',lv,lf,['M21','M19','M20'])
uv=ob.data.uv_layers.new(name='Leaf lamina');colors=ob.data.color_attributes.new(name='Natural leaf variation',type='BYTE_COLOR',domain='CORNER')
for p in ob.data.polygons:
    p.material_index=lc[p.index];p.use_smooth=True
    for li in p.loop_indices:
        vi=ob.data.loops[li].vertex_index;uu,vv=uvs[vi];uv.data[li].uv=((vi//17%8+.02+.96*uu)/8,.015+.97*vv)
        v=.74+.26*((math.sin((vi//17)*12.9898)*43758.5453)%1);colors.data[li].color=(v*.95,v,v*.86,1)
ob=mesh('N11 | branches, root flares and leaf petioles',bv,bf,['M18'])
uv=ob.data.uv_layers.new(name='Bark at physical scale')
for li in range(len(ob.data.loops)):uv.data[li].uv=buv[ob.data.loops[li].vertex_index]
for p in ob.data.polygons:p.use_smooth=True
for c in ('M19','M20','M21'):M[c].use_backface_culling=False
# Reuse the project's authored botanical maps (never alter the source assets).
TEX=ROOT/'public/media/projection-grand-v1/botanical'
for code,base,norm,rough in [('M18','bark-basecolor.png','bark-normal.png',None),('M19','leaf-atlas-basecolor.png','leaf-atlas-normal.png','leaf-atlas-roughness.png'),('M20','leaf-atlas-basecolor.png','leaf-atlas-normal.png','leaf-atlas-roughness.png'),('M21','leaf-atlas-basecolor.png','leaf-atlas-normal.png','leaf-atlas-roughness.png')]:
    mat=M[code];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');mat.diffuse_color=(1,1,1,1)
    for link in list(links):
        if link.to_node==bs and link.to_socket.name in ('Base Color','Normal'):links.remove(link)
    tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TEX/base),check_existing=True);tex.image.pack();links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TEX/norm),check_existing=True);tex.image.colorspace_settings.name='Non-Color';tex.image.pack()
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.42 if code=='M18' else .22;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    if rough:
        tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TEX/rough),check_existing=True);tex.image.colorspace_settings.name='Non-Color';tex.image.pack()
        separate=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],separate.inputs['Color']);links.new(separate.outputs['Green'],bs.inputs['Roughness'])
# Tiny basin aggregate is below the water, reinforcing real shallow depth.
for side in (-1,1):
    for i in range(48):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(side*random.uniform(9.79,10.61),random.uniform(-11.75,-2.25),-.104))
        ob=bpy.context.object;ob.name='D03 | submerged aggregate';ob.scale=(.035,.05,.009);ob.data.materials.append(M['M16'])
assert all(digest(bpy.data.objects[n])==h for n,h in protected.items())
OUT.mkdir(parents=True,exist_ok=True)
# Packed frame zero matches the live GLSL field in the delivered editable asset.
w,h=2048,1024;s=np.linspace(0,48,w,dtype=np.float32)[None,:];y=np.linspace(-12,10,h,dtype=np.float32)[:,None];a=s*math.tau/48
bend=.92*np.sin(y*.28)+.24*np.sin(y*.65)+.18*np.sin(a*5+y*.16);q=a*3+bend;v=np.sin(q)
lace=.035*np.sin(a*17+y*1.4)+.018*np.sin(a*39-y*2.1);width=.30+.09*np.sin(a*2+y*.22)
body=np.exp(-((v-lace)/width)**2*2.3);fold=np.exp(-((v-width*.53-lace)*22)**2);rim=np.exp(-((v+width*.6-lace)*70)**2)
filaments=np.maximum(0,np.sin(v*185+np.sin(a*11+y*.8)*3))**18*body;secondary=np.exp(-(np.sin(q+.53+.1*np.sin(y*.4))*38)**2)
cm=(.5+.5*np.sin(a*2+y*.18))[:,:,None];ribbon=((1-cm)*np.array([.001,.28,.075])+cm*np.array([.001,.19,.22]))*body[:,:,None]
ribbon+=fold[:,:,None]*[.008,.38,.17]+rim[:,:,None]*[.02,.36,.22]+filaments[:,:,None]*[.008,.10,.066]+secondary[:,:,None]*[.003,.065,.14]
t=np.clip((y-7)/3,0,1);fade=1-.88*t*t*(3-2*t);calm=1-.58*np.sin(np.pi*np.clip(s/16,0,1))**2*(s<=16)
pixels=np.ones((h,w,4),np.float32);pixels[:,:,:3]=np.array([.0015,.008,.014])+ribbon*fade[:,:,None]*calm[:,:,None]
im=bpy.data.images.new('Refined Emerald Current - exact frame zero',width=w,height=h);im.pixels.foreach_set(pixels.ravel());im.pack()
for c in ('M09','M10'):
    bs=M[c].node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Strength'].default_value=1.55
    for node in M[c].node_tree.nodes:
        if node.type=='TEX_IMAGE':node.image=im
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Livegrid_AV_Entrance_Refined.blend'))
# Export batched web copy, retaining all four active faces and separate rills.
groups={}
for o in bpy.context.scene.objects:
    if o.type=='MESH' and not o.name.startswith(('LED-','WATER')):groups.setdefault(tuple(m.name for m in o.data.materials),[]).append(o)
for mats,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='Refined | '+mats[0]
for mat in M.values():
    bs=mat.node_tree.nodes.get('Principled BSDF')
    for link in list(mat.node_tree.links):
        if link.to_node==bs and link.to_socket.name=='Normal' and mat not in (M['M18'],M['M19'],M['M20'],M['M21']):mat.node_tree.links.remove(link)
    bs.inputs['Base Color'].default_value=mat.diffuse_color
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/entrance/entrance-refined.glb'),export_format='GLB',export_apply=True,export_vertex_color='ACTIVE')
(OUT/'provenance.json').write_text(json.dumps({'base':'F01 editable asset preserved separately','protected_entrance_objects':len(protected),'unchanged_geometry_sha256':protected,'brand':'Official public/brand/lockup-horizontal.svg pixel grid and embedded Space Grotesk 600 outlines. Architectural spacing adapted; no provisional logo.','botany':'Original deterministic mesh foliage, branches and petioles, seed104. No external texture downloads.','botanical_maps':'Existing project-authored public/media/projection-grand-v1/botanical leaf and bark maps, packed; originals unchanged.','units':'metres, Blender Z up, website Y up; placement (0,0,-14.4)','media':'Live layered 24s procedural current; packed frame zero in native source and glTF.'},indent=2))
print('REFINEMENT_EXPORT_COMPLETE',len(lv),len(bv),len(protected))
