import reference from './reference-map.json';
export { reference };
export const WATER_LEVEL=reference.waterLevel;
export const MOUNTAIN={x:-10.5,z:-13.2,radius:1.2};
export const LAKE={x:4,z:9,rx:1.4,rz:.8};
export const RIVER:[number,number][]=[];
export const noise=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export const HABITAT_GRID={minX:-reference.width/2,minZ:-reference.depth/2,width:reference.width,depth:reference.depth,nx:reference.columns-1,nz:reference.rows-1};
export function referenceCell(x:number,z:number){const xx=Math.max(0,Math.min(reference.columns-1,Math.round((x/reference.width+.5)*(reference.columns-1)))),zz=Math.max(0,Math.min(reference.rows-1,Math.round((z/reference.depth+.5)*(reference.rows-1))));return zz*reference.columns+xx;}
export function referencePoint(index:number){return {x:(index%reference.columns/(reference.columns-1)-.5)*reference.width,z:(Math.floor(index/reference.columns)/(reference.rows-1)-.5)*reference.depth};}
export function habitatHeight(x:number,z:number){return habitatGround(x,z);}
export function habitatGround(x:number,z:number){
 const {minX,minZ,width,depth,nx,nz}=HABITAT_GRID,dx=width/nx,dz=depth/nz,ix=Math.max(0,Math.min(nx-1,Math.floor((x-minX)/dx))),iz=Math.max(0,Math.min(nz-1,Math.floor((z-minZ)/dz))),u=(x-minX-ix*dx)/dx,v=(z-minZ-iz*dz)/dz,i=iz*reference.columns+ix;
 const a=reference.heightMillimeters[i]/1000,b=reference.heightMillimeters[i+1]/1000,c=reference.heightMillimeters[i+reference.columns]/1000,d=reference.heightMillimeters[i+reference.columns+1]/1000;
 return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
export function riverDistance(x:number,z:number){return reference.landDistanceCentimeters[referenceCell(x,z)]/100;}
export function lakeDistance(x:number,z:number){return riverDistance(x,z);}
export const rockOutcrops=[
 {px:572.4,py:69.8,bounds:[484,13,657,114]},
 {px:1498.6,py:169.9,bounds:[1432,117,1574,219]},
 {px:202.8,py:855.5,bounds:[115,807,279,899]},
 {px:1176.2,py:844.0,bounds:[1120,777,1235,910]},
].map(p=>{const rx=(p.bounds[2]-p.bounds[0])/1672*reference.width*.46,rz=(p.bounds[3]-p.bounds[1])/941*reference.depth*.46;return {x:(p.px/1672-.5)*reference.width,z:(p.py/941-.5)*reference.depth,rx,rz,r:Math.max(rx,rz),sourceCenter:[p.px,p.py],sourceBounds:p.bounds};});
export const forest=[] as {x:number;z:number;scale:number;kind:number;color:number}[];
for(let iz=0;iz<79;iz++)for(let ix=0;ix<141;ix++){
 const seed=ix*419+iz*73,x=-29.5+ix*.42+(noise(seed)-.5)*.26,z=-16.5+iz*.42+(noise(seed+12)-.5)*.26,index=referenceCell(x,z);
 if(!reference.canopy[index]||habitatGround(x,z)<.43||noise(seed+29)>.61)continue;
 if(rockOutcrops.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.2))continue;
 let density=0;const column=index%reference.columns,row=Math.floor(index/reference.columns);for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const xx=column+dx,zz=row+dz;if(xx>=0&&zz>=0&&xx<reference.columns&&zz<reference.rows)density+=reference.canopy[zz*reference.columns+xx];}
 const kind=noise(seed+71);forest.push({x,z,scale:.28+noise(seed+53)*.35,kind:density<10?2:kind<.12?0:kind<.59?3:1,color:reference.colors[index]});
}
const treeBins=new Map<string,typeof forest>();
for(const p of forest){const key=`${Math.floor(p.x)},${Math.floor(p.z)}`,list=treeBins.get(key)??[];list.push(p);treeBins.set(key,list);}
function terrainWalkable(x:number,z:number,radius:number,trees:boolean,centerHeight:number,edgeHeight:number,samples:number){
 if(Math.abs(x)>reference.width/2-.55-radius||Math.abs(z)>reference.depth/2-.55-radius||habitatGround(x,z)<centerHeight)return false;
 for(let i=0;i<samples;i++){const a=i*Math.PI*2/samples;if(habitatGround(x+Math.cos(a)*radius,z+Math.sin(a)*radius)<edgeHeight)return false;}
 if(rockOutcrops.some(p=>Math.hypot((x-p.x)/(p.rx*1.15+radius),(z-p.z)/(p.rz*1.15+radius))<1))return false;
 if(trees)for(let iz=Math.floor(z-radius-.3);iz<=Math.floor(z+radius+.3);iz++)for(let ix=Math.floor(x-radius-.3);ix<=Math.floor(x+radius+.3);ix++)if(treeBins.get(`${ix},${iz}`)?.some(p=>Math.hypot(x-p.x,z-p.z)<radius+.10*p.scale))return false;
 return true;
}
export function walkable(x:number,z:number,radius:number,trees=true){return terrainWalkable(x,z,radius,trees,.425,.40,8);}
export function bankWalkable(x:number,z:number,radius:number){const clearance=Math.min(.045,Math.max(.006,radius*.12));return terrainWalkable(x,z,radius,true,WATER_LEVEL+clearance,WATER_LEVEL+clearance*.55,12);}
export const drinkingSpots=[] as {x:number;z:number;lookX:number;lookZ:number}[];
for(let i=0;i<reference.water.length;i+=2){
 const distance=reference.landDistanceCentimeters[i]/100;if(reference.water[i]||distance<.8||distance>1.45)continue;
 const p=referencePoint(i),q=referencePoint(reference.nearestWater[i]);
 if(!walkable(p.x,p.z,.40)||drinkingSpots.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<1.5))continue;
 drinkingSpots.push({...p,lookX:q.x,lookZ:q.z});
}
