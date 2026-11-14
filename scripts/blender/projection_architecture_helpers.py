"""Sweeping architectural LED rental pavilion, October 16 latest moodboard.

The upper booth photograph is the geometry authority; the lower photo strips
only explain details. All geometry is true 3D in Three XYZ, +Z toward visitors.
Runtime media faces are intentionally absent and described by the JSON layout.
Products have their own independent v3 authoring script and manifest.
"""
from pathlib import Path

HELPERS=Path(__file__).with_name("projection_joinery_helpers.py")
source=HELPERS.read_text(encoding="utf-8").split("# A very low rectilinear stone base")[0]
exec(compile(source,str(HELPERS),"exec"))
OUT=ROOT/"public/models/expo/led-rental-pavilion-v3.glb"
LAYOUT_OUT=ROOT/"public/models/expo/led-rental-pavilion-v3-layout.json"
SCREENS=[]
FLOOR_TOP=.22
ROOT_POSITION=[-10.2,0,-171]
ROOT_ROTATION=[0,math.pi/2,0]
HERO={"position":[2,3.35,26.5],"look":[0,4.65,-1],"verticalFov":40}
RNG=random.Random(20261021)
TYPOGRAPHY=[]

# Preserve material roles for the runtime finish calibration, with distinct V3
# resources so previous pavilions remain completely intact.
for mat in bpy.data.materials:
    if mat.name.startswith("LED Rental V2"):
        mat.name=mat.name.replace("LED Rental V2","LED Rental V3")
DEEP_GREEN=material("LED Rental V3 | sculpted deep green metallic accent",(.004,.061,.039),.72,.30)
GLASS_V3=material("LED Rental V3 | fine clear bronze glass",(.57,.69,.65),.02,.12)
GLASS_V3.node_tree.nodes.get("Principled BSDF").inputs["Alpha"].default_value=.30
GLASS_V3.diffuse_color=(.57,.69,.65,.30)
GLASS_V3.surface_render_method="DITHERED"


def catmull(points,steps=8):
    """Interpolating smooth swept geometry, rather than box approximations."""
    pts=[Vector(p) for p in points]
    result=[]
    for j in range(len(pts)-1):
        a,b,c,d=pts[max(j-1,0)],pts[j],pts[j+1],pts[min(j+2,len(pts)-1)]
        for k in range(steps):
            t=k/steps
            result.append((2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
    result.append(pts[-1])
    return result


def ribbon(name,path,width,depth,mat,widths=None,depths=None):
    """Solid sculpted ribbon; its broad face follows XY and its depth is Z."""
    pts=[Vector(p) for p in path]
    verts,faces=[],[]
    for j,p in enumerate(pts):
        tangent=(pts[min(j+1,len(pts)-1)]-pts[max(0,j-1)])
        normal=Vector((-tangent.y,tangent.x,0)).normalized()
        half=(widths[j] if widths is not None else width)/2
        localdepth=depths[j] if depths is not None else depth
        for side,dz in ((-1,-localdepth/2),(1,-localdepth/2),(1,localdepth/2),(-1,localdepth/2)):
            verts.append(p+normal*half*side+Vector((0,0,dz)))
    for j in range(len(pts)-1):
        for q in range(4):
            faces.append((j*4+q,(j+1)*4+q,(j+1)*4+(q+1)%4,j*4+(q+1)%4))
    faces.extend([(3,2,1,0),tuple((len(pts)-1)*4+q for q in range(4))])
    ob=patch_mesh(name,verts,faces,mat)
    return ob


def front_z(x):return 2.78+.36*math.cos(x/14.4*math.pi/2)


def fascia_bottom(x):
    # Quiet continuous wave: a higher left product bay and lower graceful
    # center/right span, like the latest swept black fascia in the reference.
    return 7.74+.40*math.exp(-((x+8.7)/3.0)**2)-.13*math.exp(-((x-8.0)/3.4)**2)


def front_warp(objects,offset=.15):
    bpy.context.view_layer.update()
    for ob in objects:
        if ob.type!="MESH":continue
        matrix=ob.matrix_world.copy()
        ob.parent=None
        for vertex in ob.data.vertices:
            q=matrix@vertex.co
            # Blender q.y is negative Three Z; glyph thickness is preserved.
            three_z=-q.y
            q.y=-(front_z(q.x)+offset+(three_z-3.16))
            vertex.co=q
        ob.matrix_world=Matrix.Identity(4)


def caption_glyph(body,p,height,max_width=None,**kwargs):
    """Keep semibold letterforms proportional when the wall limits a label."""
    kwargs.pop("semibold",None)
    ob=glyph(body,p,height,max_width=None,semibold=True,**kwargs)
    width=max(v.co.x for v in ob.data.vertices)-min(v.co.x for v in ob.data.vertices)
    fit=min(1,max_width/width) if max_width else 1
    if fit<1:
        for vertex in ob.data.vertices:vertex.co*=fit
    actual_width=width*fit
    assert not max_width or actual_width<=max_width+1e-6
    TYPOGRAPHY.append({"text":body,"position":list(p),"requestedCapHeight":height,
        "capHeight":height*fit,"width":actual_width,"maxWidth":max_width,
        "uniformFit":fit,"font":"Segoe UI Semibold"})
    return ob


def front_glyph(body,p,height,**kwargs):
    before=set(bpy.context.scene.objects)
    caption_glyph(body,p,height,**kwargs)
    front_warp(set(bpy.context.scene.objects)-before)


def feather_palm(name,x,z,height=3.2,radius=.9,seed=0):
    """Fine real pinnate palm leaflets, arching fronds and slender canes."""
    rng=random.Random(seed)
    pot_h=min(.83,height*.25)
    pot_r=radius*.33
    lathe(name+" | brushed graphite planter",x,z,[(pot_r*.91,FLOOR_TOP),
        (pot_r,FLOOR_TOP+.06),(pot_r*.91,FLOOR_TOP+pot_h),
        (pot_r*.86,FLOOR_TOP+pot_h+.03)],POT,24)
    disk(name+" | planted dark soil",x,z,pot_r*.85,FLOOR_TOP+pot_h-.02,FLOOR_TOP+pot_h,BLACK)
    verts,faces,indices=[],[],[]
    for cane in range(3 if height>2.2 else 2):
        a=cane*2.4+seed*.17
        head=Vector((x+math.cos(a)*radius*.16,FLOOR_TOP+height*(.69+cane*.105),z+math.sin(a)*radius*.16))
        root=Vector((x,FLOOR_TOP+pot_h-.02,z))
        sweep(name+" | slim softly bowed natural palm cane",[(root,.022),
            (root.lerp(head,.55)+Vector((.025,0,.025)),.018),(head,.011)],TIMBER,7)
        for frond in range(7):
            angle=frond*math.tau/7+a
            direction=Vector((math.cos(angle),0,math.sin(angle)))
            side=Vector((-math.sin(angle),0,math.cos(angle)))
            reach=radius*rng.uniform(.83,1.20)
            peak=height*rng.uniform(.09,.14)
            drop=height*rng.uniform(.12,.24)
            def spine(t):return head+direction*(reach*t)+Vector((0,peak*math.sin(t*math.pi)-drop*t*t,0))
            sweep(name+" | arched palm frond rachis",[(spine(j/12),.007*(1-j/15)) for j in range(13)],LEAVES[1],5)
            for j in range(1,16):
                t=j/16
                p=spine(t)
                leaflen=radius*.34*(math.sin(math.pi*t)**.65)*rng.uniform(.88,1.12)
                for sign in (-1,1):
                    tip=p+side*sign*leaflen+direction*leaflen*.30+Vector((0,-leaflen*.18,0))
                    mid=p.lerp(tip,.52)+Vector((0,.018,0))
                    # Wider pinnae retain the fine feathered structure while
                    # remaining visible at the reference's wide hero framing.
                    breadth=leaflen*.095*1.70
                    edge=direction*breadth
                    idx=len(verts)
                    verts.extend((p,mid-edge,mid+Vector((0,.014,0)),mid+edge,tip))
                    faces.extend(((idx,idx+1,idx+2),(idx,idx+2,idx+3),
                        (idx+1,idx+4,idx+2),(idx+2,idx+4,idx+3)))
                    indices.extend([rng.randrange(3)]*4)
    ob=patch_mesh(name+" | individually modeled fine feathered palm leaflets",verts,faces,LEAF)
    for mat in LEAVES[1:]:ob.data.materials.append(mat)
    for face,index in zip(ob.data.polygons,indices):face.material_index=index


def lounge_chair(x,z,yaw=0,width=1.45):
    before=set(bpy.context.scene.objects)
    soft_box("LED Rental V3 | lounge chair soft low upholstered base",(0,.48,0),(width,.40,1.40),IVORY,.11)
    soft_box("LED Rental V3 | lounge chair padded back",(0,1.11,-.52),(width,1.0,.28),IVORY,.12)
    for side in (-1,1):
        soft_box("LED Rental V3 | lounge chair curved padded arm",(side*(width/2-.11),.91,.01),(.23,.84,1.44),IVORY,.10)
        for zz in (-.48,.48):rod("LED Rental V3 | chair thin metal foot",(side*(width/2-.22),0,zz),(side*(width/2-.22),.40,zz),.025,BRUSHED,8)
    soft_box("LED Rental V3 | chair broad loose seat cushion",(0,.76,.10),(width-.45,.24,1.03),IVORY,.10)
    soft_box("LED Rental V3 | chair loose back cushion",(0,1.15,-.30),(width-.42,.67,.22),IVORY,.08)
    return group("LED Rental V3 | ivory visitor lounge armchair",before,(x,FLOOR_TOP,z),yaw)


def cafe_table(x,z):
    disk("LED Rental V3 | round hospitality table stone top",x,z,.75,1.38,1.44,TOP)
    rod("LED Rental V3 | round hospitality table central metal stem",(x,FLOOR_TOP,z),(x,1.38,z),.055,BRUSHED,12)
    disk("LED Rental V3 | round hospitality table low round base",x,z,.40,FLOOR_TOP,FLOOR_TOP+.055,BRUSHED)


def water_glass(x,y,z):
    lathe("LED Rental V3 | fine clear water tumbler",x,z,[(.075,y),(.078,y+.19),(.070,y+.20),(.067,y+.025),(.075,y)],GLASS_V3,24)


