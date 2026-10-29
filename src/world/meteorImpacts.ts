import { eruptionState } from './eruption';
import { groundHeight,landmarks,random } from './terrain';
import { LAVA_LEVEL } from './lavaFlows';

export const METEOR_TARGETS=[{x:2.2,z:.7},{x:3.6,z:.2},{x:4.8,z:-.8},{x:2.9,z:.55},{x:4.5,z:-1.75},{x:5.15,z:-.35}];
export const IMPACT_DURATION=2.65;
export const SPLASH_COUNT=56;
export const WAVE_SEGMENTS=72;
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};

export function meteorState(time:number,index:number,eruptionAge?:number,count=METEOR_TARGETS.length){
 const {phase}=eruptionState(time,eruptionAge),fallAge=phase-1.1-index*.55,fall=fallAge/1.2,age=fallAge-1.2;
 const target=METEOR_TARGETS[index];
 return {target,fall,age,falling:index<count&&fall>=0&&fall<1,impact:index<count&&age>=0&&age<IMPACT_DURATION,
  x:target.x-(1-fall)*.9,y:LAVA_LEVEL+.14+(1-fall)*5.8,z:target.z-(1-fall)*.35,
  flash:age>=0&&age<.28?Math.sin(Math.PI*age/.28)**.65:0,
  crownHeight:age>0&&age<1.05?1.6*Math.sin(Math.PI*age/1.05)**.85:0,
  crownRadius:.25+.48*smooth(age/.48),
  rebound:age>.33&&age<1.2?Math.sin(Math.PI*(age-.33)/.87)**1.2:0,
  fade:1-smooth((age-1.45)/1.2)};
}

// Reserve the entire particle radius, including the sea stacks and sloping coast.
export function seaClearance(x:number,z:number,radius=0){
 let clearance=Math.min(5.98-Math.abs(x)-radius,2.98-Math.abs(z)-radius);
 for(const rock of landmarks)clearance=Math.min(clearance,Math.hypot(x-rock.x,z-rock.z)-rock.r*1.55-radius);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;clearance=Math.min(clearance,LAVA_LEVEL-.025-groundHeight(x+Math.cos(a)*radius,z+Math.sin(a)*radius));}
 return clearance;
}
export function seaRayLimit(index:number,angle:number,radius=.12){
 const p=METEOR_TARGETS[index];let limit=0;
 for(let d=.02;d<=2.25;d+=.02){if(seaClearance(p.x+Math.cos(angle)*d,p.z+Math.sin(angle)*d,radius)<=0)break;limit=d;}
 return Math.max(0,limit-.025);
}
export const waveLimits=METEOR_TARGETS.map((_,index)=>Array.from({length:WAVE_SEGMENTS+1},(_,j)=>seaRayLimit(index,j/WAVE_SEGMENTS*Math.PI*2,.045)));
export const splashSeeds=METEOR_TARGETS.map((_,index)=>Array.from({length:SPLASH_COUNT},(_,j)=>{
 const seed=index*100+j,angle=j*2.399+index*.7,radius=.025+random(seed+87)*.055;
 const up=3.2+random(seed+33)*2.15,flight=up/3.65;
 const start=.16,range=seaRayLimit(index,angle,radius*1.55);
 return {angle,radius,up,start,delay:random(seed+6)*.14,speed:Math.max(0,Math.min(.65+random(seed+45)*.72,(range-start)/flight))};
}));
export function splashSample(index:number,particle:number,age:number){
 const p=METEOR_TARGETS[index],s=splashSeeds[index][particle],t=age-s.delay;
 const r=s.start+Math.max(0,t)*s.speed,y=LAVA_LEVEL+.035+s.up*t-3.65*t*t;
 const fade=clamp((y-LAVA_LEVEL)/.13);
 return {x:p.x+Math.cos(s.angle)*r,y,z:p.z+Math.sin(s.angle)*r,radius:s.radius,stretch:1.15+Math.min(.4,Math.abs(s.up-7.3*t)*.07),
  visible:t>0&&t<s.up/3.65&&y>LAVA_LEVEL,fade,age:t,angle:s.angle};
}
export function waveSample(age:number,ring:number){
 const t=age-ring*.23;
 return {radius:.28+Math.max(0,t)*1.06,width:.075+Math.max(0,t)*.025,opacity:t>=0&&t<2.3?(.72-ring*.15)*(1-smooth(t/2.3)):0};
}
