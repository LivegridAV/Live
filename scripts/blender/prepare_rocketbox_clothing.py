"""Create garment-only diffuse variants while retaining the source skin/UVs.

Run with Python + Pillow after prepare_rocketbox_humans.py. Source meshes and
maps are Microsoft Rocketbox, MIT; see assets/humans/rocketbox/LICENSE.md.
"""
import json
import math
import struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[2]
ASSETS=Path(__file__).with_name("assets")/"humans/rocketbox"
CACHE=ROOT/".next/cache/rocketbox-prepared"


def accessor(document,binary,index):
    a=document["accessors"][index]
    view=document["bufferViews"][a["bufferView"]]
    component={5121:"B",5123:"H",5125:"I",5126:"f"}[a["componentType"]]
    count={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}[a["type"]]
    fmt="<"+component*count
    stride=view.get("byteStride",struct.calcsize(fmt))
    start=view.get("byteOffset",0)+a.get("byteOffset",0)
    return [struct.unpack_from(fmt,binary,start+i*stride) for i in range(a["count"])]


def variant(avatar,filename,white=False):
    data=(CACHE/(avatar+"_talk.glb")).read_bytes()
    json_length=struct.unpack_from("<I",data,12)[0]
    document=json.loads(data[20:20+json_length])
    binary=data[28+json_length:]
    source=Image.open(ASSETS/avatar/"body-color.jpg").convert("RGB")
    mask=Image.new("L",source.size)
    draw=ImageDraw.Draw(mask)
    for mesh in document["meshes"]:
        for p in mesh["primitives"]:
            name=document["materials"][p["material"]].get("name","")
            if " | body" not in name:continue
            positions=accessor(document,binary,p["attributes"]["POSITION"])
            uv=accessor(document,binary,p["attributes"]["TEXCOORD_0"])
            indices=[item[0] for item in accessor(document,binary,p["indices"])]
            for j in range(0,len(indices),3):
                triangle=indices[j:j+3]
                # Normalized upper-body height includes cloth sleeves. Hands
                # are excluded by their original warm skin colors below.
                heights=[positions[i][1] for i in triangle]
                if sum(heights)/3<.93 or min(heights)<.78 or max(heights)>1.59:continue
                draw.polygon([(uv[i][0]*(source.width-1),uv[i][1]*(source.height-1)) for i in triangle],fill=255)
    mask=mask.filter(ImageFilter.MaxFilter(5))
    pixels=source.load()
    coverage=mask.load()
    bounds=mask.getbbox()
    for y in range(bounds[1],bounds[3]):
        for x in range(bounds[0],bounds[2]):
            if coverage[x,y]<128:continue
            r,g,b=pixels[x,y]
            if r>g*1.16 and g>b*1.08 and r>65:continue
            luma=(r*.2126+g*.7152+b*.0722)/255
            if white:
                v=max(123,min(225,154+luma*185))
                pixels[x,y]=(round(v),round(v*.99),round(v*.965))
            else:
                v=round(10+min(100,luma*100)*.25)
                pixels[x,y]=(v,round(v*1.04),round(v*1.08))
    target=ASSETS/avatar/filename
    source.save(target,quality=94,subsampling=0)
    print("ROCKETBOX_CLOTHING "+str(target),flush=True)


if __name__=="__main__":
    variant("Business_Female_04","body-white-blouse.jpg",True)
    variant("Business_Male_01","body-black-top.jpg")
