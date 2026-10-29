import {useLayoutEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {useFrame} from '@react-three/fiber';
import {Mesh} from 'three';
import type {Group,Material} from 'three';
import {animalPresence} from '../world/disaster';
import type {DisasterSequence} from '../world/disaster';

/** One shared fade per material; never clone each animal's GPU assets. */
export function AnimalPresence({sequence,children}:{sequence:DisasterSequence;children:ReactNode}){
 const root=useRef<Group>(null),materials=useRef(new Map<Material,{opacity:number;transparent:boolean;depthWrite:boolean}>()),last=useRef(-1);
 useLayoutEffect(()=>{
  root.current?.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(!materials.current.has(material))materials.current.set(material,{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});});
  return()=>{for(const [material,original] of materials.current){Object.assign(material,original);material.needsUpdate=true;}materials.current.clear();};
 },[]);
 useFrame(()=>{
  const presence=animalPresence(sequence);if(root.current)root.current.visible=presence>0;
  if(presence===last.current)return;last.current=presence;
  for(const [material,original] of materials.current){const transparent=presence<1||original.transparent;if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}material.opacity=original.opacity*presence;material.depthWrite=presence<1?false:original.depthWrite;}
 });
 return <group ref={root} name="living-animals">{children}</group>;
}
