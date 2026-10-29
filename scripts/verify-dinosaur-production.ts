import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { createOrganicDinosaur,poseDinosaurAction,bakeDinosaurClips,disposeOrganicDinosaur,speciesActions,ACTION_DURATIONS,MOUTH_TIPS } from '../src/models/SkinnedDinosaurs';
import { speciesNames } from '../src/world/paths';
import type { Species } from '../src/world/paths';
import { advanceEcosystem,createEcosystem,setWorldMode,actorAction,inhabitants } from '../src/world/ecosystem';
import { hydrationSites,hydrationSitesFor } from '../src/world/dinosaurResources';
import { habitatGround,WATER_LEVEL } from '../src/world/habitat';
import { TEXTURE_SIZE } from '../src/models/DinosaurSkin';

const models=[];let poseSamples=0,maxLoopError=0,maxFootGroundError=0,maxMouthWaterError=0;
for(const species of Object.keys(speciesNames) as Species[]){
 const rig=createOrganicDinosaur(species),geometry=rig.mesh.geometry,weights=geometry.getAttribute('skinWeight'),joints=geometry.getAttribute('skinIndex');
 assert(geometry.getAttribute('uv')&&geometry.getAttribute('normal'));assert.equal(new Set(rig.bones.map(b=>b.name)).size,rig.bones.length);
 for(let i=0;i<weights.count;i++){
  let sum=0;for(let j=0;j<4;j++){const w=weights.getComponent(i,j);assert(Number.isFinite(w)&&w>=0);sum+=w;assert(joints.getComponent(i,j)<rig.bones.length);}assert(Math.abs(sum-1)<1e-6);
 }
 for(const m of [rig.materials.skin,rig.materials.membrane]){assert(m.map&&m.normalMap&&m.roughnessMap);assert.equal(m.map.image.width,TEXTURE_SIZE);assert.equal(m.metalness,0);}
 const p=new Vector3();
 for(const action of speciesActions(species))for(let frame=0;frame<24;frame++){
  poseDinosaurAction(rig,frame/24*ACTION_DURATIONS[action],action);
  for(const b of rig.bones){assert(b.position.toArray().every(Number.isFinite));assert(Math.abs(b.quaternion.length()-1)<1e-5);}
  for(let i=0;i<weights.count;i+=37){p.fromBufferAttribute(geometry.getAttribute('position'),i);rig.mesh.applyBoneTransform(i,p);assert(p.toArray().every(Number.isFinite),`${species} ${action} nonfinite skin`);assert(p.length()<8,`${species} ${action} exploded skin: ${p.length()}`);}
  poseSamples++;
 }
 const clips=bakeDinosaurClips(rig);
 for(const clip of clips){assert(clip.validate());for(const track of clip.tracks){const n=track.getValueSize();for(let i=0;i<n;i++){const e=Math.abs(track.values[i]-track.values[track.values.length-n+i]);maxLoopError=Math.max(maxLoopError,e);assert(e<1e-5,`${species}/${clip.name} does not loop`);}}}
 poseDinosaurAction(rig,.7,'walk');const fingerprint=rig.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]);poseDinosaurAction(rig,.7,'walk');assert.deepEqual(rig.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]),fingerprint,'Same time drifts');
 if(species!=='pterosaur'){
  const path={x:0,y:habitatGround(0,-5),z:-5,heading:0},scale=.7;rig.root.position.set(path.x,path.y,path.z);rig.root.scale.setScalar(scale);
  for(let frame=0;frame<24;frame++){const t=frame/24*ACTION_DURATIONS.walk;poseDinosaurAction(rig,t,'walk',{path,scale,ground:true});for(const leg of rig.legs){const cycle=(frame/24+leg.phase/(Math.PI*2))%1;if(cycle>.64)continue;const p=leg.toe.getWorldPosition(new Vector3()),error=Math.abs(p.y-.075*scale-habitatGround(p.x,p.z));maxFootGroundError=Math.max(maxFootGroundError,error);assert(error<.035,`${species} stance foot misses ground: ${error}`);}}
  const animal=inhabitants.find(a=>a.species===species)!,site=hydrationSitesFor(animal)[0];assert(site,`${species} has no reachable water`);
  const bank={x:site.x,y:habitatGround(site.x,site.z),z:site.z,heading:Math.atan2(site.lookX-site.x,site.lookZ-site.z)};rig.root.position.set(bank.x,bank.y,bank.z);rig.root.rotation.y=bank.heading;rig.root.scale.setScalar(animal.scale);
  poseDinosaurAction(rig,1,'idle',{path:bank,scale:animal.scale,drink:1,reach:Math.hypot(site.lookX-site.x,site.lookZ-site.z)});const tip=rig.head.localToWorld(new Vector3(...MOUTH_TIPS[species])),error=tip.distanceTo(new Vector3(site.lookX,WATER_LEVEL+.018*animal.scale,site.lookZ));maxMouthWaterError=Math.max(maxMouthWaterError,error);assert(error<.004,`${species} mouth misses reachable water: ${error}`);
 }
 models.push({species,triangles:geometry.index!.count/3,vertices:weights.count,bones:rig.bones.length,clips:clips.map(c=>c.name)});disposeOrganicDinosaur(rig);
}
assert(hydrationSites.length>0,'No usable water stations');
const world=createEcosystem(),behaviors:Record<string,Set<string>>={};
for(let frame=0;frame<7200;frame++){
 advanceEcosystem(world,.05);for(const actor of world.actors){(behaviors[actor.species]??=new Set()).add(actor.behavior);assert(Number.isFinite(actor.hunger+actor.energy+actor.gaitTime));assert(actor.hunger>=0&&actor.hunger<=100&&actor.energy>=0&&actor.energy<=1);if(!actor.moving&&actor.altitude===undefined)assert(!['walk','run'].includes(actorAction(actor,world.mode)),'Stationary animal walks in place');}
}
assert(behaviors.spinosaurus.has('fish'),'Spinosaurus never fishes');assert(behaviors.brachiosaurus.has('browse'),'Sauropod never browses');assert(behaviors.triceratops.has('graze'));assert(behaviors.stegosaurus.has('graze'));assert(behaviors.velociraptor.has('hunt'));assert(behaviors.rex.has('hunt'));assert(behaviors.pterosaur.has('glide')&&behaviors.pterosaur.has('fly'));
world.paused=true;const frozen=JSON.stringify(world);advanceEcosystem(world,.05);assert.equal(JSON.stringify(world),frozen);world.paused=false;
for(const mode of ['ice','ember'] as const){setWorldMode(world,mode);for(let frame=0;frame<60;frame++)advanceEcosystem(world,.05);assert(world.actors.every(a=>a.drink===0&&!['graze','browse','fish','rest'].includes(a.behavior)),'Resource behaviour survives disaster');}
const report={result:'PASS',models,poseSamples,maxLoopError,maxFootGroundError,maxMouthWaterError,waterStations:hydrationSites.length,simulationSeconds:360,behaviors:Object.fromEntries(Object.entries(behaviors).map(([s,b])=>[s,[...b]])),normalizedWeights:true,finiteSkin:true,loopContinuity:true,deterministicPose:true,pause:true,disasterInterruptsResources:true};
writeFileSync('verification-dinosaur-production.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
