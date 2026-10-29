import { habitatGround,noise,forest } from './habitat';
import { animalWalkable as walkable,hydrationSitesFor } from './dinosaurResources';
import { SPECIES_PROFILES } from './dinosaurProfiles';
import type { DinosaurAction } from '../models/SkinnedDinosaurs';
import { DIORAMA } from './layout';
import type { WorldMode } from './layout';
import type { Species } from './paths';
import { speciesSizeFactor } from './physicalScale';
import { navigationNodes,planNavigationRoute } from './navigation';
import { advanceLocomotion,createLocomotion,motionState,navigationRadius,startRoute,stopMotion,trafficSnapshot } from './locomotion';
import type { LocomotionState } from './locomotion';
export type Behavior='wander'|'drink'|'escape'|'patrol'|'fly'|'glide'|'graze'|'browse'|'rest'|'alert'|'hunt'|'fish'|'display'|'roar';
export interface Inhabitant {id:string;species:Species;mechanical:boolean;scale:number;organicScale:number;radius:number;speed:number;homeX:number;homeZ:number;herd?:string;altitude?:number;}
export interface Actor extends Inhabitant {x:number;y:number;z:number;heading:number;age:number;behavior:Behavior;actionTime:number;drink:number;thirst:number;route:{x:number;z:number}[];waypoint:number;target?:{x:number;z:number;lookX:number;lookZ:number;purpose?:'drink'|'fish'|'browse'|'hunt'};blocked:number;distance:number;serial:number;hunger:number;energy:number;decisionIn:number;holdFor:number;gaitTime:number;moving:boolean;threatId?:string;navigation:LocomotionState;}
export interface Ecosystem {mode:WorldMode;time:number;paused:boolean;actors:Actor[];}
export const SPECIES_LABELS:Record<Species,string>={rex:'티라노사우루스',triceratops:'트리케라톱스',pterosaur:'프테라노돈 (익룡)',stegosaurus:'스테고사우루스',brachiosaurus:'브라키오사우루스',velociraptor:'벨로시랩터',spinosaurus:'스피노사우루스'};
const homes:[Species,number,number,number,number,boolean,string?][]=[
 ['rex',-11.5,3.2,.72,1.15,false],['triceratops',-7.3,-3.6,.67,1.0,false],
 ['rex',-4.0,-4.2,.72,1.08,false],['rex',11.4,-2.6,.62,.94,false],
 ['brachiosaurus',-1.2,-5.1,.80,1.50,false,'sauropods'],['brachiosaurus',1.8,-5.2,.62,1.17,false,'sauropods'],['brachiosaurus',4.5,-5.3,.48,.91,false,'sauropods'],
 ['brachiosaurus',-2.0,5.4,.71,1.34,false,'southern-sauropods'],['brachiosaurus',.9,5.6,.44,.84,false,'southern-sauropods'],
 ['stegosaurus',-8,5.3,.78,1.21,false],['stegosaurus',-4.5,5.3,.65,1.01,false],['stegosaurus',8,-4.6,.73,1.14,false],['stegosaurus',13.4,1.0,.64,1.0,false],
 ['triceratops',8,5.1,.63,.94,false,'ceratopsians'],['triceratops',10.1,5.3,.52,.78,false,'ceratopsians'],['triceratops',11.8,6.1,.44,.66,false,'ceratopsians'],
 ['triceratops',5.5,3.8,.57,.85,false,'ceratopsians'],['triceratops',-9.3,-3.4,.46,.69,false,'northern-ceratopsians'],['triceratops',-11,-1.4,.42,.63,false,'northern-ceratopsians'],['triceratops',-6.2,-5.8,.45,.68,false,'northern-ceratopsians'],
 ['velociraptor',-15,1.5,.61,.75,false],['velociraptor',-3,-2.3,.55,.68,false],['velociraptor',8.2,-1.8,.59,.73,false],['velociraptor',14,-3.7,.51,.63,false],
 ['spinosaurus',-5.6,-1.6,.64,1.5,false],['spinosaurus',9.8,3.2,.59,1.39,false],
];
export const inhabitants:Inhabitant[]=homes.map(([species,x,z,scale,radius,mechanical,herd],i)=>({id:`${mechanical?'machine':'living'}-${species}-${i}`,species,mechanical,scale,organicScale:mechanical?(species==='rex'?.66:.64):scale,radius:mechanical?(species==='rex'?1.04:.98):radius,speed:species==='velociraptor'?.48:species==='rex'?.31:species==='brachiosaurus'?.21:.27,homeX:x,homeZ:z,herd}));
for(const animal of inhabitants){const factor=speciesSizeFactor(animal.species);animal.scale*=factor;animal.organicScale*=factor;animal.radius*=factor;}
for(let i=0;i<6;i++)inhabitants.push({id:`living-pterosaur-${i}`,species:'pterosaur',mechanical:false,scale:i===0?.84:.52+(i%3)*.10,organicScale:i===0?.84:.52+(i%3)*.10,radius:i===0?1.61:1.8*(.52+(i%3)*.1),speed:.65,homeX:-12+i*4.7,homeZ:i%2?2:-2,altitude:4.5+(i%3)*1.05});

export const planRoute=planNavigationRoute;
function safeHome(def:Inhabitant,others:Actor[]){
 let best={x:def.homeX,z:def.homeZ},score=Infinity;
 for(const p of navigationNodes(navigationRadius(def))){if(others.some(q=>q.altitude===undefined&&Math.hypot(p.x-q.x,p.z-q.z)<def.radius+q.radius+.12))continue;const d=Math.hypot(p.x-def.homeX,p.z-def.homeZ);if(d<score){score=d;best=p;}}
 if(!Number.isFinite(score))throw new Error(`No reachable spawn for ${def.id}`);
 return best;
}
export function createEcosystem(mode:WorldMode='peaceful'):Ecosystem{
 const actors:Actor[]=[];
 inhabitants.forEach((def,i)=>{const p=def.altitude===undefined?safeHome(def,actors):{x:def.homeX,z:def.homeZ};actors.push({...def,x:p.x,z:p.z,y:def.altitude??habitatGround(p.x,p.z),heading:noise(i+5)*Math.PI*2,age:noise(i+8)*7,behavior:def.altitude===undefined?'wander':'fly',actionTime:0,drink:0,thirst:i%4===0?70:noise(i+16)*35,route:[],waypoint:0,blocked:0,distance:0,serial:0,hunger:32+noise(i+88)*40,energy:.45+noise(i+99)*.5,decisionIn:noise(i+71),holdFor:0,gaitTime:0,moving:false,navigation:createLocomotion()});});
 return {mode,time:0,paused:false,actors};
}
export function setWorldMode(world:Ecosystem,mode:WorldMode){
 if(world.mode===mode)return;world.mode=mode;
 for(const a of world.actors){if(a.mechanical)continue;startRoute(a,[]);stopMotion(a);a.target=undefined;a.drink=0;a.actionTime=0;a.holdFor=0;a.threatId=undefined;a.behavior=a.altitude!==undefined?'fly':mode==='peaceful'?'wander':'escape';}
}
export function desiredSpeed(a:Inhabitant,mode:WorldMode){return a.speed*(mode==='peaceful'||a.mechanical?1:2.8);}
const stationary=new Set<Behavior>(['graze','browse','rest','alert','hunt','fish','display','roar']);
function hold(a:Actor,behavior:Behavior,seconds:number){a.behavior=behavior;a.holdFor=seconds;a.actionTime=0;startRoute(a,[]);stopMotion(a);}
function approach(world:Ecosystem,a:Actor,x:number,z:number,lookX:number,lookZ:number,purpose:'browse'|'hunt'){
 if(!walkable(x,z,a.radius*.58)||world.actors.some(b=>b!==a&&b.altitude===undefined&&Math.hypot(x-b.x,z-b.z)<(a.radius+b.radius)*.75))return false;
 const route=planRoute(a.x,a.z,x,z,navigationRadius(a),{exactGoal:true});if(!route.length)return false;
 startRoute(a,route);a.target={x,z,lookX,lookZ,purpose};a.behavior='wander';return true;
}
function pickTask(world:Ecosystem,a:Actor,index:number){
 a.serial++;const peaceful=world.mode==='peaceful';a.target=undefined;
 if(peaceful&&(a.thirst>42||(a.species==='spinosaurus'&&a.hunger>42))){
  const spots=hydrationSitesFor(a).map(p=>({...p,d:Math.hypot(a.x-p.x,a.z-p.z)})).sort((p,q)=>p.d-q.d);
  for(const p of spots){if(!walkable(p.x,p.z,a.radius*.58)||world.actors.some(b=>b!==a&&b.target&&Math.hypot(b.target.x-p.x,b.target.z-p.z)<a.radius+b.radius+.3))continue;
   const path=planRoute(a.x,a.z,p.x,p.z,navigationRadius(a),{exactGoal:true});if(!path.length)continue;
   const last=path[path.length-1];if(Math.hypot(last.x-p.x,last.z-p.z)>.8)continue;
   startRoute(a,path);a.target={...p,purpose:a.species==='spinosaurus'&&a.hunger>42&&a.thirst<65?'fish':'drink'};a.behavior='wander';return;
  }
 }
 if(peaceful&&a.energy<.30){hold(a,'rest',9+noise(index+a.serial)*7);return;}
 if(peaceful&&a.hunger>45){
  const food=SPECIES_PROFILES[a.species].food;
  if(food==='graze'){hold(a,'graze',6+noise(index+a.serial)*4);return;}
  if(food==='browse'){
   const candidates=forest.map(p=>({...p,d:Math.hypot(a.x-p.x,a.z-p.z)})).sort((p,q)=>p.d-q.d).slice(0,20);
   for(const p of candidates)for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const gap=a.radius*.58+.32;if(approach(world,a,p.x+Math.cos(angle)*gap,p.z+Math.sin(angle)*gap,p.x,p.z,'browse'))return;}
  }
  if(food==='hunt'){
   // Independent search/approach. No coordinated pack state or population-removing kill.
   const prey=world.actors.filter(b=>b!==a&&b.altitude===undefined&&SPECIES_PROFILES[b.species].diet==='초식'&&b.scale<a.scale*1.05).sort((b,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(a.x-c.x,a.z-c.z))[0];
   if(prey){const dx=a.x-prey.x,dz=a.z-prey.z,l=Math.hypot(dx,dz)||1,gap=(a.radius+prey.radius)*.85+.7;if(approach(world,a,prey.x+dx/l*gap,prey.z+dz/l*gap,prey.x,prey.z,'hunt'))return;}
   hold(a,'hunt',4);return;
  }
 }
 if(peaceful&&noise(index*37+a.serial*53)<.20){hold(a,noise(a.serial+index)>.35?'alert':'roar',3.2);return;}
 a.behavior=peaceful?'wander':a.mechanical?'patrol':'escape';
 for(let trial=0;trial<10;trial++){
  const key=index*791+a.serial*131+trial*37,range=peaceful?3.2:5.4;
  const herd=a.herd?world.actors.filter(b=>b.herd===a.herd&&b!==a):[],center=herd.length?{x:herd.reduce((n,b)=>n+b.x,0)/herd.length,z:herd.reduce((n,b)=>n+b.z,0)/herd.length}:{x:a.homeX,z:a.homeZ};
  const origin=trial<4?{x:a.x*.65+center.x*.35,z:a.z*.65+center.z*.35}:{x:a.x,z:a.z};
  const gx=origin.x+(noise(key)-.5)*range*2,gz=origin.z+(noise(key+11)-.5)*range*1.3;
  const route=planRoute(a.x,a.z,gx,gz,a.radius*.58);
  if(route.length&&Math.hypot(route[route.length-1].x-a.x,route[route.length-1].z-a.z)>.7){startRoute(a,route);return;}
 }
 a.route=[];a.actionTime=-1;
}
export function advanceEcosystem(world:Ecosystem,delta:number){
 if(world.paused||!Number.isFinite(delta)||delta<=0)return;const dt=Math.min(delta,.05);world.time+=dt;const traffic=trafficSnapshot(world);
 world.actors.forEach((a,index)=>{
  const speed=desiredSpeed(a,world.mode);a.age+=dt;a.actionTime+=dt;a.thirst+=dt;a.hunger=Math.min(100,a.hunger+dt*.48);a.energy=Math.max(0,a.energy-dt*(a.moving?.004:.001));a.decisionIn-=dt;
  if(a.altitude!==undefined){const t=world.time*(a.mechanical?.10:.10*(world.mode==='peaceful'?1:2.8))+index*1.7,rx=2.0+(index%2)*.5,rz=1.05;
   const x=a.homeX+Math.cos(t)*rx,z=a.homeZ+Math.sin(t)*rz;a.distance+=Math.hypot(x-a.x,z-a.z);a.x=x;a.z=z;a.y=a.altitude+Math.sin(t*2)*.14;a.heading=Math.atan2(-rx*Math.sin(t),rz*Math.cos(t));a.behavior=world.mode==='peaceful'&&(world.time+index*3)%16>4?'glide':'fly';a.moving=true;return;}
  if(world.time<motionState(a).waitUntil){stopMotion(a);return;}
  if(world.mode==='peaceful'&&a.decisionIn<=0){
   a.decisionIn=.7+noise(index+a.serial)*.4;
   const threat=world.actors.find(b=>b.species==='rex'&&b!==a&&a.species!=='rex'&&a.species!=='spinosaurus'&&Math.hypot(a.x-b.x,a.z-b.z)<2.6+a.radius*.4);
   if(threat&&a.behavior!=='display'&&a.behavior!=='escape'&&a.behavior!=='drink'){
    a.target=undefined;a.threatId=threat.id;
    if((a.species==='triceratops'&&a.scale>.55)||a.species==='stegosaurus'){hold(a,'display',3.5);a.heading=Math.atan2(threat.x-a.x,threat.z-a.z)+(a.species==='stegosaurus'?Math.PI:0);}
    else {const dx=a.x-threat.x,dz=a.z-threat.z,l=Math.hypot(dx,dz)||1;for(const distance of [3,2,1]){const route=planRoute(a.x,a.z,a.x+dx/l*distance,a.z+dz/l*distance,navigationRadius(a));if(route.length){startRoute(a,route);a.behavior='escape';a.actionTime=0;a.holdFor=0;break;}}}
   }
  }
  if(stationary.has(a.behavior)){
   stopMotion(a);
   if(a.behavior==='rest')a.energy=Math.min(1,a.energy+dt*.06);
   if(a.behavior==='graze'||a.behavior==='browse'||a.behavior==='fish')a.hunger=Math.max(0,a.hunger-dt*6);
   if(a.behavior==='hunt')a.hunger=Math.max(0,a.hunger-dt*3); // Abstract search satisfaction, not an observed kill.
   if(a.actionTime<a.holdFor)return;a.target=undefined;a.threatId=undefined;a.behavior='wander';a.actionTime=2;
  }
  if(a.behavior==='drink'){
   stopMotion(a);
   a.drink=Math.min(1,a.actionTime/1.1,(7-a.actionTime)/1.1);a.drink=Math.max(0,a.drink);
   if(a.actionTime<7)return;a.thirst=0;a.drink=0;a.target=undefined;a.route=[];a.behavior='wander';a.actionTime=2;
  }
  while(a.waypoint<a.route.length){
   const finalBank=a.waypoint===a.route.length-1&&(a.target?.purpose==='drink'||a.target?.purpose==='fish'),tolerance=finalBank?.006:.045;
   if(Math.hypot(a.route[a.waypoint].x-a.x,a.route[a.waypoint].z-a.z)>=tolerance)break;a.waypoint++;
  }
  if(a.waypoint>=a.route.length){
   if(a.target&&world.mode==='peaceful'){
    const target=a.target;stopMotion(a);a.heading=Math.atan2(target.lookX-a.x,target.lookZ-a.z);
    if(target.purpose&&target.purpose!=='drink'){hold(a,target.purpose,target.purpose==='browse'?8:target.purpose==='fish'?8:4);a.target=target;}
    else {a.behavior='drink';a.actionTime=0;}return;
   }
   if(a.actionTime<1.1){stopMotion(a);return;}pickTask(world,a,index);a.actionTime=0;if(!a.route.length){stopMotion(a);return;}
  }
  advanceLocomotion(world,a,dt,speed,traffic);
 });
}
export function ecosystemSummary(world:Ecosystem){
 const living=world.mode==='peaceful'?world.actors.length:world.actors.filter(a=>!a.mechanical).length;
 return {mode:world.mode,time:world.time,total:world.actors.length,organic:living,mechanical:world.actors.length-living,drinking:world.actors.filter(a=>a.behavior==='drink').length,feeding:world.actors.filter(a=>['graze','browse','fish'].includes(a.behavior)).length,resting:world.actors.filter(a=>a.behavior==='rest').length,escaping:world.actors.filter(a=>a.behavior==='escape').length,animals:world.actors.map(a=>({id:a.id,species:a.species,mechanical:a.mechanical&&world.mode!=='peaceful',behavior:a.behavior,x:a.x,y:a.y,z:a.z,age:a.age,drink:a.drink,speed:desiredSpeed(a,world.mode),distance:a.distance,hunger:a.hunger,energy:a.energy,action:actorAction(a,world.mode)}))};
}
export function actorAction(a:Actor,mode:WorldMode):DinosaurAction{
 if(a.altitude!==undefined)return a.behavior==='glide'?'glide':'fly';
 if(a.moving)return mode!=='peaceful'||a.behavior==='escape'?'run':'walk';
 if(a.behavior==='drink')return 'idle';
 return stationary.has(a.behavior)?a.behavior as DinosaurAction:'idle';
}

