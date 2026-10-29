import {AnimationMixer,Bone,Box3,Group,Mesh,Quaternion,SkinnedMesh,Vector3} from 'three';
import type {AnimationClip,Object3D} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import manifest from '../../public/models/realistic-dinosaurs/manifest.json';
import type {Actor} from '../world/ecosystem';
import {actorAction} from '../world/ecosystem';
import type {WorldMode} from '../world/layout';
import type {Species} from '../world/paths';
import {habitatGround,WATER_LEVEL} from '../world/habitat';
import {solveNeckJoints} from './dinosaurAnatomy';

export type RealisticSpecies=Exclude<Species,'rex'>;
// Neutral rendered lengths of the previous map rigs, before individual scaling.
export const MAP_MODEL_LENGTHS:Record<RealisticSpecies,number>={brachiosaurus:3.407539618877635,triceratops:2.8968732712496577,stegosaurus:3.230002991207847,spinosaurus:3.803583816860927,velociraptor:2.941741335618999,pterosaur:3.4728037174572672};
export const realisticModel=(species:RealisticSpecies)=>`/models/realistic-dinosaurs/${species}${['brachiosaurus','triceratops','velociraptor','spinosaurus'].includes(species)?'-map':''}-web.glb`;
const up=new Vector3(0,1,0);
/** Shared GPU assets, independent sampling and rendered skeletons. IK never edits bind offsets. */
export class RealisticMapRig{
 readonly root=new Group();readonly scene:Group;readonly mixer:AnimationMixer;
 readonly bones:Bone[]=[];readonly neck:Bone[];readonly legs:{hip:Bone;knee:Bone;ankle:Bone;foot:Bone;sole:number}[]=[];
 readonly modelScale:number;readonly neckLengths:number[];readonly hips:Bone;readonly head:Bone;
 readonly mouthLocal:Vector3;private readonly sample:Group;private readonly sampledBones:Bone[];
 private readonly offsets:Vector3[];private readonly scales:Vector3[];private readonly baseHipY:number;
 private readonly clips:AnimationClip[];private readonly baseScenePosition:Vector3;
 activeClip='idle';
 constructor(source:Group,clips:AnimationClip[],readonly species:RealisticSpecies){
  const data=manifest.find(m=>m.id===species)!;
  this.scene=clone(source) as Group;this.root.add(this.scene);this.root.name=`map-${species}`;
  this.sample=clone(source) as Group;this.mixer=new AnimationMixer(this.sample);this.clips=clips;
  this.scene.traverse(o=>{if(o instanceof Bone)this.bones.push(o);if(o instanceof Mesh){o.castShadow=o.name!=='Layered_body_wing_tail_feathers';o.receiveShadow=true;o.frustumCulled=false;}});
  const bone=(name:string)=>{const b=this.scene.getObjectByName(name);if(!(b instanceof Bone))throw new Error(`${species}: missing bone ${name}`);return b;};
  this.hips=bone(data.hips);this.head=bone(data.head);this.neck=[...data.neck,data.head].map(bone).filter((b,i,a)=>i===0||b!==a[i-1]);
  this.sampledBones=this.bones.map(b=>this.sample.getObjectByName(b.name) as Bone);
  // A single neutral sample establishes physical scale; actor scale retains all age ratios.
  const idle=clips.find(c=>c.name==='idle');if(idle){this.mixer.clipAction(idle).play();this.mixer.update(0);}
  this.copyPose();this.root.updateMatrixWorld(true);
  const box=new Box3().setFromObject(this.root,true),length=species==='pterosaur'?box.max.x-box.min.x:box.max.z-box.min.z;
  this.modelScale=MAP_MODEL_LENGTHS[species]/length;this.scene.scale.multiplyScalar(this.modelScale);this.scene.position.y-=box.min.y*this.modelScale;
  if(species==='velociraptor'){
   // The imported root is the tail-inclusive bounding-box centre. Navigation is anchored at the feet.
   this.root.updateMatrixWorld(true);const feet=data.legs.map(names=>this.point(bone(names[3])));
   this.scene.position.z-=feet.reduce((sum,p)=>sum+p.z,0)/feet.length;this.root.updateMatrixWorld(true);
  }
  this.baseScenePosition=this.scene.position.clone();this.root.updateMatrixWorld(true);
  this.offsets=this.bones.map(b=>b.position.clone());this.scales=this.bones.map(b=>b.scale.clone());
  this.baseHipY=this.point(this.hips).y;
  this.neckLengths=this.neck.slice(1).map((b,i)=>this.point(b).distanceTo(this.point(this.neck[i])));
  for(const names of data.legs){const [hip,knee,ankle,foot]=names.map(bone);this.legs.push({hip,knee,ankle,foot,sole:this.point(foot).y});}
  // Find the front lower lip from the rendered surface near the head (exclude horns).
  const points:Vector3[]=[];const headPoint=this.point(this.head);
  this.scene.traverse(o=>{if(o instanceof SkinnedMesh){for(let i=0;i<o.geometry.attributes.position.count;i++){const p=new Vector3().fromBufferAttribute(o.geometry.attributes.position,i);o.applyBoneTransform(i,p);o.localToWorld(p);this.root.worldToLocal(p);if(Math.abs(p.x)<.12*MAP_MODEL_LENGTHS[species]&&p.y<headPoint.y+.06*MAP_MODEL_LENGTHS[species]&&p.y>headPoint.y-.18*MAP_MODEL_LENGTHS[species])points.push(p);}}});
  points.sort((a,b)=>b.z-a.z);const tip=points[0]??headPoint;
  this.mouthLocal=this.head.worldToLocal(this.root.localToWorld(tip.clone()));
  for(const clip of clips)this.mixer.clipAction(clip).play().setEffectiveWeight(clip.name==='idle'?1:0);
  this.root.userData={model:realisticModel(species),credit:data.credit,modelScale:this.modelScale};
 }
 private copyPose(){this.bones.forEach((b,i)=>{const s=this.sampledBones[i];b.position.copy(s.position);b.quaternion.copy(s.quaternion).normalize();b.scale.copy(s.scale);});}
 point(o:Object3D){return this.root.worldToLocal(o.getWorldPosition(new Vector3()));}
 private rotation(o:Object3D){return this.root.getWorldQuaternion(new Quaternion()).invert().multiply(o.getWorldQuaternion(new Quaternion()));}
 private rotate(o:Object3D,q:Quaternion){o.quaternion.copy(o.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(this.root.getWorldQuaternion(new Quaternion()).multiply(q)));o.updateWorldMatrix(false,true);}
 private aim(b:Bone,child:Bone,target:Vector3){const p=this.point(b),from=this.point(child).sub(p),to=target.clone().sub(p);if(from.lengthSq()<1e-12||to.lengthSq()<1e-12)return;this.rotate(b,new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(this.rotation(b)));}
 pose(actor:Actor,mode:WorldMode,dt:number,paused=false){
  this.root.position.set(actor.x,actor.y,actor.z);this.root.rotation.set(0,actor.heading,0);this.root.scale.setScalar(actor.scale);
  const requested=actor.behavior==='drink'?'drink':actorAction(actor,mode),name=this.clips.some(c=>c.name===requested)?requested:'idle';
  this.activeClip=name;const alpha=paused?0:1-Math.exp(-Math.min(dt,.05)/.2);
  for(const clip of this.clips){const action=this.mixer.clipAction(clip);if(!action.isRunning())action.play();const target=clip.name===name?1:0;action.setEffectiveWeight(action.getEffectiveWeight()+(target-action.getEffectiveWeight())*alpha);
   const stride=(clip.name==='run'?.34:.24)/.64*this.modelScale*actor.scale;
   action.time=clip.name==='drink'?clip.duration*.5:(clip.name==='walk'||clip.name==='run'?actor.distance/stride*clip.duration:actor.age)%clip.duration;
  }
  this.mixer.update(0);this.copyPose();
  this.bones.forEach((b,i)=>{if(b!==this.hips)b.position.copy(this.offsets[i]);b.scale.copy(this.scales[i]);});
  this.scene.position.copy(this.baseScenePosition);this.root.updateMatrixWorld(true);
  // Native fly clips include vertical travel. World simulation owns flight altitude.
  if(actor.altitude!==undefined){this.scene.position.y+=this.baseHipY-this.point(this.hips).y;this.root.updateMatrixWorld(true);return;}
  this.scene.position.y-=actor.drink*MAP_MODEL_LENGTHS[this.species]*(this.species==='velociraptor'?.25:.10);this.root.updateMatrixWorld(true);
  for(const leg of this.legs){
   const foot=this.point(leg.foot),ankle=this.point(leg.ankle),world=this.root.localToWorld(foot.clone()),ground=(habitatGround(world.x,world.z)-actor.y)/actor.scale;
   // Brachiosaurus exports independent hand/foot controllers outside the leg hierarchy.
   // Move those controls to the surface before aiming the anatomical segments.
   let ancestor:Object3D|null=leg.foot;while(ancestor&&ancestor!==leg.knee)ancestor=ancestor.parent;
   if(!ancestor){const desired=this.root.localToWorld(foot.clone().setY(ground+leg.sole+(actor.moving?Math.max(0,foot.y-leg.sole):0)));leg.foot.position.copy(leg.foot.parent!.worldToLocal(desired));leg.foot.updateWorldMatrix(false,true);}
   const lift=actor.moving?Math.max(0,foot.y-leg.sole):0,target=ankle.clone();target.y+=ground+leg.sole+lift-foot.y;
   const hip=this.point(leg.hip),knee=this.point(leg.knee),l1=hip.distanceTo(knee),l2=knee.distanceTo(ankle);if(l1<1e-6||l2<1e-6)continue;
   const dir=target.clone().sub(hip),d=Math.max(Math.abs(l1-l2)+1e-5,Math.min(l1+l2-1e-5,dir.length()));dir.normalize();target.copy(hip).addScaledVector(dir,d);
   const along=(l1*l1-l2*l2+d*d)/(2*d),bend=knee.clone().sub(hip);bend.addScaledVector(dir,-bend.dot(dir));if(bend.lengthSq()<1e-10)bend.copy(up).cross(dir);bend.normalize();
   const rotation=this.rotation(leg.ankle);this.aim(leg.hip,leg.knee,hip.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along))));this.aim(leg.knee,leg.ankle,target);this.rotate(leg.ankle,rotation);
  }
  if(actor.drink>0&&actor.target&&this.neck.length>1){
   const target=this.root.worldToLocal(new Vector3(actor.target.lookX,WATER_LEVEL+.01,actor.target.lookZ));
   // Orient the lip toward the surface, then solve the neck without changing offsets.
   for(let iteration=0;iteration<8;iteration++){
    const head=this.point(this.head),mouth=this.root.worldToLocal(this.head.localToWorld(this.mouthLocal.clone())),offset=mouth.clone().sub(head),direction=target.clone().sub(head);
    if(offset.lengthSq()>1e-10&&direction.lengthSq()>1e-10){const q=new Quaternion().slerp(new Quaternion().setFromUnitVectors(offset.normalize(),direction.normalize()),actor.drink*.35);this.rotate(this.head,q.multiply(this.rotation(this.head)));}
    const correctedMouth=this.root.worldToLocal(this.head.localToWorld(this.mouthLocal.clone())),desired=head.clone().add(target.clone().sub(correctedMouth).multiplyScalar(actor.drink)),seed=this.neck.map(b=>this.point(b)),joints=solveNeckJoints(seed,this.neckLengths,desired);
    const headRotation=this.rotation(this.head);
    for(let i=0;i<this.neck.length-1;i++)this.aim(this.neck[i],this.neck[i+1],joints[i+1]);
    this.rotate(this.head,headRotation);
   }
  }
  this.root.updateMatrixWorld(true);
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.sample);const skeletons=new Set<SkinnedMesh['skeleton']>();for(const scene of [this.scene,this.sample])scene.traverse(o=>{if(o instanceof SkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());}
}
