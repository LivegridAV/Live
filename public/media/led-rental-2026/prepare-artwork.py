from pathlib import Path
from PIL import Image
import json,hashlib
base=Path(__file__).resolve().parent
manifest=json.loads((base/'asset-manifest.json').read_text())

def output(image,name,size):
    image.convert('RGB').resize(size,Image.Resampling.LANCZOS).save(base/name,quality=95,method=6)

output(Image.open(base/'backdrop-source.png'),'backdrop.webp',(2048,1152))
products=Image.open(base/'products-source.png')
output(products.crop((836,470,1672,941)),'curved.webp',(1536,864))
output(products.crop((836,0,1672,470)),'cylinder.webp',(1536,864))
output(Image.open(base/'city-source.png'),'corner.webp',(2048,1024))
applications=Image.open(base/'applications-source.png')
for i,box in enumerate([(0,0,836,470),(836,0,1672,470),(0,470,836,941),(836,470,1672,941)]):
    output(applications.crop(box),f'application-{i}.webp',(1024,576))
output(Image.open(base/'earth-source-nasa.jpg'),'sphere.webp',(2048,1024))

def solve(matrix,rhs):
    matrix=[list(map(float,row))+[float(y)] for row,y in zip(matrix,rhs)]
    for i in range(len(matrix)):
        pivot=max(range(i,len(matrix)),key=lambda j:abs(matrix[j][i]))
        matrix[i],matrix[pivot]=matrix[pivot],matrix[i]
        q=matrix[i][i];matrix[i]=[x/q for x in matrix[i]]
        for j in range(len(matrix)):
            if j!=i:
                q=matrix[j][i];matrix[j]=[x-q*y for x,y in zip(matrix[j],matrix[i])]
    return [row[-1] for row in matrix]

reference=Path(manifest['designReference'])
if reference.exists():
    matrix=[];rhs=[]
    for (x,y),(u,v) in zip([(0,0),(1024,0),(1024,768),(0,768)],manifest['flatReferenceQuadTLTRBRBL']):
        matrix.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]])
        rhs.extend([u,v])
    source=Image.open(reference).convert('RGB')
    crop=source.transform((1024,768),Image.Transform.PERSPECTIVE,solve(matrix,rhs),Image.Resampling.BICUBIC)
    output(crop,'flat.webp',(1024,768))

assets=[]
for p in sorted(base.iterdir()):
    if p.suffix.lower() not in ['.png','.jpg','.webp']: continue
    image=Image.open(p)
    assets.append({'file':p.name,'width':image.width,'height':image.height,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
manifest['assets']=assets
(base/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(assets,indent=2))
