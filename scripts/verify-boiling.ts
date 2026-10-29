import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { advanceBoiling,BOILING_LIFETIME,BOILING_POOL_SIZE,BOILING_RATE,BOILING_SPARKS,boilingEventState,createBoilingSimulation } from '../src/world/boilingSimulation';
import { boilSpark } from '../src/world/lavaEvents';
import { seaClearance } from '../src/world/meteorImpacts';
import { createEnvironmentClock,setBoilingFrequency,setSparkStrength } from '../src/world/environmentClock';
import { LAVA_LEVEL } from '../src/world/lavaFlows';
const checks:string[]=[];
const populations:number[]=[];
for(const frequency of [0,1,3]){
 const s=createBoilingSimulation(77);for(let i=0;i<6000;i++)advanceBoiling(s,.01,frequency,2);
 assert(Math.abs(s.count-60*BOILING_RATE*frequency)<=1);populations.push(s.count);
}
assert.equal(populations[0],0);assert(Math.abs(populations[2]/populations[1]-3)<.05);checks.push('0x emits none; 3x emits three times as many events without speeding up droplets');
const frozen=createBoilingSimulation(77);advanceBoiling(frozen,1,1,1);const before=JSON.stringify(frozen);advanceBoiling(frozen,10,3,2,true);assert.equal(JSON.stringify(frozen),before);checks.push('Pause freezes particles and emission credit');
const stopping=createBoilingSimulation(12);advanceBoiling(stopping,2,1,1);const count=stopping.count,event=stopping.events.find(Boolean)!;
advanceBoiling(stopping,.1,0,0);assert.equal(stopping.count,count);assert(stopping.events.includes(event));assert.equal(event.strength,1);
advanceBoiling(stopping,BOILING_LIFETIME,0,0);assert.equal(stopping.count,count);assert(stopping.events.every(e=>e===null));advanceBoiling(stopping,1,1,0);assert(stopping.count<=count+2);checks.push('Zero frequency drains existing events; strength changes preserve airborne particles; resume does not catch up');
let eventCount=0,minSea=Infinity,minWall=Infinity,maxActive=0,maxHeight=0;
for(const seed of [0,82419,918372]){
 const s=createBoilingSimulation(seed),seen=new Set<number>();
 for(let tick=0;tick<6000;tick++){
  advanceBoiling(s,.01,3,2);maxActive=Math.max(maxActive,s.events.filter(Boolean).length);
  for(const event of s.events){
   if(!event||seen.has(event.id))continue;seen.add(event.id);eventCount++;
   minSea=Math.min(minSea,seaClearance(event.site.x,event.site.z,event.site.r+.95*.23));
   for(const strength of [0,.5,1,2])for(let age=.002;age<1.2;age+=.04)for(let j=0;j<BOILING_SPARKS;j++){
    const p=boilSpark(event.id,j,{...event,burstAge:age},strength);if(!p.visible)continue;
    const r=p.radius*p.stretch;minSea=Math.min(minSea,seaClearance(p.x,p.z,r));minWall=Math.min(minWall,6-Math.abs(p.x)-r,3-Math.abs(p.z)-r);maxHeight=Math.max(maxHeight,p.y-LAVA_LEVEL);
   }
  }
 }
}
assert(minSea>0&&minWall>0);assert(maxActive<BOILING_POOL_SIZE);checks.push('Maximum-frequency pools stay bounded; stretched droplets and complete ripples clear terrain, rocks and walls');
const probe=createBoilingSimulation(8);advanceBoiling(probe,2,1,1);const e=probe.events.find(Boolean)!;
for(let a=0;a<3;a+=.01){const p=boilingEventState(e,e.start+a);assert(Number.isFinite(p.bulge+p.crown));assert.equal(boilSpark(e.id,0,p,0).visible,false);}
const low=boilSpark(e.id,0,{...e,burstAge:.2},.5),high=boilSpark(e.id,0,{...e,burstAge:.2},2);assert(high.y>low.y);checks.push('0x strength hides sparks while the bubble remains; stronger sparks rise higher');
const settings=createEnvironmentClock();setBoilingFrequency(settings,9);setSparkStrength(settings,9);assert.equal(settings.boilingFrequency,3);assert.equal(settings.sparkStrength,2);setBoilingFrequency(settings,-1);setSparkStrength(settings,-1);assert.equal(settings.boilingFrequency,0);assert.equal(settings.sparkStrength,0);checks.push('Inputs clamp to 0–3x frequency and 0–2x spark strength');
const report={result:'PASS',checks,emissionsPerMinuteAt0x1x3x:populations,verifiedRandomEvents:eventCount,maxConcurrentEvents:maxActive,poolCapacity:BOILING_POOL_SIZE,minimumSeaClearance:minSea,minimumSparkWallClearance:minWall,maximumSparkHeight:maxHeight,unit:'scene units'};
console.log(JSON.stringify(report,null,2));writeFileSync('verification-boiling.json',JSON.stringify(report,null,2));
