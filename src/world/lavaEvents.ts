import { LAVA_LEVEL } from './lavaFlows';
import { random } from './terrain';
import { seaClearance } from './meteorImpacts';
export const BOILING_COUNT=7;
// Reserve room for the largest ripple, its jitter, and all airborne droplets.
const boilingCandidates=Array.from({length:55*25},(_,i)=>({x:-5.4+(i%55)*.2,z:-2.4+Math.floor(i/55)*.2})).filter(p=>seaClearance(p.x,p.z,.57)>.04);
export function boilingSite(index:number,cycle:number,seed=0){
 const key=seed+index*197+cycle*977,half=Math.floor(boilingCandidates.length/2),offset=cycle%2===0?0:half;
 // Alternate disjoint candidate sets so successive events cannot reuse a location.
 const choice=offset+Math.floor(random(key)*(offset===0?half:boilingCandidates.length-half));
 const p=boilingCandidates[choice];
 const site={x:p.x+(random(key+31)-.5)*.04,z:p.z+(random(key+57)-.5)*.04,r:.18+random(key+91)*.08};
 return {site,cycle,key};
}
// Retained deterministic timeline sampler also exercises candidate selection in clearance checks.
export function boilState(index:number,time:number,seed=0){
 const period=4.6+(index%3)*.7,elapsed=Math.max(0,time)+index*1.137,cycle=Math.floor(elapsed/period),phase=(elapsed-cycle*period)/period;
 return {...boilingSite(index,cycle,seed),phase,bulge:phase<.64?Math.sin(phase/.64*Math.PI/2):0,burstAge:(phase-.64)*period};
}
export function boilSpark(index:number,particle:number,state:{key:number;site:{x:number;z:number};burstAge:number},strength=1){
 const key=state.key+index*13+particle,angle=particle*2.399+random(key),age=state.burstAge-particle*.007;
 const up=(1.3+random(key+71)*.8)*Math.sqrt(strength),flight=up/3.2;
 // Stronger jets rise higher while their entire stretched droplet stays inside the reserved sea disk.
 const speed=Math.min((.22+random(key+49)*.22)*(.5+.5*strength),.34/Math.max(.01,flight));
 const y=LAVA_LEVEL+.025+up*age-3.2*age*age,life=Math.max(0,Math.min(1,age/Math.max(.01,flight)));
 const fade=Math.min(1,Math.max(0,age/.035))*Math.min(1,Math.max(0,(1-life)/.18));
 return {x:state.site.x+Math.cos(angle)*speed*age,y,z:state.site.z+Math.sin(angle)*speed*age,age,life,angle,vx:Math.cos(angle)*speed,vy:up-6.4*age,vz:Math.sin(angle)*speed,
  radius:(.022+random(key+27)*.023)*(.7+.3*strength)*Math.sqrt(fade),stretch:1+Math.min(.8,Math.abs(up-6.4*age)*.2),visible:strength>0&&particle<Math.round(12*strength)&&age>0&&age<flight&&y>LAVA_LEVEL+.015};
}
export const surfacingSites=[{x:2.6,z:.6,heading:-.7},{x:4.7,z:-1.4,heading:-1.05}];
export const SURFACING_RADIUS=.96;
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function surfacingState(time:number){
 const elapsed=time-12,cycle=Math.floor(Math.max(0,elapsed)/22),age=elapsed<0?-1:elapsed%22,site=surfacingSites[cycle%surfacingSites.length];
 const visible=age>=0&&age<6.8;
 const rise=smooth(age/1.1),sink=smooth((age-4.7)/2.1),lift=rise*(1-sink);
 return {visible,age,site:cycle%2,x:site.x+.055*Math.sin(age*2.4),z:site.z+.035*Math.sin(age*2),y:-1.22+lift*.99+lift*.06*Math.sin(age*6),heading:site.heading+.15*Math.sin(age*2.2),roll:lift*.13*Math.sin(age*5.2),pitch:lift*.10*Math.sin(age*3.4),surface:LAVA_LEVEL};
}
