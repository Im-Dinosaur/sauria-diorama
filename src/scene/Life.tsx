import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Rex,Triceratops,Pterosaur } from '../models/Dinosaurs';
import { creaturePath,creatureSpecs } from '../world/paths';
import type { Species } from '../world/paths';
import { simulation } from '../config';
function Creature({species}:{species:Species}){const ref=useRef<Group>(null);useFrame(()=>{const p=creaturePath(species,simulation.time);if(ref.current){ref.current.position.set(p.x,p.y,p.z);ref.current.rotation.y=p.heading;}});return <group ref={ref} scale={creatureSpecs[species].scale}>{species==='rex'?<Rex/>:species==='triceratops'?<Triceratops/>:<Pterosaur/>}</group>}
export function Life(){return <group><Creature species="rex"/><Creature species="triceratops"/><Creature species="pterosaur"/></group>}
