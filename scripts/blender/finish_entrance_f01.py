"""F01 finishes over the saved P01 geometry. Does not overwrite P01.
All materials/textures are authored procedurally here; no external asset license.
The browser's entranceF01.ts owns the periodic live media and water shading.
"""
import bpy, math, json, random, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/blender/entrance-f01';OUT.mkdir(parents=True,exist_ok=True)
WEB=ROOT/'public/models/entrance';WEB.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/entrance-p01/Livegrid_AV_Entrance_P01.blend'))
original={o.name:{'location':list(o.location),'scale':list(o.scale),'dimensions':list(o.dimensions)} for o in bpy.data.objects}
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h):return tuple(linear(int(h[i:i+2],16)/255) for i in (1,3,5))
CARDS=[
('M01','Graphite satin','#20282B',.41,0),('M02','Fluted charcoal','#171D20',.46,0),
('M03','Matte closure','#252D30',.58,0),('M04','Brushed trim','#8C918F',.36,1),
('M05','Warm opal diffuser','#FFF0D5',.5,0),('M06','White brand faces','#EDF0EC',.34,0),
('M07','Teal brand faces','#00C9B4',.3,0),('M08','Brand returns','#323B3E',.44,0),
('M09','Wall ceiling LED','#03090A',.36,0),('M10','Dry LED floor','#0A1517',.25,0),
('M11','Honed walking stone','#414746',.59,0),('M12','Planter stone','#353C39',.61,0),
('M13','Rill coping','#3B4443',.5,0),('M14','Submerged basin','#172522',.7,0),
('M15','Clear side water','#D7E4DF',.09,0),('M16','Landscape rocks','#596058',.72,0),
('M17','Soil mulch','#282821',.9,0),('M18','Bark','#514B3D',.78,0),
('M19','Broadleaf shrubs','#30513A',.55,0),('M20','Fern fronds','#42684A',.59,0),
('M21','Tree canopy','#36523B',.56,0),('M22','Optional hanging leaves','#2A4933',.6,0),
('M23','Gasket reveal','#101617',.8,0),('M24','Service housing','#242C2E',.66,0)]
M={}
for code,name,color,rough,metal in CARDS:
    mat=bpy.data.materials.new('LG_ENT_'+code+'_'+name);mat.diffuse_color=(*rgb(color),1);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=mat.diffuse_color
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    if code=='M05':bs.inputs['Emission Color'].default_value=(*rgb('#FFCF92'),1);bs.inputs['Emission Strength'].default_value=1.5
    if code in ('M06','M07'):bs.inputs['Emission Color'].default_value=(*rgb(color),1);bs.inputs['Emission Strength'].default_value=.12
    if code=='M15':bs.inputs['Transmission Weight'].default_value=.92;bs.inputs['IOR'].default_value=1.333
    M[code]=mat

def assign(ob,codes):
    ob.data.materials.clear()
    for code in codes:ob.data.materials.append(M[code])

# Bake a reference frame for Blender/glTF viewers. The website replaces it with
# the exact same periodic field evaluated at one shared master phase.
w,h=1024,512;s=np.linspace(0,48,w,dtype=np.float32)[None,:];y=np.linspace(-12,10,h,dtype=np.float32)[:,None]
a=s*math.tau/48;v=np.sin(a*3+.95*np.sin(y*.28)+.25*np.sin(y*.65))
body=np.exp(-v*v*22);core=np.exp(-v*v*800);fine=np.exp(-(v-.14)**2*1500)
fade=1-.72*np.clip((y-7.5)/2.5,0,1)**2*(3-2*np.clip((y-7.5)/2.5,0,1))
calm=1-.45*np.sin(np.pi*np.clip(s/16,0,1))**2*(s<=16)
col=np.zeros((h,w,4),np.float32);col[:,:,:3]=(.002,.016,.025)
col[:,:,:3]+=(body[:,:,None]*np.array([.002,.32,.16])+core[:,:,None]*np.array([.01,.65,.35])+fine[:,:,None]*np.array([.025,.32,.55]))*fade[:,:,None]*calm[:,:,None]
col[:,:,3]=1
im=bpy.data.images.new('F01 Emerald Current - frame zero',width=w,height=h);im.pixels.foreach_set(col.ravel());im.pack()
for code in ('M09','M10'):
    mat=M[code];nodes=mat.node_tree.nodes;bs=nodes.get('Principled BSDF')
    tex=nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT'
    mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=1.3

letters=sorted([o for o in bpy.data.objects if o.name.startswith('B01')],key=lambda o:o.location.x)
teal_names={o.name for o in letters[-2:]}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
for ob in list(bpy.context.scene.objects):
    if ob.type!='MESH':continue
    name=ob.name
    code='M24'
    if name.startswith('A01'):
        assign(ob,['M01','M03'])
        for p in ob.data.polygons:p.material_index=0 if p.normal.y<-.45 else 1
        # Analytic normals of the P01 bow remove triangulation from the satin
        # highlight without moving a single vertex or softening the returns.
        normals=[None]*len(ob.data.loops)
        for p in ob.data.polygons:
            p.use_smooth=True
            for li in p.loop_indices:
                x=ob.data.vertices[ob.data.loops[li].vertex_index].co.x
                n=Vector((1.8*x/(10.6**2),-1,0)).normalized()
                normals[li]=tuple(n if p.normal.y<-.45 else -n if p.normal.y>.45 else p.normal)
        ob.data.normals_split_custom_set(normals)
        continue
    if name.startswith('A08'):code='M05' if 'trim' in name else 'M23'
    elif name.startswith('A05') or name.startswith('A07'):code='M03'
    elif name.startswith('C'):
        code='M02'
        if name.startswith('C01'):
            normals=[None]*len(ob.data.loops)
            side=-1 if ' -1 ' in name else 1
            for p in ob.data.polygons:
                p.use_smooth=True
                for li in p.loop_indices:
                    q=ob.data.vertices[ob.data.loops[li].vertex_index].co
                    a=math.atan2(q.y-.6,q.x-side*10.8);r=1.175+.025*math.cos(96*a);dr=-2.4*math.sin(96*a)
                    n=Vector((r*math.cos(a)+dr*math.sin(a),r*math.sin(a)-dr*math.cos(a),0)).normalized()
                    normals[li]=tuple(p.normal if abs(p.normal.z)>.5 else n)
            ob.data.normals_split_custom_set(normals)
    elif name.startswith(('B01','B02')):
        front='M07' if name in teal_names or name.startswith('B02') else 'M06'
        assign(ob,[front,'M08'])
        for p in ob.data.polygons:
            world_normal=ob.matrix_world.to_3x3()@p.normal
            p.material_index=0 if world_normal.y<-.45 else 1
        continue
    elif name.startswith(('L01','L04','L05','L06')):
        kind={'L01':'F','L04':'L','L05':'R','L06':'C'}[name[:3]]
        assign(ob,['M10' if kind=='F' else 'M09','M24'])
        uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='F01 shared 48m perimeter')
        active={'F':Vector((0,0,1)),'R':Vector((-1,0,0)),'C':Vector((0,0,-1)),'L':Vector((1,0,0))}[kind]
        for p in ob.data.polygons:
            p.material_index=0 if (ob.matrix_world.to_3x3()@p.normal).dot(active)>.9 else 1
            for li in p.loop_indices:
                q=ob.matrix_world@ob.data.vertices[ob.data.loops[li].vertex_index].co
                per={'F':q.x+8,'R':16+q.z,'C':32-q.x,'L':48-q.z}[kind]
                uv.data[li].uv=(per/48,(q.y+12)/22)
        ob.name='LED-'+kind+' | F01 coordinated surface';continue
    elif name.startswith('F'):code='M11'
    elif name.startswith(('P01','P02','P03')):code='M12'
    elif name.startswith('P04'):code='M17'
    elif name.startswith('P05'):code='M14'
    elif name.startswith('P06'):code='M15';ob.name='WATER | '+name
    elif name.startswith('P07'):code='M13'
    elif name.startswith(('N01','N02')):code='M18'
    elif name.startswith('N05'):code='M16'
    elif name.startswith('N03'):
        assign(ob,['M21','M19','M20'])
        # Source leaf packing: each side has 1755 canopy, 800 shrub, 1540 fern leaves.
        for p in ob.data.polygons:
            leaf=(p.index//6)%4095;p.material_index=0 if leaf<1755 else 1 if leaf<2555 else 2
        colors=ob.data.color_attributes.new(name='Natural leaf variation',type='BYTE_COLOR',domain='CORNER')
        random.seed(21)
        for li in range(len(colors.data)):
            leaf=ob.data.loops[li].vertex_index//7;val=.82+.18*((math.sin(leaf*12.9898)*43758.5453)%1)
            colors.data[li].color=(val,val,val,1)
        for code in ('M19','M20','M21'):
            mat=M[code];mat.use_backface_culling=False
            nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
            attr=nodes.new('ShaderNodeVertexColor');attr.layer_name=colors.name
            multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
            multiply.inputs[1].default_value=mat.diffuse_color
            links.new(attr.outputs['Color'],multiply.inputs[2]);links.new(multiply.outputs[0],bs.inputs['Base Color'])
        continue
    assign(ob,[code])

def cube(name,loc,dims,code):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);assign(o,[code]);return o

# The P01 top trim was a chord between its two rounded corners. Add the F01
# curved light/channel infill so it follows the bowed face continuously; the
# original study geometry and its opening dimensions remain untouched.
for name,radius,offset,code in [('L01 | bowed portal crown diffuser',.063,-.06,'M05'),('L01 | bowed portal crown recess',.105,-.005,'M23')]:
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=3
    spline=curve.splines.new('POLY');spline.points.add(128)
    for i,p in enumerate(spline.points):
        x=-7.35+14.7*i/128;p.co=(x,-.9*(1-(x/10.6)**2)+offset,8,1)
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);assign(ob,[code])
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')

for side in (-1,1):
    # Continuous shielded diffuser at the inner planter edge, outside the dry strip.
    cube('L04 | warm landscape diffuser '+str(side),(side*10.795,-7,.13),(.035,9.76,.035),'M05')
    cube('L04 | shielded channel '+str(side),(side*10.82,-7,.18),(.08,9.8,.035),'M24')
    bpy.ops.mesh.primitive_torus_add(major_segments=192,minor_segments=6,location=(side*10.8,.6,9.205),major_radius=1.175,minor_radius=.018)
    o=bpy.context.object;o.name='L03 | crown diffuser '+str(side);assign(o,['M05'])
    for y in (-10.4,-6.95,-3.5):
        cube('L05 | recessed uplight housing',(side*11.8,y,.48),(.18,.2,.16),'M24')
        cube('L05 | recessed opal lens',(side*11.8,y,.564),(.12,.14,.01),'M05')

# Source retains editable procedural microfinish nodes. The web equivalent uses
# world-space noise (no external image dependency or UV seams on curved parts).
for code,mat in M.items():
    if code in ('M05','M06','M07','M09','M10','M15'):continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=120 if code in ('M01','M02','M03','M08','M24') else 18
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.08;bump.inputs['Distance'].default_value=.002
    links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])

bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.world.color=(.025,.03,.035)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.shading.use_scene_world=False
        area.spaces.active.shading.use_scene_lights=False
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Livegrid_AV_Entrance_F01.blend'))
# Keep active faces/water independent; batch the remaining mesh primitives by
# finish, preserving material slots and vertex colors for browser inspection.
obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith(('LED-','WATER'))]
groups={}
for o in obs:groups.setdefault(tuple(m.name for m in o.data.materials),[]).append(o)
for mats,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='F01 | '+mats[0]
# GLB carries base PBR, static LED frame and material identifiers; procedural
# microdetail is retained in Blender and rebuilt in the website material shader.
for mat in M.values():
    bs=mat.node_tree.nodes.get('Principled BSDF')
    for link in list(mat.node_tree.links):
        if link.to_node==bs and link.to_socket.name=='Normal':mat.node_tree.links.remove(link)
    if mat in (M['M19'],M['M20'],M['M21']):
        for link in list(mat.node_tree.links):
            if link.to_node==bs and link.to_socket.name=='Base Color':mat.node_tree.links.remove(link)
        bs.inputs['Base Color'].default_value=mat.diffuse_color
bpy.ops.export_scene.gltf(filepath=str(WEB/'entrance-f01.glb'),export_format='GLB',export_apply=True,export_vertex_color='ACTIVE')
(OUT/'finish-manifest.json').write_text(json.dumps({'source':'F01 finish brief, P01 geometry','palette':[{'id':c,'name':n,'srgb':h,'roughness':r,'metalness':m} for c,n,h,r,m in CARDS],'provenance':'Original procedural materials and media. No third-party textures.','original_geometry':original,'optional_not_added':['M22 hanging foliage (no approved placement)'],'brand':'P01 provisional vector contours retained','motion':'24 second, 48m perimeter, runtime src/venue/three/entranceF01.ts'},indent=2))
print('F01_EXPORT_COMPLETE',len(bpy.context.scene.objects))
