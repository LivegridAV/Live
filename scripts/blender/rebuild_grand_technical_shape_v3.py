"""Technical pavilion rebuilt from the user's four-view October reference.

The user explicitly chose the new low/wide proportions over the previous
shared built height. The 24 x16 m floor reservation and native contents remain.
"""
from pathlib import Path
import sys, hashlib

PREVIOUS=Path(__file__).with_name('rebuild_grand_technical_shape_v2.py')
exec(compile(PREVIOUS.read_text(encoding='utf-8').split('# The front crown')[0],str(PREVIOUS),'exec'))
sys.path.insert(0,str(Path(__file__).parent))
from technical_shape_v3_shell import build_shell_v3
from technical_shape_v3_interior import build_interior_v3

F=.12;TOP=7.50;BEAM_BOTTOM=5.60;BAY_TOP=5.25;WORKTOP=1.10
ASSET_PREFIX='grand-technical-shape-v3'
SCREENS=[];TYPOGRAPHY=[];ROLE_BOUNDS=[];EXPORTS={};HUMAN_PLACEMENTS=[]
LOUNGE_GREY=material('Technical | V3 soft ivory woven upholstery',(.47,.45,.40),0,.84)
TAUPE_LEATHER=LOUNGE_GREY

# The new four-view reference uses the heavier brand wordmark. Scope the
# semibold outlines to this new asset generation, preserving prior exports.
_reference_wordmark=wordmark
def wordmark(*args,**kwargs):
    global FONT
    previous_font=FONT
    FONT=SEMIBOLD_FONT
    try:return _reference_wordmark(*args,**kwargs)
    finally:FONT=previous_font

shell=build_shell_v3(globals())
batch_export(ASSET_PREFIX+'-shell',shell.pop('objects'))
interior=build_interior_v3(globals())
for ob in interior['objects']:
    if ob.type=='MESH' and ob.get('signage_body')=='AV' and ob.data.materials:
        ob.data.materials[0]=bpy.data.materials['Technical | V3 cyan AV letters']
batch_export(ASSET_PREFIX+'-interior',interior.pop('objects'))

people_before=set(bpy.context.scene.objects)
def seated_person(p,yaw,avatar,sofa=False):
    before=set(bpy.context.scene.objects)
    root=bpy.data.objects.new('Technical V3 native seated '+avatar,None)
    bpy.context.collection.objects.link(root)
    # The prepared pelvis is .84 m above the floor for the native console
    # stool. Lounge seating lowers that complete pose by .26 m.
    root.location=xyz((p[0],F-(.26 if sofa else 0),p[2]))
    root.rotation_euler[2]=yaw
    for index,mesh in enumerate(_human_template(avatar,'seated-v3')):
        ob=bpy.data.objects.new('Rocketbox | '+avatar+' | seated-v3 mesh '+str(index),mesh)
        bpy.context.collection.objects.link(ob);ob.parent=root
    bpy.context.view_layer.update()
    bb=bounds(set(bpy.context.scene.objects)-before)
    HUMAN_PLACEMENTS.append({'asset':avatar,'pose':'seated-v3','position':[p[0],F,p[2]],'yaw':yaw,
                             'textured':True,'nativeBodyProportions':True,'bounds':bb})

for i,seat in enumerate(interior['operatorSeats']):
    seated_person(seat['position'],seat['yaw'],
                  ['Business_Male_01','Business_Male_02','Business_Female_01'][i%3])
for i,staff in enumerate(interior['receptionStaff']):
    before=set(bpy.context.scene.objects)
    human(staff['position'][0],staff['position'][2],1,staff['turn'],staff['female'],NAVY,i,0,root_y=F)
    HUMAN_PLACEMENTS[-1]['bounds']=bounds(set(bpy.context.scene.objects)-before)
for i,(x,z,turn,female) in enumerate(((4.15,7.25,170,False),(-11.40,7.35,-20,False),(11.40,7.35,20,True))):
    before=set(bpy.context.scene.objects)
    human(x,z,1,turn,female,NAVY,i%3,1,root_y=F)
    HUMAN_PLACEMENTS[-1]['bounds']=bounds(set(bpy.context.scene.objects)-before)
for side in (-1,1):
    seated_person([side*7.77,F,3.75],0,'Business_Male_02' if side<0 else 'Business_Female_01',True)
record('visitors',people_before)
batch_export(ASSET_PREFIX+'-visitors',set(bpy.context.scene.objects)-people_before)

def world(p):
    co,si=math.cos(ROOT_YAW),math.sin(ROOT_YAW)
    return [ROOT_ANCHOR[0]+co*p[0]+si*p[2],p[1],ROOT_ANCHOR[2]-si*p[0]+co*p[2]]
views={'entry':{'position':[-4.65,1.77,8.8],'look':[-3,2,-3.4]},
       'interior':{'position':[-3,1.77,0],'look':[0,2.65,-5.8]},
       'out':{'position':[-3,1.77,0],'look':[-4.65,1.77,8.8]}}
for v in views.values():v.update(worldPosition=world(v['position']),worldLook=world(v['look']))
lowest=min(r['bounds']['min'][1] for r in ROLE_BOUNDS if r['overhead'] and r['bounds'])
layout={'version':'four-view-technical-v3-20261019','units':'metres','assetNames':list(EXPORTS),'assets':EXPORTS,
 'root':ROOT_ANCHOR,'rootRotation':[0,ROOT_YAW,0],
 'bounds':{'min':[-12,0,-8],'max':[12,TOP,8]},
 'architecturalDimensions':{'width':24,'depth':16,'height':TOP-F,'floor':F,'fasciaTop':TOP,
     'lowestOverheadUnderside':lowest,'clearHeight':lowest-F,'reservationHeightLimit':M['fasciaTop']},
 'userDecision':'New reference proportions take precedence over the previous shared built height; retain the existing footprint.',
 'architecture':shell['architecture'],'sharedFloor':{'owner':'Continuous venue stone','height':F,'authoredSupportHidden':True,'edgeOpticsBottom':F+.001,'edgeOpticsTop':F+.011},'apertures':SCREENS,'screens':SCREENS,'bays':interior['bays'],
 'furniture':interior['furniture'],'reception':interior['reception'],'operatorSeats':interior['operatorSeats'],
 'routes':[interior['route']],'views':views,'typography':TYPOGRAPHY,'roles':ROLE_BOUNDS,'humans':HUMAN_PLACEMENTS,
 'provenance':{'architecture':'Original bespoke Blender geometry reconstructed from LivegridAV Exhibition Booth Views.png',
     'humans':'Existing Microsoft Rocketbox MIT source rigs and textures; new native seated poses',
     'priorAssets':'All previous files preserved; new versioned assets only'},
 'limits':['The reference provides views rather than CAD dimensions. Successful build/geometry tests do not establish pixel identity.']}
(OUTDIR/(ASSET_PREFIX+'-layout.json')).write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_TECHNICAL_V3 '+json.dumps({'assets':EXPORTS,'screens':len(SCREENS),'people':len(HUMAN_PLACEMENTS),'height':TOP-F}),flush=True)
