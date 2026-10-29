import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PoseClock,renderDpr,RENDER_BUDGETS,initialRenderTier} from '../src/renderPerformance';
const rows=JSON.parse(readFileSync('public/models/web-delivery.json','utf8'));
const map=rows.filter((r:any)=>r.role==='map'||['stegosaurus','pterosaur'].includes(r.id));
const transferBytes=map.reduce((n:number,r:any)=>n+r.transferBytes,0),originalBytes=map.reduce((n:number,r:any)=>n+r.originalBytes,0);
assert(transferBytes<originalBytes*.35,'Main models must use at least 65% fewer transfer bytes');
for(const row of rows){const bytes=readFileSync('public'+row.output+'.gz'),decoded=gunzipSync(bytes);assert.equal(bytes.length,row.transferBytes);assert.equal(decoded.length,row.bytes);assert.equal(decoded.readUInt32LE(0),0x46546c67);assert(row.geometrySkinAnimationUnchanged);}
assert.equal(initialRenderTier('high'),0);assert.equal(initialRenderTier('low'),2);
for(const tier of [0,1,2] as const){const dpr=renderDpr(tier,1920,1080,2);assert(dpr<=RENDER_BUDGETS[tier].maxDpr);assert(1920*1080*dpr*dpr<=RENDER_BUDGETS[tier].pixels+1);}
const samples=[];
const staggered=Array.from({length:32},()=>new PoseClock());staggered.forEach(c=>c.sample(0,20,false));const sampled=new Set<number>();
for(let frame=0;frame<16;frame++){let work=0;staggered.forEach((clock,i)=>{if(clock.sample(.15,20,false,i%4===frame%4)!==null){work++;sampled.add(i);}});assert(work<=8,'Slow frames must not update all rigs at once');}assert.equal(sampled.size,32,'Sampling must be fair to every animal');
for(const hz of [20,30,60]){
 const clock=new PoseClock(.4);clock.sample(0,hz,false);let calls=0;
 for(let i=0;i<120;i++)if(clock.sample(1/60,hz,false)!==null)calls++;
 assert(Math.abs(calls-hz*2)<=1,`Unexpected ${hz}Hz pose cadence: ${calls}`);
 assert.equal(clock.sample(.016,hz,true),0);for(let i=0;i<100;i++)assert.equal(clock.sample(.016,hz,true),null,'Paused rigs must stop recomputing');
 assert(clock.sample(.1,hz,false)!==null,'Resume did not restart pose sampling');samples.push({hz,calls});
}
const report={result:'PASS',originalModelBytes:originalBytes,transferredModelBytes:transferBytes,reduction:1-transferBytes/originalBytes,samples};
writeFileSync('verification-performance.json',JSON.stringify(report,null,2)+'\n');console.log(report);
