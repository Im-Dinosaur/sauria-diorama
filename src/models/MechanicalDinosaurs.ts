import { BufferGeometry, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { creaturePath, creatureSpecs } from '../world/paths';
import type { Species } from '../world/paths';
import { groundHeight } from '../world/terrain';
type V=[number,number,number];
type Tone='armor'|'light'|'frame'|'dark'|'brass'|'steel'|'eye';
const colors:Record<Tone,string>={armor:'#b7c2b1',light:'#d1d8c8',frame:'#40595c',dark:'#1c2c30',brass:'#b98b4a',steel:'#a8bac1',eye:'#ffab38'};
const up=new Vector3(0,1,0);
const shield:[number,number][]=[[-.5,.32],[-.25,.5],[.38,.43],[.5,.16],[.3,-.4],[-.12,-.5],[-.47,-.16]];
const rectangle:[number,number][]=[[-.38,-.5],[.38,-.5],[.5,-.35],[.5,.35],[.38,.5],[-.38,.5],[-.5,.35],[-.5,-.35]];

// Explicit bevel triangles keep every surface faceted, including the AO pass.
function panelGeometry(outline:[number,number][]){
 if(outline.reduce((area,p,i)=>{const q=outline[(i+1)%outline.length];return area+p[0]*q[1]-q[0]*p[1];},0)<0)outline=[...outline].reverse();
 const p:number[]=[],n=outline.length;
 const v=(i:number,z:number,inset=1):V=>[outline[(i+n)%n][0]*inset,outline[(i+n)%n][1]*inset,z];
 const tri=(a:V,b:V,c:V)=>p.push(...a,...b,...c);
 for(let i=0;i<n;i++){const j=(i+1)%n;
  tri([0,0,-.5],v(j,-.5),v(i,-.5));
  tri(v(i,-.5),v(j,-.5),v(j,.28));tri(v(i,-.5),v(j,.28),v(i,.28));
  tri(v(i,.28),v(j,.28),v(j,.5,.87));tri(v(i,.28),v(j,.5,.87),v(i,.5,.87));
  tri([0,0,.54],v(i,.5,.87),v(j,.5,.87));
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
// Fixed parts are merged by finish; detail does not add a draw per bolt/plate.
class Parts {
 private pieces=new Map<Tone,BufferGeometry[]>();
 constructor(private materials:Record<Tone,MeshStandardMaterial>){}
 add(g:BufferGeometry,tone:Tone,at:V=[0,0,0],scale:V=[1,1,1],rotation:V=[0,0,0]){
  if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}g.deleteAttribute('uv');g.computeVertexNormals();
  g.applyMatrix4(new Matrix4().compose(new Vector3(...at),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(...scale)));
  const list=this.pieces.get(tone)??[];list.push(g);this.pieces.set(tone,list);return this;
 }
 plate(at:V,size:V,tone:Tone='armor',rotation:V=[0,0,0],outline=rectangle){return this.add(panelGeometry(outline),tone,at,size,rotation);}
 rod(a:V,b:V,r:number,tone:Tone='steel',r2=r,segments=6){
  const av=new Vector3(...a),bv=new Vector3(...b),d=bv.clone().sub(av),q=new Quaternion().setFromUnitVectors(up,d.clone().normalize());
  const g=new CylinderGeometry(r2,r,d.length(),segments,1);g.applyQuaternion(q);return this.add(g,tone,av.add(bv).multiplyScalar(.5).toArray() as V);
 }
 piston(a:V,b:V,r=.033){const m=a.map((x,i)=>x+(b[i]-x)*.57) as V;this.rod(a,b,r*.49,'steel');this.rod(a,m,r,'brass');return this;}
 joint(at:V,r:number,axis:V=[1,0,0]){
  const depth=axis[1]!==0?.35:Math.min(1,r/.12);
  const point=(d:number)=>at.map((v,i)=>v+axis[i]*d*depth) as V;
  this.rod(point(-.057),point(.057),r,'dark',r,8);
  for(const s of [-1,1]){this.rod(point(s*.055),point(s*.075),r*.82,'steel',r*.82,8);this.rod(point(s*.076),point(s*.084),r*.6,'brass',r*.6,8);this.rod(point(s*.085),point(s*.092),r*.31,'dark',r*.31,6);this.rod(point(s*.093),point(s*.099),r*.14,'steel',r*.14,6);}return this;
 }
 bolt(at:V,axis:V=[1,0,0],r=.018){return this.rod(at,at.map((v,i)=>v+axis[i]*.013) as V,r,'brass',r,6);}
 finish(name:string){const group=new Group();group.name=name;for(const [tone,geometries] of this.pieces){const g=mergeGeometries(geometries)!;geometries.forEach(x=>x.dispose());const m=new Mesh(g,this.materials[tone]);m.name=`${name}:${tone}`;m.castShadow=tone!=='eye';m.receiveShadow=tone!=='eye';group.add(m);}return group;}
}
interface Leg {hip:V;foot:V;phase:number;upper:Group;lower:Group;knee:Group;toe:Group;drive:Group;}
export interface DinosaurRig {species:Species;root:Group;legs:Leg[];wings:Group[];jaw?:Group;tail?:Group;materials:Record<Tone,MeshStandardMaterial>;}
function materials(){return Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new MeshStandardMaterial({color,metalness:k==='eye'?0:k==='brass'?.75:.64,roughness:k==='steel'?.3:.43,flatShading:true,side:DoubleSide,emissive:k==='eye'?color:'#000',emissiveIntensity:k==='eye'?1.8:0})])) as Record<Tone,MeshStandardMaterial>;}
function parts(rig:DinosaurRig){return new Parts(rig.materials);}
function leg(rig:DinosaurRig,hip:V,foot:V,phase:number){
 const p=parts(rig);p.joint(hip,rig.species==='rex'?.16:.135);rig.root.add(p.finish('hip-bearing'));
 const u=parts(rig);u.rod([0,0,0],[0,1,0],.065,'dark');u.plate([0,.47,.015],[.2,.68,.17],'armor',[0,0,.06],shield);u.plate([0,.56,.109],[.105,.31,.026],'light');u.rod([-.09,.18,-.012],[-.09,.82,-.012],.024,'steel');
 for(const y of [.25,.72])u.bolt([.06,y,.11],[0,0,1],.014);
 const l=parts(rig);l.rod([0,0,0],[0,1,0],.041,'steel');l.rod([0,0,0],[0,.53,0],.073,'dark');l.plate([0,.24,.055],[.15,.48,.06],'armor',[0,0,0],shield);l.rod([-.048,.1,.01],[-.048,.48,.01],.018,'brass');
 const k=parts(rig);k.joint([0,0,0],.102);
 const t=parts(rig);t.plate([0,.003,0],[.18,.116,.22],'frame');
 // All sole vertices remain exactly -.055 below the terrain anchor.
 for(const x of [-.062,0,.062]){t.plate([x,-.012,.108],[.055,.086,.2],'armor');t.rod([x,-.012,.193],[x,-.035,.244],.026,'light',.001);}
 t.plate([0,.071,-.047],[.12,.038,.12],'armor');t.joint([0,.106,-.05],.055);
 const d=parts(rig);d.piston([0,0,0],[0,1,0],.031);
 const data:Leg={hip,foot,phase,upper:u.finish('thigh-armor'),lower:l.finish('shin-hydraulics'),knee:k.finish('knee-servo'),toe:t.finish('grounded-claws'),drive:d.finish('leg-actuator')};
 rig.root.add(data.upper,data.lower,data.knee,data.toe,data.drive);rig.legs.push(data);
}
function tail(rig:DinosaurRig,origin:V,length:number,radius:number){
 const p=parts(rig);p.rod([0,0,0],[0,-.12,-length],radius*.56,'dark',.008);
 for(let i=0;i<7;i++){const f=i/7,z=-length*(f+.065),r=radius*(1-f*.88);
  p.plate([0,-.12*f,z],[r*1.8,r*1.45,length/7*.82],i%3===0?'light':'armor',[-.12,0,0],shield);
  for(const s of [-1,1]){p.plate([s*r*.68,-.12*f-.03,z],[r*.65,r*.9,length/7*.75],'frame',[0,s*Math.PI/2,0],shield);if(i<5)p.bolt([s*r*.99,-.12*f,z],[s,0,0],.011);}
 }
 p.rod([0,-.108,-length*.91],[0,-.12,-length],.022,'light',.003);
 rig.tail=p.finish('segmented-tail');rig.tail.position.set(...origin);rig.root.add(rig.tail);
}
function rex(rig:DinosaurRig){
 const b=parts(rig);b.plate([0,.88,-.02],[.42,.42,.64],'dark',[-.26,0,0]);b.plate([0,.88,.12],[.33,.41,.47],'frame',[-.28,0,0],shield);
 b.plate([0,.94,.36],[.26,.26,.05],'armor',[-.2,0,0],shield);b.plate([0,.77,.305],[.2,.17,.045],'light',[-.2,0,0],shield);
 for(const y of [.9,.965])b.plate([0,y,.392],[.115,.019,.012],'dark');
 for(const s of [-1,1]){
  for(let i=0;i<3;i++){const z=-.29+i*.2;b.plate([s*(.238+(.02-i*.008)),.97,z],[.27,.38,.065],i===1?'light':'armor',[0,s*Math.PI/2,s*.12],shield);b.bolt([s*.299,1.065,z+.035],[s,0,0]);b.rod([s*.185,.72,z],[s*.25,.89,z+.025],.025,'steel');}
  b.plate([s*.205,.7,-.18],[.27,.31,.1],'armor',[0,s*Math.PI/2,-s*.18],shield);b.piston([s*.2,1.02,.19],[s*.13,1.36,.47],.039);
  b.joint([s*.235,1.035,.23],.075);b.rod([s*.25,1.015,.27],[s*.33,.77,.39],.05,'frame');b.joint([s*.33,.77,.39],.055);b.rod([s*.33,.77,.39],[s*.3,.74,.51],.032,'armor');
  for(const dx of [-.03,.03])b.rod([s*.3+dx,.74,.51],[s*.3+dx,.7,.59],.016,'steel',.005);
  leg(rig,[s*.26,.71,-.13],[s*.29,0,-.08],s*Math.PI/2);
 }
 for(let i=0;i<4;i++){b.plate([0,1.12-i*.037,.18-i*.18],[.3,.075,.14],'armor',[-.24,0,0]);b.plate([0,1.165-i*.037,.18-i*.18],[.11,.016,.075],'frame');}
 b.rod([0,1,.25],[0,1.4,.49],.105,'dark');
 for(let i=0;i<3;i++)b.plate([0,1.12+i*.115,.3+i*.075],[.25,.17,.17],'armor',[-.4,0,0],shield);
 b.plate([0,1.48,.56],[.39,.28,.34],'frame',[0,0,0],shield);b.plate([0,1.48,.77],[.35,.23,.42],'armor',[-.06,0,0],shield);b.plate([0,1.605,.67],[.25,.046,.39],'light',[-.07,0,0]);b.plate([0,1.41,.96],[.26,.085,.052],'light');
 for(const s of [-1,1]){
  b.plate([s*.187,1.48,.53],[.21,.2,.043],'light',[0,s*Math.PI/2,0],shield);b.plate([s*.211,1.49,.586],[.038,.06,.11],'dark');b.plate([s*.233,1.496,.588],[.012,.034,.065],'eye');b.plate([s*.208,1.544,.59],[.04,.038,.165],'armor',[.08,0,0]);b.joint([s*.177,1.36,.435],.085);b.bolt([s*.192,1.505,.81],[s,0,0],.014);b.plate([s*.15,1.48,.935],[.028,.039,.043],'dark');
  for(let i=0;i<5;i++)b.rod([s*.13,1.372,.62+i*.072],[s*.128,1.298+(i%2)*.012,.633+i*.072],.023,'light',.002);
 }
 const j=parts(rig);j.plate([0,-.073,.245],[.3,.09,.49],'armor',[0,0,0],shield);j.plate([0,-.028,.24],[.24,.023,.37],'dark');
 for(const s of [-1,1]){j.rod([s*.14,-.03,.01],[s*.13,-.082,.37],.03,'steel');for(let i=0;i<4;i++)j.rod([s*.112,-.027,.19+i*.076],[s*.112,.028,.2+i*.076],.018,'light',.002);}
 rig.jaw=j.finish('articulated-jaw');rig.jaw.position.set(0,1.34,.435);rig.root.add(rig.jaw);rig.root.add(b.finish('rex-armored-body'));tail(rig,[0,.87,-.36],.84,.18);
}
function triceratops(rig:DinosaurRig){
 const b=parts(rig);b.plate([0,.62,-.08],[.61,.43,.8],'dark');b.plate([0,.67,-.06],[.62,.4,.74],'frame',[0,0,0],shield);
 for(let i=0;i<4;i++){const z=-.38+i*.19;b.plate([0,.875,z],[.49,.1,.165],i%2?'light':'armor',[0,0,0],shield);
  for(const s of [-1,1]){b.plate([s*.303,.735,z],[.19,.285,.06],i%2?'armor':'light',[0,s*Math.PI/2,s*.1],shield);b.bolt([s*.34,.79,z],[s,0,0],.016);b.rod([s*.27,.48,z],[s*.32,.64,z+.03],.022,'steel');}}
 for(const s of [-1,1]){for(const [i,z] of [-.34,.27].entries())leg(rig,[s*.29,.53,z],[s*.32,0,z],i*Math.PI+s);b.piston([s*.23,.67,.24],[s*.21,.57,.61],.04);}
 const frill=parts(rig);frill.joint([0,0,0],.185,[0,0,1]);
 for(let i=0;i<9;i++){const a=-Math.PI*.17+i*Math.PI*1.34/8,x=Math.cos(a)*.305,y=Math.sin(a)*.305;
  frill.plate([x,y,0],[.205,.39,.067],i%2?'armor':'light',[0,0,a-Math.PI/2],shield);frill.rod([Math.cos(a)*.12,Math.sin(a)*.12,-.035],[Math.cos(a)*.44,Math.sin(a)*.44,-.035],.018,'frame');frill.bolt([Math.cos(a)*.425,Math.sin(a)*.425,.044],[0,0,1],.013);}
 const f=frill.finish('radial-frill');f.position.set(0,.79,.39);f.rotation.x=-.23;rig.root.add(f);
 b.plate([0,.56,.64],[.35,.26,.42],'frame',[0,0,0],shield);b.plate([0,.6,.7],[.29,.22,.36],'armor',[.18,0,0],shield);b.plate([0,.485,.82],[.21,.1,.18],'light',[.16,0,0],shield);b.plate([0,.48,.875],[.18,.025,.09],'dark');
 for(const s of [-1,1]){
  b.plate([s*.177,.65,.59],[.035,.068,.115],'dark');b.plate([s*.197,.656,.6],[.014,.031,.064],'eye');b.plate([s*.18,.701,.59],[.065,.037,.14],'light',[0,0,s*.14]);b.rod([s*.16,.76,.6],[s*.18,.89,.78],.082,'dark',.065,8);b.rod([s*.18,.89,.78],[s*.21,1.055,1.045],.067,'light',.003,6);b.rod([s*.162,.78,.63],[s*.17,.815,.68],.078,'brass',.072,8);b.bolt([s*.173,.566,.715],[s,0,0],.014);
 }
 b.rod([0,.665,.84],[0,.89,.96],.061,'light',.003,6);rig.root.add(b.finish('triceratops-armored-body'));tail(rig,[0,.64,-.46],.51,.115);
}
function wing(rig:DinosaurRig,s:number){
 const b=parts(rig),a:V=[s*.12,.01,0],e:V=[s*.69,.08,-.18],tip:V=[s*1.64,-.04,-.64],rear:V=[s*.6,-.03,-.53],root:V=[s*.08,-.01,-.46];
 for(const [i,vertices] of ([[a,e,rear],[e,tip,rear],[a,rear,root]] as V[][]).entries()){
  const center=vertices.reduce((v,p)=>v.map((x,j)=>x+p[j]/3) as V,[0,0,0] as V),positions=vertices.flatMap(p=>p.map((v,j)=>center[j]+(v-center[j])*.955));
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.computeVertexNormals();b.add(g,i===1?'frame':'dark');
 }
 b.joint(a,.1,[0,1,0]);b.joint(e,.08,[0,1,0]);b.rod(a,e,.054,'armor');b.rod(e,tip,.043,'light',.008);b.rod(e,rear,.025,'steel');b.rod(a,root,.023,'steel');b.rod(root,rear,.016,'steel');b.rod(rear,tip,.016,'brass',.009);b.piston([s*.15,.048,-.23],[s*.59,.09,-.17],.03);b.rod([s*.7,.055,-.2],[s*1.15,-.012,-.5],.015,'steel');
 b.plate([s*.36,.053,-.074],[.34,.038,.115],'armor',[0,s*.3,0],shield);b.plate([s*.96,.055,-.322],[.33,.035,.09],'armor',[0,s*.41,0],shield);
 for(const at of [[s*.38,.077,-.08],[s*.94,.075,-.32]] as V[])b.bolt(at,[0,1,0],.012);
 const group=b.finish(s<0?'left-wing':'right-wing');rig.root.add(group);rig.wings.push(group);
}
function pterosaur(rig:DinosaurRig){
 const b=parts(rig);b.plate([0,0,-.03],[.2,.19,.47],'dark');for(let i=0;i<3;i++)b.plate([0,.078,-.17+i*.14],[.22,.09,.12],i===1?'light':'armor',[0,0,0],shield);
 b.rod([0,.04,.15],[0,.115,.31],.072,'frame');b.plate([0,.12,.3],[.17,.16,.19],'armor',[.2,0,0],shield);b.rod([0,.103,.34],[0,.04,.75],.073,'light',.002,5);b.rod([0,.052,.34],[0,.022,.7],.045,'frame',.002,5);b.rod([0,.167,.27],[0,.39,-.015],.073,'armor',.003,5);
 for(const s of [-1,1]){b.plate([s*.084,.142,.31],[.018,.037,.063],'dark');b.plate([s*.096,.146,.32],[.008,.021,.039],'eye');b.rod([s*.065,-.06,-.18],[s*.105,-.18,-.3],.029,'steel');b.joint([s*.1,-.16,-.29],.037);b.rod([s*.105,-.18,-.3],[s*.125,-.19,-.39],.021,'armor',.007);wing(rig,s);}
 b.rod([0,-.01,-.23],[0,-.08,-.63],.036,'armor',.004);rig.root.add(b.finish('pterosaur-armored-body'));
}
export function createDinosaur(species:Species):DinosaurRig{
 const rig:DinosaurRig={species,root:new Group(),legs:[],wings:[],materials:materials()};rig.root.name=`mechanical-${species}`;
 if(species==='rex')rex(rig);else if(species==='triceratops')triceratops(rig);else pterosaur(rig);poseDinosaur(rig,0);return rig;
}
const delta=new Vector3();
function link(group:Group,a:V,b:V){delta.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);group.position.set(...a);group.scale.y=delta.length();group.quaternion.setFromUnitVectors(up,delta.normalize());}
export function poseDinosaur(rig:DinosaurRig,time:number,position?:{x:number;y:number;z:number;heading:number},scale?:number){
 const path=position??creaturePath(rig.species,time),s=scale??creatureSpecs[rig.species].scale;
 for(const l of rig.legs){
  const fz=l.foot[2]+Math.sin(time*2+l.phase)*.08,wx=path.x+(l.foot[0]*Math.cos(path.heading)+fz*Math.sin(path.heading))*s,wz=path.z+(-l.foot[0]*Math.sin(path.heading)+fz*Math.cos(path.heading))*s,fy=(groundHeight(wx,wz)-path.y)/s+.055;
  const k:V=[l.hip[0]+Math.sign(l.hip[0])*.065,l.hip[1]*.57+fy*.43,l.hip[2]+(rig.species==='rex'?.16:-.08)],f:V=[l.foot[0],fy+.106,fz-.005];
  link(l.upper,l.hip,k);link(l.lower,k,f);l.knee.position.set(...k);l.toe.position.set(l.foot[0],fy,fz+.045);link(l.drive,[l.hip[0]*1.07,l.hip[1]-.04,l.hip[2]-.08],[k[0]*1.04,k[1],k[2]-.06]);
 }
 if(rig.jaw)rig.jaw.rotation.x=.19+Math.sin(time*.8)*.035;if(rig.tail)rig.tail.rotation.y=Math.sin(time*1.1)*.025;
 rig.wings.forEach((g,i)=>g.rotation.z=(i===0?1:-1)*Math.sin(time*2.1)*.16);
}
export function disposeDinosaur(rig:DinosaurRig){rig.root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});Object.values(rig.materials).forEach(m=>m.dispose());}
