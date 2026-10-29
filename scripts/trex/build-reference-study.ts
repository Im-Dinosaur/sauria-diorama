import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {CatmullRomCurve3,Quaternion,TubeGeometry,Vector3} from 'three';

// Derivative of the author's explicitly CC BY 4.0 GLB. Keep its UVs, maps and rig.
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out='public/models/tyrannosaurus-study';mkdirSync(out,{recursive:true});
const source=readFileSync('qa-trex-study/references/animal-animator.glb');
const length=source.readUInt32LE(12),doc=JSON.parse(source.subarray(20,20+length).toString());
const bin=Buffer.from(source.subarray(28+length,28+length+source.readUInt32LE(20+length)));
const chunks:Buffer[]=[bin];let offset=bin.length;
const components:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function read(index:number){
 const a=doc.accessors[index],bv=doc.bufferViews[a.bufferView],n=components[a.type];
 const bytes=a.componentType===5126||a.componentType===5125?4:a.componentType===5123?2:1;
 const stride=bv.byteStride??n*bytes,result:number[]=[],data=(bv.byteOffset??0)>=bin.length?Buffer.concat(chunks):bin;
 for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){
  const pos=(bv.byteOffset??0)+(a.byteOffset??0)+i*stride+k*bytes;
  result.push(a.componentType===5126?data.readFloatLE(pos):a.componentType===5125?data.readUInt32LE(pos):a.componentType===5123?data.readUInt16LE(pos):data.readUInt8(pos));
 }return result;
}
function append(values:number[],type:string,target?:number,componentType=5126){
 const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}
 const bytes=componentType===5123?2:4,data=Buffer.alloc(values.length*bytes);values.forEach((v,i)=>componentType===5126?data.writeFloatLE(v,i*bytes):componentType===5123?data.writeUInt16LE(v,i*bytes):data.writeUInt32LE(v,i*bytes));
 const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});chunks.push(data);offset+=data.length;
 const index=doc.accessors.length,n=components[type],accessor:any={bufferView:view,componentType,count:values.length/n,type};
 if(type==='SCALAR'||target===34962){accessor.min=Array(n).fill(Infinity);accessor.max=Array(n).fill(-Infinity);for(let i=0;i<values.length;i++){const k=i%n;accessor.min[k]=Math.min(accessor.min[k],values[i]);accessor.max[k]=Math.max(accessor.max[k],values[i]);}}
 doc.accessors.push(accessor);return index;
}
const headIndex=doc.nodes.findIndex((n:any)=>n.name==='DEF-head');
const skullScale=[1.08,.97,1.10];
for(const animation of doc.animations)for(const channel of animation.channels){
 if(channel.target.node!==headIndex||channel.target.path!=='scale')continue;
 const sampler=animation.samplers[channel.sampler],values=read(sampler.output).map((v,i)=>v*skullScale[i%3]);
 sampler.output=append(values,'VEC3');
}
doc.nodes[headIndex].scale=(doc.nodes[headIndex].scale??[1,1,1]).map((v:number,i:number)=>v*skullScale[i]);

// Broaden the ribcage gently without moving the feet or changing the source UV atlas.
const body=doc.meshes[0].primitives[0],p=read(body.attributes.POSITION),normals=read(body.attributes.NORMAL),tints:number[]=[];
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const chestAt=(y:number,z:number)=>smooth(.16,.23,y)*(1-smooth(.20,.27,z))*smooth(-.22,-.12,z);
for(let i=0;i<p.length;i+=3){
 const x=p[i],y=p[i+1],z=p[i+2];
 const chest=chestAt(y,z),s=1+.10*chest,eps=.00001,dy=.1*(chestAt(y+eps,z)-chestAt(y-eps,z))/(eps*2),dz=.1*(chestAt(y,z+eps)-chestAt(y,z-eps))/(eps*2);
 const n=new Vector3(normals[i]/s,normals[i+1]-x*dy*normals[i]/s,normals[i+2]-x*dz*normals[i]/s).normalize();normals.splice(i,3,...n.toArray());
 p[i]*=1+.10*chest;
 // Broad irregular patches use bind-space vertices, so they stay attached in animation.
 const wave=Math.sin(z*67+Math.sin(y*35)*1.3+Math.sin(x*58)*.6)*.48+Math.sin(z*113+y*42+x*30)*.23;
 const dorsal=smooth(.18,.30,y),patch=smooth(-.07,.52,wave)*dorsal;
 const shade=1-patch*.42;
 tints.push(shade,shade,shade);
}
body.attributes.POSITION=append(p,'VEC3',34962);body.attributes.NORMAL=append(normals,'VEC3',34962);body.attributes.COLOR_0=append(tints,'VEC3',34962);
// Both UV material sections meet at the neck. Apply the same deformation to both.
const face=doc.meshes[0].primitives[1],hp=read(face.attributes.POSITION),hn=read(face.attributes.NORMAL),hj=read(face.attributes.JOINTS_0),hw=read(face.attributes.WEIGHTS_0);
for(let i=0;i<hp.length;i+=3){const x=hp[i],y=hp[i+1],z=hp[i+2],s=1+.1*chestAt(y,z),eps=.00001,dy=.1*(chestAt(y+eps,z)-chestAt(y-eps,z))/(eps*2),dz=.1*(chestAt(y,z+eps)-chestAt(y,z-eps))/(eps*2),n=new Vector3(hn[i]/s,hn[i+1]-x*dy*hn[i]/s,hn[i+2]-x*dz*hn[i]/s).normalize();hp[i]*=s;hn.splice(i,3,...n.toArray());}
face.attributes.POSITION=append(hp,'VEC3',34962);face.attributes.NORMAL=append(hn,'VEC3',34962);
doc.materials[0].pbrMetallicRoughness.baseColorFactor=[1,.76,.43,1];
doc.materials[1].pbrMetallicRoughness.baseColorFactor=[.94,.83,.65,1];
for(const m of doc.materials)if(m.name.startsWith('TRex_')){m.pbrMetallicRoughness.metallicFactor=0;m.normalTexture.scale=m.name==='TRex_Tongue_v3'?.8:.72;}
// Avoid the white scleral appearance at a distance; retain the source iris texture.
doc.materials[3].pbrMetallicRoughness.baseColorFactor=[.72,.63,.40,1];
for(const node of doc.nodes)if(/^(Eye|Cornea)\.[LR]$/.test(node.name))node.scale=(node.scale??[1,1,1]).map((v:number)=>v*.78);

// Fine cranial filaments observed on the selected museum reconstruction.
// Their roots use the source head surface and its four normalized skin weights.
const eligible:number[]=[];
for(let i=0;i<hp.length/3;i++)if(hp[i*3+1]>.387&&hp[i*3+2]>.265&&hp[i*3+2]<.365&&hn[i*3+1]>.3)eligible.push(i);
const hairP:number[]=[],hairN:number[]=[],hairJ:number[]=[],hairW:number[]=[],hairI:number[]=[];
for(let i=0;i<120&&eligible.length;i++){
 const at=eligible[(i*127)%eligible.length],a=new Vector3().fromArray(hp,at*3),n=new Vector3().fromArray(hn,at*3).lerp(new Vector3(0,1,0),.4).normalize(),len=.008+(Math.sin(i*57.1)*.5+.5)*.012;
 a.addScaledVector(n,-.0007);const b=a.clone().addScaledVector(n,len*.5).add(new Vector3(0,0,-len*.2)),c=a.clone().addScaledVector(n,len).add(new Vector3(0,0,-len*.5));
 const g=new TubeGeometry(new CatmullRomCurve3([a,b,c]),6,.000085,3,false),base=hairP.length/3,position=g.getAttribute('position'),normal=g.getAttribute('normal');
 hairP.push(...Array.from(position.array));hairN.push(...Array.from(normal.array));hairI.push(...Array.from(g.index!.array).map(j=>j+base));
 for(let k=0;k<position.count;k++){hairJ.push(...hj.slice(at*4,at*4+4));hairW.push(...hw.slice(at*4,at*4+4));}g.dispose();
}
const hairMaterial=doc.materials.length;doc.materials.push({name:'AMNH_reference_cranial_filaments',pbrMetallicRoughness:{baseColorFactor:[.12,.105,.075,1],metallicFactor:0,roughnessFactor:.95}});
const hairMesh=doc.meshes.length;doc.meshes.push({name:'Added_cranial_filaments',primitives:[{attributes:{POSITION:append(hairP,'VEC3',34962),NORMAL:append(hairN,'VEC3',34962),JOINTS_0:append(hairJ,'VEC4',34962,5123),WEIGHTS_0:append(hairW,'VEC4',34962)},indices:append(hairI,'SCALAR',34963,5125),material:hairMaterial}]});
const hairNode=doc.nodes.length;doc.nodes.push({name:'Cranial_filaments',mesh:hairMesh,skin:0});doc.nodes.find((n:any)=>n.name==='TRex_Rig').children.push(hairNode);

// Hold a real sampled jaw pose for judging silhouette, independently of playback.
const attack=doc.animations.find((a:any)=>a.name==='04_Attack'),jawIndex=doc.nodes.findIndex((n:any)=>n.name==='DEF-jaw');
const jawChannel=attack.channels.find((c:any)=>c.target.node===jawIndex&&c.target.path==='rotation');
const jawSampler=attack.samplers[jawChannel.sampler],jt=read(jawSampler.input),jv=read(jawSampler.output);
let peak=0,maxAngle=-Infinity;const start=new Quaternion().fromArray(jv);
for(let i=0;i<jt.length;i++){const angle=start.angleTo(new Quaternion().fromArray(jv,i*4));if(angle>maxAngle){maxAngle=angle;peak=jt[i];}}
function sample(sampler:any,path:string,time:number){
 const times=read(sampler.input),values=read(sampler.output),n=path==='rotation'?4:3;let at=0;
 while(at<times.length-2&&times[at+1]<time)at++;
 const t=Math.max(0,Math.min(1,(time-times[at])/(times[at+1]-times[at]||1)));
 if(path==='rotation')return new Quaternion().fromArray(values,at*n).slerp(new Quaternion().fromArray(values,(at+1)*n),t).toArray();
 return Array.from({length:n},(_,i)=>values[at*n+i]*(1-t)+values[(at+1)*n+i]*t);
}
const holdTime=append([0,8],'SCALAR'),reference:any={name:'reference',samplers:[],channels:[]},idle=doc.animations.find((a:any)=>a.name==='01_Idle');
for(const channel of idle.channels){const path=channel.target.path,isJaw=channel.target.node===jawIndex&&path==='rotation',values=isJaw?sample(jawSampler,path,peak):sample(idle.samplers[channel.sampler],path,0),output=append([...values,...values],path==='rotation'?'VEC4':'VEC3');reference.channels.push({sampler:reference.samplers.length,target:channel.target});reference.samplers.push({input:holdTime,output,interpolation:'LINEAR'});}
doc.animations.push(reference);
const roots=doc.scenes[doc.scene??0].nodes,wrapper=doc.nodes.length;
doc.nodes.push({name:'AMNH_reference_proportion_study',scale:[4,4,4],translation:[0,0,-.45],children:roots});doc.scenes[doc.scene??0].nodes=[wrapper];
const credit='Tyrannosaurus rex 3D model by AnimalAnimator.com (https://animalanimator.com), licensed under CC BY 4.0.';
doc.asset.copyright=`${credit} Modified in the diorama project: ribcage width, skull scale, pigment and reference pose.`;
doc.asset.extras={source:'https://animalanimator.com/free-3d-animated-t-rex-reference/',license:'https://creativecommons.org/licenses/by/4.0/',reference:'https://www.amnh.org/explore/news-blogs/t-rex-size-evolution',fidelity:'Reference-based derivative, not an AMNH scan or exact replica.'};

const images=[];
for(const image of doc.images){const view=doc.bufferViews[image.bufferView],data=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),file=image.name.replace(/[^\w.-]/g,'_')+'.jpg';writeFileSync(`${out}/${file}`,data);const metadata=await sharp(data).metadata();images.push({name:image.name,file,width:metadata.width,height:metadata.height});}
doc.buffers[0].byteLength=offset;
let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
let binary=Buffer.concat(chunks);binary=Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,bh,binary]);writeFileSync(`${out}/tyrannosaurus-reference-study.glb`,result);
const report={target:'AMNH The Ultimate Predator adult reconstruction',status:'reference-based derivative; exact match not achieved',credit,license:'https://creativecommons.org/licenses/by/4.0/',source:'https://animalanimator.com/free-3d-animated-t-rex-reference/',sourceBytes:source.length,glbBytes:result.length,bones:doc.skins[0].joints.length,triangles:doc.meshes.flatMap((m:any)=>m.primitives).reduce((sum:number,p:any)=>sum+doc.accessors[p.indices].count/3,0),clips:doc.animations.map((a:any)=>({name:a.name,duration:Math.max(...a.samplers.map((s:any)=>doc.accessors[s.input].max?.[0]??0))})),images,changes:{skullScale,upperRibcageWidth:1.10,pigment:'warm amber with dorsal patches, source UV maps retained',referencePoseSampleTime:peak},limits:['Not a digitization of the AMNH physical exhibit.','Head profile, feathers and skin patterns still differ from the selected reference.','The earlier generated 2K skin test is not used on this derivative.']};
writeFileSync(`${out}/reference-manifest.json`,JSON.stringify(report,null,2));
writeFileSync(`${out}/CREDITS.txt`,`${credit}\n\nSource and download: ${report.source}\nLicense: ${report.license}\nChanges: expanded ribcage; widened/deepened skull using the existing skin rig; warmer pigmentation and dorsal patches; sampled reference pose; scale and placement. Original UV-mapped textures, anatomy, rig and four animated clips are by the credited author.\n\nVisual target: AMNH The Ultimate Predator adult reconstruction. This derivative is not an AMNH scan or an exact reproduction of the museum object.\nGenerated skin-source.png and trex-*.png belong to an earlier procedural material test and are not used on this model.\n`);
console.log(JSON.stringify(report,null,2));
