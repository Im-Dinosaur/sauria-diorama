import {useRigPose} from './useRigPose';
import {publicAsset} from '../publicAsset';
import { useEffect,useMemo } from 'react';
import {useWebGLTF as useGLTF} from '../useWebGLTF';
import { TyrannosaurusMapRig,TYRANNOSAURUS_MODEL } from '../models/TyrannosaurusMapRig';
import type { Actor,Ecosystem } from '../world/ecosystem';

export function MapTyrannosaurus({actor,world,poseHz=60}:{actor:Actor;world:Ecosystem;poseHz?:number}){
 const asset=useGLTF(publicAsset(TYRANNOSAURUS_MODEL)),rig=useMemo(()=>new TyrannosaurusMapRig(asset.scene,asset.animations),[asset]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useRigPose(rig,actor,world,poseHz);
 return <primitive object={rig.root} dispose={null}/>;
}
