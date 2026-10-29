import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { simulation } from '../config';
import type { Species } from '../world/paths';
import { createDinosaur, disposeDinosaur, poseDinosaur } from './MechanicalDinosaurs';

function MechanicalDinosaur({species}:{species:Species}){
 const rig=useMemo(()=>createDinosaur(species),[species]);
 useFrame(()=>poseDinosaur(rig,simulation.time));
 useEffect(()=>()=>disposeDinosaur(rig),[rig]);
 return <primitive object={rig.root} dispose={null}/>;
}
export function Rex(){return <MechanicalDinosaur species="rex"/>;}
export function Triceratops(){return <MechanicalDinosaur species="triceratops"/>;}
export function Pterosaur(){return <MechanicalDinosaur species="pterosaur"/>;}
