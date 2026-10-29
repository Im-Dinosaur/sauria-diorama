import { planRoute,createEcosystem,advanceEcosystem } from '../src/world/ecosystem';
import { animalWalkable } from '../src/world/dinosaurResources';
import { DIORAMA } from '../src/world/layout';
const step=.7,minX=-DIORAMA.halfWidth+.9,minZ=-DIORAMA.halfDepth+.9,radius=.6;
const blockedEdges=[];
for(let z=minZ;z<DIORAMA.halfDepth-1.8&&blockedEdges.length<5;z+=step)for(let x=minX;x<DIORAMA.halfWidth-1.8&&blockedEdges.length<5;x+=step){
 const end={x:x+step,z};if(!animalWalkable(x,z,radius)||!animalWalkable(end.x,end.z,radius))continue;
 if(Array.from({length:9},(_,i)=>animalWalkable(x+step*i/8,z,radius)).every(Boolean))continue;
 const path=planRoute(x,z,end.x,end.z,radius);if(path.length===1)blockedEdges.push({start:{x,z},end,path});
}
const world=createEcosystem('ember'),history=new Map<string,{x:number;z:number;vx:number;vz:number;flips:number;movingChanges:number;moving:boolean;travel:number}>();
for(const a of world.actors)history.set(a.id,{x:a.x,z:a.z,vx:0,vz:0,flips:0,movingChanges:0,moving:false,travel:0});
for(let frame=0;frame<2400;frame++){
 advanceEcosystem(world,.05);
 for(const a of world.actors){if(a.altitude!==undefined)continue;const h=history.get(a.id)!,vx=a.x-h.x,vz=a.z-h.z,speed=Math.hypot(vx,vz),before=Math.hypot(h.vx,h.vz);if(speed>.001&&before>.001&&(vx*h.vx+vz*h.vz)/(speed*before)<-.2)h.flips++;if(a.moving!==h.moving)h.movingChanges++;h.travel+=speed;h.x=a.x;h.z=a.z;h.vx=vx;h.vz=vz;h.moving=a.moving;}
}
console.log(JSON.stringify({blockedEdges,unstable:[...history].filter(([id])=>!id.includes('pterosaur')).map(([id,h])=>({id,flips:h.flips,movingChanges:h.movingChanges,travel:+h.travel.toFixed(2)})).sort((a,b)=>b.flips-a.flips).slice(0,10)},null,2));
