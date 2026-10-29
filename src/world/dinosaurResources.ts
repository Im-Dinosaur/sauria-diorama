import { habitatGround,bankWalkable,WATER_LEVEL,drinkingSpots,reference,referencePoint } from './habitat';
import { DIORAMA } from './layout';
import { canDrinkAt } from '../models/dinosaurAnatomy';
import type { Species } from './paths';

/** Allows dry sloping banks as well as the existing high-ground navigation area. */
export function animalWalkable(x:number,z:number,radius:number){return bankWalkable(x,z,radius);}
export const hydrationSites=[...drinkingSpots];
// Derive destinations from the current height field; no hard-coded lake coordinates.
if(hydrationSites.length===0)for(let z=-DIORAMA.halfDepth+1;z<DIORAMA.halfDepth-1;z+=.48)for(let x=-DIORAMA.halfWidth+1;x<DIORAMA.halfWidth-1;x+=.48){
 if(!animalWalkable(x,z,.30)||hydrationSites.some(p=>Math.hypot(x-p.x,z-p.z)<1.05))continue;
 let found=false;for(const reach of [.70,1.0,1.30]){for(let i=0;i<16;i++){const a=i*Math.PI/8,lookX=x+Math.cos(a)*reach,lookZ=z+Math.sin(a)*reach;if(habitatGround(lookX,lookZ)<WATER_LEVEL-.025){hydrationSites.push({x,z,lookX,lookZ});found=true;break;}}if(found)break;}
}

// Include the lower, dry part of each bank. The old high-ground stations were
// often farther from the water than a juvenile's entire head and neck could reach.
const bankSites:typeof hydrationSites=[],smallBankSites:typeof hydrationSites=[];
for(let i=0;i<reference.water.length;i++){
 const distance=reference.landDistanceCentimeters[i]/100;
 if(reference.water[i]||distance<.25||distance>3.4)continue;
 const origin=referencePoint(i),q=referencePoint(reference.nearestWater[i]);
 if(habitatGround(q.x,q.z)>WATER_LEVEL-.01)continue;
 for(const offset of [0,.08,.16,.24]){
 const distance=Math.hypot(q.x-origin.x,q.z-origin.z),p={x:origin.x+(q.x-origin.x)*offset/distance,z:origin.z+(q.z-origin.z)*offset/distance};
 if(habitatGround(p.x,p.z)<WATER_LEVEL+.045)continue;
 // nearestWater points at a raster cell centre, well inside the river. Aim at
 // the actual terrain/water intersection instead of the middle of that cell.
 let dry=0,wet=1;for(let step=0;step<12;step++){const t=(dry+wet)/2,x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;if(habitatGround(x,z)>WATER_LEVEL-.012)dry=t;else wet=t;}
 bankSites.push({...p,lookX:p.x+(q.x-p.x)*wet,lookZ:p.z+(q.z-p.z)*wet});
 }
 // A real 1.8m raptor cannot drink from the 22.5cm-high stations sized for giants.
 // Locate lower, still-dry standing points on the same visible terrain height field.
 for(const clearance of [.025,.03,.035,.04,.045]){
  if(habitatGround(origin.x,origin.z)<=WATER_LEVEL+clearance)continue;
  let dry=0,wet=1;for(let step=0;step<16;step++){const t=(dry+wet)/2,x=origin.x+(q.x-origin.x)*t,z=origin.z+(q.z-origin.z)*t;if(habitatGround(x,z)>WATER_LEVEL+clearance)dry=t;else wet=t;}
  const p={x:origin.x+(q.x-origin.x)*dry,z:origin.z+(q.z-origin.z)*dry};
  dry=0;wet=1;for(let step=0;step<16;step++){const t=(dry+wet)/2,x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;if(habitatGround(x,z)>WATER_LEVEL-.012)dry=t;else wet=t;}
  smallBankSites.push({...p,lookX:p.x+(q.x-p.x)*wet,lookZ:p.z+(q.z-p.z)*wet});
 }
}
const reachableSites=new Map<string,typeof hydrationSites>();
export function hydrationSitesFor(animal:{species:Species;scale:number;radius:number}){
 const key=`${animal.species}:${animal.scale}:${animal.radius}`,cached=reachableSites.get(key);if(cached)return cached;
 const candidates=animal.scale<.25?[...bankSites,...smallBankSites]:bankSites;
 const cells=new Set<string>();
 const sites=candidates.filter(p=>canDrinkAt(animal.species,animal.scale,habitatGround(p.x,p.z),WATER_LEVEL,Math.hypot(p.lookX-p.x,p.lookZ-p.z))&&animalWalkable(p.x,p.z,animal.radius*.58)).filter(p=>{if(animal.scale>=.25)return true;const cell=`${Math.floor(p.x/.12)},${Math.floor(p.z/.12)}`;if(cells.has(cell))return false;cells.add(cell);return true;});
 reachableSites.set(key,sites);return sites;
}
