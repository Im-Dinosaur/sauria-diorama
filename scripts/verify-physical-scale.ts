import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Box3 } from 'three';
import { DIORAMA } from '../src/world/layout';
import { METRES_PER_UNIT,MAP_WIDTH_METRES,SIZE_REFERENCE } from '../src/world/physicalScale';
import { inhabitants } from '../src/world/ecosystem';
import { createOrganicDinosaur,poseDinosaurAction,disposeOrganicDinosaur } from '../src/models/SkinnedDinosaurs';
import { TyrannosaurusMapRig } from '../src/models/TyrannosaurusMapRig';
import { loadMapModel } from './trex/load-map-model';

assert.equal(DIORAMA.width*METRES_PER_UNIT,300);assert.equal(MAP_WIDTH_METRES,300);
const asset=await loadMapModel(),cases=[];
for(const species of ['brachiosaurus','rex','triceratops'] as const){
 const animals=inhabitants.filter(a=>a.species===species),adult=animals.reduce((a,b)=>a.scale>b.scale?a:b),reference=SIZE_REFERENCE[species]!;
 const rig=species==='rex'?new TyrannosaurusMapRig(asset.scene,asset.animations):createOrganicDinosaur(species);
 if(species!=='rex')poseDinosaurAction(rig as ReturnType<typeof createOrganicDinosaur>,0,'idle');
 rig.root.scale.setScalar(adult.scale);rig.root.updateMatrixWorld(true);const box=new Box3().setFromObject(rig.root,true),metres=(box.max.z-box.min.z)*METRES_PER_UNIT;
 assert(Math.abs(metres-reference.metres)<.001,`${species}: expected ${reference.metres}m, got ${metres}m`);
 assert(animals.every(a=>a.scale<=adult.scale&&a.radius>0));
 cases.push({species,adultMetres:metres,targetMetres:reference.metres,mapWidthFraction:metres/MAP_WIDTH_METRES,individualMetres:animals.map(a=>reference.modelLength*a.scale*METRES_PER_UNIT)});
 if(rig instanceof TyrannosaurusMapRig)rig.dispose();else disposeOrganicDinosaur(rig);
}
const report={result:'PASS',mapWidthMetres:MAP_WIDTH_METRES,metresPerUnit:METRES_PER_UNIT,measuredFromRenderedModels:true,cases};writeFileSync('verification-physical-scale.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
