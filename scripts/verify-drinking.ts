import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { createOrganicDinosaur,poseDinosaurAction,disposeOrganicDinosaur,MOUTH_TIPS,speciesActions,ACTION_DURATIONS } from '../src/models/SkinnedDinosaurs';
import { inhabitants,createEcosystem,advanceEcosystem } from '../src/world/ecosystem';
import { hydrationSitesFor,animalWalkable } from '../src/world/dinosaurResources';
import { habitatGround,WATER_LEVEL } from '../src/world/habitat';
import { planNavigationRoute } from '../src/world/navigation';

let maxBoneLengthError=0,maxMouthError=0,maxFootError=0,maxFrameTravel=0,maxJointFrameTravel=0;
const cases=[],spawnWorld=createEcosystem();
for(const animal of inhabitants.filter(a=>a.altitude===undefined)){
 const rig=createOrganicDinosaur(animal.species),chain=[...rig.neckBones,rig.head],sites=hydrationSitesFor(animal);
 assert(sites.length,`${animal.id}: no anatomically reachable water`);
 let site=sites.find(p=>planNavigationRoute(animal.homeX,animal.homeZ,p.x,p.z,animal.radius*.58,{exactGoal:true}).length);
 // Home coordinates may be forest; the actual spawn always belongs to a navigation component.
 if(!site){const actor=spawnWorld.actors.find(a=>a.id===animal.id)!;site=sites.find(p=>planNavigationRoute(actor.x,actor.z,p.x,p.z,animal.radius*.58,{exactGoal:true}).length);}
 assert(site,`${animal.id}: no reachable bank route`);
 const path={...site,y:habitatGround(site.x,site.z),heading:Math.atan2(site.lookX-site.x,site.lookZ-site.z)},reach=Math.hypot(site.lookX-site.x,site.lookZ-site.z);
 rig.root.position.set(path.x,path.y,path.z);rig.root.rotation.y=path.heading;rig.root.scale.setScalar(animal.scale);
 let last:Vector3|undefined,lastJoints:Vector3[]|undefined;
 for(let f=0;f<=120;f++){
  const drink=f/120;poseDinosaurAction(rig,1,'idle',{path,scale:animal.scale,ground:true,drink,reach});
  for(const bone of chain){
   assert(bone.position.distanceTo(rig.rest.get(bone)!)<1e-10,`${animal.id}: translated neck joint`);
   assert(bone.scale.distanceTo(new Vector3(1,1,1))<1e-10,'Scaled neck joint');
   const parent=bone.parent!,actual=bone.getWorldPosition(new Vector3()).distanceTo(parent.getWorldPosition(new Vector3())),expected=rig.rest.get(bone)!.length()*animal.scale,error=Math.abs(actual-expected);
   maxBoneLengthError=Math.max(maxBoneLengthError,error);assert(error<1e-8,`${animal.id}: stretched neck by ${error}`);
  }
  const mouth=rig.head.localToWorld(new Vector3(...MOUTH_TIPS[animal.species]));
  const joints=chain.map(b=>b.getWorldPosition(new Vector3()));if(lastJoints)joints.forEach((p,i)=>{const travel=p.distanceTo(lastJoints![i]);maxJointFrameTravel=Math.max(maxJointFrameTravel,travel);assert(travel<.075,`${animal.id}: neck joint snaps ${travel}`);});lastJoints=joints;
  if(last){const travel=mouth.distanceTo(last);maxFrameTravel=Math.max(maxFrameTravel,travel);assert(travel<.075,`${animal.id}: discontinuous drinking pose ${travel}`);}last=mouth;
  if(f===120){
   const target=new Vector3(site.lookX,WATER_LEVEL+.018*animal.scale,site.lookZ),error=mouth.distanceTo(target);maxMouthError=Math.max(maxMouthError,error);assert(error<.004,`${animal.id}: mouth misses reachable water by ${error}`);
   for(const leg of rig.legs){const foot=leg.toe.getWorldPosition(new Vector3()),error=Math.abs(foot.y-.075*animal.scale-habitatGround(foot.x,foot.z));maxFootError=Math.max(maxFootError,error);assert(error<.035,`${animal.id}: crouch lifts foot ${error}`);}
  }
 }
 // An impossible destination must never pull the skeleton apart.
 poseDinosaurAction(rig,1,'idle',{path,scale:animal.scale,ground:true,drink:1,reach:12});
 for(const bone of chain)assert(bone.position.distanceTo(rig.rest.get(bone)!)<1e-10,'Impossible target extended neck');
 for(const action of speciesActions(animal.species))for(let f=0;f<24;f++){
  poseDinosaurAction(rig,f/24*ACTION_DURATIONS[action],action);
  for(const bone of chain)assert(bone.position.distanceTo(rig.rest.get(bone)!)<1e-10,`${action} changes neck length`);
 }
 cases.push({id:animal.id,sites:sites.length,bankHeight:path.y,reach});disposeOrganicDinosaur(rig);
}
const world=createEcosystem(),drinkers=new Set<string>(),observedSites=new Set<string>(),rigs=new Map([...new Set(inhabitants.filter(a=>a.altitude===undefined).map(a=>a.species))].map(species=>[species,createOrganicDinosaur(species)]));let maxLiveMouthError=0;
for(let frame=0;frame<4800;frame++){
 advanceEcosystem(world,.05);
 for(const animal of world.actors.filter(a=>a.behavior==='drink')){
  drinkers.add(animal.id);assert(animal.target);assert(animalWalkable(animal.x,animal.z,animal.radius*.58));
  const key=`${animal.id}:${animal.target.x}:${animal.target.z}`;
  if(animal.drink===1&&!observedSites.has(key)){
   observedSites.add(key);const rig=rigs.get(animal.species)!;rig.root.position.set(animal.x,animal.y,animal.z);rig.root.rotation.y=animal.heading;rig.root.scale.setScalar(animal.scale);
   poseDinosaurAction(rig,animal.age,'idle',{path:animal,scale:animal.scale,ground:true,drink:1,reach:Math.hypot(animal.target.lookX-animal.x,animal.target.lookZ-animal.z)});
   const tip=rig.head.localToWorld(new Vector3(...MOUTH_TIPS[animal.species])),error=tip.distanceTo(new Vector3(animal.target.lookX,WATER_LEVEL+.018*animal.scale,animal.target.lookZ));maxLiveMouthError=Math.max(maxLiveMouthError,error);assert(error<.008,`${animal.id}: actual arrival cannot reach water ${error}`);
  }
 }
}
assert(drinkers.size>=12,`Too few animals can drink: ${drinkers.size}`);
for(const rig of rigs.values())disposeOrganicDinosaur(rig);
const report={result:'PASS',maxBoneLengthError,maxMouthError,maxLiveMouthError,maxFootError,maxFrameTravel,maxJointFrameTravel,drinkers:drinkers.size,liveDrinkingSites:observedSites.size,simulationSeconds:240,cases};
writeFileSync('verification-drinking.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
