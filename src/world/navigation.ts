import { animalWalkable } from './dinosaurResources';
import { DIORAMA } from './layout';

export interface NavigationPoint {x:number;z:number;}
export interface NavigationObstacle extends NavigationPoint {radius:number;}
export interface RouteOptions {exactGoal?:boolean;obstacles?:NavigationObstacle[];}
export const NAVIGATION_STEP=.5;
const MIN_X=-DIORAMA.halfWidth+.55,MIN_Z=-DIORAMA.halfDepth+.55;
const NX=Math.floor((DIORAMA.width-1.1)/NAVIGATION_STEP)+1,NZ=Math.floor((DIORAMA.depth-1.1)/NAVIGATION_STEP)+1;
const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]],OPPOSITE=[2,3,0,1,6,7,4,5];
interface Grid {radius:number;free:Uint8Array;known:Uint8Array;edges:Uint8Array;component:Int32Array;nodes:NavigationPoint[];}
const grids=new Map<number,Grid>();
const point=(i:number):NavigationPoint=>({x:MIN_X+i%NX*NAVIGATION_STEP,z:MIN_Z+Math.floor(i/NX)*NAVIGATION_STEP});
export function segmentWalkable(a:NavigationPoint,b:NavigationPoint,radius:number){
 const samples=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));
 for(let i=0;i<=samples;i++){const t=i/samples;if(!animalWalkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,radius))return false;}
 return true;
}
function obstacleFree(a:NavigationPoint,b:NavigationPoint,obstacles:NavigationObstacle[]){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 return obstacles.every(o=>{const t=length?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length)):0;return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)>=o.radius;});
}
function neighbor(i:number,direction:number){const x=i%NX+DIRECTIONS[direction][0],z=Math.floor(i/NX)+DIRECTIONS[direction][1];return x<0||x>=NX||z<0||z>=NZ?-1:z*NX+x;}
function edge(grid:Grid,i:number,direction:number){
 const bit=1<<direction;if(grid.known[i]&bit)return !!(grid.edges[i]&bit);
 const j=neighbor(i,direction);grid.known[i]|=bit;if(j<0||!grid.free[i]||!grid.free[j])return false;
 let allowed=true;
 if(direction>=4){const [dx,dz]=DIRECTIONS[direction],x=i%NX,z=Math.floor(i/NX);allowed=!!grid.free[z*NX+x+dx]&&!!grid.free[(z+dz)*NX+x];}
 allowed=allowed&&segmentWalkable(point(i),point(j),grid.radius);
 grid.known[j]|=1<<OPPOSITE[direction];if(allowed){grid.edges[i]|=bit;grid.edges[j]|=1<<OPPOSITE[direction];}return allowed;
}
function gridFor(radius:number){
 const key=Math.ceil((radius+.025)/.05),cached=grids.get(key);if(cached)return cached;
 const grid:Grid={radius:key*.05,free:new Uint8Array(NX*NZ),known:new Uint8Array(NX*NZ),edges:new Uint8Array(NX*NZ),component:new Int32Array(NX*NZ).fill(-1),nodes:[]};
 for(let i=0;i<grid.free.length;i++){const p=point(i);grid.free[i]=animalWalkable(p.x,p.z,grid.radius)?1:0;}
 let label=0;
 for(let start=0;start<grid.free.length;start++)if(grid.free[start]&&grid.component[start]<0){
  const connected=[start];grid.component[start]=label;
  for(let at=0;at<connected.length;at++){const i=connected[at];for(let d=0;d<4;d++)if(edge(grid,i,d)){const j=neighbor(i,d);if(grid.component[j]<0){grid.component[j]=label;connected.push(j);}}}
  if(connected.length<20)for(const i of connected)grid.free[i]=0;label++;
 }
 for(let i=0;i<grid.free.length;i++)if(grid.free[i])grid.nodes.push(point(i));grids.set(key,grid);return grid;
}
export function navigationNodes(radius:number){return gridFor(radius).nodes;}
function nearest(grid:Grid,p:NavigationPoint,radius:number,component?:number){
 let best=-1,distance=Infinity;const cx=Math.round((p.x-MIN_X)/NAVIGATION_STEP),cz=Math.round((p.z-MIN_Z)/NAVIGATION_STEP);
 for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
  const x=cx+dx,z=cz+dz,i=z*NX+x;if(x<0||z<0||x>=NX||z>=NZ||!grid.free[i]||(component!==undefined&&grid.component[i]!==component))continue;
  const q=point(i),d=Math.hypot(q.x-p.x,q.z-p.z);if(d>1.35||d>=distance||!segmentWalkable(p,q,radius))continue;best=i;distance=d;
 }
 return best;
}
class Frontier {
 private nodes:{id:number;score:number}[]=[];
 get length(){return this.nodes.length;}
 push(id:number,score:number){const value={id,score};let i=this.nodes.length;this.nodes.push(value);while(i){const parent=(i-1)>>1;if(this.nodes[parent].score<=score)break;this.nodes[i]=this.nodes[parent];i=parent;}this.nodes[i]=value;}
 pop(){const first=this.nodes[0],last=this.nodes.pop()!;if(this.nodes.length){let i=0;while(i*2+1<this.nodes.length){let child=i*2+1;if(child+1<this.nodes.length&&this.nodes[child+1].score<this.nodes[child].score)child++;if(this.nodes[child].score>=last.score)break;this.nodes[i]=this.nodes[child];i=child;}this.nodes[i]=last;}return first.id;}
}
/** Every route edge and off-grid connector uses the same swept footprint as movement. */
export function planNavigationRoute(x:number,z:number,gx:number,gz:number,radius:number,options:RouteOptions={}):NavigationPoint[]{
 const startPoint={x,z},goalPoint={x:gx,z:gz},grid=gridFor(radius),validGoal=animalWalkable(gx,gz,radius),obstacles=options.obstacles??[];
 if(!animalWalkable(x,z,radius)||options.exactGoal&&!validGoal)return [];
 const start=nearest(grid,startPoint,radius);if(start<0)return [];
 let goal=-1;
 if(validGoal)goal=nearest(grid,goalPoint,radius,grid.component[start]);
 else{
  let distance=1.35;for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const xx=Math.round((gx-MIN_X)/NAVIGATION_STEP)+dx,zz=Math.round((gz-MIN_Z)/NAVIGATION_STEP)+dz,i=zz*NX+xx;if(xx<0||zz<0||xx>=NX||zz>=NZ||!grid.free[i]||grid.component[i]!==grid.component[start])continue;const p=point(i),d=Math.hypot(p.x-gx,p.z-gz);if(d<distance){goal=i;distance=d;}}}
 if(goal<0||!obstacleFree(startPoint,point(start),obstacles))return [];
 const open=new Frontier(),closed=new Uint8Array(grid.free.length),previous=new Int32Array(grid.free.length).fill(-1),cost=new Float64Array(grid.free.length).fill(Infinity);
 const heuristic=(i:number)=>Math.hypot(i%NX-goal%NX,Math.floor(i/NX)-Math.floor(goal/NX));cost[start]=0;open.push(start,heuristic(start));
 while(open.length){const current=open.pop();if(closed[current])continue;closed[current]=1;
  if(current===goal){
   const ids=[];for(let i=goal;i!==start;i=previous[i])ids.push(i);ids.push(start);const points=ids.reverse().map(point);
   if(validGoal&&obstacleFree(points[points.length-1],goalPoint,obstacles))points.push(goalPoint);else if(options.exactGoal)return [];
   const result:NavigationPoint[]=[];let from=startPoint,index=0;
   while(index<points.length){let far=Math.min(points.length-1,index+12);while(far>index&&(!segmentWalkable(from,points[far],radius)||!obstacleFree(from,points[far],obstacles)))far--;const p=points[far];if(!segmentWalkable(from,p,radius)||!obstacleFree(from,p,obstacles))return [];if(Math.hypot(from.x-p.x,from.z-p.z)>.015)result.push(p);from=p;index=far+1;}return result;
  }
  for(let d=0;d<8;d++){if(!edge(grid,current,d))continue;const next=neighbor(current,d);if(closed[next]||!grid.free[next]||grid.component[next]!==grid.component[start]||!obstacleFree(point(current),point(next),obstacles))continue;const g=cost[current]+(d<4?1:Math.SQRT2);if(g>=cost[next])continue;cost[next]=g;previous[next]=current;open.push(next,g+heuristic(next));}
 }
 return [];
}
