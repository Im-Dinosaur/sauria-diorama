import {useRigPose} from './useRigPose';
import {publicAsset} from '../publicAsset';
import {useEffect,useMemo} from 'react';
import {useWebGLTF as useGLTF} from '../useWebGLTF';
import {RealisticMapRig,realisticModel} from '../models/RealisticMapRig';
import type {RealisticSpecies} from '../models/RealisticMapRig';
import type {Actor,Ecosystem} from '../world/ecosystem';
export function MapRealisticDinosaur({actor,world,poseHz=60}:{actor:Actor;world:Ecosystem;poseHz?:number}){
 const species=actor.species as RealisticSpecies,asset=useGLTF(publicAsset(realisticModel(species)));
 const rig=useMemo(()=>new RealisticMapRig(asset.scene,asset.animations,species),[asset,species]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useRigPose(rig,actor,world,poseHz);
 return <primitive object={rig.root} dispose={null}/>;
}
