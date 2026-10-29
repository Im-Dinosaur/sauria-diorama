import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { flowPoint,lavaFlows,LAVA_LEVEL } from '../src/world/lavaFlows';
import { groundHeight,landmarks } from '../src/world/terrain';
import { creaturePath,creatureSpecs,treeSites,rockSites,bushSites,carcass } from '../src/world/paths';
import { surfacingState,SURFACING_RADIUS,BOILING_COUNT,boilState,boilSpark } from '../src/world/lavaEvents';
import { seaClearance } from '../src/world/meteorImpacts';
const obstacles=[...treeSites.map(p=>({...p,r:p.s*.5})),...rockSites,...bushSites.map(p=>({...p,r:p.s})),carcass,...landmarks.map(p=>({...p,r:p.r*1.55}))];
let flowWall=Infinity,flowTerrain=Infinity,flowProps=Infinity,flowLanes=Infinity,visitorWall=Infinity,visitorProps=Infinity,visitorShore=Infinity,visitorLanes=Infinity,sparkWall=Infinity,sparkShore=Infinity;
const flows=lavaFlows.map((_,index)=>Array.from({length:401},(_,i)=>flowPoint(index,i/400)));
for(const [index,points] of flows.entries()){
 for(let i=0;i<=400;i++){
  const p=points[i];flowWall=Math.min(flowWall,6-Math.abs(p.x)-p.width,3-Math.abs(p.z)-p.width);
  for(const o of obstacles)flowProps=Math.min(flowProps,Math.hypot(p.x-o.x,p.z-o.z)-p.width-o.r);
  for(let s=-1;s<=1;s+=.25){const q=flowPoint(index,i/400,s);flowTerrain=Math.min(flowTerrain,q.y-groundHeight(q.x,q.z));}
 }
 assert(groundHeight(points[400].x,points[400].z)<LAVA_LEVEL,'Flow never reaches sea');
 assert(Math.abs(points[400].y-LAVA_LEVEL-.022)<1e-9,'Flow does not merge at sea level');
}
for(let i=0;i<1440;i++)for(const species of ['rex','triceratops'] as const){
 const p=creaturePath(species,i/1440*Math.PI*2/(species==='rex'?.16:.13)),r=creatureSpecs[species].radius;
 for(const points of flows)for(const f of points)flowLanes=Math.min(flowLanes,Math.hypot(p.x-f.x,p.z-f.z)-r-f.width);
 for(let k=0;k<2;k++){const q=surfacingState(14.2+k*22);visitorLanes=Math.min(visitorLanes,Math.hypot(q.x-p.x,q.z-p.z)-SURFACING_RADIUS-.08-r);}
}
for(let t=0;t<60;t+=.02){const p=surfacingState(t);if(!p.visible)continue;
 visitorWall=Math.min(visitorWall,6-Math.abs(p.x)-SURFACING_RADIUS,3-Math.abs(p.z)-SURFACING_RADIUS);
 for(const o of obstacles)visitorProps=Math.min(visitorProps,Math.hypot(p.x-o.x,p.z-o.z)-SURFACING_RADIUS-o.r);
 for(let a=0;a<Math.PI*2;a+=Math.PI/24)for(const r of [0,SURFACING_RADIUS*.5,SURFACING_RADIUS])visitorShore=Math.min(visitorShore,LAVA_LEVEL-groundHeight(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r));
}
let boilingEvents=0,minBoilingSea=Infinity;
for(const seed of [0,82419,918372])for(let cycle=0;cycle<240;cycle++)for(let i=0;i<BOILING_COUNT;i++){
 const period=4.6+(i%3)*.7,t=cycle*period+period*.5-i*1.137;if(t<0)continue;
 const state=boilState(i,t,seed),site=state.site,radius=site.r+.7*.35;boilingEvents++;
 const next=boilState(i,t+period,seed);assert(Math.hypot(site.x-next.site.x,site.z-next.site.z)>.05,'Consecutive boiling events reuse a location');
 assert.deepEqual(state,boilState(i,t,seed),'Paused boiling changes');
 assert.deepEqual(site,boilState(i,t+period*.35,seed).site,'Boiling location changes before its burst finishes');
 sparkWall=Math.min(sparkWall,6-Math.abs(site.x)-radius,3-Math.abs(site.z)-radius);
 minBoilingSea=Math.min(minBoilingSea,seaClearance(site.x,site.z,radius));
 for(let a=0;a<Math.PI*2;a+=Math.PI/12)sparkShore=Math.min(sparkShore,LAVA_LEVEL-groundHeight(site.x+Math.cos(a)*radius,site.z+Math.sin(a)*radius));
 for(let age=0;age<.8;age+=.04)for(let j=0;j<10;j++){
  const p=boilSpark(i,j,{...state,burstAge:age});if(!p.visible)continue;
  sparkWall=Math.min(sparkWall,6-Math.abs(p.x)-p.radius,3-Math.abs(p.z)-p.radius);minBoilingSea=Math.min(minBoilingSea,seaClearance(p.x,p.z,p.radius));
 }
}
assert(minBoilingSea>0,'Random boiling enters shore, landmarks or wall');
console.log(JSON.stringify({randomBoilingEvents:boilingEvents,minimumRandomBoilingSeaClearance:minBoilingSea,seedVariants:3}));
assert(!surfacingState(0).visible&&surfacingState(14.2).visible&&!surfacingState(20).visible&&surfacingState(36.2).visible,'Appearance timing');
assert(surfacingState(36.2).site!==surfacingState(14.2).site,'Sites must alternate');
assert(surfacingState(18.7).y+1.55*.78<LAVA_LEVEL,'Entire head must sink below opaque surface');
const rounded=(n:number)=>Number(n.toFixed(5));
const report={unit:'scene units',riverSamples:802,visitorTimeSamples:3000,minimumRiverWallClearance:rounded(flowWall),minimumRiverTerrainOffset:rounded(flowTerrain),minimumRiverPropClearance:rounded(flowProps),minimumRiverCreatureLaneClearance:rounded(flowLanes),minimumVisitorWallClearance:rounded(visitorWall),minimumVisitorObstacleClearance:rounded(visitorProps),minimumVisitorSeabedDepth:rounded(visitorShore),minimumVisitorLandCreatureClearance:rounded(visitorLanes),minimumBoilingEffectWallClearance:rounded(sparkWall),minimumBoilingEffectSeabedDepth:rounded(sparkShore),visitorCycleSeconds:22,visibleDurationSeconds:6.8,firstAppearanceSeconds:12,simultaneousVisitors:1,result:[flowWall,flowTerrain,flowProps,flowLanes,visitorWall,visitorProps,visitorShore,visitorLanes,sparkWall,sparkShore].every(v=>v>0)?'PASS':'FAIL'};
writeFileSync('lava-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
for(const [key,value] of Object.entries(report))if(key.startsWith('minimum')&&typeof value==='number')assert(value>0,key);
