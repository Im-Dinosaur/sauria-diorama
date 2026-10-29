import { Box3 } from 'three';
import { createOrganicDinosaur,poseDinosaurAction,disposeOrganicDinosaur } from '../src/models/SkinnedDinosaurs';
import { loadMapModel } from './trex/load-map-model';
import { TyrannosaurusMapRig } from '../src/models/TyrannosaurusMapRig';
for(const species of ['brachiosaurus','triceratops'] as const){const rig=createOrganicDinosaur(species);poseDinosaurAction(rig,0,'idle');const box=new Box3().setFromObject(rig.root,true);console.log({species,min:box.min,max:box.max,length:box.max.z-box.min.z});disposeOrganicDinosaur(rig);}
const asset=await loadMapModel(),rig=new TyrannosaurusMapRig(asset.scene,asset.animations),box=new Box3().setFromObject(rig.root,true);console.log({species:'rex',min:box.min,max:box.max,length:box.max.z-box.min.z});rig.dispose();
