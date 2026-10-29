import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {RealisticMapRig,realisticModel} from '../models/RealisticMapRig';
import type {RealisticSpecies} from '../models/RealisticMapRig';
import type {Actor,Ecosystem} from '../world/ecosystem';
export function MapRealisticDinosaur({actor,world}:{actor:Actor;world:Ecosystem}){
 const species=actor.species as RealisticSpecies,asset=useGLTF(realisticModel(species));
 const rig=useMemo(()=>new RealisticMapRig(asset.scene,asset.animations,species),[asset,species]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useFrame((_,dt)=>rig.pose(actor,world.mode,dt,world.paused));
 return <primitive object={rig.root} dispose={null}/>;
}
