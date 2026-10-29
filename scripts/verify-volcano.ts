import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { EJECTA_COUNT,ejectaSample,eruptionState } from '../src/world/eruption';
import { SMOKE_COUNT,smokeSample } from '../src/world/volcanicSmoke';
import { groundHeight } from '../src/world/terrain';

let smokeWall=Infinity,ejectaWall=Infinity,ejectaGround=Infinity,maxHeight=0,smokeInstances=0,ejectaInstances=0;
const step=.02;
for(const intensity of [.5,1,2])for(let time=0;time<26;time+=step){
 for(let i=0;i<SMOKE_COUNT;i++){
  const p=smokeSample(time,i,undefined,intensity);
  assert(Number.isFinite(p.x+p.y+p.z+p.radius+p.opacity));
  if(p.opacity<.005)continue;
  smokeInstances++;smokeWall=Math.min(smokeWall,6-Math.abs(p.x)-p.radius,3-Math.abs(p.z)-p.radius);maxHeight=Math.max(maxHeight,p.y+p.radius);
 }
 const {phase}=eruptionState(time);
 for(let i=0;i<EJECTA_COUNT;i++){
  const head=ejectaSample(phase,i,0,intensity);if(!head.visible)continue;
  for(let trail=0;trail<5;trail++){
   const p=ejectaSample(phase,i,trail*.038,intensity);if(!p.visible)continue;
   // The elongated trail can be 2.4 radii long; use a conservative enclosing sphere.
   const radius=trail===0?p.radius:p.radius*.68*2.4;
   ejectaInstances++;ejectaWall=Math.min(ejectaWall,6-Math.abs(p.x)-radius,3-Math.abs(p.z)-radius);
   ejectaGround=Math.min(ejectaGround,p.y-radius-groundHeight(p.x,p.z));
  }
 }
}
assert(smokeWall>0,'Smoke leaves the block footprint');assert(ejectaWall>0,'Ejecta/trail leaves the block footprint');assert(ejectaGround>0,'Ejecta/trail intersects terrain');
const frozen=JSON.stringify(Array.from({length:SMOKE_COUNT},(_,i)=>smokeSample(8.25,i)));
assert.equal(frozen,JSON.stringify(Array.from({length:SMOKE_COUNT},(_,i)=>smokeSample(8.25,i))),'Paused smoke moves');
for(const time of [0,8.25,11,20])for(let i=0;i<EJECTA_COUNT;i++){
 const a=ejectaSample(eruptionState(time).phase,i),b=ejectaSample(eruptionState(time+26).phase,i);
 assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-8,'Ejecta cycle discontinuity');
}
const r=(n:number)=>Number(n.toFixed(5));
const report={result:'PASS',sampleStepSeconds:step,checkedSmokeInstances:smokeInstances,checkedEjectaAndTrailInstances:ejectaInstances,minimumSmokeWallClearance:r(smokeWall),minimumEjectaAndTrailWallClearance:r(ejectaWall),minimumEjectaAndTrailTerrainClearance:r(ejectaGround),maximumSmokeHeight:r(maxHeight),smokeInstanceCount:SMOKE_COUNT,ejectaInstanceCount:EJECTA_COUNT,trailInstanceCount:EJECTA_COUNT*4,eruptionBursts:3,deterministicPause:true,unit:'scene units'};
console.log(JSON.stringify(report,null,2));writeFileSync('verification-volcano.json',JSON.stringify(report,null,2));
