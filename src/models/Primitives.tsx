import { useMemo } from 'react';
import { Vector3, Quaternion } from 'three';
type V=[number,number,number];
export function Plate({at=[0,0,0],size=[1,1,1],color='#8d948c',rotation=[0,0,0],glow=false}:{at?:V;size?:V;color?:string;rotation?:V;glow?:boolean}){return <mesh position={at} rotation={rotation} castShadow={!glow} receiveShadow={!glow}><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={glow?0:.65} roughness={.48} flatShading emissive={glow?color:'#000000'} emissiveIntensity={glow?2.3:0}/></mesh>}
export function Joint({at,r=.1}:{at:V;r?:number}){return <mesh position={at} castShadow><icosahedronGeometry args={[r,0]}/><meshStandardMaterial color="#323b37" metalness={.8} roughness={.38} flatShading/></mesh>}
export function Rod({a,b,r=.035,color='#828b80',r2,glow=false}:{a:V;b:V;r?:number;r2?:number;color?:string;glow?:boolean}){
 const {mid,q,length}=useMemo(()=>{const av=new Vector3(...a),bv=new Vector3(...b);return {mid:av.clone().add(bv).multiplyScalar(.5),q:new Quaternion().setFromUnitVectors(new Vector3(0,1,0),bv.clone().sub(av).normalize()),length:av.distanceTo(bv)};},[a[0],a[1],a[2],b[0],b[1],b[2]]);
 return <mesh position={mid} quaternion={q} castShadow={!glow}><cylinderGeometry args={[r2??r,r,length,5]}/><meshStandardMaterial color={color} metalness={.6} roughness={.5} flatShading emissive={glow?color:'#000'} emissiveIntensity={glow?2:0}/></mesh>;
}
export function Horn({at,height=.3,r=.07,rotation=[0,0,0],color='#dbcfaa'}:{at:V;height?:number;r?:number;rotation?:V;color?:string}){return <mesh position={at} rotation={rotation} castShadow><coneGeometry args={[r,height,5]}/><meshStandardMaterial color={color} metalness={.55} roughness={.45} flatShading/></mesh>}
export function Servo({at,r=.15,rotation=[0,0,Math.PI/2]}:{at:V;r?:number;rotation?:V}){return <group position={at} rotation={rotation}>
 <mesh castShadow><cylinderGeometry args={[r,r,.105,8]}/><meshStandardMaterial color="#202a2b" metalness={.8} roughness={.28} flatShading/></mesh>
 {[-1,1].map(s=><group key={s}><mesh position={[0,s*.06,0]} castShadow><cylinderGeometry args={[r*.77,r*.77,.024,8]}/><meshStandardMaterial color="#cbd0c6" metalness={.85} roughness={.24} flatShading/></mesh><mesh position={[0,s*.077,0]} castShadow><cylinderGeometry args={[r*.32,r*.32,.018,6]}/><meshStandardMaterial color="#b9783d" metalness={.7} roughness={.3} flatShading/></mesh></group>)}
 </group>}
export function Piston({a,b,r=.04}:{a:V;b:V;r?:number}){const end:V=[a[0]+(b[0]-a[0])*.57,a[1]+(b[1]-a[1])*.57,a[2]+(b[2]-a[2])*.57];return <group><Rod a={a} b={b} r={r*.55} color="#e2e5d9"/><Rod a={a} b={end} r={r} color="#37484a"/></group>}
