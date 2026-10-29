import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group,Quaternion,Vector3 } from 'three';
import { simulation } from '../config';
import { surfacingState } from '../world/lavaEvents';
type V=[number,number,number];
function Skin({at,scale,color='#77744a'}:{at:V;scale:V;color?:string}){return <mesh position={at} scale={scale} castShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={color} roughness={.83} flatShading/></mesh>}
function Bone({a,b,r,r2,color='#77744a'}:{a:V;b:V;r:number;r2:number;color?:string}){const {p,q,len}=useMemo(()=>{const x=new Vector3(...a),y=new Vector3(...b);return {p:x.clone().add(y).multiplyScalar(.5),q:new Quaternion().setFromUnitVectors(new Vector3(0,1,0),y.clone().sub(x).normalize()),len:x.distanceTo(y)};},[a[0],a[1],a[2],b[0],b[1],b[2]]);return <mesh position={p} quaternion={q} castShadow><cylinderGeometry args={[r2,r,len,7]}/><meshStandardMaterial color={color} roughness={.84} flatShading/></mesh>}
export function LivingDinosaur(){const head=useRef<Group>(null),jaw=useRef<Group>(null),left=useRef<Group>(null),right=useRef<Group>(null),tail=useRef<Group>(null);
 useFrame(()=>{const {age}=surfacingState(simulation.time),t=age;
 if(head.current){head.current.rotation.y=Math.sin(t*4.1)*.2;head.current.rotation.x=-.15+Math.sin(t*5.2)*.13;}
 if(jaw.current)jaw.current.rotation.x=.32+.18*Math.sin(t*6.2);
 if(left.current){left.current.rotation.z=.35+Math.sin(t*8)*.65;left.current.rotation.x=Math.cos(t*6)*.55;}
 if(right.current){right.current.rotation.z=-.35+Math.sin(t*8+1.8)*.65;right.current.rotation.x=Math.cos(t*6+2)*.55;}
 if(tail.current)tail.current.rotation.y=Math.sin(t*5)*.38;
 });
 return <group>
 <Skin at={[0,.36,-.08]} scale={[.33,.48,.4]}/><Skin at={[0,.67,.07]} scale={[.27,.35,.28]} color="#ada070"/>
 <Bone a={[0,.67,.05]} b={[0,1.11,.2]} r={.22} r2={.16}/>
 <group ref={head} position={[0,1.07,.2]}>
  <Skin at={[0,.12,.08]} scale={[.25,.22,.29]} color="#88905b"/>
  <mesh position={[0,.09,.31]} castShadow><boxGeometry args={[.37,.22,.39]}/><meshStandardMaterial color="#89905c" roughness={.8} flatShading/></mesh>
  <mesh position={[0,-.035,.3]}><boxGeometry args={[.34,.035,.38]}/><meshStandardMaterial color="#251d19" flatShading/></mesh>
  <group ref={jaw} position={[0,-.025,.08]}><Skin at={[0,-.035,.19]} scale={[.18,.065,.26]} color="#c1af7d"/>
  {[-1,1].map(s=><group key={s}>{[.16,.3,.4].map(z=><mesh key={z} position={[s*.13,.027,z]}><coneGeometry args={[.018,.07,5]}/><meshStandardMaterial color="#e5d6ae" flatShading/></mesh>)}</group>)}
  </group>
  {[-1,1].map(s=><group key={s}><Skin at={[s*.223,.16,.12]} scale={[.025,.067,.07]} color="#e5d7a1"/><Skin at={[s*.244,.16,.135]} scale={[.012,.039,.025]} color="#171d17"/><Skin at={[s*.12,.14,.505]} scale={[.032,.017,.012]} color="#2f3827"/></group>)}
 </group>
 {[-1,1].map(s=><group key={s} ref={s<0?left:right} position={[s*.25,.72,.08]}>
  <Bone a={[0,0,0]} b={[s*.23,-.12,.12]} r={.09} r2={.066}/><Bone a={[s*.23,-.12,.12]} b={[s*.4,.04,.28]} r={.065} r2={.035} color="#9a9465"/>
  {[0,1,2].map(i=><Bone key={i} a={[s*(.36+i*.036),.04,.26]} b={[s*(.4+i*.036),.06,.38]} r={.015} r2={.006} color="#ded2ae"/>)}
 </group>)}
 <group ref={tail} position={[0,.24,-.32]}><Bone a={[0,0,0]} b={[0,.06,-.36]} r={.17} r2={.1}/><Bone a={[0,.06,-.36]} b={[0,.16,-.72]} r={.1} r2={.008}/></group>
 {[-.35,-.15,.05].map((z,i)=><mesh key={z} position={[0,.81-i*.025,z]} rotation={[-.3,0,0]} castShadow><coneGeometry args={[.07,.18,4]}/><meshStandardMaterial color="#464d35" flatShading/></mesh>)}
 </group>
}
