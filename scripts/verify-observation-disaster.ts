import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Box3,OrthographicCamera,PerspectiveCamera,Vector3} from 'three';
import {createEcosystem} from '../src/world/ecosystem';
import {SIZE_SPECIES_ORDER} from '../src/world/physicalScale';
import {RealisticMapRig,realisticModel} from '../src/models/RealisticMapRig';
import {TyrannosaurusMapRig} from '../src/models/TyrannosaurusMapRig';
import {loadMapModel} from './trex/load-map-model';
import {observationSubject,observationCentre,observationDistance,pickObservationSubject,ObservationTap} from '../src/scene/observationMath';
import {advanceDisaster,animalPresence,createDisaster,disasterAppearance,disasterWaterAppearance,disasterSnapshot,disasterWorldMode,distantFlash,resetDisaster,startDisaster} from '../src/world/disaster';

const world=createEcosystem(),cases=[];
for(const species of SIZE_SPECIES_ORDER){
 const asset=await loadMapModel(species==='rex'?undefined:`public${realisticModel(species)}`),rig=species==='rex'?new TyrannosaurusMapRig(asset.scene,asset.animations):new RealisticMapRig(asset.scene,asset.animations,species);
 const actor=world.actors.filter(a=>a.species===species).sort((a,b)=>b.scale-a.scale)[0];Object.assign(actor,{x:0,y:1,z:0,heading:.61});
 const subject=observationSubject(actor,rig.root,new Box3().setFromObject(rig.root,true));rig.root.position.set(actor.x,actor.y,actor.z);rig.root.rotation.y=actor.heading;rig.root.scale.setScalar(actor.scale);rig.root.updateMatrixWorld(true);
 const centre=observationCentre(subject),sizes=[];
 for(const aspect of [16/9,9/16]){
  const distance=observationDistance(subject.radius,aspect),camera=new PerspectiveCamera(42,aspect,.012,220);camera.position.copy(centre).add(new Vector3(.82,.58,.3).normalize().multiplyScalar(distance));camera.lookAt(centre);camera.updateMatrixWorld(true);
  let extent=0;const b=subject.bounds;
  for(let i=0;i<8;i++){const p=new Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(rig.root.matrixWorld).project(camera);assert(p.z>=-1&&p.z<=1);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}
  assert(extent<.85,`${species} clipped in ${aspect} aspect`);assert.equal(pickObservationSubject([subject],camera,900*aspect,900,450*aspect,450),actor.id);
  sizes.push({aspect,distance,maximumScreenExtent:extent});
 }
 const top=new OrthographicCamera(-30,30,16.875,-16.875,.1,200);top.position.set(0,80,0);top.up.set(0,0,-1);top.lookAt(0,0,0);top.updateMatrixWorld(true);
 const screen=centre.clone().project(top),x=(screen.x+1)*640,y=(1-screen.y)*360;
 assert.equal(pickObservationSubject([subject],top,1280,720,x+14,y),actor.id,`${species} small tap target`);
 assert.equal(pickObservationSubject([subject],top,1280,720,0,0),null,'Background click must not select a remote animal');
 const previous=observationCentre(subject);actor.x+=4;actor.y+=1;actor.z-=2;const moved=observationCentre(subject).sub(previous);assert(moved.distanceTo(new Vector3(4,1,-2))<1e-10,'Follow centre must preserve actor translation and flight altitude');
 cases.push({species,sizes});rig.dispose();
}
const tap=new ObservationTap();tap.start(1,0,0);tap.move(1,2,1);assert(tap.end(1,2,1));tap.start(1,0,0);tap.move(1,30,0);assert(!tap.end(1,0,0),'Returning drag must not become a click');tap.start(1,0,0);tap.start(2,2,2);assert(!tap.end(2,2,2));assert(!tap.end(1,0,0),'Pinch must not select');tap.start(3,0,0);tap.cancel(3);assert(!tap.end(3,0,0));
const sequences=[];
for(const kind of ['ice','ember'] as const){
 const sequence=createDisaster();assert.equal(animalPresence(sequence),1);assert.equal(disasterAppearance(sequence),0);startDisaster(sequence,kind);
 sequence.elapsed=.999;assert.equal(distantFlash(sequence),0);sequence.elapsed=1;assert.equal(distantFlash(sequence),kind==='ember'?1:0);
 sequence.elapsed=6;assert.equal(animalPresence(sequence),1);if(kind==='ice'){assert(disasterAppearance(sequence)>0);assert.equal(disasterWaterAppearance(sequence),0,'Snow must settle before the river freezes');}
 const held=sequence.elapsed;for(let i=0;i<60;i++)advanceDisaster(sequence,1/60,true);assert.equal(sequence.elapsed,held,'Pause must freeze the disaster, including flash timing');
 sequence.elapsed=30;assert(animalPresence(sequence)<1&&animalPresence(sequence)>0);assert.equal(disasterWorldMode(sequence),kind);
 for(let i=0;i<1000;i++)advanceDisaster(sequence,1/60,false);
 const finished=disasterSnapshot(sequence);assert(finished.finished);assert.equal(finished.progress,1);assert.equal(animalPresence(sequence),0);assert.equal(disasterWaterAppearance(sequence),1);assert.equal(distantFlash(sequence),0,'Flash must never repeat');
 for(let i=0;i<60;i++)advanceDisaster(sequence,1/60,false);assert.equal(sequence.elapsed,sequence.duration,'Aftermath must remain complete');
 sequences.push({kind,finished});resetDisaster(sequence);assert.equal(disasterSnapshot(sequence).kind,null);assert.equal(animalPresence(sequence),1);assert.equal(disasterAppearance(sequence),0);
}
const report={result:'PASS',renderedModelFraming:cases,gestureSafety:true,sequences};writeFileSync('verification-observation-disaster.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
