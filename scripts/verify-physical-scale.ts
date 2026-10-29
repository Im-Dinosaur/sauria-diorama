import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Box3 } from 'three';
import { DIORAMA } from '../src/world/layout';
import { METRES_PER_UNIT,MAP_WIDTH_METRES,SIZE_REFERENCE,SIZE_SPECIES_ORDER } from '../src/world/physicalScale';
import { inhabitants,createEcosystem } from '../src/world/ecosystem';
import {RealisticMapRig,realisticModel} from '../src/models/RealisticMapRig';
import { TyrannosaurusMapRig } from '../src/models/TyrannosaurusMapRig';
import { loadMapModel } from './trex/load-map-model';

assert.equal(DIORAMA.width*METRES_PER_UNIT,300);assert.equal(MAP_WIDTH_METRES,300);
const asset=await loadMapModel(),cases=[];
for(const species of SIZE_SPECIES_ORDER){
 const animals=inhabitants.filter(a=>a.species===species),adult=animals.reduce((a,b)=>a.scale>b.scale?a:b),reference=SIZE_REFERENCE[species]!;
 const model=species==='rex'?asset:await loadMapModel(`public${realisticModel(species)}`);
 const rig=species==='rex'?new TyrannosaurusMapRig(model.scene,model.animations):new RealisticMapRig(model.scene,model.animations,species);
 rig.root.scale.setScalar(adult.scale);rig.root.updateMatrixWorld(true);const box=new Box3().setFromObject(rig.root,true);let metres=(box.max.z-box.min.z)*METRES_PER_UNIT;
 if(species==='pterosaur'){
  const actor=createEcosystem().actors.find(a=>a.id===adult.id)!;Object.assign(actor,{x:0,y:0,z:0,heading:0,behavior:'fly'});metres=0;
  for(const behavior of ['fly','glide'] as const){actor.behavior=behavior;const duration=model.animations.find(clip=>clip.name===behavior)!.duration;for(let frame=0;frame<=Math.ceil(duration*120);frame++){actor.age=Math.min(duration,frame/120);rig.pose(actor,'peaceful',.05);const flying=new Box3().setFromObject(rig.root,true);metres=Math.max(metres,(flying.max.x-flying.min.x)*METRES_PER_UNIT);}}
 }
 assert(Math.abs(metres-reference.metres)<.001,`${species}: expected ${reference.metres}m, got ${metres}m`);
 assert(animals.every(a=>a.scale<=adult.scale&&a.radius>0));
 cases.push({species,measurement:reference.measurement,adultMetres:metres,targetMetres:reference.metres,mapWidthFraction:metres/MAP_WIDTH_METRES,individualMetres:animals.map(a=>reference.modelLength*a.scale*METRES_PER_UNIT),sourceUrl:reference.sourceUrl});
 rig.dispose();
}
assert(SIZE_REFERENCE.velociraptor.metres/SIZE_REFERENCE.rex.metres<.16,'Raptor must stay much smaller than T. rex');
const report={result:'PASS',mapWidthMetres:MAP_WIDTH_METRES,metresPerUnit:METRES_PER_UNIT,measuredFromRenderedModels:true,cases};writeFileSync('verification-physical-scale.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
