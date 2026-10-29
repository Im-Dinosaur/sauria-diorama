import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { createResinShell } from '../src/world/resinShell';

// Regression: a transparent top face 0.004 above the lava used to produce a flat glint.
// Verify the actual render geometry, its boundary, and the retained five cut faces.
for(const [width,height,depth] of [[12,.86,6],[12.008,1.52,6.008]]){
 const geometry=createResinShell(width,height,depth),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
 const sides=new Set<string>();let area=0,topTriangles=0;
 for(let i=0;i<p.count;i+=3){
  const a=new Vector3().fromBufferAttribute(p,i),b=new Vector3().fromBufferAttribute(p,i+1),c=new Vector3().fromBufferAttribute(p,i+2);
  const cross=b.clone().sub(a).cross(c.clone().sub(a));area+=cross.length()*.5;
  const face=cross.normalize();if(face.y>.9)topTriangles++;
  sides.add([Math.round(face.x),Math.round(face.y),Math.round(face.z)].join(','));
  for(let j=i;j<i+3;j++){
   assert.ok(Math.abs(p.getX(j))<=width/2+1e-6&&Math.abs(p.getY(j))<=height/2+1e-6&&Math.abs(p.getZ(j))<=depth/2+1e-6,'Shell escaped the existing block bounds');
   assert.ok(face.distanceTo(new Vector3().fromBufferAttribute(n,j))<1e-6,'Shell lost flat face normals');
  }
 }
 assert.equal(topTriangles,0,'Reflective lid must not cover the lava');
 assert.deepEqual([...sides].sort(),['1,0,0','-1,0,0','0,0,1','0,0,-1','0,-1,0'].sort());
 assert.ok(Math.abs(area-(2*height*(width+depth)+width*depth))<1e-4,'The four side walls and base must remain complete');
 console.log(JSON.stringify({size:[width,height,depth],topTriangles,triangles:p.count/3,retainedFaces:sides.size,area}));
 geometry.dispose();
}
