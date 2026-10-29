import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Mesh, Vector3 } from 'three';
import { createDinosaur, poseDinosaur, disposeDinosaur } from '../src/models/MechanicalDinosaurs';
import { creaturePath, creatureSpecs } from '../src/world/paths';
import type { Species } from '../src/world/paths';
import { groundHeight } from '../src/world/terrain';

const reports=[],samples=720,v=new Vector3();
for(const species of ['rex','triceratops','pterosaur'] as Species[]){
 const rig=createDinosaur(species),meshes:{mesh:Mesh;points:Vector3[];sole:boolean}[]=[];
 const fingerprint=()=>{const values:number[]=[];rig.root.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return JSON.stringify(values);};
 poseDinosaur(rig,20);const paused=fingerprint();poseDinosaur(rig,20);assert.equal(fingerprint(),paused,'Paused pose drift');poseDinosaur(rig,21);assert.notEqual(fingerprint(),paused,'Animation failed to advance');
 let triangles=0;
 rig.root.traverse(o=>{if(!(o instanceof Mesh))return;const g=o.geometry,a=g.getAttribute('position'),n=g.getAttribute('normal');
  assert(!g.index,'All dinosaur geometry must have face normals');triangles+=a.count/3;
  const m=Array.isArray(o.material)?o.material:[o.material];
  for(const material of m){assert('flatShading' in material&&material.flatShading);assert(!('map' in material&&material.map));assert(!(material.transparent&&o.castShadow));}
  for(let i=0;i<n.count;i+=3)for(let j=1;j<3;j++)assert(Math.abs(n.getX(i)-n.getX(i+j))+Math.abs(n.getY(i)-n.getY(i+j))+Math.abs(n.getZ(i)-n.getZ(i+j))<1e-5,'Smooth face normals');
  const unique=new Map<string,Vector3>();for(let i=0;i<a.count;i++){const point=new Vector3().fromBufferAttribute(a,i);unique.set(point.toArray().map(x=>x.toFixed(6)).join(','),point);}
  meshes.push({mesh:o,points:[...unique.values()],sole:o.name.startsWith('grounded-claws')});
 });
 let radius=0,wall=Infinity,terrain=Infinity,soleError=0,flightFloor=Infinity,vertices=0;
 for(let i=0;i<samples;i++){
  const time=i*120/samples,p=creaturePath(species,time),s=creatureSpecs[species].scale,c=Math.cos(p.heading),sn=Math.sin(p.heading);
  poseDinosaur(rig,time);rig.root.updateMatrixWorld(true);
  for(const {mesh,points,sole} of meshes)for(const point of points){
   v.copy(point).applyMatrix4(mesh.matrixWorld).multiplyScalar(s);radius=Math.max(radius,Math.hypot(v.x,v.z));flightFloor=Math.min(flightFloor,v.y);
   const x=p.x+v.x*c+v.z*sn,z=p.z-v.x*sn+v.z*c,y=p.y+v.y,clearance=y-groundHeight(x,z);
   wall=Math.min(wall,6-Math.abs(x),3-Math.abs(z));terrain=Math.min(terrain,clearance);
   if(sole&&Math.abs(point.y+.055)<1e-6)soleError=Math.max(soleError,Math.abs(clearance));vertices++;
  }
 }
 const round=(n:number)=>Number(n.toFixed(6));
 reports.push({species,poseSamples:samples,vertexSamples:vertices,meshes:meshes.length,triangles,maximumAnimatedRadius:round(radius),reservedRadius:creatureSpecs[species].radius,radiusMargin:round(creatureSpecs[species].radius-radius),minimumActualWallClearance:round(wall),minimumVertexTerrainClearance:round(terrain),maximumSoleTerrainError:round(soleError),minimumLocalVertexY:round(flightFloor)});
 assert(radius<=creatureSpecs[species].radius,`${species}: detailed model exceeds the verified path envelope (${radius})`);
 assert(wall>0,`${species}: wall collision`);assert(terrain>-.00001,`${species}: terrain penetration (${terrain})`);assert(soleError<.00001,`${species}: floating sole (${soleError})`);
 if(species==='pterosaur')assert(flightFloor>=-.35,'Flight clearance envelope changed');
 disposeDinosaur(rig);
}
const report={result:'PASS',durationSeconds:120,deterministicPause:true,unit:'scene units',method:'Every unique rendered vertex is transformed through the actual animated rig. The retained conservative envelopes feed the full path/obstacle/lane checks.',species:reports};
console.log(JSON.stringify(report,null,2));writeFileSync('verification-dinosaurs.json',JSON.stringify(report,null,2));
