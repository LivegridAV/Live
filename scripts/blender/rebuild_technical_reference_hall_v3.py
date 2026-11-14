"""Actual exhibition truss context above the reference Technical pavilion.

Independent hall context, not included in the stall's 24 x16m /7.5m bounds.
"""
from pathlib import Path
import hashlib

helper=Path(__file__).with_name('rebuild_grand_technical_shape_v2.py')
exec(compile(helper.read_text(encoding='utf-8').split('# The front crown')[0],str(helper),'exec'))
name='technical-reference-hall-rig-v3'
RIG=material('Technical | V3 exhibition satin graphite truss',(.10,.12,.14),.65,.38,.11)
CASE=material('Technical | V3 exhibition black spotlight housing',(.014,.018,.023),.4,.43)
LENS=material('Technical | V3 exhibition warm optical lens',(.93,.76,.53),0,.24,3.8)
COOL_LENS=material('Technical | V3 exhibition neutral optical lens',(.65,.77,.94),0,.24,3.0)

def lattice(a,b):
    a,b=Vector(a),Vector(b)
    direction=(b-a).normalized()
    side=Vector((-direction.z,0,direction.x))*.15
    up=Vector((0,.15,0))
    corners=[side+up,-side+up,-side-up,side-up]
    for corner in corners:
        rod('Technical V3 hall actual continuous truss chord',tuple(a+corner),tuple(b+corner),.024,RIG,8)
    steps=round((b-a).length/1.2)
    for i in range(steps):
        p=a+(b-a)*(i/steps);q=a+(b-a)*((i+1)/steps)
        for j in range(4):
            rod('Technical V3 hall triangulated lattice web',tuple(p+corners[j]),tuple(q+corners[(j+1)%4]),.011,RIG,6)

for z in (-13,-8,-3,2,7,12,17):lattice((-20,9.8,z),(20,9.8,z))
for x in (-18,-12,-6,0,6,12,18):lattice((x,10.12,-15),(x,10.12,19))
for row,z in enumerate((-9,-3,3,9,15)):
    for col,x in enumerate((-16,-10,-4,2,8,14)):
        x+=.55*(row%2)
        rod('Technical V3 hall real pendant suspension',(x,9.8,z),(x,9.47,z),.012,CASE,8)
        rod('Technical V3 hall cylindrical fixture housing',(x,9.47,z),(x,9.25,z),.073,CASE,12)
        disk('Technical V3 hall recessed actual optic',x,z,.059,9.236,9.25,COOL_LENS if (row+col)%4==0 else LENS)
objects=set(bpy.context.scene.objects)
for ob in objects:
    if ob.type=='MESH':ob['grandRole']='hall-context';ob['grandOverhead']=True
batch_export(name,objects)
(OUTDIR/(name+'.json')).write_text(json.dumps({'asset':EXPORTS[name],'context':'Independent real exhibition truss, not part of the reserved stall architecture.'},indent=2),encoding='utf-8')
print('TECHNICAL_HALL_V3 '+json.dumps(EXPORTS[name]),flush=True)
