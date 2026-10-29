import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,PerspectiveCamera} from '@react-three/drei';
import {Box3,Vector3} from 'three';
import type {Group,OrthographicCamera,PerspectiveCamera as PerspectiveCameraImpl} from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import type {Actor} from '../world/ecosystem';
import {habitatGround} from '../world/habitat';
import {observationCentre,observationDistance,observationHover,observationSubject,ObservationTap,pickObservationSubject} from './observationMath';
import type {ObservationSubjects} from './observationMath';

const neutralBounds=new WeakMap<Group,Box3>();
export function useObservationSubject(root:Group,actor:Actor,source:Group,subjects:ObservationSubjects){
 const subject=useMemo(()=>{
  let bounds=neutralBounds.get(source);
  if(!bounds){bounds=new Box3().setFromObject(root,true);neutralBounds.set(source,bounds);}
  return observationSubject(actor,root,bounds);
 },[root,actor,source]);
 useLayoutEffect(()=>{subjects.set(actor.id,subject);return()=>{subjects.delete(actor.id);};},[subjects,subject,actor.id]);
}

export function AnimalPicking({subjects,onSelect,enabled=true}:{subjects:ObservationSubjects;onSelect:(id:string)=>void;enabled?:boolean}){
 const {gl,get}=useThree();
 useEffect(()=>{
  if(!enabled)return;
  const canvas=gl.domElement,owner=canvas.ownerDocument,tap=new ObservationTap();let hoverFrame=0;
  const down=(e:PointerEvent)=>{if(e.button===0)tap.start(e.pointerId,e.clientX,e.clientY);};
  const move=(e:PointerEvent)=>{
   tap.move(e.pointerId,e.clientX,e.clientY);
   if(e.buttons||hoverFrame||e.target!==canvas)return;
   hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;const r=canvas.getBoundingClientRect();canvas.style.cursor=observationHover(subjects.values(),get().camera,r.width,r.height,e.clientX-r.left,e.clientY-r.top)?'pointer':'';});
  };
  const up=(e:PointerEvent)=>{
   if(!tap.end(e.pointerId,e.clientX,e.clientY))return;
   const r=canvas.getBoundingClientRect();
   if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
   const id=pickObservationSubject(subjects.values(),get().camera,r.width,r.height,e.clientX-r.left,e.clientY-r.top,e.pointerType==='touch'?24:18);
   if(id)onSelect(id);
  };
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  canvas.addEventListener('pointerdown',down);owner.addEventListener('pointermove',move);owner.addEventListener('pointerup',up);owner.addEventListener('pointercancel',cancel);
  return()=>{canvas.removeEventListener('pointerdown',down);owner.removeEventListener('pointermove',move);owner.removeEventListener('pointerup',up);owner.removeEventListener('pointercancel',cancel);cancelAnimationFrame(hoverFrame);canvas.style.cursor='';};
 },[gl,get,subjects,onSelect,enabled]);
 return null;
}

export function ObservationCamera({id,subjects,zoom}:{id:string;subjects:ObservationSubjects;zoom:number}){
 const {camera:previousCamera,controls:previousControls,size,invalidate}=useThree();
 const camera=useRef<PerspectiveCameraImpl>(null),controls=useRef<OrbitControlsImpl>(null),lastZoom=useRef(zoom);
 const [entry]=useState(()=>{
  const target=(previousControls as OrbitControlsImpl|null)?.target.clone()??new Vector3(0,.4,0),position=previousCamera.position.clone();
  if((previousCamera as OrthographicCamera).isOrthographicCamera){const c=previousCamera as OrthographicCamera,distance=(c.top-c.bottom)/c.zoom/2/Math.tan(42*Math.PI/360);position.sub(target).normalize().multiplyScalar(distance).add(target);}
  return {position,target};
 });
 const transition=useRef({elapsed:0,position:entry.position.clone(),target:entry.target.clone()}),centre=useMemo(()=>new Vector3(),[]),delta=useMemo(()=>new Vector3(),[]),direction=useRef<Vector3|null>(null),fitted=useRef(false);
 useLayoutEffect(()=>{camera.current?.position.copy(entry.position);controls.current?.target.copy(entry.target);if(controls.current)controls.current.enabled=false;invalidate();},[entry,invalidate]);
 useEffect(()=>{if(!fitted.current)return;const c=camera.current,o=controls.current;if(c&&o){transition.current={elapsed:0,position:c.position.clone(),target:o.target.clone()};direction.current=c.position.clone().sub(o.target).normalize();invalidate();}},[size.width,size.height,invalidate]);
 useEffect(()=>{
  const c=camera.current,o=controls.current,factor=Math.pow(.83,zoom-lastZoom.current);lastZoom.current=zoom;
  if(c&&o&&transition.current.elapsed>=1.1){c.position.sub(o.target).multiplyScalar(factor).add(o.target);o.update();invalidate();}
 },[zoom,invalidate]);
 useFrame((_,dt)=>{
  const subject=subjects.get(id),c=camera.current,o=controls.current;if(!subject||!c||!o)return;
  observationCentre(subject,centre);const distance=observationDistance(subject.radius,size.width/size.height)*Math.pow(.83,zoom);
  o.minDistance=Math.max(.12,subject.radius*1.35);o.maxDistance=Math.max(50,distance*8);
  if(!direction.current){const angle=subject.actor.heading+Math.PI*.6;direction.current=new Vector3(Math.sin(angle)*.82,.75,Math.cos(angle)*.82).normalize();}
  const t=transition.current;t.elapsed+=Math.min(dt,.25);fitted.current=true;
  if(t.elapsed<1.1){
   const p=Math.min(1,t.elapsed/1.1),ease=p*p*(3-2*p);o.enabled=false;
   delta.copy(direction.current).multiplyScalar(distance).add(centre);c.position.lerpVectors(t.position,delta,ease);o.target.lerpVectors(t.target,centre,ease);c.lookAt(o.target);invalidate();
  }else{
   if(!o.enabled){delta.copy(direction.current).multiplyScalar(distance).add(centre);c.position.copy(delta);o.target.copy(centre);o.enabled=true;}
   else{delta.copy(centre).sub(o.target).multiplyScalar(1-Math.exp(-dt*12));c.position.add(delta);o.target.add(delta);}
  }
  c.position.y=Math.max(c.position.y,habitatGround(c.position.x,c.position.z)+.12);c.lookAt(o.target);
 },-2);
 return <><PerspectiveCamera ref={camera} makeDefault fov={42} near={.012} far={220}/><OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} enablePan={false} minPolarAngle={.06} maxPolarAngle={Math.PI*.47} rotateSpeed={.55} zoomSpeed={.7}/></>;
}
