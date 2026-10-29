import { random,VOLCANO } from './terrain';
import { eruptionState } from './eruption';

export const SMOKE_COUNT=68;
const ease=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// Absolute-time particles make pause, camera changes and repeated eruptions deterministic.
export function smokeSample(time:number,index:number,eruptionAge?:number,intensity=1){
 const {phase,strength}=eruptionState(time,eruptionAge,intensity);
 if(index<28){
  const rise=((time/7.8+index/28)%1+1)%1,angle=rise*8+index*2.4;
  const radius=(.16+rise*.43)*(.85+random(index+200)*.25);
  return {x:VOLCANO.x+rise*.52+Math.sin(angle)*rise*.21,y:2.46+rise*2.75,z:VOLCANO.z+rise*.16+Math.cos(angle)*rise*.2,
   radius,stretch:.92,opacity:.62*ease(0,.08,rise)*(1-ease(.65,1,rise)),heat:(1-rise)**3*(.18+strength*.82),rotation:angle*.2};
 }
 const i=index-28,age=phase-Math.floor(i/5)*.27;
 const rise=1-Math.exp(-Math.max(0,age)*.78),angle=i*2.399+age*.13;
 const spread=rise*(.35+random(i+410)*1.08);
 return {x:VOLCANO.x+rise*.48+Math.cos(angle)*spread,y:2.48+(rise*3.05+(random(i+311)-.5)*rise*.54)*(.5+.5*intensity),
  z:VOLCANO.z+rise*.15+Math.sin(angle)*spread*.76,radius:(.13+rise*(.44+random(i+222)*.16))*(.8+.2*intensity),stretch:1-.22*rise,
  opacity:Math.min(.9,(.42+.27*rise)*(.7+.3*intensity))*ease(0,.28,age)*(1-ease(3.7,6.8,age)),heat:Math.exp(-Math.max(0,age)*1.4)*strength,rotation:angle*.3};
}
