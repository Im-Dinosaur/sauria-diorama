import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Mesh } from 'three';
import { createEcosystem,advanceEcosystem,setWorldMode,desiredSpeed,inhabitants,ecosystemSummary } from '../src/world/ecosystem';
import { habitatGround,forest,WATER_LEVEL } from '../src/world/habitat';
import { DIORAMA } from '../src/world/layout';
import { createOrganicDinosaur,poseOrganicDinosaur,disposeOrganicDinosaur } from '../src/models/SkinnedDinosaurs';
import type { Species } from '../src/world/paths';
const world=createEcosystem(),seenDrinking=new Set<string>();
assert.equal(inhabitants.length,32);assert.equal(new Set(inhabitants.map(a=>a.species)).size,7);assert(inhabitants.every(a=>!a.mechanical));
assert(DIORAMA.width>0&&DIORAMA.depth>0);assert(forest.length>150);
let shore=Infinity,wall=Infinity,minSeparation=Infinity,moved=0;
for(let frame=0;frame<2400;frame++){
 advanceEcosystem(world,.05);
 for(const a of world.actors){assert(Number.isFinite(a.x+a.y+a.z+a.age+a.heading));wall=Math.min(wall,DIORAMA.halfWidth-Math.abs(a.x)-a.radius,DIORAMA.halfDepth-Math.abs(a.z)-a.radius);
  if(a.altitude===undefined){shore=Math.min(shore,habitatGround(a.x,a.z)-WATER_LEVEL);if(a.behavior==='drink')seenDrinking.add(a.id);}
 }
 if(frame%20===0)for(let i=0;i<world.actors.length;i++)for(let j=i+1;j<world.actors.length;j++){const a=world.actors[i],b=world.actors[j];if(a.altitude===undefined&&b.altitude===undefined)minSeparation=Math.min(minSeparation,Math.hypot(a.x-b.x,a.z-b.z)-(a.radius+b.radius)*.64);}
}
assert(seenDrinking.size>=3,`Drinking never reached: ${seenDrinking.size}`);assert(shore>0,'Animal leaves dry terrain');assert(wall>0,'Animal leaves diorama');assert(minSeparation>=-.01,'Animal avoidance failed');
for(const a of world.actors)if(a.distance>1)moved++;assert(moved>=27,`Animals stuck: ${JSON.stringify(world.actors.filter(a=>a.distance<1).map(a=>({id:a.id,x:a.x,z:a.z,route:a.route.length,waypoint:a.waypoint,blocked:a.blocked,distance:a.distance})))}`);
world.paused=true;const frozen=JSON.stringify(world);advanceEcosystem(world,.05);assert.equal(JSON.stringify(world),frozen);world.paused=false;
const before=world.actors.map(a=>({x:a.x,y:a.y,z:a.z,age:a.age}));setWorldMode(world,'ember');assert.deepEqual(world.actors.map(a=>({x:a.x,y:a.y,z:a.z,age:a.age})),before,'Mode switch teleports animals');
for(const a of world.actors)assert.equal(desiredSpeed(a,'ember'),desiredSpeed(a,'peaceful')*2.8);
for(let i=0;i<400;i++)advanceEcosystem(world,.05);assert(world.actors.some(a=>a.behavior==='escape'));assert(world.actors.every(a=>a.drink===0),'Drinking survives disaster');
setWorldMode(world,'ice');for(let i=0;i<100;i++)advanceEcosystem(world,.05);assert.equal(ecosystemSummary(world).mechanical,0);
const models=[];
for(const species of ['rex','triceratops','pterosaur','stegosaurus','brachiosaurus','velociraptor','spinosaurus'] as Species[]){
 const rig=createOrganicDinosaur(species);let triangles=0,curvedNormals=0,metal=0;
 rig.root.traverse(o=>{if(!(o instanceof Mesh))return;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if('metalness'in m)metal+=Number(m.metalness);if('flatShading'in m&&!m.flatShading)curvedNormals++;}});
 assert(triangles>1000&&curvedNormals>0);assert.equal(metal,0);
 const path={x:0,y:.46,z:-5,heading:0};poseOrganicDinosaur(rig,12,path,.7,0);rig.root.updateMatrixWorld(true);const fingerprint=JSON.stringify(rig.root.toJSON().object);poseOrganicDinosaur(rig,12,path,.7,0);rig.root.updateMatrixWorld(true);assert.equal(JSON.stringify(rig.root.toJSON().object),fingerprint,'Pose drifts while paused');
 models.push({species,triangles,curvedMeshes:curvedNormals});disposeOrganicDinosaur(rig);
}
const report={result:'PASS',map:[DIORAMA.width,DIORAMA.depth],animals:inhabitants.length,species:7,mechanical:0,trees:forest.length,peacefulSimulationSeconds:120,animalsObservedDrinking:seenDrinking.size,animalsMoving:moved,minimumDryGroundAboveWater:shore,minimumWallClearance:wall,minimumAvoidanceClearance:minSeparation,modeSwitchPreservesPositions:true,pauseFreezesSimulation:true,disasterSpeedMultiplier:2.8,models};
writeFileSync('verification-ecosystem.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
