import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { advanceEnvironmentClock as tick,createEnvironmentClock as create,eruptionInProgress,setEruptionInterval as interval,setAutomaticEruptions as automatic,setLavaFlowSpeed as speed,setEruptionIntensity as intensity,setMeteorCount as meteorCount,triggerEruption as trigger,seekEnvironmentClock as seek } from '../src/world/environmentClock';
import { eruptionState } from '../src/world/eruption';
import { meteorState } from '../src/world/meteorImpacts';
import { smokeSample } from '../src/world/volcanicSmoke';
const close=(a:number,b:number)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const checked:string[]=[];
for(let count=0;count<=6;count++){
 const c=create();intensity(c,2);meteorCount(c,count);tick(c,6);assert.equal(c.eventIntensity,2);assert.equal(c.eventMeteorCount,count);
 const falls=new Set<number>(),hits=new Set<number>();
 for(let age=0;age<9;age+=.02)for(let i=0;i<6;i++){const p=meteorState(c.time+age,i,age,c.eventMeteorCount);if(p.falling)falls.add(i);if(p.impact)hits.add(i);}
 assert.equal(falls.size,count);assert.equal(hits.size,count);
 intensity(c,.5);meteorCount(c,6-count);assert.equal(c.eventIntensity,2);assert.equal(c.eventMeteorCount,count);
 tick(c,10);assert(trigger(c));assert.equal(c.eventIntensity,.5);assert.equal(c.eventMeteorCount,6-count);
}
checked.push('0–6 requested meteors produce exactly that many falls and impacts; settings are captured at ignition');
const limits=create();intensity(limits,-2);assert.equal(limits.intensity,.5);intensity(limits,99);assert.equal(limits.intensity,2);meteorCount(limits,-2);assert.equal(limits.meteorCount,0);meteorCount(limits,99);assert.equal(limits.meteorCount,6);
for(const age of [.2,1,2,3])close(eruptionState(0,age,2).pulse/eruptionState(0,age,.5).pulse,4);
checked.push('Intensity clamps to 0.5–2x and changes jet power without changing timing');

const defaults=create();tick(defaults,5.99);assert.equal(defaults.count,0);tick(defaults,.01);assert.equal(defaults.count,1);close(defaults.age,0);tick(defaults,26);assert.equal(defaults.count,2);close(defaults.lastStart!,32);checked.push('Default first eruption at 6 s, subsequent starts 26 s apart');
const active=create();tick(active,8);const eventStart=active.lastStart;interval(active,60);assert.equal(active.interval,26);assert.equal(active.pendingInterval,60);close(active.age,2);tick(active,6.9);assert.equal(active.pendingInterval,60);tick(active,.1);assert.equal(active.interval,60);assert.equal(active.pendingInterval,null);assert.equal(active.lastStart,eventStart);close(active.nextStart!,66);tick(active,50.99);assert.equal(active.count,1);tick(active,.01);assert.equal(active.count,2);checked.push('Interval edit waits for the complete 9 s sequence and does not restart it');
const cancel=create();tick(cancel,8);interval(cancel,120);interval(cancel,26);assert.equal(cancel.pendingInterval,null);checked.push('Returning the slider to its original value cancels a pending interval');
const idle=create();tick(idle,20);const beforeFlow=idle.flowTime;interval(idle,15);close(idle.time,20);close(idle.flowTime,beforeFlow);close(idle.nextStart!,35);tick(idle,15);assert.equal(idle.count,2);checked.push('Editing an idle interval starts a fresh countdown without moving world or flow time');
const stopped=create();tick(stopped,8);automatic(stopped,false);assert(eruptionInProgress(stopped));tick(stopped,1);close(stopped.age,3);assert(eruptionState(stopped.time,stopped.age).strength>0);tick(stopped,200);assert.equal(stopped.count,1);assert.equal(stopped.nextStart,null);assert(!eruptionInProgress(stopped));for(let i=28;i<68;i++)assert.equal(smokeSample(stopped.time,i,stopped.age).opacity,0);checked.push('Automatic off lets an existing eruption finish and creates no later explosions');
const timeBefore=stopped.time,flowBefore=stopped.flowTime;assert(trigger(stopped));close(stopped.time,timeBefore);close(stopped.flowTime,flowBefore);assert(!trigger(stopped));assert.equal(stopped.nextStart,null);tick(stopped,2.3);assert(meteorState(stopped.time,0,stopped.age).impact);for(let i=1;i<3;i++){tick(stopped,.55);assert(meteorState(stopped.time,i,stopped.age).impact);}tick(stopped,6);assert(trigger(stopped));checked.push('Manual explosion works with auto off, blocks reentry, and keeps all 3 meteor impacts synchronized');
const paused=JSON.stringify(stopped);tick(stopped,100,true);assert.equal(JSON.stringify(stopped),paused);checked.push('Pause freezes eruption age, countdown and integrated flow time');
tick(stopped,10);automatic(stopped,true);close(stopped.nextStart!,stopped.time+stopped.interval);checked.push('Re-enabling automatic eruptions starts a full interval');
const flow=create();tick(flow,7);speed(flow,0);close(flow.flowTime,7);tick(flow,4);close(flow.flowTime,7);close(flow.time,11);speed(flow,2);close(flow.flowTime,7);tick(flow,3);close(flow.flowTime,13);close(flow.time,14);checked.push('Flow 0x stops advection only; 2x advances twice as fast without any texture jump');
for(const limit of [15,120]){const c=create();interval(c,limit);for(let i=0;i<3;i++){tick(c,limit);assert.equal(c.count,i+1);close(c.age,0);}assert.equal(c.interval,limit);}checked.push('Minimum 15 s and maximum 120 s intervals repeat without overlapping sequences');
const bounds=create();interval(bounds,-99);assert.equal(bounds.interval,15);interval(bounds,999);assert.equal(bounds.interval,120);speed(bounds,-2);assert.equal(bounds.flowSpeed,0);speed(bounds,9);assert.equal(bounds.flowSpeed,2);checked.push('Numeric input is clamped to supported ranges');
const qa=create();seek(qa,9.8);close(qa.age,3.8);close(qa.flowTime,9.8);close(meteorState(qa.time,0,qa.age).age,1.5);checked.push('Development bookmarks synchronize world, eruption and flow timelines');
const report={result:'PASS',checks:checked,intervalSeconds:{minimum:15,maximum:120,default:26},flowSpeed:{minimum:0,maximum:2,default:1},completeEruptionSequenceSeconds:9,manualTriggerResetsWorld:false};
console.log(JSON.stringify(report,null,2));writeFileSync('verification-environment.json',JSON.stringify(report,null,2));
