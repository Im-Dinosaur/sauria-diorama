import { ERUPTION_PERIOD } from './eruption';

export const ERUPTION_SEQUENCE_SECONDS=9;
export const ENVIRONMENT_LIMITS={interval:{min:15,max:120,default:ERUPTION_PERIOD},flow:{min:0,max:2,default:1},intensity:{min:.5,max:2,default:1},meteors:{min:0,max:6,default:3},boiling:{min:0,max:3,default:1},sparks:{min:0,max:2,default:1}};
export interface EnvironmentClock {
 time:number;flowTime:number;flowSpeed:number;automatic:boolean;interval:number;pendingInterval:number|null;
 lastStart:number|null;nextStart:number|null;age:number;count:number;
 intensity:number;meteorCount:number;eventIntensity:number;eventMeteorCount:number;
 boilingFrequency:number;sparkStrength:number;
}
export function createEnvironmentClock():EnvironmentClock{return {time:0,flowTime:0,flowSpeed:1,automatic:true,interval:ERUPTION_PERIOD,pendingInterval:null,lastStart:null,nextStart:6,age:12,count:0,intensity:1,meteorCount:3,eventIntensity:1,eventMeteorCount:3,boilingFrequency:1,sparkStrength:1};}
export function setBoilingFrequency(clock:EnvironmentClock,value:number){if(Number.isFinite(value))clock.boilingFrequency=Math.max(0,Math.min(3,value));}
export function setSparkStrength(clock:EnvironmentClock,value:number){if(Number.isFinite(value))clock.sparkStrength=Math.max(0,Math.min(2,value));}
// Capture settings at ignition so an in-flight meteor or plume never pops out mid-event.
function captureEruptionSettings(clock:EnvironmentClock){clock.eventIntensity=clock.intensity;clock.eventMeteorCount=clock.meteorCount;}
export function setEruptionIntensity(clock:EnvironmentClock,value:number){if(Number.isFinite(value))clock.intensity=Math.max(.5,Math.min(2,value));}
export function setMeteorCount(clock:EnvironmentClock,value:number){if(Number.isFinite(value))clock.meteorCount=Math.round(Math.max(0,Math.min(6,value)));}
export function eruptionInProgress(clock:EnvironmentClock){return clock.lastStart!==null&&clock.age<ERUPTION_SEQUENCE_SECONDS;}
function updateAge(clock:EnvironmentClock){clock.age=clock.lastStart===null?12:Math.min(12,Math.max(0,clock.time-clock.lastStart));}
function applyPending(clock:EnvironmentClock){
 if(clock.pendingInterval===null)return;
 clock.interval=clock.pendingInterval;clock.pendingInterval=null;
 clock.nextStart=clock.automatic?(clock.lastStart??clock.time)+clock.interval:null;
}
export function setEruptionInterval(clock:EnvironmentClock,value:number){
 if(!Number.isFinite(value))return;
 const interval=Math.round(Math.max(15,Math.min(120,value)));
 if(interval===(clock.pendingInterval??clock.interval))return;
 if(eruptionInProgress(clock)){clock.pendingInterval=interval===clock.interval?null:interval;return;}
 clock.interval=interval;clock.pendingInterval=null;
 // While idle, a changed interval starts a fresh, visible countdown.
 clock.nextStart=clock.automatic?clock.time+interval:null;
}
export function setAutomaticEruptions(clock:EnvironmentClock,enabled:boolean){
 if(clock.automatic===enabled)return;clock.automatic=enabled;
 clock.nextStart=enabled?(eruptionInProgress(clock)?clock.lastStart!+clock.interval:clock.time+clock.interval):null;
}
export function setLavaFlowSpeed(clock:EnvironmentClock,value:number){if(Number.isFinite(value))clock.flowSpeed=Math.max(0,Math.min(2,value));}
export function triggerEruption(clock:EnvironmentClock){
 if(eruptionInProgress(clock))return false;
 applyPending(clock);clock.lastStart=clock.time;clock.age=0;clock.count++;
 captureEruptionSettings(clock);
 clock.nextStart=clock.automatic?clock.time+clock.interval:null;return true;
}
export function advanceEnvironmentClock(clock:EnvironmentClock,delta:number,paused=false){
 if(paused||!Number.isFinite(delta)||delta<=0)return;
 clock.time+=delta;clock.flowTime+=delta*clock.flowSpeed;updateAge(clock);
 if(!eruptionInProgress(clock))applyPending(clock);
 while(clock.automatic&&clock.nextStart!==null&&clock.time>=clock.nextStart){
  clock.lastStart=clock.nextStart;clock.count++;clock.nextStart=clock.lastStart+clock.interval;
  captureEruptionSettings(clock);
 }
 updateAge(clock);
}
// Development timeline bookmarks also seek the independent effect clocks.
export function seekEnvironmentClock(clock:EnvironmentClock,time:number){
 clock.time=Math.max(0,time);clock.flowTime=clock.time*clock.flowSpeed;clock.pendingInterval=null;
 captureEruptionSettings(clock);
 clock.lastStart=clock.time<6?null:6+Math.floor((clock.time-6)/clock.interval)*clock.interval;
 clock.count=clock.lastStart===null?0:1+Math.floor((clock.time-6)/clock.interval);
 clock.nextStart=clock.automatic?(clock.lastStart===null?6:clock.lastStart+clock.interval):null;updateAge(clock);
}
