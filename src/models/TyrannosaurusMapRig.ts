import { AnimationMixer,Bone,Group,Mesh,Quaternion,SkinnedMesh,Vector3 } from 'three';
import type { AnimationAction,AnimationClip,Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { habitatGround,WATER_LEVEL } from '../world/habitat';
import { actorAction } from '../world/ecosystem';
import type { Actor } from '../world/ecosystem';
import type { WorldMode } from '../world/layout';
import { solveNeckJoints } from './dinosaurAnatomy';

export const TYRANNOSAURUS_MODEL='/models/tyrannosaurus-study/tyrannosaurus-map-web.glb';
export const TYRANNOSAURUS_SCALE=.82;
const axisX=new Vector3(1,0,0),axisY=new Vector3(0,1,0);
const clipNames=['01_Idle','02_Walk','03_Run','04_Attack'] as const;
type ClipName=typeof clipNames[number];
interface Leg {hip:Bone;knee:Bone;ankle:Bone;foot:Bone;sole:number;}

/** Each animal owns its skeleton/mixer; GPU geometry, textures and materials remain shared. */
export class TyrannosaurusMapRig {
 readonly root=new Group();
 readonly scene:Group;
 readonly mixer:AnimationMixer;
 private readonly animationScene:Group;
 private readonly animationBones:Bone[];
 readonly actions=new Map<ClipName,AnimationAction>();
 readonly bones:Bone[]=[];
 readonly neck:Bone[];
 readonly legs:Leg[];
 readonly pelvis:Bone;
 readonly chest:Bone;
 readonly head:Bone;
 readonly mouthLocal:Vector3;
 readonly headFacing:Quaternion;
 readonly mouthFacing:Vector3;
 readonly neckLengths:number[];
 activeClip:ClipName='01_Idle';
 private readonly sourceScale=new Map<Bone,Vector3>();
 private readonly sourcePosition=new Map<Bone,Vector3>();

 constructor(source:Group,clips:AnimationClip[]){
  this.scene=clone(source) as Group;this.scene.scale.setScalar(TYRANNOSAURUS_SCALE);this.scene.position.set(0,0,.23);this.root.add(this.scene);this.root.name='map-tyrannosaurus';
  this.scene.traverse(o=>{if(o instanceof Bone)this.bones.push(o);if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
  this.animationScene=clone(source) as Group;this.mixer=new AnimationMixer(this.animationScene);
  this.animationBones=this.bones.map(b=>this.animationScene.getObjectByName(b.name) as Bone);
  for(const name of clipNames){const clip=clips.find(c=>c.name===name);if(!clip)throw new Error(`Missing Tyrannosaurus clip: ${name}`);const action=this.mixer.clipAction(clip);action.play();action.setEffectiveWeight(name==='01_Idle'?1:0);this.actions.set(name,action);}
  this.mixer.update(0);this.bones.forEach((b,i)=>{b.position.copy(this.animationBones[i].position);b.quaternion.copy(this.animationBones[i].quaternion).normalize();b.scale.copy(this.animationBones[i].scale);});this.root.updateMatrixWorld(true);
  const bone=(name:string)=>{const value=this.scene.getObjectByName(`DEF-${name}`);if(!(value instanceof Bone))throw new Error(`Missing Tyrannosaurus bone: ${name}`);return value;};
  this.pelvis=bone('pelvis');this.chest=bone('spine04');this.head=bone('head');this.neck=['neck01','neck02','neck03','neck04','head'].map(bone);
  this.legs=['L','R'].map(side=>{const foot=bone(`toeIII01${side}`);return {hip:bone(`thigh${side}`),knee:bone(`shin${side}`),ankle:bone(`metatarsus${side}`),foot,sole:this.point(foot).y};});
  this.neckLengths=this.neck.slice(1).map((b,i)=>this.point(b).distanceTo(this.point(this.neck[i])));
  // Calibrate the contact point from the actual closed-mouth mesh, not a second model's proportions.
  const candidates:Vector3[]=[];
  this.scene.traverse(o=>{if(o instanceof SkinnedMesh&&o.name==='Tirannosaurus_Rex_v3_2'){
   for(let i=0;i<o.geometry.attributes.position.count;i++){const p=new Vector3().fromBufferAttribute(o.geometry.attributes.position,i);o.applyBoneTransform(i,p);o.localToWorld(p);this.root.worldToLocal(p);candidates.push(p);}
  }});
  if(!candidates.length)throw new Error('Tyrannosaurus head surface missing');
  const front=Math.max(...candidates.map(p=>p.z)),tip=candidates.filter(p=>p.z>front-.06).sort((a,b)=>a.y-b.y),contact=tip[Math.floor(tip.length*.12)].clone();
  this.mouthLocal=this.head.worldToLocal(this.root.localToWorld(contact.clone()));
  const headPoint=this.point(this.head),offset=contact.sub(headPoint),yaw=-Math.atan2(offset.x,offset.z),facing=new Quaternion().setFromAxisAngle(axisY,yaw);
  this.headFacing=facing.clone().multiply(this.modelRotation(this.head));this.mouthFacing=offset.applyQuaternion(facing);
  for(const b of this.bones){this.sourceScale.set(b,b.scale.clone());this.sourcePosition.set(b,b.position.clone());}
  this.root.userData={model:TYRANNOSAURUS_MODEL,credit:'Tyrannosaurus rex by AnimalAnimator.com · CC BY 4.0 · modified',modelScale:TYRANNOSAURUS_SCALE};
 }
 point(object:Object3D){return this.root.worldToLocal(object.getWorldPosition(new Vector3()));}
 private modelRotation(object:Object3D){return this.root.getWorldQuaternion(new Quaternion()).invert().multiply(object.getWorldQuaternion(new Quaternion()));}
 private rotate(object:Object3D,modelQuaternion:Quaternion){
  const world=this.root.getWorldQuaternion(new Quaternion()).multiply(modelQuaternion),parent=object.parent!.getWorldQuaternion(new Quaternion());object.quaternion.copy(parent.invert().multiply(world));object.updateWorldMatrix(false,true);
 }
 private move(object:Object3D,modelPoint:Vector3){object.position.copy(object.parent!.worldToLocal(this.root.localToWorld(modelPoint.clone())));object.updateWorldMatrix(false,true);}
 private aim(bone:Bone,child:Bone,target:Vector3){
  const origin=this.point(bone),before=this.point(child).sub(origin).normalize(),after=target.clone().sub(origin).normalize(),rotation=new Quaternion().setFromUnitVectors(before,after).multiply(this.modelRotation(bone));this.rotate(bone,rotation);
 }
 pose(actor:Actor,mode:WorldMode,dt:number,paused=false){
  this.root.position.set(actor.x,actor.y,actor.z);this.root.rotation.y=actor.heading;this.root.scale.setScalar(actor.scale);this.root.updateMatrixWorld(true);
  const action=actorAction(actor,mode),moving=actor.moving&&actor.drink===0;
  this.activeClip=moving?(mode==='peaceful'?'02_Walk':'03_Run'):action==='roar'?'04_Attack':'01_Idle';
  const alpha=paused?0:1-Math.exp(-Math.min(dt,.05)/.16);
  for(const [name,clip] of this.actions){const target=name===this.activeClip?1:0;clip.setEffectiveWeight(clip.getEffectiveWeight()+(target-clip.getEffectiveWeight())*alpha);const duration=clip.getClip().duration;clip.time=name==='02_Walk'?actor.distance/(1.10*actor.scale)*duration%duration:name==='03_Run'?actor.distance/(1.70*actor.scale)*duration%duration:name==='04_Attack'?actor.actionTime%duration:actor.age%duration;}
  this.mixer.update(0);
  // Clip exports contain tiny translation/scale noise. Anatomical offsets remain fixed.
  this.bones.forEach((b,i)=>{b.position.copy(b===this.pelvis?this.animationBones[i].position:this.sourcePosition.get(b)!);b.scale.copy(this.sourceScale.get(b)!);b.quaternion.copy(this.animationBones[i].quaternion).normalize();});
  this.root.updateMatrixWorld(true);
  const feet=this.legs.map(leg=>({foot:this.point(leg.foot),ankle:this.point(leg.ankle),rotation:this.modelRotation(leg.ankle)})),drink=Math.max(0,Math.min(1,actor.drink)),rest=actor.behavior==='rest'?.08:0;
  const pelvis=this.point(this.pelvis);pelvis.y-=drink*.38+rest;pelvis.z+=drink*.12;this.move(this.pelvis,pelvis);
  if(drink>0)this.rotate(this.chest,new Quaternion().setFromAxisAngle(axisX,drink*.28).multiply(this.modelRotation(this.chest)));
  for(let i=0;i<this.legs.length;i++){
   const leg=this.legs[i],sample=feet[i],world=this.root.localToWorld(sample.foot.clone()),ground=(habitatGround(world.x,world.z)-actor.y)/actor.scale,lift=moving?Math.max(0,sample.foot.y-leg.sole):0,desiredFoot=sample.foot.clone();desiredFoot.y=ground+leg.sole+lift;
   const hip=this.point(leg.hip),knee=this.point(leg.knee),ankle=this.point(leg.ankle),target=sample.ankle.clone().add(desiredFoot.sub(sample.foot)),l1=hip.distanceTo(knee),l2=knee.distanceTo(ankle),direction=target.clone().sub(hip),distance=Math.max(Math.abs(l1-l2)+.00001,Math.min(l1+l2-.00001,direction.length()));direction.normalize();target.copy(hip).addScaledVector(direction,distance);
   const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=knee.clone().sub(hip);bend.addScaledVector(direction,-bend.dot(direction));if(bend.lengthSq()<1e-10)bend.set(0,0,1);bend.normalize();
   const kneeTarget=hip.clone().addScaledVector(direction,along).addScaledVector(bend,height);this.aim(leg.hip,leg.knee,kneeTarget);this.aim(leg.knee,leg.ankle,target);this.rotate(leg.ankle,sample.rotation);
  }
  if(drink>0&&actor.target){
   const reach=Math.hypot(actor.target.lookX-actor.x,actor.target.lookZ-actor.z)/actor.scale,water=(WATER_LEVEL-actor.y)/actor.scale+.018,base=this.point(this.neck[0]),pitch=Math.max(.4,Math.min(1.2,Math.atan2(base.y-water,reach-base.z)-Math.atan2(-this.mouthFacing.y,this.mouthFacing.z))),rotation=new Quaternion().setFromAxisAngle(axisX,pitch).multiply(this.headFacing),mouth=this.mouthFacing.clone().applyAxisAngle(axisX,pitch),desired=this.point(this.head).lerp(new Vector3(0,water,reach).sub(mouth),drink),seed=this.neck.map(b=>this.point(b)),joints=solveNeckJoints(seed,this.neckLengths,desired);
   for(let i=0;i<this.neck.length-1;i++)this.aim(this.neck[i],this.neck[i+1],joints[i+1]);
   this.rotate(this.head,this.modelRotation(this.head).slerp(rotation,drink));
  }
  this.root.updateMatrixWorld(true);this.scene.traverse(o=>{if(o instanceof SkinnedMesh)o.skeleton.update();});
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.animationScene);const owned=new Set<SkinnedMesh['skeleton']>();for(const scene of [this.scene,this.animationScene])scene.traverse(o=>{if(o instanceof SkinnedMesh)owned.add(o.skeleton);});owned.forEach(s=>s.dispose());}
}
