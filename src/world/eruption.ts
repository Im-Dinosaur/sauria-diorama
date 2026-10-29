import { groundHeight,random,VOLCANO } from './terrain';
// A deterministic clock keeps eruptions, ejecta and meteors synchronized when paused.
export const ERUPTION_PERIOD=26;
export const EJECTA_COUNT=120;
export function eruptionState(time:number,age?:number,intensity=1){
 const phase=age??((time-6)%ERUPTION_PERIOD+ERUPTION_PERIOD)%ERUPTION_PERIOD;
 const strength=phase<3.4?Math.sin(Math.PI*phase/3.4)**.7:0;
 const pulse=phase<3.4?strength*(.78+.22*Math.sin(phase*10)**2):0;
 const flash=phase<.6?Math.sin(Math.PI*phase/.6)**2:0;
 return {phase,strength:strength*intensity,pulse:pulse*intensity,flash:flash*intensity,active:phase<9};
}

export function ejectaSample(phase:number,index:number,trailDelay=0,intensity=1){
 const burst=Math.floor(index/40),age=phase-(.08+burst*.78+(index%40)*.016)-trailDelay;
 const angle=random(index+6)*Math.PI*2,speed=.48+random(index+15)*.46;
 const vx=.17+Math.cos(angle)*speed,vz=.04+Math.sin(angle)*speed*.66,vy=4.5+random(index+41)*1.15;
 const lift=.5+.5*intensity;
 const x=VOLCANO.x+vx*age,z=VOLCANO.z+vz*age,y=2.46+(vy*age-2.85*age*age)*lift;
 const radius=(index%9===0?.085:.035)+random(index+22)*.035;
 const floor=Math.max(1.9,groundHeight(x,z)+radius+.07);
 const fade=Math.min(1,Math.max(0,(y-floor)/.24));
 return {x,y,z,age,radius,visible:age>0&&age<2.35&&y>floor&&(index%40)<Math.ceil(40*Math.min(1,intensity)),fade,vx,vy:(vy-5.7*age)*lift,vz};
}
