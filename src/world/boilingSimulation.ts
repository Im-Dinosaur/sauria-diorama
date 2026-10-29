import { boilingSite } from './lavaEvents';
import { random } from './terrain';

export const BOILING_POOL_SIZE=24;
export const BOILING_SPARKS=24;
export const BOILING_RATE=1.32;
export const BOILING_LIFETIME=3;
export interface BoilingEvent extends ReturnType<typeof boilingSite>{id:number;start:number;grow:number;strength:number;}
export interface BoilingSimulation {time:number;credit:number;count:number;seed:number;events:(BoilingEvent|null)[];}
export function createBoilingSimulation(seed:number):BoilingSimulation{return {time:0,credit:0,count:0,seed,events:Array(BOILING_POOL_SIZE).fill(null)};}

// Frequency changes only emission rate. Existing bubbles and droplets retain real-time motion.
export function advanceBoiling(state:BoilingSimulation,delta:number,frequency:number,strength:number,paused=false){
 if(paused||!Number.isFinite(delta)||delta<=0)return;
 state.time+=delta;
 for(let i=0;i<state.events.length;i++)if(state.events[i]&&state.time-state.events[i]!.start>=BOILING_LIFETIME)state.events[i]=null;
 const rate=BOILING_RATE*Math.max(0,Math.min(3,frequency));
 if(rate===0)return;
 state.credit+=delta*rate;
 while(state.credit>=1){
  state.credit--;const id=state.count++,start=state.time-state.credit/rate;
  if(state.time-start>=BOILING_LIFETIME)continue;
  const slot=state.events.findIndex(event=>event===null);
  if(slot<0)throw new Error('Boiling pool capacity exceeded');
  const site=boilingSite(id%7,Math.floor(id/7),state.seed);
  state.events[slot]={...site,id,start,grow:1.1+random(site.key+120)*.5,strength:Math.max(0,Math.min(2,strength))};
 }
}

export function boilingEventState(event:BoilingEvent,time:number){
 const age=time-event.start,burstAge=age-event.grow,pressure=Math.max(0,Math.min(1,age/event.grow));
 const bulge=age>=0&&burstAge<0?Math.sin(pressure*Math.PI/2)*(.96+.04*Math.sin(age*12+event.key)):0;
 const crown=burstAge>=0&&burstAge<.46?Math.sin(Math.PI*burstAge/.46)**.7:0;
 return {...event,age,burstAge,pressure,bulge,crown};
}
