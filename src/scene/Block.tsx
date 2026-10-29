import { Edges } from '@react-three/drei';
import { useMemo } from 'react';
import { createResinShell } from '../world/resinShell';
export function Block(){const shells=useMemo(()=>[createResinShell(12,.86,6),createResinShell(12.008,1.52,6.008)],[]);return <group>
 <mesh position={[0,-1.23,0]} castShadow receiveShadow><boxGeometry args={[12,.34,6]}/><meshStandardMaterial color="#302c2b" roughness={.9} flatShading/></mesh>
 <mesh position={[0,-1.01,0]} receiveShadow><boxGeometry args={[12,.1,6]}/><meshStandardMaterial color="#595045" roughness={1} flatShading/></mesh>
 <mesh position={[0,-.89,0]} receiveShadow><boxGeometry args={[12,.14,6]}/><meshStandardMaterial color="#a08b68" roughness={1} flatShading/></mesh>
 <mesh position={[0,-.78,0]} receiveShadow><boxGeometry args={[12,.08,6]}/><meshStandardMaterial color="#c3a16d" roughness={1} flatShading/></mesh>
 <mesh geometry={shells[0]} position={[0,-.31,0]} renderOrder={3}><meshPhysicalMaterial color="#d26927" transparent opacity={.1} roughness={.07} metalness={.15} clearcoat={1} depthWrite={false} flatShading/><Edges color="#e9b077" transparent opacity={.48} threshold={30}/></mesh>
 <mesh geometry={shells[1]} position={[0,-.64,0]} renderOrder={4}><meshPhysicalMaterial color="#efc7a0" transparent opacity={.035} roughness={.03} clearcoat={1} depthWrite={false} flatShading/><Edges color="#c6a57e" transparent opacity={.38}/></mesh>
 </group>}
