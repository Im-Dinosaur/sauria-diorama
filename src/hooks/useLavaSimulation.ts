import { useMemo } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial,Vector3 } from 'three';
import { simulation,STAGE } from '../config';
import { eruptionState } from '../world/eruption';
import { METEOR_TARGETS,meteorState } from '../world/meteorImpacts';
// Only shader uniforms change. Geometry, block edges and camera never react to a pointer.
export function useLavaSimulation(materials:RefObject<(ShaderMaterial|null)[]>){
 const uniforms=useMemo(()=>({uTime:{value:0},uFlowTime:{value:0},uHeat:{value:1},uEruption:{value:0},uImpacts:{value:METEOR_TARGETS.map(p=>new Vector3(p.x,p.z,-1))}}),[]);
 useFrame(()=>{
  const update=(u:typeof uniforms)=>{u.uTime.value=simulation.time;u.uFlowTime.value=simulation.environment.flowTime;u.uHeat.value=simulation.heat;u.uEruption.value=eruptionState(simulation.time,simulation.environment.age,simulation.environment.eventIntensity).strength;
   u.uImpacts.value.forEach((impact,i)=>{const state=meteorState(simulation.time,i,simulation.environment.age,simulation.environment.eventMeteorCount);impact.z=simulation.meteors&&STAGE>=5&&state.impact?state.age:-1;});
  };
  update(uniforms);
  // Material instances may own cloned uniforms; write to the uniforms actually rendered.
  for(const material of materials.current)if(material)update(material.uniforms as typeof uniforms);
 });
 return uniforms;
}
