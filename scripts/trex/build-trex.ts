import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { AnimationClip,Bone,BufferGeometry,CatmullRomCurve3,Color,DoubleSide,Float32BufferAttribute,Group,Matrix4,Mesh,MeshStandardMaterial,Quaternion,QuaternionKeyframeTrack,Skeleton,SkinnedMesh,SphereGeometry,TubeGeometry,Uint16BufferAttribute,Vector3,VectorKeyframeTrack } from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const require=createRequire(import.meta.url),sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const OUT='public/models/tyrannosaurus-study';mkdirSync(OUT,{recursive:true});
type V=[number,number,number];
const v=(p:V)=>new Vector3(...p),clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
const root=new Group();root.name='AMNH_reference_Tyrannosaurus_study';
const bones:Bone[]=[],absolute:Vector3[]=[],rest:Vector3[]=[];
function bone(name:string,p:V,parent?:Bone){const b=new Bone();b.name=name;b.position.copy(v(p));if(parent)b.position.sub(absolute[bones.indexOf(parent)]);(parent??root).add(b);bones.push(b);absolute.push(v(p));rest.push(b.position.clone());return b;}
const hips=bone('hips',[0,1.12,-.16]),spine=bone('spine',[0,1.17,.18],hips),chest=bone('chest',[0,1.27,.47],spine),neck0=bone('neck_base',[0,1.38,.65],chest),neck1=bone('neck_atlas',[0,1.48,.79],neck0),head=bone('head',[0,1.51,.87],neck1),jaw=bone('jaw',[0,1.34,.85],head);
const tailBones:Bone[]=[];let parent=hips;
for(let i=0;i<11;i++){const t=i/10;parent=bone(`tail_${i}`,[.04*Math.sin(t*Math.PI)*t,1.10-.16*t-.20*t*t,-.51-1.97*t],parent);tailBones.push(parent);}
const legs:{upper:Bone;lower:Bone;hock:Bone;foot:Bone;side:number}[]=[],arms:{upper:Bone;forearm:Bone;hand:Bone;side:number}[]=[];
for(const side of [-1,1]){
 const suffix=side<0?'L':'R',upper=bone(`thigh_${suffix}`,[side*.24,1.13,-.22],hips),lower=bone(`shin_${suffix}`,[side*.30,.68,.12],upper),hock=bone(`hock_${suffix}`,[side*.30,.27,-.15],lower),foot=bone(`foot_${suffix}`,[side*.30,.075,.09],hock);legs.push({upper,lower,hock,foot,side});
 const u=bone(`upperarm_${suffix}`,[side*.225,1.23,.51],chest),f=bone(`forearm_${suffix}`,[side*.31,1.08,.62],u),h=bone(`hand_${suffix}`,[side*.275,1.10,.76],f);arms.push({upper:u,forearm:f,hand:h,side});
}
interface Part {center:V;radius:V;bone:Bone;second?:Bone;blend?:number;smooth:number;angle?:number;exponent?:number;}
const parts:Part[]=[],jawParts:Part[]=[];
const add=(c:V,r:V,b:Bone,smooth=.045,second?:Bone,blend=0)=>parts.push({center:c,radius:r,bone:b,second,blend,smooth});
// Axial mass follows an adult, broad-chested tyrannosaur rather than a spherical trunk.
add([0,1.14,-.24],[.31,.29,.43],hips,.075);
add([0,1.10,.04],[.35,.32,.48],spine,.075,hips,.35);
add([0,1.20,.30],[.325,.33,.43],spine,.065,chest,.40);
add([0,1.29,.49],[.26,.27,.29],chest,.065);
add([0,1.38,.63],[.235,.255,.235],neck0,.075,chest,.25);
add([0,1.47,.76],[.215,.245,.235],neck1,.07,head,.30);
// Deep rear skull, broad temporal region and a blunt, narrower snout.
add([0,1.505,.875],[.255,.180,.225],head,.035);
add([0,1.495,1.065],[.205,.125,.255],head,.030);
parts.push({center:[0,1.490,1.230],radius:[.182,.132,.218],bone:head,smooth:.025,exponent:3.0});
add([0,1.405,1.15],[.18,.065,.265],head,.020);
for(const side of [-1,1]){
 add([side*.193,1.425,.95],[.055,.115,.18],head,.025);
 add([side*.185,1.645,.871],[.059,.031,.083],head,.020);
 add([side*.194,1.620,.803],[.039,.027,.052],head,.023);
 // Integrated thigh muscles; tendons and joints remain continuous with the skin.
 const leg=legs.find(l=>l.side===side)!;
 add([side*.265,1.015,-.19],[.185,.275,.275],leg.upper,.065,hips,.17);
 add([side*.29,.835,-.015],[.145,.225,.185],leg.upper,.055);
 add([side*.30,.685,.105],[.104,.108,.128],leg.lower,.045,leg.upper,.45);
 for(let i=0;i<=9;i++){const t=i/9,r=.061*(1-t)+.037*t+.014*Math.sin(t*Math.PI);add([side*.30,.665-.395*t,.105-.255*t],[r,.072,r*1.05],leg.lower,.040,leg.hock,t*.60);}
 add([side*.30,.263,-.146],[.047,.057,.061],leg.hock,.027);
 for(let i=0;i<=6;i++){const t=i/6;add([side*.30,.255-.180*t,-.14+.23*t],[.033,.049,.047],leg.hock,.027,leg.foot,t*.6);}
 add([side*.30,.069,.125],[.073,.058,.128],leg.foot,.025);
 for(let toe=0;toe<3;toe++){
  const spread=toe-1,tipZ=toe===1?.43:.38;
  for(let i=0;i<6;i++){const t=i/5;add([side*.30+spread*(.035+.048*t),.058-.025*t,.14+(tipZ-.14)*t],[.026-.009*t,.028-.010*t,.051],leg.foot,.012);}
 }
 // Tiny arms, palms facing inward. Fingers and claws are separate detailed geometry.
 const arm=arms.find(a=>a.side===side)!;
 add([side*.231,1.205,.535],[.074,.098,.095],arm.upper,.045,chest,.30);
 add([side*.276,1.14,.575],[.052,.099,.056],arm.upper,.027);
 add([side*.305,1.092,.636],[.040,.042,.051],arm.forearm,.024);
 add([side*.29,1.095,.70],[.031,.034,.077],arm.forearm,.020,arm.hand,.30);
 add([side*.274,1.102,.762],[.025,.036,.039],arm.hand,.018);
}
// Long tail with a muscular caudofemoral base, approximately half the axial length.
for(let i=0;i<=34;i++){
 const t=i/34,z=-.48-2.02*t,y=1.10-.16*t-.20*t*t,r=.23*Math.pow(1-t,1.45)+.004,bf=t*10,bi=Math.min(9,Math.floor(bf));
 add([.04*Math.sin(t*Math.PI)*t,y,z],[r,r*.96,.104],tailBones[bi],.030,tailBones[bi+1],bf-bi);
}
jawParts.push({center:[0,1.30,.98],radius:[.202,.086,.19],bone:jaw,smooth:.025},{center:[0,1.307,1.18],radius:[.164,.057,.247],bone:jaw,smooth:.025},{center:[0,1.32,1.35],radius:[.148,.042,.095],bone:jaw,smooth:.022});
for(const side of [-1,1])jawParts.push({center:[side*.16,1.285,1.08],radius:[.048,.065,.20],bone:jaw,smooth:.025});

function distance(p:V,part:Part){if(part.exponent){const e=part.exponent,q=part.radius.map((r,i)=>Math.abs((p[i]-part.center[i])/r));return (Math.pow(q.reduce((sum,x)=>sum+Math.pow(x,e),0),1/e)-1)*Math.min(...part.radius);}const x=(p[0]-part.center[0])/part.radius[0],y=(p[1]-part.center[1])/part.radius[1],z=(p[2]-part.center[2])/part.radius[2],k0=Math.hypot(x,y,z),k1=Math.hypot(x/part.radius[0],y/part.radius[1],z/part.radius[2]);return k0*(k0-1)/(k1||1);}
const hash=(x:number,y:number,z:number)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
function noise(x:number,y:number,z:number){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),tx=x-ix,ty=y-iy,tz=z-iz,fx=tx*tx*(3-2*tx),fy=ty*ty*(3-2*ty),fz=tz*tz*(3-2*tz);let result=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)result+=hash(ix+a,iy+b,iz+c)*(a?fx:1-fx)*(b?fy:1-fy)*(c?fz:1-fz);return result;}
function smin(a:number,b:number,k:number){const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*h*k/6;}
const material=new MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.79,metalness:0});material.name='Living_skin';
const geometryStats:any[]=[];
function sculpt(name:string,primitives:Part[],resolution:number,bounds:{min:V;max:V},cutHead=false){
 console.log(`Sculpting ${name} at ${resolution}³…`);
 const mc=new MarchingCubes(resolution,material,false,false,700000),field=mc.field;field.fill(-4);mc.isolation=0;
 const size=bounds.max.map((m,i)=>m-bounds.min[i]) as V,step=size.map(x=>x/resolution) as V;
 for(const part of primitives){
  const pad=part.smooth*2+.025,min=part.center.map((c,i)=>Math.max(1,Math.floor((c-part.radius[i]-pad-bounds.min[i])/step[i]))) as V,max=part.center.map((c,i)=>Math.min(resolution-2,Math.ceil((c+part.radius[i]+pad-bounds.min[i])/step[i]))) as V;
  for(let z=min[2];z<=max[2];z++)for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++){
   const at:V=[bounds.min[0]+x*step[0],bounds.min[1]+y*step[1],bounds.min[2]+z*step[2]],i=x+y*resolution+z*resolution*resolution;
   field[i]=-smin(-field[i],distance(at,part),part.smooth);
  }
 }
 if(cutHead)for(let z=1;z<resolution-1;z++){const zz=bounds.min[2]+z*step[2];if(zz<.77||zz>1.49)continue;for(let y=1;y<resolution-1;y++){const yy=bounds.min[1]+y*step[1];if(yy<1.20)continue;for(let x=1;x<resolution-1;x++){
  const xx=bounds.min[0]+x*step[0],i=x+y*resolution+z*resolution*resolution;
  // Palatal plane and restrained orbital/antorbital depressions, without a shrink-wrapped skull.
  if(zz>.95&&yy<1.38)field[i]=Math.min(field[i],yy-(1.365+.012*(zz-1.1)));
  for(const side of [-1,1]){
   const orbit=distance([xx,yy,zz],{center:[side*.235,1.600,.866],radius:[.029,.026,.034],bone:head,smooth:.01});field[i]=Math.min(field[i],orbit);
  }
 }}}
 mc.update();const count=mc.count;console.log(`${name}: ${Math.round(count/3).toLocaleString()} triangles before welding`);
 const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=new Float32Array(count*2),colors=new Float32Array(count*3),joints=new Uint16Array(count*4),weights=new Float32Array(count*4);
 const p=new Vector3(),n=new Vector3(),tint=new Color();
 for(let i=0;i<count;i++){
  for(let c=0;c<3;c++){positions[i*3+c]=bounds.min[c]+(mc.positionArray[i*3+c]+1)*.5*size[c];normals[i*3+c]=mc.normalArray[i*3+c]/size[c];}
  n.fromArray(normals,i*3).normalize();normals.set(n.toArray(),i*3);p.fromArray(positions,i*3);
  const scores=primitives.map(part=>distance([p.x,p.y,p.z],part)),best=Math.min(...scores),influence=new Float64Array(bones.length);
  for(let k=0;k<primitives.length;k++){const part=primitives[k],amount=Math.exp(-Math.max(0,scores[k]-best)/.020);influence[bones.indexOf(part.bone)]+=amount*(1-(part.blend??0));if(part.second)influence[bones.indexOf(part.second)]+=amount*(part.blend??0);}
  const ranking=Array.from(influence,((w,j)=>({w,j}))).sort((a,b)=>b.w-a.w).slice(0,4),sum=ranking.reduce((s,w)=>s+w.w,0);ranking.forEach((entry,c)=>{joints[i*4+c]=entry.j;weights[i*4+c]=entry.w/sum;});
  const belly=clamp(-n.y*.8+.12),macro=noise(p.x*6,p.y*6,p.z*6)*.65+noise(p.x*16,p.y*14,p.z*15)*.35,patch=clamp((macro-.38)*2.4)*(1-belly*.7);tint.setRGB(1.12,.88,.53).lerp(new Color().setRGB(.20,.24,.19),patch*.85).lerp(new Color().setRGB(1.18,1.11,.91),belly*.60);colors.set(tint.toArray(),i*3);
 }
 // Per-triangle planar UV projection avoids a stretched stripe across projection boundaries.
 for(let i=0;i<count;i+=3){n.set(0,0,0);for(let k=0;k<3;k++)n.add(new Vector3().fromArray(normals,(i+k)*3));n.normalize();const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z),density=positions[i*3+2]>.76&&positions[i*3+1]>1.18?1.45:2.7;for(let k=0;k<3;k++){const j=i+k,x=positions[j*3],y=positions[j*3+1],z=positions[j*3+2];uv[j*2]=(ax>=ay&&ax>=az?z:x)*density;uv[j*2+1]=(ay>=ax&&ay>=az?z:y)*density;}}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('normal',new Float32BufferAttribute(normals,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setAttribute('skinIndex',new Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));const merged=mergeVertices(g,.00001);g.dispose();mc.geometry.dispose();
 geometryStats.push({name,triangles:merged.index!.count/3,vertices:merged.getAttribute('position').count});return merged;
}
const bodyGeometry=sculpt('continuous_body',parts,224,{min:[-.65,-.03,-2.60],max:[.65,1.88,1.56]},true),jawGeometry=sculpt('mandible',jawParts,100,{min:[-.27,1.185,.77],max:[.27,1.395,1.47]});
const body=new SkinnedMesh(bodyGeometry,material),mandible=new SkinnedMesh(jawGeometry,material);body.name='Continuous_anatomical_skin';mandible.name='Articulated_lower_jaw';root.add(body,mandible);

const enamel=new MeshStandardMaterial({color:'#c6bca5',vertexColors:true,roughness:.40,metalness:0});enamel.name='Enamel';const keratin=new MeshStandardMaterial({color:'#494438',vertexColors:true,roughness:.55});keratin.name='Claw_keratin';
const mucosa=new MeshStandardMaterial({color:'#633b47',roughness:.46,side:DoubleSide});mucosa.name='Oral_soft_tissue';
const eyeMat=new MeshStandardMaterial({color:'#17170c',roughness:.12});eyeMat.name='Pupil';const irisMat=new MeshStandardMaterial({color:'#8d723b',roughness:.26});irisMat.name='Iris';
function rigidSkin(geometry:BufferGeometry,mat:MeshStandardMaterial,b:Bone,name:string){const n=geometry.getAttribute('position').count,indices=new Uint16Array(n*4),weights=new Float32Array(n*4);for(let i=0;i<n;i++){indices[i*4]=bones.indexOf(b);weights[i*4]=1;}geometry.setAttribute('skinIndex',new Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));const mesh=new SkinnedMesh(geometry,mat);mesh.name=name;root.add(mesh);return mesh;}
function oval(at:V,r:V,b:Bone,mat:MeshStandardMaterial,name:string){const g=new SphereGeometry(1,28,18);g.scale(...r);g.translate(...at);return rigidSkin(g,mat,b,name);}
function curvedSpike(a:V,b:V,r:number,joint:Bone,name:string){
 const p:number[]=[],uv:number[]=[],idx:number[]=[],colors:number[]=[],av=v(a),bv=v(b),tangent=bv.clone().sub(av).normalize(),x=new Vector3().crossVectors(tangent,new Vector3(1,0,0)).normalize(),y=new Vector3().crossVectors(tangent,x),steps=12,sides=12;
 for(let i=0;i<=steps;i++){const t=i/steps,c=av.clone().lerp(bv,t);c.z+=Math.sin(t*Math.PI)*r*1.3;const radius=r*Math.pow(1-t,.72)+.0003;for(let s=0;s<=sides;s++){const angle=s/sides*Math.PI*2,q=c.clone().addScaledVector(x,Math.cos(angle)*radius).addScaledVector(y,Math.sin(angle)*radius),tint=.52+.48*Math.sqrt(t);p.push(...q.toArray());uv.push(s/sides,t);colors.push(tint,tint,tint);}}
 for(let i=0;i<steps;i++)for(let s=0;s<sides;s++){const a=i*(sides+1)+s,b=a+sides+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();return rigidSkin(g,name.includes('claw')?keratin:enamel,joint,name);
}
for(const side of [-1,1]){
 // Actual eyeballs sit behind a sculpted brow, not on top of the facial surface.
 oval([side*.219,1.601,.862],[.014,.013,.017],head,irisMat,`Eye_${side}`);oval([side*.230,1.601,.869],[.004,.006,.006],head,eyeMat,`Pupil_${side}`);
 oval([side*.223,1.589,.862],[.010,.007,.023],head,material,`Lower_eyelid_${side}`);oval([side*.223,1.614,.862],[.010,.007,.023],head,material,`Upper_eyelid_${side}`);
 oval([side*.176,1.520,1.350],[.009,.012,.023],head,eyeMat,`Nostril_${side}`);
 const l=legs.find(l=>l.side===side)!;for(let toe=0;toe<3;toe++){const spread=toe-1,z=toe===1?.43:.38;curvedSpike([side*.30+spread*.083,.034,z-.025],[side*.30+spread*.094,.015,z+.071],.021,l.foot,`Pedal_claw_${side}_${toe}`);}
 const a=arms.find(a=>a.side===side)!;for(let digit=0;digit<2;digit++){const y=1.085+digit*.035;oval([side*.27,y,.795],[.014,.013,.045],a.hand,material,`Finger_${side}_${digit}`);curvedSpike([side*.27,y,.831],[side*.25,y-.020,.889],.010,a.hand,`Manual_claw_${side}_${digit}`);}
}
for(let i=0;i<30;i++){const angle=-2.10+i/29*4.20,z=1.11+Math.cos(angle)*.29,x=Math.sin(angle)*.177,variation=.9+.1*Math.sin(i*2.7),length=(.055+.027*Math.abs(Math.sin(angle)))*variation,radius=.011+.006*Math.abs(Math.sin(angle));curvedSpike([x,1.365,z],[x*.99,1.365-length,z+.008],radius,head,`Upper_tooth_${i}`);curvedSpike([x*.95,1.340,z-.006],[x*.95,1.340+length*.77,z],radius*.82,jaw,`Lower_tooth_${i}`);}
for(const side of [-1,1]){oval([side*.158,1.359,1.14],[.017,.014,.215],head,mucosa,`Upper_gum_${side}`);oval([side*.150,1.340,1.14],[.016,.014,.211],jaw,mucosa,`Lower_gum_${side}`);}
oval([0,1.371,1.15],[.150,.020,.229],head,mucosa,'Upper_palate');oval([0,1.372,1.135],[.132,.024,.205],jaw,mucosa,'Tongue');oval([0,1.348,.924],[.14,.072,.04],head,mucosa,'Throat');
for(const side of [-1,1]){const g=new BufferGeometry(),p=[side*.155,1.36,.925,side*.17,1.36,1.02,side*.155,1.32,1.02,side*.14,1.30,.925];g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('skinIndex',new Uint16BufferAttribute([bones.indexOf(head),bones.indexOf(jaw),0,0,bones.indexOf(head),bones.indexOf(jaw),0,0,bones.indexOf(head),bones.indexOf(jaw),0,0,bones.indexOf(head),bones.indexOf(jaw),0,0],4));g.setAttribute('skinWeight',new Float32BufferAttribute([1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0],4));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const mesh=new SkinnedMesh(g,mucosa);mesh.name=`Buccal_fold_${side}`;root.add(mesh);}
// Sparse filaments are part of the selected AMNH reconstruction, not a claim of preserved plumage here.
const filament=new MeshStandardMaterial({color:'#6d6652',roughness:.95});filament.name='AMNH_reference_sparse_filaments';for(let i=0;i<72;i++){const t=i/71,a=i*2.39996,z=.76+t*.25,x=Math.sin(a)*.10,y=1.675+Math.cos(a)*.015,length=.035+hash(i,7,1)*.045,curve=new CatmullRomCurve3([new Vector3(x,y,z),new Vector3(x*1.08,y+length*.65,z-.020),new Vector3(x*1.2,y+length,z-.045)]);rigidSkin(new TubeGeometry(curve,5,.0006,3,false),filament,head,`Cranial_filament_${i}`);}
// Lower the head and neck into the selected adult's forward-reaching silhouette.
function warp(p:Vector3,n?:Vector3){const t=clamp((p.z-.42)/.40),s=clamp((p.y-.80)/.30),f=t*t*(3-2*t),g=s*s*(3-2*s),a=1-.14*f*6*s*(1-s)/.30,b=-.14*6*t*(1-t)/.40*g;if(n){n.set(n.x,n.y/a,n.z-b*n.y/a).normalize();}p.y-=.14*f*g;return p;}
root.traverse(o=>{if(!(o instanceof Mesh))return;const position=o.geometry.getAttribute('position'),normal=o.geometry.getAttribute('normal'),p=new Vector3(),n=new Vector3(),color=o.geometry.getAttribute('color');for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i);n.fromBufferAttribute(normal,i);warp(p,n);if(o===body){const neck=clamp((p.z-.30)/.20)*clamp((.96-p.z)/.20)*clamp((p.y-1.0)/.15),fold=Math.exp(-Math.pow(Math.sin(p.z*65+p.y*21+Math.sin(p.x*22)*.4)*5,2));p.addScaledVector(n,-.010*neck*fold);if(color){const shade=1-neck*fold*.12;color.setXYZ(i,color.getX(i)*shade,color.getY(i)*shade,color.getZ(i)*shade);}}position.setXYZ(i,p.x,p.y,p.z);normal.setXYZ(i,n.x,n.y,n.z);}o.geometry.computeBoundingSphere();});
const warped=absolute.map(p=>warp(p.clone()));bones.forEach((b,i)=>{b.position.copy(warped[i]);if(b.parent instanceof Bone)b.position.sub(warped[bones.indexOf(b.parent)]);rest[i].copy(b.position);});
root.updateMatrixWorld(true);const skeleton=new Skeleton(bones);root.traverse(o=>{if(o instanceof SkinnedMesh){o.bind(skeleton);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
const clips:AnimationClip[]=[];
for(const name of ['idle','reference','roar']){
 const duration=name==='idle'?6:name==='reference'?8:4,frames=duration*24,times:number[]=[],positions=bones.map(()=>[] as number[]),rotations=bones.map(()=>[] as number[]),scales=bones.map(()=>[] as number[]);
 for(let f=0;f<=frames;f++){const t=f/frames*duration,phase=t/duration*Math.PI*2;for(let i=0;i<bones.length;i++){bones[i].position.copy(rest[i]);bones[i].quaternion.identity();bones[i].scale.setScalar(1);}chest.scale.y=1+Math.sin(phase)*.006;spine.scale.x=1+Math.sin(phase)*.004;head.rotation.y=Math.sin(phase)*.025;jaw.rotation.x=name==='reference'?.62+Math.sin(phase)*.006:name==='roar'?Math.sin(phase*.5)**4*.72:.018;neck1.rotation.x=name==='reference'?-.035:name==='roar'?-.07*Math.sin(phase*.5)**2:0;tailBones.forEach((b,i)=>b.rotation.y=Math.sin(phase-i*.33)*.008);times.push(t);bones.forEach((b,i)=>{positions[i].push(...b.position.toArray());rotations[i].push(...b.quaternion.toArray());scales[i].push(...b.scale.toArray());});}
 const tracks=bones.flatMap((b,i)=>[new VectorKeyframeTrack(`${b.name}.position`,times,positions[i]),new QuaternionKeyframeTrack(`${b.name}.quaternion`,times,rotations[i]),new VectorKeyframeTrack(`${b.name}.scale`,times,scales[i])]);clips.push(new AnimationClip(name,duration,tracks));
}
for(let i=0;i<bones.length;i++){bones[i].position.copy(rest[i]);bones[i].quaternion.identity();bones[i].scale.setScalar(1);}root.updateMatrixWorld(true);
root.userData={target:'AMNH The Ultimate Predator adult reconstruction',version:'dedicated-anatomical-sculpt-1',units:'model units = approximately 3 metres',skinSource:'AI-generated living reptile skin material, not a fossil scan',references:['https://www.amnh.org/explore/news-blogs/t-rex-size-evolution','https://www.scotthartman.info/research/anatomy/'],notes:'Continuous implicit anatomical surface. Scientific reconstruction and color interpretation, not a digitization of the museum object.'};

// Preserve the generated source; the following are numerical material-map derivatives.
const source=await sharp(`${OUT}/skin-source.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),n=2048;
const resized=await sharp(`${OUT}/skin-source.png`).resize(n,n).ensureAlpha().raw().toBuffer(),normal=new Uint8Array(n*n*4),roughness=new Uint8Array(n*n*4),height=new Float32Array(n*n);
for(let i=0;i<n*n;i++)height[i]=(resized[i*4]*.2126+resized[i*4+1]*.7152+resized[i*4+2]*.0722)/255;
for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,dx=(height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n])*3.0,dy=(height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x])*3.0,l=Math.hypot(dx,dy,1);normal[i]=Math.round((.5-dx/l*.5)*255);normal[i+1]=Math.round((.5+dy/l*.5)*255);normal[i+2]=Math.round((.5+.5/l)*255);normal[i+3]=255;roughness[i]=0;roughness[i+1]=Math.round((.62+(1-height[y*n+x])*.22)*255);roughness[i+2]=0;roughness[i+3]=255;}
await sharp(resized,{raw:{width:n,height:n,channels:4}}).png().toFile(`${OUT}/trex-albedo.png`);await sharp(normal,{raw:{width:n,height:n,channels:4}}).png().toFile(`${OUT}/trex-normal.png`);await sharp(roughness,{raw:{width:n,height:n,channels:4}}).png().toFile(`${OUT}/trex-roughness-metalness.png`);

class FileReaderShim {result:any;onloadend?:()=>void;readAsArrayBuffer(blob:Blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}readAsDataURL(blob:Blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();});}}
(globalThis as any).FileReader=FileReaderShim;
const exported=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations:clips}) as ArrayBuffer),jsonLength=exported.readUInt32LE(12),document=JSON.parse(exported.subarray(20,20+jsonLength).toString()),binOffset=20+jsonLength,originalBin=exported.subarray(binOffset+8,binOffset+8+exported.readUInt32LE(binOffset)),chunks:Buffer[]=[originalBin];let offset=originalBin.length;
document.images=[];document.textures=[];document.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
for(const [i,file] of ['trex-albedo.png','trex-normal.png','trex-roughness-metalness.png'].entries()){const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}const bytes=readFileSync(`${OUT}/${file}`),view=document.bufferViews.length;document.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});document.images.push({mimeType:'image/png',bufferView:view,name:file});document.textures.push({sampler:0,source:i});chunks.push(bytes);offset+=bytes.length;}
for(const mat of document.materials)if(mat.name==='Living_skin'){mat.pbrMetallicRoughness.baseColorTexture={index:0};mat.pbrMetallicRoughness.metallicRoughnessTexture={index:2};mat.pbrMetallicRoughness.roughnessFactor=1;mat.normalTexture={index:1,scale:.46};}
document.buffers[0].byteLength=offset;let json=Buffer.from(JSON.stringify(document)),jsonPad=(4-json.length%4)%4;json=Buffer.concat([json,Buffer.alloc(jsonPad,0x20)]);let bin=Buffer.concat(chunks),binPad=(4-bin.length%4)%4;bin=Buffer.concat([bin,Buffer.alloc(binPad)]);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+8+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);const glb=Buffer.concat([header,json,bh,bin]);writeFileSync(`${OUT}/tyrannosaurus-anatomical.glb`,glb);
const report={result:'BUILT',target:root.userData.target,geometry:geometryStats,bones:bones.length,clips:clips.map(c=>c.name),textureSize:[n,n],sourceSize:[source.info.width,source.info.height],glbBytes:glb.length,continuousSkin:true,sourceImagePreserved:true};writeFileSync(`${OUT}/manifest.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
