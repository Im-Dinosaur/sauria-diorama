import {Bone,BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,Skeleton,SkinnedMesh,TextureLoader,Uint16BufferAttribute,Vector3} from 'three';

type V=[number,number,number];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const hash=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export async function makeFeatheredVelociraptor(source:Group){
 source.updateMatrixWorld(true);const root=new Group();root.name='Feathered_Velociraptor';const bones:Bone[]=[],absolute:Vector3[]=[],segments:{a:Vector3;b:Vector3;bone:Bone;end:Bone;r:number;region:string}[]=[];
 function bone(name:string,p:V,parent?:Bone){const b=new Bone();b.name=name;b.position.set(...p);if(parent)b.position.sub(absolute[bones.indexOf(parent)]);(parent??root).add(b);bones.push(b);absolute.push(new Vector3(...p));return b;}
 const hips=bone('hips',[0,.74,-.28]),spine=bone('spine',[0,.85,-.04],hips),chest=bone('chest',[0,.98,.12],spine),n0=bone('neck0',[0,1.10,.22],chest),n1=bone('neck1',[0,1.29,.31],n0),head=bone('head',[0,1.35,.44],n1),jaw=bone('jaw',[0,1.23,.35],head);
 const bodySource:Mesh[]=[];source.traverse(o=>{if((o as any).isMesh)bodySource.push(o);});
 const skinOriginal=bodySource.find(m=>m.name.includes('body'))!,bodyGeometry=skinOriginal.geometry.clone().applyMatrix4(skinOriginal.matrixWorld),bp=bodyGeometry.getAttribute('position');
 function tailPoint(z:number){let lo=Infinity,hi=-Infinity;for(let i=0;i<bp.count;i++)if(Math.abs(bp.getZ(i)-z)<.075&&Math.abs(bp.getX(i))<.22){lo=Math.min(lo,bp.getY(i));hi=Math.max(hi,bp.getY(i));}return Number.isFinite(lo)?(lo+hi)/2:.87;}
 const tail:Bone[]=[];let par=hips;for(let i=0;i<10;i++){const z=-.47-i*.22,b=bone(`tail${i}`,[0,tailPoint(z),z],par);tail.push(b);par=b;}
 const legs:Bone[][]=[],arms:Bone[][]=[];
 for(const side of [-1,1]){const s=side<0?'L':'R',upper=bone(`thigh${s}`,[side*.19,.73,-.28],hips),lower=bone(`shin${s}`,[side*.21,.39,-.06],upper),ankle=bone(`hock${s}`,[side*.18,.025,-.26],lower),foot=bone(`foot${s}`,[side*.19,-.185,.015],ankle);legs.push([upper,lower,ankle,foot]);
 const arm=bone(`upperArm${s}`,[side*.17,.94,.14],chest),fore=bone(`foreArm${s}`,[side*.27,.65,.25],arm),hand=bone(`hand${s}`,[side*.30,.44,.44],fore);arms.push([arm,fore,hand]);}
 function link(a:Bone,b:Bone,r:number,region:string){segments.push({a:absolute[bones.indexOf(a)],b:absolute[bones.indexOf(b)],bone:a,end:b,r,region});}
 link(hips,spine,.31,'torso');link(spine,chest,.27,'torso');link(chest,n0,.17,'neck');link(n0,n1,.14,'neck');link(n1,head,.16,'head');
 tail.forEach((b,i)=>{if(i<tail.length-1)link(b,tail[i+1],.09*(1-i/12),'tail');});
 legs.forEach(l=>{link(l[0],l[1],.14,'leg');link(l[1],l[2],.075,'leg');link(l[2],l[3],.075,'leg');});arms.forEach(a=>{link(a[0],a[1],.07,'arm');link(a[1],a[2],.10,'arm');});
 function weights(p:Vector3,name='body'){
  if(/cornea|eye|top_teeth/.test(name))return {j:[bones.indexOf(head),0,0,0],w:[1,0,0,0]};
  if(/bottom_teeth|tongue/.test(name))return {j:[bones.indexOf(jaw),0,0,0],w:[1,0,0,0]};
  if(p.z>.35&&p.y>1.14){const lower=clamp((1.285-p.y)/.055)*clamp((p.z-.35)/.12);return {j:[bones.indexOf(head),bones.indexOf(jaw),0,0],w:[1-lower,lower,0,0]};}
  const influences=new Float64Array(bones.length);
  for(const s of segments){if(s.region==='tail'&&p.z>-.40||s.region==='arm'&&(p.y<.22||p.z<.06)||s.region==='leg'&&(p.y>.90||p.z<-.8)||s.region==='torso'&&p.y<.25)continue;
   const ab=s.b.clone().sub(s.a),t=clamp(p.clone().sub(s.a).dot(ab)/ab.lengthSq()),distance=p.distanceTo(s.a.clone().addScaledVector(ab,t)),score=Math.exp(-Math.pow(distance/s.r,2)*2.5);influences[bones.indexOf(s.bone)]+=score*(1-t);influences[bones.indexOf(s.end)]+=score*t;
  }
  const ranked=Array.from(influences,(w,j)=>({j,w})).sort((a,b)=>b.w-a.w).slice(0,4),sum=ranked.reduce((s,p)=>s+p.w,0);if(sum<1e-30)return {j:[bones.indexOf(hips),0,0,0],w:[1,0,0,0]};return {j:ranked.map(x=>x.j),w:ranked.map(x=>x.w/sum)};
 }
 let body:SkinnedMesh|undefined;
 for(const original of bodySource){const g=original===skinOriginal?bodyGeometry:original.geometry.clone().applyMatrix4(original.matrixWorld),position=g.getAttribute('position'),indices:number[]=[],values:number[]=[],p=new Vector3();for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i);const w=weights(p,original.name);indices.push(...w.j);values.push(...w.w);}g.setAttribute('skinIndex',new Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new Float32BufferAttribute(values,4));const mesh=new SkinnedMesh(g,original.material);mesh.name=original.name;root.add(mesh);if(original===skinOriginal)body=mesh;}

 const texture=await new TextureLoader().loadAsync('/models/realistic-dinosaurs/materials/velociraptor-feather-source.png');texture.colorSpace='srgb';
 const material=new MeshStandardMaterial({name:'Reconstructed_pennaceous_feathers',map:texture,alphaTest:.40,side:DoubleSide,roughness:.93,vertexColors:true,metalness:0});
 const positions:number[]=[],normals:number[]=[],uv:number[]=[],indices:number[]=[],joints:number[]=[],sw:number[]=[],colors:number[]=[];
 function feather(a:Vector3,direction:Vector3,normal:Vector3,length:number,width:number,id:number,weight=weights(a),bodyCard=false){
  const start=positions.length/3,tangent=direction.clone().normalize(),across=new Vector3().crossVectors(tangent,normal).normalize(),c=new Color().setRGB(.70+hash(id+2)*.25,.65+hash(id+3)*.20,.55+hash(id+4)*.22);
  for(let k=0;k<=4;k++)for(let side=0;side<2;side++){const t=k/4,p=a.clone().addScaledVector(tangent,length*t).addScaledVector(across,(side-.5)*width).addScaledVector(normal,.004+Math.sin(t*Math.PI)*length*.08);positions.push(...p.toArray());normals.push(...normal.toArray());uv.push(side?.675:.325,bodyCard?.38+.62*t:.10+.90*t);joints.push(...weight.j);sw.push(...weight.w);colors.push(...c.toArray());}
  for(let k=0;k<4;k++){const b=start+k*2;indices.push(b,b+1,b+2,b+1,b+3,b+2);}
 }
 const bn=bodyGeometry.getAttribute('normal'),p=new Vector3(),n=new Vector3(),bi=bodyGeometry.index,faces=Math.floor((bi?.count??bp.count)/3),areas:number[]=[];let totalArea=0,count=0;
 const a=new Vector3(),b=new Vector3(),c=new Vector3();
 for(let i=0;i<faces;i++){a.fromBufferAttribute(bp,bi?bi.getX(i*3):i*3);b.fromBufferAttribute(bp,bi?bi.getX(i*3+1):i*3+1);c.fromBufferAttribute(bp,bi?bi.getX(i*3+2):i*3+2);totalArea+=b.sub(a).cross(c.sub(a)).length()*.5;areas.push(totalArea);}
 for(let k=0;k<50000&&count<10000;k++){const area=hash(k*13+71)*totalArea;let lo=0,hi=faces-1;while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<area)lo=mid+1;else hi=mid;}let u=hash(k+1327),v=hash(k+9137);if(u+v>1){u=1-u;v=1-v;}const w=[1-u-v,u,v];p.set(0,0,0);n.set(0,0,0);for(let j=0;j<3;j++){const index=bi?bi.getX(lo*3+j):lo*3+j;p.addScaledVector(new Vector3().fromBufferAttribute(bp,index),w[j]);n.addScaledVector(new Vector3().fromBufferAttribute(bn,index),w[j]);}n.normalize();if(p.y<.26||p.z<-2.20||p.z>.31&&p.y<1.30||p.z>.39)continue;
  if(p.y<.58&&p.z>.07)continue;const back=new Vector3(0,-.15,-1).addScaledVector(n,n.z+n.y*.15).normalize();feather(p,back,n,.080+hash(k)*.050,.018+hash(k+11)*.010,k,weights(p),true);count++;
 }
 for(let side=0;side<2;side++){const sign=side===0?-1:1;for(let i=0;i<14;i++){const t=i/13,desired=new Vector3(sign*(.26+.04*t),.75-.20*t,.23+.18*t);let nearest=0,distance=Infinity;for(let j=0;j<bp.count;j++){const q=new Vector3().fromBufferAttribute(bp,j);if(q.x*sign<.17||q.y<.48||q.y>.92||q.z<.12)continue;const d=q.distanceToSquared(desired);if(d<distance){distance=d;nearest=j;}}const a=new Vector3().fromBufferAttribute(bp,nearest),normal=new Vector3().fromBufferAttribute(bn,nearest).normalize(),d=new Vector3(sign*(.5+.4*t),-.25,-1).addScaledVector(normal,-normal.dot(new Vector3(sign*(.5+.4*t),-.25,-1))).normalize();feather(a,d,normal,.19+.10*Math.sin(t*Math.PI),.040,30000+side*100+i,weights(a));}}
 for(let i=0;i<14;i++){const t=i/13,a=new Vector3((t-.5)*.075,tailPoint(-2.18)+.035,-2.18),d=new Vector3((t-.5)*.85,.04,-1).normalize();feather(a,d,new Vector3(0,1,0),.37,.07,40000+i,{j:[bones.indexOf(tail[8]),bones.indexOf(tail[9]),0,0],w:[.5,.5,0,0]});}
 const fg=new BufferGeometry();fg.setAttribute('position',new Float32BufferAttribute(positions,3));fg.setAttribute('normal',new Float32BufferAttribute(normals,3));fg.setAttribute('uv',new Float32BufferAttribute(uv,2));fg.setAttribute('color',new Float32BufferAttribute(colors,3));fg.setAttribute('skinIndex',new Uint16BufferAttribute(joints,4));fg.setAttribute('skinWeight',new Float32BufferAttribute(sw,4));fg.setIndex(indices);const plumage=new SkinnedMesh(fg,material);plumage.name='Layered_body_wing_tail_feathers';root.add(plumage);
 root.updateMatrixWorld(true);const skeleton=new Skeleton(bones);root.traverse(o=>{if((o as any).isSkinnedMesh){o.bind(skeleton);o.normalizeSkinWeights();}});
 return {root,bones,feathers:count+42,anatomy:{hips:hips.name,chest:chest.name,head:head.name,jaw:jaw.name,neck:[n0.name,n1.name],tail:tail.map(b=>b.name),legs:legs.map(l=>l.map(b=>b.name))}};
}
