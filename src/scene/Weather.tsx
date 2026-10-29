import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group,InstancedMesh,Object3D,Mesh } from 'three';
import { simulation } from '../config';
import { random,groundHeight } from '../world/terrain';
import { VolcanoEruption } from './VolcanoEruption';
import { VolcanicSmoke } from './VolcanicSmoke';
import { METEOR_TARGETS,meteorState } from '../world/meteorImpacts';
import { MeteorImpacts } from './MeteorImpacts';
function Ash(){const ref=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]);const particles=useMemo(()=>Array.from({length:110},(_,i)=>({x:(random(i*3)-.5)*10.8,z:(random(i*3+1)-.5)*4.8,h:random(i*3+2),size:.008+random(i+73)*.02})),[]);
 useFrame(()=>{if(!ref.current)return;particles.forEach((p,i)=>{const t=simulation.time,fall=1-((p.h+t*.055)%1);const x=p.x+Math.sin(t*.2+i)*.18,z=p.z+Math.sin(t*.14+i)*.1;const floor=Math.max(.15,groundHeight(x,z));dummy.position.set(x,floor+.15+fall*4.4,z);dummy.rotation.set(i+t*.4,i*2,0);dummy.scale.setScalar(p.size*(i<simulation.ash*110?1:0));dummy.updateMatrix();ref.current!.setMatrixAt(i,dummy.matrix);});ref.current.instanceMatrix.needsUpdate=true;});
 return <instancedMesh ref={ref} args={[undefined,undefined,110]} frustumCulled={false}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color="#b2ad94" flatShading transparent opacity={.55} depthWrite={false}/></instancedMesh>;
}
function Meteor({index}:{index:number}){const ref=useRef<Group>(null),head=useRef<Mesh>(null);
 useFrame(()=>{const state=meteorState(simulation.time,index,simulation.environment.age,simulation.environment.eventMeteorCount);
 if(ref.current){ref.current.visible=state.falling&&simulation.meteors;ref.current.position.set(state.x,state.y,state.z);}
 if(head.current)head.current.rotation.x=simulation.time*2;
 });return <group><group ref={ref}>
 <mesh ref={head}><icosahedronGeometry args={[.14,0]}/><meshStandardMaterial color="#ffd49b" emissive="#ff7a1d" emissiveIntensity={5} flatShading/></mesh>
 {Array.from({length:9},(_,i)=><mesh key={i} position={[-i*.045,i*.26,-i*.017]} scale={[.075-i*.006,.2,.065-i*.005]}><octahedronGeometry args={[1,0]}/><meshBasicMaterial color={i<3?'#ffc67d':'#ce6b32'} transparent opacity={.85-i*.085} depthWrite={false}/></mesh>)}
 </group></group>}
export function Weather(){return <group><Ash/><VolcanicSmoke/><VolcanoEruption/><MeteorImpacts/>{METEOR_TARGETS.map((_,i)=><Meteor key={i} index={i}/>)}</group>}
