import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { reference,referenceCell,referencePoint,habitatGround,forest,walkable,WATER_LEVEL,HABITAT_GRID,rockOutcrops } from '../src/world/habitat';
import { DIORAMA } from '../src/world/layout';
import { fracturedSlab } from '../src/world/rockGeometry';
const file=readFileSync('public/textures/reference-valley.png');
assert.equal(file.readUInt32BE(16),1672);assert.equal(file.readUInt32BE(20),941);
assert.equal(createHash('sha256').update(file).digest('hex'),reference.sourceSHA256,'Reference image changed after the terrain was traced');
assert(Math.abs(DIORAMA.width/DIORAMA.depth-1672/941)<1e-10,'Reference aspect ratio is distorted');
assert.equal(reference.heightMillimeters.length,reference.columns*reference.rows);
let wet=0,dry=0,terrainError=0;
for(let i=0;i<reference.water.length;i++){
 const p=referencePoint(i);assert.equal(referenceCell(p.x,p.z),i,'Image/world coordinate mapping is not reversible');
 const h=habitatGround(p.x,p.z);terrainError=Math.max(terrainError,Math.abs(h-reference.heightMillimeters[i]/1000));
 assert.equal(h<WATER_LEVEL,!!reference.water[i],'Visible water and navigation terrain use different masks');
 if(reference.water[i])wet++;else dry++;
}
assert(terrainError<1e-9);assert(wet>reference.water.length*.06&&wet<reference.water.length*.15);
for(const i of [0,reference.columns-1,(reference.rows-1)*reference.columns,reference.rows*reference.columns-1])assert.equal(reference.water[i],0,'A rectangular sea border was introduced');
for(const p of forest){const i=referenceCell(p.x,p.z);assert.equal(reference.canopy[i],1,'A tree invaded a reference clearing');assert(habitatGround(p.x,p.z)>.40);}
assert(forest.length>1000);assert(forest.some(p=>p.kind===0)&&forest.some(p=>p.kind===1)&&forest.some(p=>p.kind===2)&&forest.some(p=>p.kind===3));
const deep=reference.heightMillimeters.indexOf(Math.min(...reference.heightMillimeters)),p=referencePoint(deep);assert.equal(walkable(p.x,p.z,.5),false);
assert.equal(rockOutcrops.length,4);
let checkedRockFaces=0;
for(let seed=17;seed<28;seed++){
 const g=fracturedSlab(seed),p=g.getAttribute('position'),n=g.getAttribute('normal');
 for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
  if(i%15===12)assert(n.getY(i)>0,'Rock top faces down and disappears with backface culling');
  assert(x*n.getX(i)+y*n.getY(i)+z*n.getZ(i)>0,'Rock wall points inward');checkedRockFaces++;
 }g.dispose();
}
const report={result:'PASS',sourceImageUnmodified:true,referencePixels:reference.sourceSize,sourceSHA256:reference.sourceSHA256,worldSize:[DIORAMA.width,DIORAMA.depth],aspectPreserved:true,grid:[HABITAT_GRID.nx,HABITAT_GRID.nz],sampledVertices:reference.water.length,maximumTerrainVertexError:terrainError,waterAreaPercent:wet/(wet+dry)*100,noRectangularWaterBorder:true,treeCount:forest.length,treesInsideReferenceForest:true,registeredRockOutcrops:rockOutcrops.length,terrainHeightRange:[Math.min(...reference.heightMillimeters)/1000,Math.max(...reference.heightMillimeters)/1000],waterLevel:WATER_LEVEL};
Object.assign(report,{checkedOutwardRockFaces:checkedRockFaces});writeFileSync('verification-reference.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
