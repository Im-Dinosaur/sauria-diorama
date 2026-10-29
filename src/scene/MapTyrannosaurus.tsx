import { useEffect,useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { TyrannosaurusMapRig,TYRANNOSAURUS_MODEL } from '../models/TyrannosaurusMapRig';
import type { Actor,Ecosystem } from '../world/ecosystem';

export function MapTyrannosaurus({actor,world}:{actor:Actor;world:Ecosystem}){
 const asset=useGLTF(TYRANNOSAURUS_MODEL),rig=useMemo(()=>new TyrannosaurusMapRig(asset.scene,asset.animations),[asset]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useFrame((_,dt)=>rig.pose(actor,world.mode,dt,world.paused));
 return <primitive object={rig.root} dispose={null}/>;
}
