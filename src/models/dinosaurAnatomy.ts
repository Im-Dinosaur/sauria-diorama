import { Vector3 } from 'three';
import type { Species } from '../world/paths';

export type V = [number, number, number];
interface Shape {y:number;width:number;height:number;length:number;head:V;neck:V[];biped:boolean;}
export const shapes:Record<Species,Shape>={
 rex:{y:.96,width:.32,height:.32,length:.86,head:[0,1.25,.79],neck:[[0,1.02,.30],[0,1.15,.49],[0,1.25,.79]],biped:true},
 velociraptor:{y:.63,width:.155,height:.18,length:.58,head:[0,.82,.65],neck:[[0,.67,.27],[0,.79,.44],[0,.82,.65]],biped:true},
 triceratops:{y:.67,width:.45,height:.34,length:.88,head:[0,.57,.77],neck:[[0,.68,.43],[0,.61,.62],[0,.57,.77]],biped:false},
 stegosaurus:{y:.65,width:.43,height:.40,length:.92,head:[0,.34,1.11],neck:[[0,.59,.54],[0,.44,.83],[0,.34,1.11]],biped:false},
 brachiosaurus:{y:1.12,width:.49,height:.44,length:.98,head:[0,3.16,.97],neck:[[0,1.44,.48],[0,2.02,.56],[0,2.68,.76],[0,3.16,.97]],biped:false},
 spinosaurus:{y:.70,width:.31,height:.26,length:1.00,head:[0,.91,.99],neck:[[0,.77,.42],[0,.86,.72],[0,.91,.99]],biped:true},
 pterosaur:{y:0,width:.12,height:.13,length:.38,head:[0,.16,.36],neck:[[0,.04,.20],[0,.14,.28],[0,.16,.36]],biped:true},
};
export const MOUTH_TIPS:Record<Species,V>={rex:[0,-.063,.52],velociraptor:[0,-.063,.35],spinosaurus:[0,-.063,.73],triceratops:[0,-.13,.63],stegosaurus:[0,-.05,.30],brachiosaurus:[0,-.10,.35],pterosaur:[0,-.03,.68]};
const axisX=new Vector3(1,0,0);

/** A modest leg crouch and torso lean; none of the bones change length. */
export function drinkingPosture(species:Species){
 const shape=shapes[species];
 return {drop:shape.y*(species==='brachiosaurus'?.12:species==='velociraptor'?.48:shape.biped?.40:.30),forward:species==='velociraptor'?.20:.12,lean:species==='brachiosaurus'?.16:.30,pitch:species==='brachiosaurus'?.62:.95};
}
export function drinkingNeckBase(species:Species){
 const shape=shapes[species],posture=drinkingPosture(species),chest=new Vector3(0,shape.y+.03-posture.drop,.28+posture.forward);
 return new Vector3(...shape.neck[0]).sub(new Vector3(0,shape.y+.03,.28)).applyAxisAngle(axisX,posture.lean).add(chest);
}
export function drinkingPitch(species:Species,waterY:number,reach:number){
 const base=drinkingNeckBase(species),mouth=MOUTH_TIPS[species],angle=Math.atan2(base.y-waterY-.018,reach-base.z)-Math.atan2(-mouth[1],mouth[2]);
 return Math.max(.55,Math.min(1.15,angle));
}
export function drinkingHeadTarget(species:Species,waterY:number,reach:number){
 const mouth=new Vector3(...MOUTH_TIPS[species]).applyAxisAngle(axisX,drinkingPitch(species,waterY,reach));
 return new Vector3(0,waterY+.018-mouth.y,reach-mouth.z);
}
export function neckLengths(species:Species){
 const points=shapes[species].neck.map(p=>new Vector3(...p));
 return points.slice(1).map((p,i)=>p.distanceTo(points[i]));
}
/** Resource planning uses the same anatomy as the renderer, in unscaled model units. */
export function canDrinkAt(species:Species,scale:number,groundY:number,waterY:number,reach:number){
 if(species==='pterosaur'||scale<=0)return false;
 const base=drinkingNeckBase(species),target=drinkingHeadTarget(species,(waterY-groundY)/scale,reach/scale),lengths=neckLengths(species),length=lengths.reduce((a,b)=>a+b,0),distance=base.distanceTo(target);
 return target.z>base.z+.07&&distance<length*.965&&distance>length*(species==='brachiosaurus'?.82:.46);
}

/** Fixed-length IK. Unreachable targets stop at the anatomical limit. */
export function solveNeckJoints(seed:Vector3[],lengths:number[],desired:Vector3){
 const points=seed.map(p=>p.clone()),base=points[0].clone(),length=lengths.reduce((a,b)=>a+b,0),delta=desired.clone().sub(base),distance=delta.length(),minimum=Math.max(0,2*Math.max(...lengths)-length)+.0001;
 if(distance<1e-8)delta.set(0,-1,1).normalize();else delta.divideScalar(distance);
 const target=base.clone().addScaledVector(delta,Math.max(minimum,Math.min(length-.0001,distance)));
 if(lengths.length===2){
  const d=base.distanceTo(target),along=(lengths[0]**2-lengths[1]**2+d*d)/(2*d),height=Math.sqrt(Math.max(0,lengths[0]**2-along**2));
  // Keep the bend on the same side of the sagittal plane through every frame.
  const bend=new Vector3(0,delta.z,-delta.y);if(bend.lengthSq()<1e-8)bend.set(0,0,1);bend.normalize();
  points[1].copy(base).addScaledVector(delta,along).addScaledVector(bend,height);points[2].copy(target);return points;
 }
 // A long neck lowers along a forward arc; seeding from the upright bind pose
 // otherwise folds the middle joint back on itself when the head reaches down.
 const bend=new Vector3(0,delta.z,-delta.y).normalize(),bow=Math.sqrt(Math.max(0,length*length-base.distanceToSquared(target)))*.4,blend=Math.min(1,seed[seed.length-1].distanceTo(target)/(length*.4));
 for(let i=1;i<points.length-1;i++){const t=i/(points.length-1),arc=base.clone().lerp(target,t).addScaledVector(bend,Math.sin(t*Math.PI)*bow);points[i].lerp(arc,blend);}
 for(let iteration=0;iteration<32;iteration++){
  points[points.length-1].copy(target);
  for(let i=points.length-2;i>=0;i--)points[i].sub(points[i+1]).normalize().multiplyScalar(lengths[i]).add(points[i+1]);
  points[0].copy(base);
  for(let i=1;i<points.length;i++)points[i].sub(points[i-1]).normalize().multiplyScalar(lengths[i-1]).add(points[i-1]);
  if(points[points.length-1].distanceToSquared(target)<1e-10)break;
 }
 return points;
}
