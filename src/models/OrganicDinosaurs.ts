import { BufferGeometry,CatmullRomCurve3,ConeGeometry,CylinderGeometry,DoubleSide,Euler,Float32BufferAttribute,Group,IcosahedronGeometry,Matrix4,Mesh,MeshStandardMaterial,Quaternion,Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Species } from '../world/paths';
import { habitatGround,WATER_LEVEL } from '../world/habitat';
type V=[number,number,number];
type Finish='skin'|'belly'|'stripe'|'horn'|'eye'|'iris';
export interface OrganicRig {species:Species;root:Group;materials:Record<Finish,MeshStandardMaterial>;legs:{hip:V;foot:V;phase:number;upper:Group;lower:Group;toe:Group}[];head:Group;tail:Group;wings:Group[];headOrigin:V;neck?:{root:V;segments:Group[];joints:Group[]};}
const palettes:Record<Species,[string,string,string]>={rex:['#72865c','#b7ba81','#3b5748'],triceratops:['#927a54','#c7b17c','#5c6450'],stegosaurus:['#758364','#b0b37b','#b86e46'],brachiosaurus:['#829b81','#c4c6a0','#536e59'],velociraptor:['#ae875b','#d4bf91','#554e48'],pterosaur:['#b18d65','#d8c293','#675f4f'],spinosaurus:['#68685c','#bbb29a','#793f30']};
const up=new Vector3(0,1,0);
class Pieces{
 private pieces=new Map<Finish,BufferGeometry[]>();
 constructor(private rig:OrganicRig){}
 add(g:BufferGeometry,finish:Finish,at:V=[0,0,0],scale:V=[1,1,1],rotation:V=[0,0,0]){
  if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}g.deleteAttribute('uv');g.applyMatrix4(new Matrix4().compose(new Vector3(...at),new Quaternion().setFromEuler(new Euler(...rotation)),new Vector3(...scale)));
  const list=this.pieces.get(finish)??[];list.push(g);this.pieces.set(finish,list);return this;
 }
 skin(at:V,size:V,finish:Finish='skin',detail=3){return this.add(new IcosahedronGeometry(1,Math.max(2,detail)),finish,at,size);}
 rod(a:V,b:V,r:number,r2=r,finish:Finish='skin',segments=16){const av=new Vector3(...a),bv=new Vector3(...b),g=new CylinderGeometry(r2,r,av.distanceTo(bv),segments,2);g.applyQuaternion(new Quaternion().setFromUnitVectors(up,bv.clone().sub(av).normalize()));return this.add(g,finish,av.add(bv).multiplyScalar(.5).toArray() as V);}
 spike(at:V,r:number,h:number,finish:Finish='horn',rotation:V=[0,0,0],scale:V=[1,1,1]){return this.add(new ConeGeometry(r,h,5),finish,at,scale,rotation);}
 finish(name:string){const group=new Group();group.name=name;for(const [finish,parts] of this.pieces){const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());const mesh=new Mesh(g,this.rig.materials[finish]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}return group;}
}
function addLeg(rig:OrganicRig,hip:V,foot:V,phase:number,r=.12){
 const u=new Pieces(rig).rod([0,0,0],[0,1,0],r,r*.82).finish('organic-thigh');
 const l=new Pieces(rig).rod([0,0,0],[0,1,0],r*.65,r*.75).finish('organic-shin');
 const t=new Pieces(rig).skin([0,.055,.07],[r*.95,.055,r*1.5],'belly');
 for(const x of [-.07,0,.07])t.skin([x,.03,r*1.6],[.025,.025,.065],'horn',0);
 const toe=t.finish('organic-foot');rig.legs.push({hip,foot,phase,upper:u,lower:l,toe});rig.root.add(u,l,toe);
}
function eyes(p:Pieces,x:number,y:number,z:number){for(const s of [-1,1]){p.skin([s*x,y,z],[.023,.042,.048],'horn');p.skin([s*(x+.018),y+.004,z+.014],[.013,.027,.027],'iris');p.skin([s*(x+.026),y+.005,z+.02],[.007,.021,.012],'eye');}}
function tail(rig:OrganicRig,origin:V,length:number,r:number){
 const curve=new CatmullRomCurve3([new Vector3(0,0,0),new Vector3(0,-.025,-length*.35),new Vector3(.02,.06,-length*.72),new Vector3(.04,.16,-length)]),frames=curve.computeFrenetFrames(20,false),positions:number[]=[],normals:number[]=[],indices:number[]=[];
 for(let i=0;i<=20;i++){const p=curve.getPointAt(i/20),radius=.006+r*Math.pow(1-i/20,1.1);for(let j=0;j<=16;j++){const a=j/16*Math.PI*2,n=frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a));positions.push(p.x+n.x*radius,p.y+n.y*radius,p.z+n.z*radius);normals.push(n.x,n.y,n.z);}}
 for(let i=0;i<20;i++)for(let j=0;j<16;j++){const a=i*17+j,b=a+17;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('normal',new Float32BufferAttribute(normals,3));g.setIndex(indices);const mesh=new Mesh(g,rig.materials.skin);mesh.castShadow=true;rig.tail=new Group();rig.tail.add(mesh);rig.tail.position.set(...origin);rig.root.add(rig.tail);
}
function neck(rig:OrganicRig,root:V,radius:number,tip:number){
 const segments:Group[]=[],joints:Group[]=[];
 for(let i=0;i<5;i++){const r=radius+(tip-radius)*i/5,r2=radius+(tip-radius)*(i+1)/5,segment=new Pieces(rig).rod([0,0,0],[0,1,0],r,r2).finish('organic-neck-muscle'),joint=new Pieces(rig).skin([0,0,0],[r,r,r]).finish('organic-neck-joint');segments.push(segment);joints.push(joint);rig.root.add(segment,joint);}
 rig.neck={root,segments,joints};
}
function theropod(rig:OrganicRig,raptor:boolean){
 const p=new Pieces(rig),k=raptor?.66:1;
 p.skin([0,.87*k,-.12],[.33*k,.42*k,.58*k]);p.skin([0,.72*k,.06],[.27*k,.3*k,.42*k],'belly');
 for(let i=0;i<6;i++)p.skin([0,(1.20-i*.035)*k,(-.42+i*.15)*k],[.075*k,.05*k,.06*k],'stripe',0);
 for(const s of [-1,1]){p.rod([s*.25*k,1.01*k,.3*k],[s*.4*k,.83*k,.48*k],.065*k,.045*k);p.rod([s*.4*k,.83*k,.48*k],[s*.38*k,.9*k,.68*k],.045*k,.018*k);
  for(const dx of [-.025,.025])p.rod([s*.38*k+dx,.9*k,.66*k],[s*.38*k+dx,.86*k,.77*k],.016,.002,'horn');
  addLeg(rig,[s*.26*k,.74*k,-.16*k],[s*.29*k,0,.01*k],s*Math.PI/2,.15*k);
  if(raptor)for(let i=0;i<5;i++)p.spike([s*(.4+i*.035)*k,.85*k,(.38-i*.075)*k],.07,.29,'stripe',[0,0,s*.85],[.28,1,1]);
 }
 rig.root.add(p.finish('organic-theropod-body'));
 const h=new Pieces(rig);h.skin([0,.1,.16],[.29*k,.235*k,.35*k]);h.skin([0,.035,.4*k],[.245*k,.16*k,.27*k]);h.skin([0,-.10*k,.32*k],[.23*k,.065*k,.31*k],'belly');
 h.rod([-.22*k,-.04*k,.17*k],[-.22*k,-.04*k,.57*k],.012,.012,'stripe');h.rod([.22*k,-.04*k,.17*k],[.22*k,-.04*k,.57*k],.012,.012,'stripe');eyes(h,.27*k,.17*k,.15*k);
 for(const s of [-1,1])for(let i=0;i<5;i++)h.spike([s*.17*k,-.04*k,(.2+i*.07)*k],.017*k,.065*k,'horn',[Math.PI,0,0]);
 rig.headOrigin=[0,1.35*k,.43*k];rig.head=h.finish('organic-theropod-head');rig.head.position.set(...rig.headOrigin);rig.root.add(rig.head);neck(rig,[0,1.02*k,.18*k],.23*k,.16*k);tail(rig,[0,.8*k,-.55*k],raptor?1.15:1.0,.21*k);
}
function ceratopsian(rig:OrganicRig){
 const p=new Pieces(rig);p.skin([0,.66,-.1],[.43,.4,.7]);p.skin([0,.48,.16],[.34,.24,.52],'belly');
 for(const s of [-1,1])for(const [i,z] of [-.5,.43].entries())addLeg(rig,[s*.31,.61,z],[s*.34,0,z+.06],i*Math.PI+s,.145);
 for(let i=0;i<6;i++)p.skin([0,.99,-.55+i*.18],[.07,.06,.06],'stripe',0);rig.root.add(p.finish('organic-triceratops-body'));
 const h=new Pieces(rig);h.skin([0,.06,.2],[.29,.26,.42]);h.skin([0,-.06,.48],[.22,.15,.21],'belly');
 h.add(new CylinderGeometry(.48,.43,.10,10),'stripe',[0,.36,-.12],[1,1,1],[Math.PI/2-.2,0,0]);
 for(let i=0;i<9;i++){const a=i/8*Math.PI;h.spike([Math.cos(a)*.46,.36+Math.sin(a)*.46,-.12],.065,.13,'horn',[0,0,a-Math.PI/2]);}
 for(const s of [-1,1])h.rod([s*.17,.27,.28],[s*.22,.61,.74],.072,.003,'horn');h.rod([0,.17,.59],[0,.39,.72],.052,.002,'horn');eyes(h,.282,.16,.27);
 rig.headOrigin=[0,.58,.58];rig.head=h.finish('organic-triceratops-head');rig.head.position.set(...rig.headOrigin);rig.root.add(rig.head);neck(rig,[0,.67,.39],.23,.19);tail(rig,[0,.62,-.68],.65,.15);
}
function stegosaur(rig:OrganicRig){
 const p=new Pieces(rig);p.skin([0,.65,-.08],[.41,.43,.73]);
 for(const s of [-1,1])for(const [i,z] of [-.47,.46].entries())addLeg(rig,[s*.29,.59,z],[s*.31,0,z+.05],i*Math.PI+s,.13);
 for(let i=0;i<9;i++){const z=-.67+i*.17,height=.25+Math.sin(i/8*Math.PI)*.43;p.spike([i%2?.11:-.11,.96+height*.38,z],.25,height,'stripe',[0,0,i%2?.12:-.12],[.30,1,1]);}
 rig.root.add(p.finish('organic-stegosaurus'));const h=new Pieces(rig);h.skin([0,0,.09],[.13,.13,.23]);eyes(h,.12,.04,.14);rig.headOrigin=[0,.34,.95];rig.head=h.finish('organic-stegosaurus-head');rig.head.position.set(...rig.headOrigin);rig.root.add(rig.head);neck(rig,[0,.58,.45],.21,.10);tail(rig,[0,.56,-.69],.90,.17);
 const th=new Pieces(rig);for(const s of [-1,1])for(const z of [-.61,-.79])th.rod([0,.10,z],[s*.28,.39,z-.13],.045,.002,'horn');rig.tail.add(th.finish('thagomizer'));
}
function sauropod(rig:OrganicRig){
 const p=new Pieces(rig);p.skin([0,1.02,-.07],[.48,.48,.77]);p.skin([0,.83,.14],[.38,.28,.62],'belly');
 for(const s of [-1,1])for(const [i,z] of [-.52,.45].entries())addLeg(rig,[s*.34,i===0?.91:1.13,z],[s*.37,0,z+.04],i*Math.PI+s,.17);
 for(let i=0;i<6;i++)for(const s of [-1,1])p.skin([s*.43,1.12,-.57+i*.2],[.05,.13,.07],'stripe',0);
 rig.root.add(p.finish('organic-brachiosaurus-body'));
 const h=new Pieces(rig);h.skin([0,0,.10],[.18,.18,.28]);h.skin([0,-.08,.26],[.14,.10,.16],'belly');eyes(h,.17,.06,.13);
 rig.headOrigin=[0,2.97,.82];rig.head=h.finish('organic-brachiosaurus-head');rig.head.position.set(...rig.headOrigin);rig.root.add(rig.head);neck(rig,[0,1.25,.48],.26,.12);tail(rig,[0,.97,-.73],1.12,.21);
}
function flyer(rig:OrganicRig){
 const p=new Pieces(rig);p.skin([0,0,-.08],[.14,.14,.4]);p.rod([0,.04,.18],[0,.12,.40],.09,.06);p.rod([0,.1,.4],[0,.04,.93],.075,.001,'horn',5);p.rod([0,.19,.35],[0,.47,-.05],.08,.002,'stripe',5);eyes(p,.10,.15,.38);
 for(const s of [-1,1])p.rod([s*.08,-.04,-.23],[s*.15,-.23,-.45],.032,.008);rig.root.add(p.finish('organic-pterosaur-body'));
 for(const s of [-1,1]){const w=new Pieces(rig),points=[s*.10,0,.08,s*.70,.04,-.08,s*1.65,-.10,-.62,s*.10,0,.08,s*1.65,-.10,-.62,s*.33,-.05,-.58];const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(points,3));g.computeVertexNormals();w.add(g,'belly');w.rod([s*.10,0,.08],[s*.70,.04,-.08],.046,.035);w.rod([s*.70,.04,-.08],[s*1.65,-.10,-.62],.035,.006);w.rod([s*.10,0,.08],[s*.33,-.05,-.58],.025,.009,'stripe');const wing=w.finish('organic-wing');rig.wings.push(wing);rig.root.add(wing);}
}
export function createOrganicDinosaur(species:Species,variant=0):OrganicRig{
 const palette=palettes[species],materials=Object.fromEntries(Object.entries({skin:palette[0],belly:palette[1],stripe:palette[2],horn:'#d7cfad',eye:'#141b16',iris:'#cbb15c'}).map(([key,color])=>{const material=new MeshStandardMaterial({color,roughness:key==='eye'?.22:.78,metalness:0,flatShading:false,side:DoubleSide});if(key==='skin'){
  material.color.offsetHSL((variant%3-1)*.013,(variant%2)*.04,(variant%4-1.5)*.025);
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSkinPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSkinPosition=position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSkinPosition;\nfloat skinHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}')
    .replace('#include <color_fragment>','#include <color_fragment>\nfloat fleck=skinHash(floor(vSkinPosition*75.));float stripes=smoothstep(.42,.8,.5+.5*sin(vSkinPosition.z*15.+sin(vSkinPosition.y*14.)*1.8));diffuseColor.rgb*=mix(.76,1.12,fleck)*mix(.74,1.,stripes);')
    .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nfloat grain=skinHash(floor(vSkinPosition*95.));normal=normalize(normal+vec3(dFdx(grain),dFdy(grain),0.)*.055);');
  };material.customProgramCacheKey=()=>`dinosaur-skin-v1`;
 }return [key,material];})) as Record<Finish,MeshStandardMaterial>;
 const rig:OrganicRig={species,root:new Group(),materials,legs:[],head:new Group(),headOrigin:[0,0,0],tail:new Group(),wings:[]};rig.root.name=`organic-${species}`;
 if(species==='rex'||species==='velociraptor')theropod(rig,species==='velociraptor');else if(species==='triceratops')ceratopsian(rig);else if(species==='stegosaurus')stegosaur(rig);else if(species==='brachiosaurus')sauropod(rig);else flyer(rig);
 return rig;
}
const delta=new Vector3();
function link(group:Group,a:V,b:V){delta.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);group.position.set(...a);group.scale.y=delta.length();group.quaternion.setFromUnitVectors(up,delta.normalize());}
export function poseOrganicDinosaur(rig:OrganicRig,time:number,path:{x:number;y:number;z:number;heading:number},scale:number,drink=0,alert=false,reach=1.15){
 const gait=time*(rig.species==='brachiosaurus'?1.7:2.6),c=Math.cos(path.heading),sn=Math.sin(path.heading);
 for(const leg of rig.legs){const phase=gait+leg.phase,stride=drink>0?0:Math.sin(phase)*.12,lift=drink>0?0:Math.max(0,Math.cos(phase))*.07,fz=leg.foot[2]+stride;
  const wx=path.x+(leg.foot[0]*c+fz*sn)*scale,wz=path.z+(-leg.foot[0]*sn+fz*c)*scale,fy=(habitatGround(wx,wz)-path.y)/scale+lift;
  const knee:V=[leg.hip[0],leg.hip[1]*.52+fy*.48,leg.hip[2]+.12],foot:V=[leg.foot[0],fy+.09,fz];link(leg.upper,leg.hip,knee);link(leg.lower,knee,foot);leg.toe.position.set(leg.foot[0],fy,fz);
 }
 rig.tail.rotation.y=Math.sin(time*1.6)*.095;rig.head.rotation.y=drink>0?0:Math.sin(time*.63)*.09;
 const tall=rig.species==='brachiosaurus',angle=tall?.42:rig.species==='rex'||rig.species==='velociraptor'?.95:.72;
 rig.head.rotation.x=drink*angle+(alert?-.10:0);
 const mouth:V=tall?[0,-.08,.38]:rig.species==='triceratops'?[0,-.06,.59]:rig.species==='stegosaurus'?[0,-.035,.27]:[0,-.04,rig.species==='velociraptor'?.39:.58];
 const mouthY=mouth[1]*Math.cos(angle)-mouth[2]*Math.sin(angle),mouthZ=mouth[1]*Math.sin(angle)+mouth[2]*Math.cos(angle);
 rig.head.position.y=rig.headOrigin[1]*(1-drink)+drink*((WATER_LEVEL-path.y)/scale-mouthY+.015);
 rig.head.position.z=rig.headOrigin[2]*(1-drink)+drink*(reach/scale-mouthZ);
 if(rig.neck){const from=new Vector3(...rig.neck.root),to=rig.head.position.clone(),bend=from.clone().lerp(to,.5);bend.y+=tall?.35:.12;const curve=new CatmullRomCurve3([from,bend,to]);rig.neck.segments.forEach((segment,i)=>{const a=curve.getPointAt(i/5),b=curve.getPointAt((i+1)/5);link(segment,a.toArray() as V,b.toArray() as V);rig.neck!.joints[i].position.copy(a);});}
 rig.wings.forEach((wing,i)=>wing.rotation.z=(i===0?1:-1)*Math.sin(time*2.7)*.23);
}
export function disposeOrganicDinosaur(rig:OrganicRig){rig.root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});Object.values(rig.materials).forEach(m=>m.dispose());}
