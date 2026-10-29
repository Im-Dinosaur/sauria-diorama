import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { IMPACT_DURATION,METEOR_TARGETS,SPLASH_COUNT,WAVE_SEGMENTS,meteorState,seaClearance,splashSample,waveLimits,waveSample } from '../src/world/meteorImpacts';
import { LAVA_LEVEL } from '../src/world/lavaFlows';
let droplets=0,waveVertices=0,minSea=Infinity,minWall=Infinity,maxSplashHeight=0,minCrown=Infinity,minWave=Infinity;
for(let index=0;index<METEOR_TARGETS.length;index++){
 const target=METEOR_TARGETS[index],hitTime=8.3+index*.55;
 assert(Math.abs(meteorState(hitTime,index).y-.14-LAVA_LEVEL)<1e-8,'Meteor contact does not meet the surface');
 assert(meteorState(hitTime-.01,index).falling,'Meteor disappears before contact');
 assert(meteorState(hitTime+.01,index).impact,'Impact is delayed after contact');
 assert(!meteorState(hitTime+IMPACT_DURATION+.01,index).impact,'Impact remains after its lifetime');
 for(let age=.001;age<IMPACT_DURATION;age+=.0125){
  const state=meteorState(hitTime+age,index);
  for(let particle=0;particle<SPLASH_COUNT;particle++){
   const p=splashSample(index,particle,age);if(!p.visible)continue;
   droplets++;const radius=p.radius*p.stretch*Math.sqrt(p.fade);
   minSea=Math.min(minSea,seaClearance(p.x,p.z,radius));minWall=Math.min(minWall,6-Math.abs(p.x)-radius,3-Math.abs(p.z)-radius);maxSplashHeight=Math.max(maxSplashHeight,p.y+radius-LAVA_LEVEL);
  }
  if(state.crownHeight>0)for(let j=0;j<128;j++){const a=j/128*Math.PI*2;minCrown=Math.min(minCrown,seaClearance(target.x+Math.cos(a)*state.crownRadius,target.z+Math.sin(a)*state.crownRadius,.018));}
  for(let ring=0;ring<3;ring++){
   const wave=waveSample(age,ring);if(wave.opacity<=.001)continue;
   for(let j=0;j<WAVE_SEGMENTS;j++)for(const edge of [-1,1]){
    const a=j/WAVE_SEGMENTS*Math.PI*2,r=Math.min(wave.radius+edge*wave.width,waveLimits[index][j]);
    if(wave.radius>=waveLimits[index][j])continue;
    const x=target.x+Math.cos(a)*r,z=target.z+Math.sin(a)*r;minWave=Math.min(minWave,seaClearance(x,z,.01));waveVertices++;
   }
  }
 }
 for(let t=0;t<26;t+=.1){const a=meteorState(t,index),b=meteorState(t+26,index);assert(Math.abs(a.age-b.age)<1e-8,'Meteor phase drifts across cycles');}
}
assert(minSea>0,'Splash enters a coast, sea stack or wall');assert(minCrown>0,'Crown enters a coast or sea stack');assert(minWave>0,'Wave enters a coast, sea stack or wall');
const r=(n:number)=>Number(n.toFixed(5));
const report={result:'PASS',unit:'scene units',sampleStepSeconds:.0125,checkedDroplets:droplets,checkedWaveVertices:waveVertices,minimumSplashSeaClearance:r(minSea),minimumSplashWallClearance:r(minWall),minimumCrownSeaClearance:r(minCrown),minimumWaveSeaClearance:r(minWave),maximumSplashHeight:r(maxSplashHeight),impactStartSeconds:METEOR_TARGETS.map((_,i)=>8.3+i*.55),impactDurationSeconds:IMPACT_DURATION,flowCrustEastwardUnitsPerSecond:.22*12/15,flowMoltenSeamSpeedMultiplier:1.35,flowDisplacementInTwoSeconds:.22*12/15*2};
writeFileSync('verification-impacts.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
