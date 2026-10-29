import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Box3,Mesh,SkinnedMesh,Vector3} from 'three';
import {loadMapModel} from './trex/load-map-model';
import {RealisticMapRig,MAP_MODEL_LENGTHS,realisticModel} from '../src/models/RealisticMapRig';
import type {RealisticSpecies} from '../src/models/RealisticMapRig';
import {createEcosystem} from '../src/world/ecosystem';
import {hydrationSitesFor} from '../src/world/dinosaurResources';
import {habitatGround,WATER_LEVEL} from '../src/world/habitat';
import {METRES_PER_UNIT} from '../src/world/physicalScale';
const world=createEcosystem(),cases=[];
for(const species of Object.keys(MAP_MODEL_LENGTHS) as RealisticSpecies[]){
 const asset=await loadMapModel(`public${realisticModel(species)}`),rig=new RealisticMapRig(asset.scene,asset.animations,species),other=new RealisticMapRig(asset.scene,asset.animations,species);
 assert.notEqual(rig.bones[0],other.bones[0]);assert.notEqual(rig.mixer,other.mixer);
 const meshes:SkinnedMesh[]=[];rig.scene.traverse(o=>{if(o instanceof SkinnedMesh)meshes.push(o);});
 const others:SkinnedMesh[]=[];other.scene.traverse(o=>{if(o instanceof SkinnedMesh)others.push(o);});
 meshes.forEach((m,i)=>{assert.equal(m.geometry,others[i].geometry);assert.equal(m.material,others[i].material);assert.notEqual(m.skeleton,others[i].skeleton);});
 const box=new Box3().setFromObject(rig.root,true),size=box.getSize(new Vector3()),length=species==='pterosaur'?size.x:size.z;
 assert(Math.abs(length-MAP_MODEL_LENGTHS[species])<1e-5,`${species} scale ${length}`);
 const actor=world.actors.filter(a=>a.species===species).sort((a,b)=>b.scale-a.scale)[0];
 const neutralHipY=rig.point(rig.hips).y;
 const offsets=rig.bones.map(b=>b.position.clone()),scales=rig.bones.map(b=>b.scale.clone());
 let maxLengthError=0;
 for(let f=0;f<120;f++){
  actor.age=f*.05;actor.distance=f*.015;actor.moving=f<40;actor.behavior=f<40?'wander':f<80?'drink':'rest';actor.drink=f>=40&&f<80?(f-40)/40:0;
  actor.target={x:actor.x,z:actor.z,lookX:actor.x,lookZ:actor.z+actor.scale,purpose:'drink'};
  rig.pose(actor,f>100?'ember':'peaceful',.05);
  rig.bones.forEach((b,i)=>{assert(b.position.toArray().every(Number.isFinite)&&b.quaternion.toArray().every(Number.isFinite),`${species} finite`);if(b!==rig.hips&&!/^controller(hand|foot)/.test(b.name))assert(b.position.distanceTo(offsets[i])<1e-9,`${species} stretched ${b.name}`);assert(b.scale.distanceTo(scales[i])<1e-9);});
  rig.neck.slice(1).forEach((b,i)=>{const error=Math.abs(b.getWorldPosition(new Vector3()).distanceTo(rig.neck[i].getWorldPosition(new Vector3()))-rig.neckLengths[i]*actor.scale);maxLengthError=Math.max(maxLengthError,error);assert(error<1e-5,`${species} neck length ${error}`);});
  if(species==='pterosaur')assert(Math.abs(rig.point(rig.hips).y-neutralHipY)<1e-6,'Flight altitude counted twice');
 }
 rig.pose(actor,'ember',0,true);const frozen=rig.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]);for(let f=0;f<10;f++)rig.pose(actor,'ember',.05,true);assert.deepEqual(rig.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]),frozen,`${species} pause drift`);
 let mouthError:number|undefined,maxFootError:number|undefined;
 const site=hydrationSitesFor(actor)[0];
 if(site&&species!=='pterosaur'){
  actor.x=site.x;actor.z=site.z;actor.y=habitatGround(site.x,site.z);actor.heading=Math.atan2(site.lookX-site.x,site.lookZ-site.z);actor.target={...site,purpose:'drink'};actor.behavior='drink';actor.drink=1;actor.moving=false;
  for(let f=0;f<60;f++)rig.pose(actor,'peaceful',.05);
  const mouth=rig.head.localToWorld(rig.mouthLocal.clone());mouthError=mouth.distanceTo(new Vector3(site.lookX,WATER_LEVEL+.01,site.lookZ));
  maxFootError=Math.max(...rig.legs.map(l=>{const foot=l.foot.getWorldPosition(new Vector3());return Math.abs(foot.y-habitatGround(foot.x,foot.z)-l.sole*actor.scale);}));
  assert(mouthError<.035,`${species} mouth contact ${mouthError}`);assert(maxFootError<.035,`${species} foot contact ${maxFootError}`);
 }
 let triangles=0;rig.scene.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 cases.push({species,adultMetres:length*actor.scale*METRES_PER_UNIT,triangles,mouthError,maxFootError,bones:rig.bones.length,maxLengthError,independentSkeletons:true,sharedGpuAssets:true,pause:true});rig.dispose();other.dispose();
}
writeFileSync('verification-realistic-map.json',JSON.stringify({result:'PASS',cases},null,2));console.log(JSON.stringify(cases,null,2));
