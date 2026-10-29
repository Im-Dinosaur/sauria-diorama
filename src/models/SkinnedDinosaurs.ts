import { AnimationClip,Bone,BufferGeometry,CatmullRomCurve3,Color,DoubleSide,Float32BufferAttribute,Group,MeshStandardMaterial,Quaternion,QuaternionKeyframeTrack,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector2,Vector3,VectorKeyframeTrack } from 'three';
import type { Species } from '../world/paths';
import { habitatGround,WATER_LEVEL } from '../world/habitat';
import { dinosaurSkin,SKIN_PALETTES,skinPigment,skinNoise,TEXTURE_SIZE } from './DinosaurSkin';
import { shapes,MOUTH_TIPS,drinkingPosture,drinkingPitch,neckLengths,solveNeckJoints } from './dinosaurAnatomy';
import type { V } from './dinosaurAnatomy';
export { MOUTH_TIPS } from './dinosaurAnatomy';

type Finish='skin'|'horn'|'mouth'|'eye'|'iris'|'feather'|'membrane'|'plate';
export type DinosaurAction='idle'|'walk'|'run'|'roar'|'drink'|'graze'|'browse'|'rest'|'alert'|'hunt'|'fish'|'fly'|'glide'|'display';
export interface Leg {hip:V;knee:V;foot:V;phase:number;upper:Bone;lower:Bone;toe:Bone;front:boolean;ankle?:V;hock?:Bone;}
export interface OrganicRig {
 species:Species;root:Group;mesh:SkinnedMesh;skeleton:Skeleton;bones:Bone[];materials:Record<Finish,MeshStandardMaterial>;
 hips:Bone;chest:Bone;head:Bone;jaw:Bone;tail:Bone;tailBones:Bone[];neckBones:Bone[];wings:Bone[];wingTips:Bone[];legs:Leg[];headOrigin:V;
 rest:Map<Bone,Vector3>;absolute:Map<Bone,Vector3>;clips:AnimationClip[];
}
const finishes:Finish[]=['skin','horn','mouth','eye','iris','feather','membrane','plate'];
const vec=(v:V)=>new Vector3(...v),tuple=(v:Vector3)=>v.toArray() as V;
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
function torso(species:Species,t:number){
 const shape=shapes[species],profile=[.10,.58,.90,1,.93,.72,.16],k=t*(profile.length-1),i=Math.min(profile.length-2,Math.floor(k)),u=k-i,f=u*u*(3-2*u),bulge=profile[i]*(1-f)+profile[i+1]*f;
 return {z:-shape.length+t*(shape.length+(shape.biped?.63:.72)),y:shape.y+.025*Math.sin(t*Math.PI)+(species==='brachiosaurus'?(t-.5)*.28:species==='stegosaurus'?.065*Math.sin(t*Math.PI):0),rx:shape.width*bulge,ry:shape.height*Math.pow(bulge,.85)};
}

/** Indexed smooth surfaces, blended bone weights, UV microstructure and vertex pigmentation. */
class Surface {
 positions:number[]=[];uvs:number[]=[];colors:number[]=[];indices:number[]=[];joints:number[]=[];weights:number[]=[];
 groups:{start:number;count:number;materialIndex:number}[]=[];
 constructor(private rig:OrganicRig){}
 boneIndex(b:Bone){return this.rig.bones.indexOf(b);}
 vertex(p:Vector3,u:number,v:number,a:Bone,b=a,w=0,finish:Finish='skin',belly=0){
  const index=this.positions.length/3;this.positions.push(p.x,p.y,p.z);this.uvs.push(u,v);
  const c=finish==='skin'||finish==='feather'?skinPigment(this.rig.species,p.x,p.y,p.z,belly):new Color('#ffffff');
  this.colors.push(c.r,c.g,c.b);this.joints.push(this.boneIndex(a),this.boneIndex(b),0,0);this.weights.push(1-w,w,0,0);return index;
 }
 group(start:number,finish:Finish){this.groups.push({start,count:this.indices.length-start,materialIndex:finishes.indexOf(finish)});}
 tube(points:V[],radii:[number,number][],bones:Bone[],finish:Finish='skin',steps=32,sides=20,square=0){
  const curve=new CatmullRomCurve3(points.map(vec)),offset=this.positions.length/3,start=this.indices.length,length=curve.getLength();
  for(let i=0;i<=steps;i++){
   const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t),axisX=Math.abs(tangent.x)>.85?new Vector3(0,0,1):new Vector3(1,0,0),axisY=new Vector3().crossVectors(tangent,axisX).normalize();axisX.crossVectors(axisY,tangent).normalize();
   const k=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(k)),f=k-j,rx=radii[j][0]*(1-f)+radii[j+1][0]*f,ry=radii[j][1]*(1-f)+radii[j+1][1]*f;
   const bk=t*(bones.length-1),bi=Math.min(bones.length-1,Math.floor(bk)),bw=bk-bi;
   for(let a=0;a<=sides;a++){
    const angle=a/sides*Math.PI*2,cs=Math.cos(angle),sn=Math.sin(angle),cx=Math.sign(cs)*Math.abs(cs)**(1-square),cy=Math.sign(sn)*Math.abs(sn)**(1-square*.65),q=p.clone().addScaledVector(axisX,cx*rx).addScaledVector(axisY,cy*ry);
    const fold=1+(finish==='skin'?(Math.sin(t*62+Math.sin(angle*3)*.9)*.006+skinNoise(t*18,a/sides*12)*.010)*Math.sin(angle*2)**2:finish==='horn'?Math.sin(t*105)*.018:0);q.sub(p).multiplyScalar(fold).add(p);
    const surfaceNormal=axisX.clone().multiplyScalar(cs).addScaledVector(axisY,sn);
    const index=this.vertex(q,a/sides*Math.max(.45,(rx+ry)*4),t*length*2.5,bones[bi],bones[Math.min(bi+1,bones.length-1)],bw,finish,clamp(-surfaceNormal.y*.9-.1));
    if(finish==='horn'){const tint=.48+.52*Math.sqrt(t);this.colors[index*3]*=tint;this.colors[index*3+1]*=tint;this.colors[index*3+2]*=tint;}
   }
  }
  for(let i=0;i<steps;i++)for(let a=0;a<sides;a++){const j=offset+i*(sides+1)+a,b=j+sides+1;this.indices.push(j,j+1,b,b,j+1,b+1);}
  const first=this.vertex(vec(points[0]),0,0,bones[0],bones[0],0,finish),last=this.vertex(vec(points[points.length-1]),0,1,bones[bones.length-1],bones[bones.length-1],0,finish);
  for(let a=0;a<sides;a++){this.indices.push(first,offset+a+1,offset+a);const end=offset+steps*(sides+1);this.indices.push(last,end+a,end+a+1);}this.group(start,finish);
 }
 ellipsoid(at:V,size:V,bone:Bone,finish:Finish='skin',sides=20,rings=12){
  const start=this.indices.length,offset=this.positions.length/3;
  for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){
   const a=i/sides*Math.PI*2,b=j/rings*Math.PI,p=new Vector3(at[0]+Math.cos(a)*Math.sin(b)*size[0],at[1]+Math.cos(b)*size[1],at[2]+Math.sin(a)*Math.sin(b)*size[2]);
   this.vertex(p,i/sides*size[0]*7,j/rings*size[1]*7,bone,bone,0,finish,clamp(-Math.cos(b)*.85));
  }
  for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const a=offset+j*(sides+1)+i,b=a+sides+1;this.indices.push(a,a+1,b,b,a+1,b+1);}this.group(start,finish);
 }
 horn(a:V,b:V,r:number,bone:Bone,finish:Finish='horn',bend=.04){this.tube([a,[(a[0]+b[0])/2,(a[1]+b[1])/2+bend,(a[2]+b[2])/2],b],[[r,r],[r*.6,r*.6],[.001,.001]],[bone],finish,12,10);}
 sheet(points:V[],bone:Bone,finish:Finish='skin',tipBone=bone){
  const start=this.indices.length,base=this.positions.length/3;points.forEach((p,i)=>this.vertex(vec(p),i%2,Math.floor(i/2),bone,tipBone,i>1?1:0,finish));
  for(let i=1;i<points.length-1;i++)this.indices.push(base,base+i,base+i+1);this.group(start,finish);
 }
 feather(a:V,b:V,width:number,bone:Bone,normal:V=[0,1,0]){
  const start=this.indices.length,offset=this.positions.length/3,from=vec(a),to=vec(b),direction=to.clone().sub(from),n=vec(normal).normalize(),across=new Vector3().crossVectors(direction,n).normalize();
  for(let i=0;i<=5;i++)for(let j=0;j<3;j++){const t=i/5,w=Math.sin(t*Math.PI)**.6*width*(1-t*.6),p=from.clone().addScaledVector(direction,t).addScaledVector(across,(j-1)*w).addScaledVector(n,Math.sin(t*Math.PI)*(j===1?.003:0));this.vertex(p,j/2,t,bone,bone,0,'feather',clamp(-n.y*.6));}
  for(let i=0;i<5;i++)for(let j=0;j<2;j++){const a=offset+i*3+j,b=a+3;this.indices.push(a,b,a+1,b,b+1,a+1);}this.group(start,'feather');
 }
 plate(x:number,outline:[number,number][],thickness:number,bone:Bone){
  const start=this.indices.length,n=outline.length,cy=outline.reduce((v,p)=>v+p[0],0)/n,cz=outline.reduce((v,p)=>v+p[1],0)/n;
  for(const side of [-1,1]){const center=this.vertex(new Vector3(x+side*thickness*1.3,cy,cz),.5,.5,bone,bone,0,'plate'),edge=outline.map(([y,z],i)=>this.vertex(new Vector3(x+side*thickness*.45,y,z),i/n,y,bone,bone,0,'plate'));for(let i=0;i<n;i++){const a=edge[i],b=edge[(i+1)%n];this.indices.push(center,...(side<0?[b,a]:[a,b]));}}
  for(let i=0;i<n;i++){const p=outline[i],q=outline[(i+1)%n],a=this.vertex(new Vector3(x-thickness*.45,p[0],p[1]),0,0,bone,bone,0,'plate'),b=this.vertex(new Vector3(x+thickness*.45,p[0],p[1]),1,0,bone,bone,0,'plate'),c=this.vertex(new Vector3(x-thickness*.45,q[0],q[1]),0,1,bone,bone,0,'plate'),d=this.vertex(new Vector3(x+thickness*.45,q[0],q[1]),1,1,bone,bone,0,'plate');this.indices.push(a,b,c,b,d,c);}this.group(start,'plate');
 }
 finish(){
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(this.positions,3));g.setAttribute('uv',new Float32BufferAttribute(this.uvs,2));g.setAttribute('color',new Float32BufferAttribute(this.colors,3));g.setAttribute('skinIndex',new Uint16BufferAttribute(this.joints,4));g.setAttribute('skinWeight',new Float32BufferAttribute(this.weights,4));
  const sorted:number[]=[];for(let m=0;m<finishes.length;m++){const start=sorted.length;for(const group of this.groups)if(group.materialIndex===m)for(let i=group.start;i<group.start+group.count;i++)sorted.push(this.indices[i]);if(sorted.length>start)g.addGroup(start,sorted.length-start,m);}g.setIndex(sorted);g.computeVertexNormals();g.computeBoundingSphere();return g;
 }
}
function addBone(rig:OrganicRig,name:string,position:V,parent?:Bone){
 const b=new Bone();b.name=name;const absolute=vec(position);b.position.copy(absolute);if(parent)b.position.sub(rig.absolute.get(parent)!);(parent??rig.root).add(b);rig.bones.push(b);rig.rest.set(b,b.position.clone());rig.absolute.set(b,absolute);return b;
}
function makeMaterials(species:Species,variant:number){
 const maps=dinosaurSkin(species),palette=SKIN_PALETTES[species];
 const skin=new MeshStandardMaterial({...maps,vertexColors:true,roughness:1,metalness:0,normalScale:new Vector2(.65,.65)});skin.color.offsetHSL((variant%3-1)*.008,0,(variant%4-1.5)*.012);
 const materials={skin,horn:new MeshStandardMaterial({color:'#b3a58b',roughness:.68,metalness:0,vertexColors:true}),mouth:new MeshStandardMaterial({color:'#49302b',roughness:.48}),eye:new MeshStandardMaterial({color:'#11130e',roughness:.10}),iris:new MeshStandardMaterial({color:palette.iris,roughness:.24}),feather:new MeshStandardMaterial({color:'#ece5d7',vertexColors:true,roughness:.91,side:DoubleSide}),membrane:new MeshStandardMaterial({...maps,color:palette.belly,vertexColors:true,roughness:1,normalScale:new Vector2(.35,.35),side:DoubleSide}),plate:new MeshStandardMaterial({...maps,color:'#815a40',roughness:.85,normalScale:new Vector2(.35,.35),side:DoubleSide})};
 for(const [name,m] of Object.entries(materials))m.name=`${species}-${name}`;return materials;
}
function buildLeg(rig:OrganicRig,s:Surface,side:number,z:number,front:boolean,phase:number){
 const shape=shapes[rig.species],biped=shape.biped,raptor=rig.species==='velociraptor',sauropod=rig.species==='brachiosaurus',width=shape.width*(biped?.76:.76),hip:V=[side*width,shape.y*(sauropod?(front?1.16:.89):front?1.01:.96),z],foot:V=[side*width*1.10,.075,z+(biped?.18:.015)],knee:V=[side*width*1.11,hip[1]*.56,z+(front?-.09:biped?.22:.10)];
 const prefix=`${front?'front':'hind'}_${side<0?'L':'R'}`,upper=addBone(rig,`${prefix}_thigh`,hip,rig.hips),lower=addBone(rig,`${prefix}_shin`,knee,upper),ankle:V|undefined=biped?[side*width*1.10,shape.y*.27,z-.14]:undefined,hock=ankle?addBone(rig,`${prefix}_hock`,ankle,lower):undefined,toe=addBone(rig,`${prefix}_foot`,foot,hock??lower),r=shape.width*(biped?.48:.35);
 rig.legs.push({hip,knee,foot,phase,upper,lower,toe,front,ankle,hock});
 const origin:V=[hip[0]*.64,hip[1]+.08,hip[2]-.035];
 if(ankle&&hock)s.tube([origin,hip,knee,ankle,foot],[[r*.12,r*.18],[r*1.4,r*1.5],[r*.66,r*.80],[r*.32,r*.38],[r*.32,r*.35]],[upper,upper,lower,hock,toe],'skin',42,24);
 else s.tube([origin,hip,knee,foot],[[r*.12,r*.16],[r*1.2,r*1.24],[r*.83,r*.90],[r*.66,r*.64]],[upper,upper,lower,toe],'skin',32,24);
 s.ellipsoid([foot[0],.060,foot[2]+.035],[r*(biped?.63:.82),.060,biped?r*.83:r*.91],toe);
 const count=raptor?2:biped?3:sauropod&&front?0:4;for(let i=0;i<count;i++){
  const x=foot[0]+(i-(count-1)/2)*r*(biped?.49:.39),tipZ=foot[2]+r*(biped?2.45:1.03)-Math.abs(i-(count-1)/2)*r*.23;
  s.tube([[x,.060,foot[2]+.025],[x,.031,tipZ]],[[r*(biped?.18:.24),r*.22],[r*.13,r*.13]],[toe],'skin',8,10);
  if(biped)s.horn([x,.040,tipZ-.025],[x,.018,tipZ+.07],r*.16,toe,'horn',.022);
  else s.ellipsoid([x,.035,tipZ+.008],[r*.17,.028,.035],toe,'horn',12,8);
 }
 if(sauropod&&front)s.horn([foot[0]-side*r*.65,.055,foot[2]+.02],[foot[0]-side*r*.75,.035,foot[2]+.10],r*.22,toe,'horn',.018);
 if(raptor){s.tube([[foot[0]-side*.05,.085,foot[2]+.015],[foot[0]-side*.065,.15,foot[2]+.09]],[[.020,.022],[.013,.013]],[toe],'skin',8,10);s.horn([foot[0]-side*.065,.15,foot[2]+.09],[foot[0]-side*.065,.16,foot[2]+.23],.023,toe,'horn',.115);}
}
function eyes(s:Surface,head:Bone,at:V,width:number,small=false){
 for(const side of [-1,1]){
  const x=at[0]+side*width,y=at[1],z=at[2];s.ellipsoid([x,y,z],[.014,.020,.025],head,'skin');s.ellipsoid([x+side*.010,y,z+.005],[.008,.011,.013],head,'iris',16,10);s.ellipsoid([x+side*.016,y,z+.007],[.004,.008,.008],head,'eye',12,8);
  if(!small)s.tube([[x-side*.025,y+.018,z-.037],[x+side*.001,y+.025,z+.024]],[[.026,.016],[.020,.012]],[head],'skin',12,12);
 }
}
function buildHead(rig:OrganicRig,s:Surface){
 const species=rig.species,[,y,z]=rig.headOrigin,p=(dy:number,dz:number):V=>[0,y+dy,z+dz];
 if(species==='rex'||species==='velociraptor'||species==='spinosaurus'){
  const raptor=species==='velociraptor',spino=species==='spinosaurus',w=raptor?.085:spino?.12:.215,l=raptor?.35:spino?.73:.52;
  s.tube([p(.035,-.11),p(.070,.06),p(.040,l*.56),p(.008,l*.93),p(-.008,l*1.03)],[[w*.55,w*.45],[w,w*(raptor?.63:.78)],[w*(spino?.47:.76),w*(spino?.33:.48)],[w*(spino?.54:.62),w*.30],[.012,.010]],[rig.head],'skin',40,28,spino?.20:.30);
  s.ellipsoid(p(-.034,l*.44),[w*.70,.023,l*.48],rig.head,'mouth');s.tube([p(-.047,-.02),p(-.068,l*.43),p(-.039,l*.96),p(-.031,l*1.03)],[[w*.76,w*.27],[w*.78,w*.26],[w*.54,w*.20],[.012,.008]],[rig.jaw],'skin',32,24,.25);eyes(s,rig.head,[0,y+.10,z+.025],w*.96,raptor);
  for(const side of [-1,1]){
   s.ellipsoid([side*w*.50,y+.036,z+l*.81],[.006,.008,.019],rig.head,'eye',12,8);
   for(let i=0;i<(raptor?10:spino?17:12);i++){
    const f=i/(raptor?10:spino?17:12),tz=z+.12+f*(l-.16),x=side*w*(.77-.23*f),len=(raptor?.026:spino?.045:.062)*(1-.35*f);
    s.horn([x*.89,y-.021,tz],[x*.89,y-.021-len*.72,tz+.008],raptor?.004:.009,rig.head,'horn',0);s.horn([x*.86,y-.047,tz],[x*.86,y-.047+len*.50,tz+.004],raptor?.004:.007,rig.jaw,'horn',0);
   }
  }
 }else if(species==='triceratops'){
  s.tube([p(.03,-.13),p(.005,.20),p(-.095,.51)],[[.28,.22],[.22,.18],[.105,.085]],[rig.head],'skin',36,28,.16);s.ellipsoid(p(-.15,.34),[.17,.065,.24],rig.jaw);s.horn(p(-.065,.45),p(-.13,.63),.095,rig.head,'horn',.02);s.ellipsoid(p(.28,-.14),[.44,.43,.065],rig.head,'skin',40,24);
  for(let i=0;i<13;i++){const a=i/12*Math.PI;s.horn([Math.cos(a)*.42,y+.28+Math.sin(a)*.41,z-.14],[Math.cos(a)*.45,y+.28+Math.sin(a)*.45,z-.15],.026,rig.head);}
  for(const side of [-1,1])s.horn([side*.17,y+.20,z+.12],[side*.25,y+.55,z+.75],.065,rig.head,'horn',.03);s.horn(p(.14,.38),p(.35,.57),.055,rig.head);eyes(s,rig.head,[0,y+.11,z+.17],.251);
 }else if(species==='stegosaurus'){
  s.tube([p(0,-.12),p(.015,.14),p(-.02,.31)],[[.10,.11],[.105,.10],[.06,.065]],[rig.head],'skin',16,16);s.ellipsoid(p(-.07,.14),[.08,.03,.17],rig.jaw);eyes(s,rig.head,[0,y+.04,z+.04],.10,true);
 }else if(species==='brachiosaurus'){
  s.tube([p(.03,-.10),p(.015,.13),p(-.06,.35)],[[.13,.18],[.17,.15],[.12,.075]],[rig.head],'skin',20,20);s.ellipsoid(p(-.10,.16),[.13,.055,.21],rig.jaw);eyes(s,rig.head,[0,y+.06,z+.04],.148,true);for(const side of [-1,1])s.ellipsoid([side*.09,y+.012,z+.30],[.013,.016,.025],rig.head,'eye',12,8);
 }else{
  s.ellipsoid(p(.02,0),[.10,.12,.16],rig.head);s.horn(p(.015,.06),p(-.03,.68),.085,rig.head,'horn',0);s.horn(p(-.035,.04),p(-.06,.65),.06,rig.jaw,'horn',0);s.tube([p(.08,-.04),p(.25,-.24),p(.30,-.43)],[[.023,.095],[.015,.09],[.002,.006]],[rig.head],'skin',16,12);eyes(s,rig.head,[0,y+.06,z+.015],.095,true);
 }
}
function buildDetails(rig:OrganicRig,s:Surface){
 const species=rig.species,shape=shapes[species];
 if(species==='stegosaurus'){
  for(let i=0;i<19;i++){const t=i/18,z=-1.06+t*1.89,h=.10+Math.sin(t*Math.PI)**1.3*.52,x=i%2?.105:-.105,body=torso(species,clamp((z+shape.length)/(shape.length+.72))),y=body.y+body.ry-.055,w=.032+h*.115;s.plate(x,[[y,z-w],[y+h*.53,z-w*.87],[y+h,z-.015],[y+h*.72,z+w*.86],[y,z+w]],.018,z>0?rig.chest:rig.hips);}
  for(const side of [-1,1])for(const i of [5,6]){const a=rig.absolute.get(rig.tailBones[i])!;s.horn(tuple(a),[a.x+side*.28,a.y+.27,a.z-.12],.042,rig.tailBones[i]);}
 }
 if(species==='spinosaurus'){
  const y=shape.y+shape.height*.76,outline:[number,number][]=[[y,-.90]];
  for(let i=0;i<=20;i++){const t=i/20,z=-.90+t*1.53,h=.10+Math.sin(Math.PI*t)**.72*(.66+.06*Math.sin(t*Math.PI*3));outline.push([y+h,z]);}outline.push([y,.63]);s.plate(0,outline,.016,rig.hips);
  for(let i=0;i<14;i++){const t=i/13,z=-.90+t*1.53,h=.10+Math.sin(Math.PI*t)**.72*(.66+.06*Math.sin(t*Math.PI*3));s.tube([[0,y,z],[0,y+h*.55,z],[0,y+h,z]],[[.019,.022],[.014,.018],[.004,.006]],[rig.hips],'skin',14,10);}
 }
 if(species==='velociraptor'){
  for(const side of [-1,1])for(let i=0;i<20;i++){const x=side*(.18+i*.004),y=.55-i*.0015,z=.51-i*.018,len=.18+i*.005;s.feather([x,y,z],[x+side*len,y-.045,z-.19],.027,rig.chest);}
  for(let j=4;j<8;j++){const p=rig.absolute.get(rig.tailBones[j])!;for(const side of [-1,1])for(let k=0;k<4;k++)s.feather([p.x,p.y,p.z+.025],[p.x+side*(.12+k*.012),p.y+.004,p.z-.24-k*.012],.024,rig.tailBones[j]);}
  for(let i=0;i<900;i++){const t=.09+(i/899)*.82,a=i*2.399963,body=torso(species,t),nx=Math.cos(a),ny=Math.sin(a),x=nx*body.rx*1.008,y=body.y+ny*body.ry*1.008,z=body.z;s.feather([x,y,z],[x+nx*.006,y+ny*.007,z-.050],.011,z>.12?rig.chest:rig.hips,[nx,ny,0]);}
  const neckCurve=new CatmullRomCurve3(shape.neck.map(vec));for(let i=0;i<200;i++){const t=i/235,a=i*2.399963,p=neckCurve.getPoint(t),radius=.10*(1-t*.50),nx=Math.cos(a),ny=Math.sin(a);s.feather([p.x+nx*radius,p.y+ny*radius,p.z],[p.x+nx*(radius+.006),p.y+ny*(radius+.005),p.z-.040],.010,t<.45?rig.neckBones[0]:rig.neckBones[1],[nx,ny,0]);}
 }
}
function buildWings(rig:OrganicRig,s:Surface){
 for(const side of [-1,1]){
  s.tube([[side*.055,-.04,-.18],[side*.12,-.17,-.39],[side*.15,-.12,-.50]],[[.033,.035],[.021,.022],[.009,.010]],[rig.hips],'skin',12,10);
  for(let i=0;i<3;i++)s.horn([side*.15+(i-1)*.015,-.12,-.50],[side*.15+(i-1)*.026,-.13,-.57],.008,rig.hips);
 }
 for(const side of [-1,1]){
  const shoulder:V=[side*.10,.015,.05],elbow:V=[side*.56,.045,-.04],wrist:V=[side*.83,.025,-.12],tip:V=[side*1.74,-.04,-.50],wing=addBone(rig,`wing_${side<0?'L':'R'}`,shoulder,rig.chest),distal=addBone(rig,`wingtip_${side<0?'L':'R'}`,wrist,wing);rig.wings.push(wing);rig.wingTips.push(distal);s.tube([shoulder,elbow,wrist,tip],[[.045,.05],[.035,.035],[.025,.028],[.004,.004]],[wing,wing,distal,distal],'skin',24,12);
  const start=s.indices.length,base=s.positions.length/3,nx=20,ny=10;
  for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){const u=i/nx,v=j/ny,x=side*(.10+1.64*u),front=.05-.55*u,back=-.43-.20*Math.sin(u*Math.PI)-.07*u,y=-Math.sin(v*Math.PI)*Math.sin(u*Math.PI)*.09;s.vertex(new Vector3(x,y,front*(1-v)+back*v),u*2,v,wing,distal,clamp((u-.30)/.30),'membrane');}
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=base+i*(ny+1)+j,b=a+ny+1;s.indices.push(a,b,a+1,b,b+1,a+1);}s.group(start,'membrane');
 }
}
export function createOrganicDinosaur(species:Species,variant=0):OrganicRig{
 const shape=shapes[species],root=new Group();root.name=`organic-${species}`;
 const rig={species,root,bones:[],materials:makeMaterials(species,variant),legs:[],tailBones:[],neckBones:[],wings:[],wingTips:[],headOrigin:shape.head,rest:new Map(),absolute:new Map(),clips:[]} as unknown as OrganicRig;
 rig.hips=addBone(rig,'hips',[0,shape.y,-.15]);rig.chest=addBone(rig,'chest',[0,shape.y+.03,.28],rig.hips);
 let parent=rig.chest;for(let i=0;i<shape.neck.length-1;i++){parent=addBone(rig,`neck_${i}`,shape.neck[i],parent);rig.neckBones.push(parent);}rig.head=addBone(rig,'head',shape.head,parent);rig.jaw=addBone(rig,'jaw',[0,shape.head[1]-.06,shape.head[2]+.02],rig.head);
 const s=new Surface(rig),p:V[]=[],r:[number,number][]=[];
 for(let i=0;i<=18;i++){const body=torso(species,i/18);p.push([0,body.y,body.z]);r.push([body.rx,body.ry]);}s.tube(p,r,[rig.hips,rig.hips,rig.chest],'skin',64,36);
 const neckR=species==='brachiosaurus'?.235:species==='rex'?.20:species==='triceratops'?.22:species==='spinosaurus'?.17:.10;
 s.tube([[0,shape.y,.25],...shape.neck],[[shape.width*.72,shape.height*.72],...shape.neck.map((_,i)=>[neckR*(1-i/shape.neck.length*.55),neckR*(1-i/shape.neck.length*.45)] as [number,number])],[rig.chest,...rig.neckBones,rig.head],'skin',48,28);
 const tailLength=species==='pterosaur'?.13:species==='velociraptor'?1.19:species==='brachiosaurus'?1.30:species==='triceratops'?.69:species==='spinosaurus'?1.28:1.08,tailPoints:V[]=[],tailR:[number,number][]=[];parent=rig.hips;
 for(let i=0;i<8;i++){const t=i/7,at:V=[0,shape.y-.06+Math.sin(t*Math.PI*.7)*.12,-shape.length*.78-tailLength*t];parent=addBone(rig,`tail_${i}`,at,parent);rig.tailBones.push(parent);tailPoints.push(at);const radius=Math.max(.005,shape.width*.65*(1-t)**1.4);tailR.push([radius,species==='spinosaurus'?Math.max(.01,.22*Math.sin(t*Math.PI)+radius):radius]);}rig.tail=rig.tailBones[0];s.tube(tailPoints,tailR,rig.tailBones,'skin',36,18);
 if(species==='pterosaur')buildWings(rig,s);else for(const side of [-1,1]){
  buildLeg(rig,s,side,shape.biped?-.20:-.48,false,side<0?0:Math.PI);if(!shape.biped)buildLeg(rig,s,side,.41,true,side<0?Math.PI*.72:Math.PI*1.72);
  else {const small=species==='rex',a:V=[side*shape.width*.78,shape.y+.07,.30],b:V=[side*(shape.width+.075),shape.y-(small?.10:.15),.46],c:V=[side*(shape.width+.055),shape.y-(small?.15:.12),small?.55:.66];s.tube([a,b,c],[[small?.052:.065,small?.065:.075],[.035,.035],[.018,.022]],[rig.chest],'skin',12,12);for(let i=0;i<(small?2:3);i++)s.horn([c[0]+(i-1)*.025,c[1],c[2]],[c[0]+(i-1)*.032,c[1]-.045,c[2]+.08],.014,rig.chest);}
 }
 buildHead(rig,s);buildDetails(rig,s);rig.mesh=new SkinnedMesh(s.finish(),finishes.map(f=>rig.materials[f]));rig.mesh.name=`${species}_skinned_surface`;rig.mesh.castShadow=true;rig.mesh.receiveShadow=true;rig.mesh.frustumCulled=false;root.add(rig.mesh);root.updateMatrixWorld(true);rig.skeleton=new Skeleton(rig.bones);rig.mesh.bind(rig.skeleton);rig.mesh.normalizeSkinWeights();
 root.userData={species,assetVersion:3,textureResolution:TEXTURE_SIZE,units:'diorama units; not metres',reconstruction:'museum/research-guided procedural reconstruction; pigmentation is an artistic hypothesis'};return rig;
}
function resetRig(rig:OrganicRig){for(const b of rig.bones){b.position.copy(rig.rest.get(b)!);b.quaternion.identity();b.scale.setScalar(1);}}
const qa=new Quaternion(),qb=new Quaternion(),p0=new Vector3();
function placeBone(rig:OrganicRig,bone:Bone,at:Vector3,rotation=new Quaternion()){
 rig.root.updateWorldMatrix(true,false);bone.parent!.updateWorldMatrix(true,false);p0.copy(at).applyMatrix4(rig.root.matrixWorld);bone.position.copy(bone.parent!.worldToLocal(p0));rig.root.getWorldQuaternion(qa);qa.multiply(rotation);bone.parent!.getWorldQuaternion(qb);bone.quaternion.copy(qb.invert().multiply(qa));bone.updateWorldMatrix(false,false);
}
function rotateBone(rig:OrganicRig,bone:Bone,rotation:Quaternion){
 rig.root.getWorldQuaternion(qa);qa.multiply(rotation);bone.parent!.getWorldQuaternion(qb);bone.quaternion.copy(qb.invert().multiply(qa));bone.updateWorldMatrix(false,true);
}
function poseNeck(rig:OrganicRig,target:Vector3,headRotation:Quaternion){
 const chain=[...rig.neckBones,rig.head];rig.root.updateMatrixWorld(true);
 const seed=chain.map(b=>rig.root.worldToLocal(b.getWorldPosition(new Vector3()))),joints=solveNeckJoints(seed,neckLengths(rig.species),target);
 for(let i=0;i<chain.length-1;i++){
  const bone=chain[i],direction=joints[i+1].clone().sub(joints[i]).normalize();
  rig.root.getWorldQuaternion(qa);direction.applyQuaternion(qa);bone.parent!.getWorldQuaternion(qb);direction.applyQuaternion(qb.invert());
  bone.quaternion.setFromUnitVectors(rig.rest.get(chain[i+1])!.clone().normalize(),direction);bone.updateWorldMatrix(false,true);
 }
 // Local translations stay at their bind positions, including the head joint.
 rotateBone(rig,rig.head,headRotation);
}
export const ACTION_DURATIONS:Record<DinosaurAction,number>={idle:4,walk:1.6,run:.86,roar:3.2,drink:5,graze:4,browse:5,rest:6,alert:3,hunt:2.4,fish:4,fly:1.4,glide:4,display:3.2};
export function speciesActions(species:Species):DinosaurAction[]{
 if(species==='pterosaur')return ['fly','glide','roar'];const base:DinosaurAction[]=['idle','walk','run','roar','drink','rest','alert'];if(species==='brachiosaurus')base.push('browse');else if(species==='triceratops'||species==='stegosaurus')base.push('graze','display');else if(species==='spinosaurus')base.push('fish','hunt');else base.push('hunt');return base;
}
interface PoseOptions {path?:{x:number;y:number;z:number;heading:number};scale?:number;ground?:boolean;drink?:number;reach?:number;}
export function poseDinosaurAction(rig:OrganicRig,time:number,action:DinosaurAction='idle',options:PoseOptions={}){
 resetRig(rig);const shape=shapes[rig.species],duration=ACTION_DURATIONS[action],phase=(time%duration)/duration*Math.PI*2,moving=action==='walk'||action==='run',run=action==='run',breath=Math.sin(phase),bob=moving?Math.sin(phase*2)*(run?.025:.009):0;
 let drink=clamp(options.drink??0);if(action==='drink')drink=Math.sin(phase*.5)**2;
 const grazing=action==='graze'?Math.sin(phase*.5)**2:0,browse=action==='browse'?Math.sin(phase)*.12:0,fish=action==='fish'?Math.pow(Math.max(0,Math.sin(phase)),6):0,waterReach=Math.max(drink,fish),posture=drinkingPosture(rig.species),lower=Math.max(waterReach,grazing),rest=action==='rest'?.75+Math.sin(phase)*.025:0,bodyDrop=posture.drop*lower+rest*shape.y*.22;
 rig.hips.position.y+=bob-bodyDrop;rig.hips.position.z+=posture.forward*lower;rig.chest.rotation.z=moving?Math.sin(phase)*.014:0;rig.chest.rotation.x=posture.lean*lower;rig.root.updateMatrixWorld(true);
 for(const leg of rig.legs){
  const cycle=(phase+leg.phase)/(Math.PI*2),u=cycle-Math.floor(cycle),stance=.64,stride=moving?(run?.22:rig.species==='brachiosaurus'?.13:.16):0;let zOffset=0,lift=0;
  if(u<stance)zOffset=stride*(1-u/stance*2);else{const f=(u-stance)/(1-stance);zOffset=-stride*Math.cos(f*Math.PI);lift=Math.sin(f*Math.PI)*(run?.15:.09);}
  const target=vec(leg.foot);target.z+=zOffset;target.y+=moving?lift:0;
  if(options.ground&&options.path){const p=options.path,k=options.scale??1,c=Math.cos(p.heading),sn=Math.sin(p.heading),wx=p.x+(target.x*c+target.z*sn)*k,wz=p.z+(-target.x*sn+target.z*c)*k;target.y+=(habitatGround(wx,wz)-p.y)/k;}
  const footTarget=target.clone(),ankleOffset=leg.ankle?vec(leg.ankle).sub(vec(leg.foot)):new Vector3();target.add(ankleOffset);
  const hip=vec(leg.hip);hip.y+=bob-bodyDrop;hip.z+=posture.forward*lower;const l1=vec(leg.knee).distanceTo(vec(leg.hip)),l2=vec(leg.ankle??leg.foot).distanceTo(vec(leg.knee)),direction=target.clone().sub(hip),d=clamp(direction.length(),Math.abs(l1-l2)+.001,l1+l2-.001);direction.normalize();target.copy(hip).addScaledVector(direction,d);
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=new Vector3(0,0,leg.front?-1:1).addScaledVector(direction,-direction.z*(leg.front?-1:1)).normalize(),knee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,height);
  const upperRot=new Quaternion().setFromUnitVectors(vec(leg.knee).sub(vec(leg.hip)).normalize(),knee.clone().sub(hip).normalize()),lowerRot=new Quaternion().setFromUnitVectors(vec(leg.ankle??leg.foot).sub(vec(leg.knee)).normalize(),target.clone().sub(knee).normalize());placeBone(rig,leg.upper,hip,upperRot);placeBone(rig,leg.lower,knee,lowerRot);if(leg.hock){placeBone(rig,leg.hock,target);placeBone(rig,leg.toe,footTarget);}else placeBone(rig,leg.toe,target);
 }
 const head=rig.root.worldToLocal(rig.head.getWorldPosition(new Vector3()));head.y+=breath*.006*(1-lower)+browse;head.z+=browse*.3;
 const k=options.scale??1,waterY=options.path?(WATER_LEVEL-options.path.y)/k:.10,fullPitch=options.reach===undefined?posture.pitch:drinkingPitch(rig.species,waterY,options.reach/k),pitch=waterReach*fullPitch+grazing*.85+(action==='display'&&rig.species==='triceratops'?.22:0)+(action==='hunt'?.14+.055*Math.sin(phase):0),mouth=vec(MOUTH_TIPS[rig.species]).applyAxisAngle(new Vector3(1,0,0),pitch);
 if(waterReach>0){const path=options.path,k=options.scale??1,targetY=(path?(WATER_LEVEL-path.y)/k:.10)+.018-mouth.y,targetZ=options.reach===undefined?(rig.species==='brachiosaurus'?1.9:shape.head[2]*.8):options.reach/k-mouth.z;head.y=head.y*(1-waterReach)+targetY*waterReach;head.z=head.z*(1-waterReach)+targetZ*waterReach;}
 if(grazing>0)head.y=head.y*(1-grazing)+(.10-mouth.y)*grazing;
 head.y-=rest*.08;
 const headRot=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),pitch+(action==='roar'?-.13*Math.sin(phase*.5)**2:0));headRot.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),(lower?0:Math.sin(phase)*.055)+(action==='alert'?.18*Math.sin(phase):0)));poseNeck(rig,head,headRot);
 rig.jaw.rotation.x=action==='roar'?Math.sin(phase*.5)**4*.48:action==='fish'?fish*.38:action==='graze'?.055*(.5+.5*Math.sin(phase*7)):action==='browse'?.025*Math.max(0,Math.sin(phase)):drink*.035;
 rig.tailBones.forEach((bone,i)=>{bone.rotation.y=Math.sin(phase-i*.48)*(action==='display'?.14:moving?.035:.018);bone.rotation.x=Math.sin(phase-i*.3)*.006;});rig.wings.forEach((wing,i)=>{const side=i===0?-1:1,amplitude=action==='glide'?.035:.30;wing.rotation.z=side*(Math.sin(phase)*amplitude+.04);rig.wingTips[i].rotation.z=side*Math.sin(phase-.6)*amplitude*.55;});rig.root.updateMatrixWorld(true);rig.skeleton.update();
}
export function poseOrganicDinosaur(rig:OrganicRig,time:number,path:{x:number;y:number;z:number;heading:number},scale:number,drink=0,alert=false,reach=1.15,action?:DinosaurAction){poseDinosaurAction(rig,time,action??(rig.species==='pterosaur'?'fly':drink>0?'idle':alert?'run':'walk'),{path,scale,drink,reach,ground:rig.species!=='pterosaur'});}
export function bakeDinosaurClips(rig:OrganicRig){
 const clips:AnimationClip[]=[];for(const action of speciesActions(rig.species)){
  const duration=ACTION_DURATIONS[action],frames=Math.ceil(duration*24),times:number[]=[],positions=rig.bones.map(()=>[] as number[]),rotations=rig.bones.map(()=>[] as number[]),scales=rig.bones.map(()=>[] as number[]);
  for(let f=0;f<=frames;f++){const t=f/frames*duration;poseDinosaurAction(rig,t,action);times.push(t);rig.bones.forEach((b,i)=>{positions[i].push(...b.position.toArray());rotations[i].push(...b.quaternion.toArray());scales[i].push(...b.scale.toArray());});}
  const tracks=rig.bones.flatMap((b,i)=>[new VectorKeyframeTrack(`${b.name}.position`,times,positions[i]),new QuaternionKeyframeTrack(`${b.name}.quaternion`,times,rotations[i]),new VectorKeyframeTrack(`${b.name}.scale`,times,scales[i])]);clips.push(new AnimationClip(action,duration,tracks));
 }resetRig(rig);rig.root.updateMatrixWorld(true);rig.skeleton.update();rig.clips=clips;return clips;
}
export function disposeOrganicDinosaur(rig:OrganicRig){rig.mesh.geometry.dispose();rig.skeleton.dispose();Object.values(rig.materials).forEach(m=>m.dispose());}
