import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { creaturePath,creatureSpecs,treeSites,rockSites,bushSites,carcass } from '../src/world/paths';
import { groundHeight,landmarks,rawHeight,VOLCANO } from '../src/world/terrain';
import { eruptionState,ERUPTION_PERIOD,EJECTA_COUNT,ejectaSample } from '../src/world/eruption';
const obstacles=[...treeSites.map(p=>({...p,r:p.s*.5})),...rockSites,...bushSites.map(p=>({...p,r:p.s})),carcass,...landmarks.map(p=>({...p,r:p.r*1.55,h:p.h+.42}))];
let walls=Infinity,props=Infinity,lanes=Infinity,flight=Infinity,body=Infinity,feet=Infinity,sole=0,ejectaWall=Infinity;
const samples=1440,rex=[],tri=[];
for(let i=0;i<samples;i++){
 const a=creaturePath('rex',i/samples*Math.PI*2/.16),b=creaturePath('triceratops',i/samples*Math.PI*2/.13);rex.push(a);tri.push(b);
 for(const [species,p] of [['rex',a],['triceratops',b]] as const){
 const {radius:r,scale:s}=creatureSpecs[species];walls=Math.min(walls,6-Math.abs(p.x)-r,3-Math.abs(p.z)-r);
 for(const o of obstacles)props=Math.min(props,Math.hypot(p.x-o.x,p.z-o.z)-r-o.r);
 // Conservative rectangular torso footprint, transformed into the actual heading.
 for(const lx of [-.34,0,.34])for(const lz of [-.46,0,.46]){
  const x=p.x+(lx*Math.cos(p.heading)+lz*Math.sin(p.heading))*s,z=p.z+(-lx*Math.sin(p.heading)+lz*Math.cos(p.heading))*s;
  body=Math.min(body,p.y+(species==='rex'?.56:.38)*s-groundHeight(x,z));
 }
 // Sample the full soles and all gait phases, not only foot centers.
 for(const side of [-1,1])for(const z0 of species==='rex'?[-.08]:[-.34,.27])for(const gait of [-.08,0,.08]){
  const lx=side*(species==='rex'?.29:.32),lz=z0+gait;
  const x=p.x+(lx*Math.cos(p.heading)+lz*Math.sin(p.heading))*s,z=p.z+(-lx*Math.sin(p.heading)+lz*Math.cos(p.heading))*s,ground=groundHeight(x,z);
  feet=Math.min(feet,ground-.116);
  for(const dx of [-.095,.095])for(const dz of [-.13,.27]){
   const xx=x+(dx*Math.cos(p.heading)+dz*Math.sin(p.heading))*s,zz=z+(-dx*Math.sin(p.heading)+dz*Math.cos(p.heading))*s;
   sole=Math.max(sole,Math.abs(groundHeight(xx,zz)-ground));
  }
 }
 }
 const f=creaturePath('pterosaur',i/samples*Math.PI*2/.13),fr=creatureSpecs.pterosaur.radius;
 walls=Math.min(walls,6-Math.abs(f.x)-fr,3-Math.abs(f.z)-fr);
 for(let dx=-fr;dx<=fr;dx+=.13)for(let dz=-fr;dz<=fr;dz+=.13)if(dx*dx+dz*dz<=fr*fr)flight=Math.min(flight,f.y-.35-groundHeight(f.x+dx,f.z+dz));
 for(const o of obstacles){const h='h' in o?o.h:'s' in o?o.s*1.25:.4;if(Math.hypot(f.x-o.x,f.z-o.z)<fr+o.r)flight=Math.min(flight,f.y-.35-groundHeight(o.x,o.z)-h);}
}
for(const a of rex)for(const b of tri)lanes=Math.min(lanes,Math.hypot(a.x-b.x,a.z-b.z)-creatureSpecs.rex.radius-creatureSpecs.triceratops.radius);
for(const o of obstacles)walls=Math.min(walls,6-Math.abs(o.x)-o.r,3-Math.abs(o.z)-o.r);
for(let phase=0;phase<6;phase+=.01)for(let i=0;i<EJECTA_COUNT;i++){
 const p=ejectaSample(phase,i);
 if(p.visible)ejectaWall=Math.min(ejectaWall,6-Math.abs(p.x)-p.radius,3-Math.abs(p.z)-p.radius);
}
let oldArea=0,newArea=0;
for(let x=-5.85;x<5.85;x+=.03)for(let z=-2.85;z<2.85;z+=.03){
 const a=Math.atan2(z/2.64,(x+2.6)/3.05),d=Math.hypot((x+2.6)/3.05,z/2.64)+.035*Math.sin(a*7)+.02*Math.sin(a*13);
 const vr=Math.hypot(x-VOLCANO.x,z-VOLCANO.z),va=Math.atan2(z-VOLCANO.z,x-VOLCANO.x),rr=vr*(1+.085*Math.sin(va*7)+.04*Math.cos(va*11));
 let oldHeight=d<.82?.38:Math.max(-.74,.38-(d-.82)*4.4);
 if(rr<1.42)oldHeight=Math.max(oldHeight,rr<.36?2.15+rr*.8:.4+2.3*Math.pow(Math.max(0,1-(rr-.36)/1.06),1.22));
 if(oldHeight>.116)oldArea+=.0009;
 if(rawHeight(x,z)>.116)newArea+=.0009;
}
for(let t=0;t<ERUPTION_PERIOD;t+=.1){const a=eruptionState(t),b=eruptionState(t+ERUPTION_PERIOD);assert(Math.abs(a.strength-b.strength)<1e-8,'Eruption clock repeat mismatch');}
assert(eruptionState(0).strength===0);assert(eruptionState(8).strength>.8);
const r=(n:number)=>Number(n.toFixed(5));
const report={samplesPerPath:samples,independentLanePairs:samples*samples,unit:'scene units',minimumWallClearance:r(walls),minimumStaticObstacleClearance:r(props),minimumIndependentLaneClearance:r(lanes),minimumAirborneTerrainAndPropClearance:r(flight),minimumBodyTerrainClearance:r(body),minimumFootHeightAboveLava:r(feet),maximumSoleTerrainError:r(sole),minimumEjectaWallClearance:r(ejectaWall),landAreaIncreasePercent:r((newArea/oldArea-1)*100),eruptionPeriodSeconds:ERUPTION_PERIOD,eruptionFirstStartSeconds:6,scaleIncrease:{rex:'50%',triceratops:'50%',pterosaur:'38.46%'},footPlacement:'Every sole stays on the flat walking shelf; each foot follows the exact rendered triangle height.',blockDimensions:[12,6],result:[walls,props,lanes,flight,body,feet,ejectaWall].every(n=>n>0)&&sole<.001?'PASS':'FAIL'};
console.log(JSON.stringify(report,null,2));writeFileSync('verification.json',JSON.stringify(report,null,2));
assert(walls>0,'Wall intersection');assert(props>0,'Obstacle intersection');assert(lanes>0,'Creature lane intersection');assert(flight>0,'Flight intersection');assert(body>0,'Body-terrain intersection');assert(feet>0,'Foot enters lava');assert(sole<.001,'Sole floats or sinks on a slope');assert(ejectaWall>0,'Ejecta leaves block footprint');
