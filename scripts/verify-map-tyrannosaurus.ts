import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Mesh,SkinnedMesh,Vector3 } from 'three';
import { loadMapModel } from './trex/load-map-model';
import { TyrannosaurusMapRig } from '../src/models/TyrannosaurusMapRig';
import { advanceEcosystem,createEcosystem,setWorldMode } from '../src/world/ecosystem';
import { habitatGround,WATER_LEVEL } from '../src/world/habitat';
import { hydrationSitesFor } from '../src/world/dinosaurResources';

const asset=await loadMapModel(),world=createEcosystem(),actors=world.actors.filter(a=>a.species==='rex'),rigs=actors.map(()=>new TyrannosaurusMapRig(asset.scene,asset.animations));
const meshes=(rig:TyrannosaurusMapRig)=>{const list:SkinnedMesh[]=[];rig.scene.traverse(o=>{if(o instanceof SkinnedMesh)list.push(o);});return list;};
for(let i=1;i<rigs.length;i++){
 assert.notEqual(rigs[0].mixer,rigs[i].mixer);assert.notEqual(rigs[0].bones[0],rigs[i].bones[0]);
 for(let m=0;m<meshes(rigs[0]).length;m++){const a=meshes(rigs[0])[m],b=meshes(rigs[i])[m];assert.notEqual(a.skeleton,b.skeleton);assert.equal(a.geometry,b.geometry);assert.equal(a.material,b.material);}
}
let maxNeckLengthError=0,maxFootError=0,maxMouthError=0,maxJointFrameTravel=0;let drinkingCases=0;
for(let i=0;i<actors.length;i++){
 const actor=actors[i],rig=rigs[i];
 for(const site of hydrationSitesFor(actor).filter((_,i)=>i%11===0)){
  actor.x=site.x;actor.z=site.z;actor.y=habitatGround(site.x,site.z);actor.heading=Math.atan2(site.lookX-site.x,site.lookZ-site.z);actor.target={...site,purpose:'drink'};actor.behavior='drink';actor.moving=false;
  let last:Vector3[]|undefined;for(let frame=0;frame<=60;frame++){
   actor.drink=frame/60;rig.pose(actor,'peaceful',.05);
   const joints=rig.neck.map(b=>b.getWorldPosition(new Vector3()));if(last)joints.forEach((p,j)=>{const delta=p.distanceTo(last![j]);maxJointFrameTravel=Math.max(maxJointFrameTravel,delta);assert(delta<.09,`Imported neck snaps: ${delta}`);});last=joints;
   for(let j=1;j<rig.neck.length;j++){const length=rig.neck[j].getWorldPosition(new Vector3()).distanceTo(rig.neck[j-1].getWorldPosition(new Vector3())),error=Math.abs(length-rig.neckLengths[j-1]*actor.scale);maxNeckLengthError=Math.max(maxNeckLengthError,error);assert(error<1e-5,`Imported neck stretches: ${error}`);}
  }
  const tip=rig.head.localToWorld(rig.mouthLocal.clone()),target=new Vector3(site.lookX,WATER_LEVEL+.018*actor.scale,site.lookZ),error=tip.distanceTo(target);maxMouthError=Math.max(maxMouthError,error);assert(error<.015,`New rex cannot reach water: ${error} at ${JSON.stringify(site)}`);
  for(const leg of rig.legs){const foot=leg.foot.getWorldPosition(new Vector3()),error=Math.abs(foot.y-habitatGround(foot.x,foot.z)-leg.sole*actor.scale);maxFootError=Math.max(maxFootError,error);assert(error<.03,`New rex foot floats: ${error}`);}drinkingCases++;
 }
}
// Full simulation, source clip selection, distance-based gait and pause determinism.
const live=createEcosystem(),seen=new Set<string>();
for(let f=0;f<2400;f++){
 advanceEcosystem(live,.05);
 live.actors.filter(a=>a.species==='rex').forEach((actor,i)=>{const rig=rigs[i];rig.pose(actor,live.mode,.05);seen.add(rig.activeClip);for(const mesh of meshes(rig)){for(let n=0;n<mesh.geometry.attributes.position.count;n+=503){const p=new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,n);mesh.applyBoneTransform(n,p);assert(p.toArray().every(Number.isFinite),'Nonfinite imported skin');}}});
}
assert(seen.has('01_Idle')&&seen.has('02_Walk'));
setWorldMode(live,'ember');for(let f=0;f<80;f++){advanceEcosystem(live,.05);live.actors.filter(a=>a.species==='rex').forEach((actor,i)=>{rigs[i].pose(actor,'ember',.05);seen.add(rigs[i].activeClip);});}assert(seen.has('03_Run'));
const actor=live.actors.find(a=>a.species==='rex')!,rig=rigs[0];rig.pose(actor,'ember',0,true);const frozen=rig.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]);for(let i=0;i<20;i++)rig.pose(actor,'ember',.05,true);assert.deepEqual(rig.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]),frozen,'Paused imported rig drifts');
let triangles=0;rig.scene.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
const report={result:'PASS',instances:rigs.length,triangles,bones:rig.bones.length,independentSkeletons:true,sharedGpuAssets:true,drinkingCases,maxNeckLengthError,maxFootError,maxMouthError,maxJointFrameTravel,clipsSeen:[...seen],pause:true};
writeFileSync('verification-map-tyrannosaurus.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));rigs.forEach(r=>r.dispose());
