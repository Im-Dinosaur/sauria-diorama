import type { Actor,Ecosystem } from './ecosystem';
import { habitatGround } from './habitat';
import { planNavigationRoute,segmentWalkable } from './navigation';
import type { NavigationPoint } from './navigation';

export interface LocomotionState {vx:number;vz:number;blend:number;side:number;sideUntil:number;progressTime:number;bestDistance:number;lastWaypoint:number;replans:number;waitUntil:number;}
export interface Traffic extends NavigationPoint {id:string;radius:number;vx:number;vz:number;}
export function createLocomotion():LocomotionState{return {vx:0,vz:0,blend:0,side:1,sideUntil:0,progressTime:0,bestDistance:Infinity,lastWaypoint:-1,replans:0,waitUntil:0};}
export const navigationRadius=(a:{radius:number})=>a.radius*.58;
export function motionState(a:Actor){return a.navigation??(a.navigation=createLocomotion());}
export function stopMotion(a:Actor){const n=motionState(a);n.vx=n.vz=n.blend=0;a.moving=false;}
export function startRoute(a:Actor,route:NavigationPoint[]){
 a.route=route;a.waypoint=0;const n=motionState(a);n.progressTime=0;n.bestDistance=Infinity;n.lastWaypoint=-1;n.waitUntil=0;
}
export function trafficSnapshot(world:Ecosystem):Traffic[]{return world.actors.filter(a=>a.altitude===undefined).map(a=>({id:a.id,x:a.x,z:a.z,radius:a.radius,vx:a.navigation?.vx??0,vz:a.navigation?.vz??0}));}
function safeVelocity(a:Actor,goal:NavigationPoint,speed:number,time:number,traffic:Traffic[]){
 const n=motionState(a),dx=goal.x-a.x,dz=goal.z-a.z,d=Math.hypot(dx,dz),ux=dx/d,uz=dz/d,neighbors=traffic.filter(b=>b.id!==a.id&&Math.hypot(a.x-b.x,a.z-b.z)<(a.radius+b.radius)+2.0);
 let best={vx:0,vz:0,angle:0,score:0};const preferred=n.side||1;
 for(const angle of [0,preferred*.38,preferred*.76,preferred*1.20,-preferred*.38,-preferred*.76,-preferred*1.20])for(const fraction of [1,.5]){
  const c=Math.cos(angle),s=Math.sin(angle),vx=(ux*c-uz*s)*speed*fraction,vz=(ux*s+uz*c)*speed*fraction,horizon=Math.min(.65,d/(speed*fraction)),end={x:a.x+vx*horizon,z:a.z+vz*horizon};
  if(!segmentWalkable(a,end,navigationRadius(a)))continue;
  let risk=0,blocked=false;
  for(const b of neighbors){
   const rx=a.x-b.x,rz=a.z-b.z,rvx=vx-b.vx,rvz=vz-b.vz,v2=rvx*rvx+rvz*rvz,t=v2?Math.max(0,Math.min(horizon,-(rx*rvx+rz*rvz)/v2)):0,clearance=Math.hypot(rx+rvx*t,rz+rvz*t)-(a.radius+b.radius)*.65;
   if(clearance<.025){blocked=true;break;}risk+=Math.max(0,.35-clearance)*2;
  }
  if(blocked)continue;
  const oldSpeed=Math.hypot(n.vx,n.vz),continuity=oldSpeed?(n.vx*vx+n.vz*vz)/(oldSpeed*speed*fraction):1;
  const sideCost=angle*preferred<0?(n.sideUntil>time?.38:.12):0,score=Math.cos(angle)*fraction*3+continuity*.35-risk-sideCost;
  if(score>best.score)best={vx,vz,angle,score};
 }
 if(Math.abs(best.angle)>.05){n.side=Math.sign(best.angle);n.sideUntil=time+1.1;}
 return best;
}
function recover(world:Ecosystem,a:Actor,traffic:Traffic[]){
 const n=motionState(a),destination=a.target??a.route[a.route.length-1];n.replans++;
 const obstacles=traffic.filter(b=>b.id!==a.id&&Math.hypot(a.x-b.x,a.z-b.z)<4).map(b=>({x:b.x,z:b.z,radius:(a.radius+b.radius)*.65-.02}));
 const route=destination?planNavigationRoute(a.x,a.z,destination.x,destination.z,navigationRadius(a),{exactGoal:!!a.target,obstacles}):[];
 startRoute(a,route);stopMotion(a);n.waitUntil=world.time+.35;a.blocked=0;
 if(!route.length){a.target=undefined;a.actionTime=-.35;a.behavior=world.mode==='peaceful'?'wander':'escape';}
}
/** No repulsion is added to the goal vector: it can never invert the route every frame. */
export function advanceLocomotion(world:Ecosystem,a:Actor,dt:number,speed:number,traffic:Traffic[]){
 const n=motionState(a),goal=a.route[a.waypoint];if(!goal)return;
 const d=Math.hypot(goal.x-a.x,goal.z-a.z);
 if(n.lastWaypoint!==a.waypoint){n.lastWaypoint=a.waypoint;n.bestDistance=d;n.progressTime=0;}
 if(d<n.bestDistance-.035){n.bestDistance=d;n.progressTime=0;}else n.progressTime+=dt;
 if(n.progressTime>1.8){recover(world,a,traffic);return;}
 const desired=safeVelocity(a,goal,speed,world.time,traffic),alpha=1-Math.exp(-dt*7);
 let vx=n.vx+(desired.vx-n.vx)*alpha,vz=n.vz+(desired.vz-n.vz)*alpha;
 const maxStep=Math.min(1,d/Math.max(.00001,Math.hypot(vx,vz)*dt));vx*=maxStep;vz*=maxStep;
 let end={x:a.x+vx*dt,z:a.z+vz*dt};
 if(!segmentWalkable(a,end,navigationRadius(a))){vx=desired.vx;vz=desired.vz;const clamp=Math.min(1,d/Math.max(.00001,Math.hypot(vx,vz)*dt));vx*=clamp;vz*=clamp;end={x:a.x+vx*dt,z:a.z+vz*dt};}
 const occupied=world.actors.some(b=>b!==a&&b.altitude===undefined&&Math.hypot(end.x-b.x,end.z-b.z)<(a.radius+b.radius)*.65);
 const moved=!occupied&&segmentWalkable(a,end,navigationRadius(a))?Math.hypot(end.x-a.x,end.z-a.z):0;
 if(moved>.00005){
  a.x=end.x;a.z=end.z;a.y=habitatGround(a.x,a.z);a.distance+=moved;a.gaitTime+=moved/(a.scale*.20);n.vx=vx;n.vz=vz;a.blocked=0;
  const heading=Math.atan2(vx,vz),difference=Math.atan2(Math.sin(heading-a.heading),Math.cos(heading-a.heading));a.heading+=Math.max(-3.2*dt,Math.min(3.2*dt,difference));
 }else{n.vx=n.vz=0;a.blocked+=dt;}
 const actual=moved/dt,natural=actual>.025?Math.min(1,actual/speed):0;n.blend+=(natural-n.blend)*(1-Math.exp(-dt*12));a.moving=n.blend>(a.moving?.06:.15);
}
