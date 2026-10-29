import { groundHeight, random, VOLCANO } from './terrain';
export type MechanicalSpecies = 'rex' | 'triceratops' | 'pterosaur';
export type Species = MechanicalSpecies | 'stegosaurus' | 'brachiosaurus' | 'velociraptor' | 'spinosaurus';
export const speciesNames:Record<Species,string>={rex:'티라노사우루스',triceratops:'트리케라톱스',pterosaur:'프테라노돈',stegosaurus:'스테고사우루스',brachiosaurus:'브라키오사우루스',velociraptor:'벨로시랩터',spinosaurus:'스피노사우루스'};
export const creatureSpecs={rex:{radius:1.04,scale:.84},triceratops:{radius:.98,scale:.81},pterosaur:{radius:1.61,scale:.90},stegosaurus:{radius:1.15,scale:.76},brachiosaurus:{radius:1.35,scale:.73},velociraptor:{radius:.78,scale:.65},spinosaurus:{radius:1.5,scale:.68}};
export interface CreatureDefinition {
 id:string;species:Species;mechanical:boolean;scale:number;organicScale:number;radius:number;
 route:{x:number;z:number;rx:number;rz:number;speed:number;phase:number;height?:number};herd?:string;
}
export const population:CreatureDefinition[]=[
 {id:'machine-rex',species:'rex',mechanical:true,scale:.84,organicScale:.68,radius:1.04,route:{x:-6.25,z:1.65,rx:.38,rz:.28,speed:.16,phase:1.4}},
 {id:'machine-triceratops',species:'triceratops',mechanical:true,scale:.81,organicScale:.67,radius:.98,route:{x:-3.05,z:1.7,rx:.34,rz:.28,speed:.13,phase:0}},
 {id:'machine-pterosaur',species:'pterosaur',mechanical:true,scale:.90,organicScale:.85,radius:1.61,route:{x:-3.6,z:.15,rx:1.45,rz:.7,speed:.13,phase:0,height:4.25}},
 {id:'wild-rex',species:'rex',mechanical:false,scale:.69,organicScale:.69,radius:1.05,route:{x:-4.1,z:-1.5,rx:.28,rz:.24,speed:.18,phase:2.6}},
 {id:'wild-stegosaurus',species:'stegosaurus',mechanical:false,scale:.73,organicScale:.73,radius:1.13,route:{x:.25,z:1.65,rx:.30,rz:.26,speed:.13,phase:3.1}},
 {id:'brachiosaurus-adult',species:'brachiosaurus',mechanical:false,scale:.70,organicScale:.70,radius:1.32,route:{x:-.95,z:-1.65,rx:.20,rz:.20,speed:.10,phase:.5},herd:'sauropods'},
 {id:'brachiosaurus-young',species:'brachiosaurus',mechanical:false,scale:.43,organicScale:.43,radius:.82,route:{x:1.8,z:-1.65,rx:.20,rz:.20,speed:.10,phase:.5},herd:'sauropods'},
 {id:'triceratops-young-1',species:'triceratops',mechanical:false,scale:.43,organicScale:.43,radius:.65,route:{x:3.10,z:.95,rx:.13,rz:.13,speed:.13,phase:1.1},herd:'ceratopsians'},
 {id:'triceratops-young-2',species:'triceratops',mechanical:false,scale:.40,organicScale:.40,radius:.61,route:{x:4.48,z:1.48,rx:.13,rz:.13,speed:.13,phase:1.1},herd:'ceratopsians'},
 {id:'triceratops-young-3',species:'triceratops',mechanical:false,scale:.38,organicScale:.38,radius:.58,route:{x:3.38,z:2.65,rx:.13,rz:.13,speed:.13,phase:1.1},herd:'ceratopsians'},
 {id:'wild-velociraptor',species:'velociraptor',mechanical:false,scale:.59,organicScale:.59,radius:.76,route:{x:4.25,z:-1.65,rx:.37,rz:.30,speed:.28,phase:4.2}},
 {id:'wild-pterosaur-1',species:'pterosaur',mechanical:false,scale:.69,organicScale:.69,radius:1.30,route:{x:.2,z:.1,rx:1.65,rz:.75,speed:.15,phase:2.1,height:5.7}},
 {id:'wild-pterosaur-2',species:'pterosaur',mechanical:false,scale:.57,organicScale:.57,radius:1.08,route:{x:4.35,z:.2,rx:1.2,rz:.65,speed:.16,phase:4.3,height:4.1}},
];
export function pathFor(creature:CreatureDefinition,time:number){
 const r=creature.route,a=time*r.speed+r.phase,x=r.x+Math.cos(a)*r.rx,z=r.z+Math.sin(a)*r.rz;
 return {x,y:r.height===undefined?groundHeight(x,z):r.height+.10*Math.sin(a*2),z,heading:Math.atan2(-r.rx*Math.sin(a),r.rz*Math.cos(a))};
}
export type CreaturePath=ReturnType<typeof pathFor>;
export function creaturePath(species:Species,time:number){return pathFor(population.find(p=>p.species===species)!,time);}

// Dressing is selected outside the complete swept movement envelopes.
const candidates=[] as {x:number;z:number;s:number}[];
for(let z=-3.35;z<=3.35;z+=.67)for(let x=-7.9;x<=5.4;x+=.67){
 const s=.52+random(x*19+z*13)*.3;
 if(groundHeight(x,z)<.36||Math.hypot(x-VOLCANO.x,z-VOLCANO.z)<1.8)continue;
 if(population.some(p=>p.route.height===undefined&&Math.hypot(Math.max(0,Math.abs(x-p.route.x)-p.route.rx),Math.max(0,Math.abs(z-p.route.z)-p.route.rz))<p.radius+s*.58+.13))continue;
 if(x<-5.6&&z<-.3)continue;
 candidates.push({x,z,s});
}
candidates.sort((a,b)=>random(a.x*53+a.z*17)-random(b.x*53+b.z*17));
export const treeSites:typeof candidates=[];
for(const p of candidates)if(treeSites.length<21&&treeSites.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>1.0))treeSites.push(p);
export const rockSites=[{x:-7.8,z:.1,r:.18,h:.3},{x:-1.9,z:3.25,r:.19,h:.24}];
export const carcass={x:-2.65,z:-3.15,r:.36,s:.5};
export const bushSites=treeSites.slice(0,7).map(p=>({x:p.x+.1,z:p.z-.12,s:.15}));
