import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { advanceEcosystem,createEcosystem,planRoute } from '../src/world/ecosystem';
import type { Actor,Ecosystem } from '../src/world/ecosystem';
import { animalWalkable } from '../src/world/dinosaurResources';
import { habitatGround } from '../src/world/habitat';
import { createLocomotion,navigationRadius,startRoute } from '../src/world/locomotion';
import { navigationNodes,segmentWalkable } from '../src/world/navigation';

// These endpoints passed the old grid test, but the connecting segment hit a tree/bank.
const badEdges=[
 [{x:14.3,z:-3.383971291866035},{x:15,z:-3.383971291866035}],
 [{x:-18.6,z:-1.983971291866035},{x:-17.9,z:-1.983971291866035}],
 [{x:-17.9,z:-1.983971291866035},{x:-17.2,z:-1.983971291866035}],
 [{x:15.7,z:-1.283971291866035},{x:16.4,z:-1.283971291866035}],
 [{x:-20,z:6.4160287081339655},{x:-19.3,z:6.4160287081339655}],
];
let detours=0,rejected=0,checkedSegments=0;
for(const [start,end] of badEdges){
 assert(animalWalkable(start.x,start.z,.6)&&animalWalkable(end.x,end.z,.6));
 assert(!segmentWalkable(start,end,.6),'Reproduction no longer contains the original obstruction');
 const route=planRoute(start.x,start.z,end.x,end.z,.6,{exactGoal:true});
 if(!route.length){rejected++;continue;}detours++;
 let previous=start;for(const p of route){assert(segmentWalkable(previous,p,.6),'Route crosses an obstacle between nodes');checkedSegments++;previous=p;}
 assert(Math.hypot(previous.x-end.x,previous.z-end.z)<.001);
}
const base=createEcosystem(),template=base.actors.find(a=>a.species==='triceratops')!;
const field=navigationNodes(.58).find(p=>[-1.2,0,1.2].every(dz=>segmentWalkable({x:p.x-2.3,z:p.z+dz},{x:p.x+2.3,z:p.z+dz},.58)));
assert(field,'No open field found for head-on passage');
const actor=(id:string,x:number,goalX:number):Actor=>{
 const a:Actor={...template,id,x,z:field.z,y:habitatGround(x,field.z),radius:1,scale:.67,heading:id==='pass-a'?Math.PI/2:-Math.PI/2,speed:.50,homeX:goalX,homeZ:field.z,age:0,behavior:'wander',actionTime:2,thirst:0,hunger:0,energy:1,decisionIn:1e6,holdFor:0,blocked:0,distance:0,gaitTime:0,drink:0,moving:false,route:[],waypoint:0,target:undefined,navigation:createLocomotion()};
 startRoute(a,planRoute(x,field.z,goalX,field.z,navigationRadius(a),{exactGoal:true}));assert(a.route.length);return a;
};
const crossing:Ecosystem={mode:'peaceful',paused:false,time:0,actors:[actor('pass-a',field.x-2,field.x+2),actor('pass-b',field.x+2,field.x-2)]};
const noTime=JSON.stringify(crossing);advanceEcosystem(crossing,0);assert.equal(JSON.stringify(crossing),noTime,'A zero-time frame mutates movement');
let separation=Infinity,passed=false;
for(let frame=0;frame<1200;frame++){
 advanceEcosystem(crossing,.05);const [a,b]=crossing.actors;separation=Math.min(separation,Math.hypot(a.x-b.x,a.z-b.z)-(a.radius+b.radius)*.65);
 if(a.x>field.x+.6&&b.x<field.x-.6){passed=true;break;}
}
assert(separation>=-1e-6,'Head-on collision');assert(passed,'Head-on animals deadlock instead of passing');

const world=createEcosystem('ember'),history=new Map(world.actors.filter(a=>a.altitude===undefined).map(a=>[a.id,{x:a.x,z:a.z,vx:0,vz:0,flips:0,changes:0,moving:false,streak:0,maxStreak:0}]));
let minimumGround=Infinity;
for(let frame=0;frame<2400;frame++){
 advanceEcosystem(world,.05);
 for(const a of world.actors){if(a.altitude!==undefined)continue;const h=history.get(a.id)!,vx=a.x-h.x,vz=a.z-h.z,speed=Math.hypot(vx,vz),old=Math.hypot(h.vx,h.vz);
  const flipped=speed>.001&&old>.001&&(vx*h.vx+vz*h.vz)/(speed*old)<-.2;if(flipped){h.flips++;h.streak++;}else h.streak=0;h.maxStreak=Math.max(h.maxStreak,h.streak);
  if(a.moving!==h.moving)h.changes++;h.x=a.x;h.z=a.z;h.vx=vx;h.vz=vz;h.moving=a.moving;
  assert(animalWalkable(a.x,a.z,navigationRadius(a)),'Movement and planning disagree about traversability');minimumGround=Math.min(minimumGround,a.y);
 }
}
const results=[...history].map(([id,h])=>({id,reversals:h.flips,consecutiveReversals:h.maxStreak,locomotionTransitions:h.changes}));
assert(results.every(a=>a.reversals<15&&a.consecutiveReversals<3),'Frame-to-frame movement oscillation regressed');
const report={result:'PASS',reproducedUnsafeEdges:badEdges.length,verifiedDetours:detours,rejectedUnreachableEdges:rejected,checkedSweptSegments:checkedSegments,headOnPassage:true,minimumHeadOnSeparation:separation,simulationSeconds:120,maximumReversals:Math.max(...results.map(a=>a.reversals)),maximumConsecutiveReversals:Math.max(...results.map(a=>a.consecutiveReversals)),minimumGround,actors:results};
writeFileSync('verification-navigation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
