import {useRigPose} from './useRigPose';
import {publicAsset} from '../publicAsset';
import { useEffect,useMemo } from 'react';
import {useWebGLTF as useGLTF} from '../useWebGLTF';
import { TyrannosaurusMapRig,TYRANNOSAURUS_MODEL } from '../models/TyrannosaurusMapRig';
import type { Actor,Ecosystem } from '../world/ecosystem';
import {useObservationSubject} from './AnimalObservation';
import type {ObservationSubjects} from './observationMath';

export function MapTyrannosaurus({actor,world,subjects,poseHz=60}:{actor:Actor;world:Ecosystem;subjects:ObservationSubjects;poseHz?:number}){
 const asset=useGLTF(publicAsset(TYRANNOSAURUS_MODEL)),rig=useMemo(()=>new TyrannosaurusMapRig(asset.scene,asset.animations),[asset]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useObservationSubject(rig.root,actor,asset.scene,subjects);
 useRigPose(rig,actor,world,poseHz);
 return <primitive object={rig.root} dispose={null}/>;
}
