from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image, ImageFilter

root=Path(__file__).resolve().parent.parent
im=np.array(Image.open(root/'public/textures/reference-valley.png').convert('RGB')).astype(float)
regions=[(0,0,im.shape[1],im.shape[0])]
terrain=json.loads((root/'src/world/reference-map.json').read_text())
dist=np.array(terrain['landDistanceCentimeters'],dtype='uint16').reshape(terrain['rows'],terrain['columns'])
distance=np.array(Image.fromarray(dist).resize((im.shape[1],im.shape[0]),Image.Resampling.NEAREST))
results=[]
for x0,y0,x1,y1 in regions:
    a=im[y0:y1,x0:x1];r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    raw=(r>g*.96)&(r<g*1.25)&(b>g*.73)&(b<g*1.03)&((r+g+b)/3>92)&(distance[y0:y1,x0:x1]>115)
    mask=np.array(Image.fromarray((raw*255).astype('uint8')).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7)))>0
    visited=np.zeros_like(mask);components=[]
    for y in range(mask.shape[0]):
        for x in range(mask.shape[1]):
            if not mask[y,x] or visited[y,x]:continue
            queue=deque([(y,x)]);visited[y,x]=True;points=[]
            while queue:
                yy,xx=queue.popleft();points.append((yy,xx))
                for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
                    ny,nx=yy+dy,xx+dx
                    if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not visited[ny,nx]:visited[ny,nx]=True;queue.append((ny,nx))
            if len(points)>40:
                p=np.array(points);components.append({'pixels':len(points),'center':[round(float(p[:,1].mean()+x0),1),round(float(p[:,0].mean()+y0),1)],'bounds':[int(p[:,1].min()+x0),int(p[:,0].min()+y0),int(p[:,1].max()+x0),int(p[:,0].max()+y0)]})
    components.sort(key=lambda p:-p['pixels']);results.append(components[:22])
print(json.dumps(results,indent=2))
