import {Box3,MathUtils,Raycaster,Vector2,Vector3} from 'three';
import type {Camera,Group,Object3D} from 'three';
import type {Actor} from '../world/ecosystem';
import {SIZE_REFERENCE} from '../world/physicalScale';

export interface ObservationSubject {
 actor:Actor;
 root:Group;
 bounds:Box3;
 centre:Vector3;
 radius:number;
}
export type ObservationSubjects=Map<string,ObservationSubject>;

export function observationSubject(actor:Actor,root:Group,neutralBounds:Box3):ObservationSubject {
 const bounds=neutralBounds.clone();
 if(actor.species==='pterosaur'){
  const x=(bounds.min.x+bounds.max.x)/2,half=SIZE_REFERENCE.pterosaur.modelLength/2;
  bounds.min.x=x-half;bounds.max.x=x+half;
 }
 return {actor,root,bounds,centre:bounds.getCenter(new Vector3()),radius:bounds.getSize(new Vector3()).length()*actor.scale/2};
}
export function observationCentre(subject:ObservationSubject,out=new Vector3()){
 const {actor,centre}=subject,c=Math.cos(actor.heading),s=Math.sin(actor.heading);
 return out.set(actor.x+(centre.x*c+centre.z*s)*actor.scale,actor.y+centre.y*actor.scale,actor.z+(centre.z*c-centre.x*s)*actor.scale);
}
export function observationDistance(radius:number,aspect:number,fov=42){
 const vertical=MathUtils.degToRad(fov)/2,horizontal=Math.atan(Math.tan(vertical)*aspect);
 return radius/Math.sin(Math.min(vertical,horizontal))*1.28;
}
const corner=new Vector3(),centre=new Vector3(),raycaster=new Raycaster(),pointer=new Vector2();
function screenCandidates(subjects:Iterable<ObservationSubject>,camera:Camera,width:number,height:number,x:number,y:number,tolerance:number){
 const candidates:{subject:ObservationSubject;distance:number}[]=[];
 for(const subject of subjects){
  const b=subject.bounds;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  subject.root.updateWorldMatrix(true,false);
  for(let i=0;i<8;i++){
   corner.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(subject.root.matrixWorld).project(camera);
   if(corner.z< -1||corner.z>1)continue;
   const px=(corner.x+1)*width/2,py=(1-corner.y)*height/2;
   minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
  }
  centre.copy(subject.centre).applyMatrix4(subject.root.matrixWorld).project(camera);
  if(centre.z< -1||centre.z>1)continue;
  const distance=Math.hypot((centre.x+1)*width/2-x,(1-centre.y)*height/2-y);
  if(distance<=tolerance||(x>=minX&&x<=maxX&&y>=minY&&y<=maxY))candidates.push({subject,distance});
 }
 return candidates;
}
/** Raycast only shortlisted animals, only on a tap. Terrain/foliage never enter this work. */
export function pickObservationSubject(subjects:Iterable<ObservationSubject>,camera:Camera,width:number,height:number,x:number,y:number,tolerance=18){
 const candidates=screenCandidates(subjects,camera,width,height,x,y,tolerance);
 raycaster.setFromCamera(pointer.set(x/width*2-1,1-y/height*2),camera);
 const roots=new Map<Object3D,string>(candidates.map(({subject})=>[subject.root,subject.actor.id]));
 const hits=raycaster.intersectObjects([...roots.keys()],true);
 if(hits.length){let object:Object3D|null=hits[0].object;while(object){const id=roots.get(object);if(id)return id;object=object.parent;}}
 return candidates.filter(c=>c.distance<=tolerance).sort((a,b)=>a.distance-b.distance)[0]?.subject.actor.id??null;
}
export function observationHover(subjects:Iterable<ObservationSubject>,camera:Camera,width:number,height:number,x:number,y:number){
 return screenCandidates(subjects,camera,width,height,x,y,18).length>0;
}
/** A drag that returns to its starting point and multi-touch gestures are not taps. */
export class ObservationTap {
 private pointers=new Set<number>();
 private down?:{id:number;x:number;y:number;valid:boolean};
 start(id:number,x:number,y:number){this.pointers.add(id);if(this.pointers.size===1)this.down={id,x,y,valid:true};else if(this.down)this.down.valid=false;}
 move(id:number,x:number,y:number){if(this.down?.id===id&&Math.hypot(x-this.down.x,y-this.down.y)>7)this.down.valid=false;}
 end(id:number,x:number,y:number){this.move(id,x,y);const tap=this.pointers.size===1&&this.down?.id===id&&this.down.valid;this.pointers.delete(id);if(this.down?.id===id)this.down=undefined;return Boolean(tap);}
 cancel(id:number){this.pointers.delete(id);if(this.down)this.down.valid=false;}
}
