import {AnimationClip,AnimationMixer,Bone,Box3,BufferAttribute,Color,Float32BufferAttribute,Group,Matrix4,Mesh,MeshStandardMaterial,Quaternion,QuaternionKeyframeTrack,RepeatWrapping,SkinnedMesh,TextureLoader,Uint32BufferAttribute,Vector3,VectorKeyframeTrack} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {deinterleaveGeometry,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import {makeFeatheredVelociraptor} from './feathered-velociraptor';
import definitions from './species.json';

const xAxis=new Vector3(1,0,0),yAxis=new Vector3(0,1,0),zAxis=new Vector3(0,0,1),clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const vec=(a:number[])=>new Vector3(...a as [number,number,number]);
function rotateWorld(b:Bone,axis:Vector3,angle:number){if(!angle)return;const q=b.getWorldQuaternion(new Quaternion()).premultiply(new Quaternion().setFromAxisAngle(axis,angle)),parent=b.parent!.getWorldQuaternion(new Quaternion()).invert();b.quaternion.copy(parent.multiply(q));b.updateWorldMatrix(false,true);}
function positionWorld(b:Bone,p:Vector3){b.position.copy(b.parent!.worldToLocal(p.clone()));b.updateWorldMatrix(false,true);}
function orient(b:Bone,from:Vector3,to:Vector3){const q=new Quaternion().setFromUnitVectors(from.clone().normalize(),to.clone().normalize()),parent=b.parent!.getWorldQuaternion(new Quaternion()).invert();b.quaternion.copy(parent.multiply(b.getWorldQuaternion(new Quaternion()).premultiply(q)));b.updateWorldMatrix(false,true);}

async function textureBrachiosaurus(root:Group){
 const loader=new TextureLoader(),base='/models/realistic-dinosaurs/materials/';
 const [map,normalMap,roughnessMap]=await Promise.all(['brachiosaurus-hide-source.png','brachiosaurus-hide-normal.png','brachiosaurus-hide-roughness.png'].map(f=>loader.loadAsync(base+f)));
 map.colorSpace='srgb';for(const t of [map,normalMap,roughnessMap]){t.wrapS=t.wrapT=RepeatWrapping;}
 const skin=new MeshStandardMaterial({name:'New_brachiosaurus_skin',map,normalMap,roughnessMap,normalScale:undefined,roughness:1,metalness:0,vertexColors:true,color:'#b7b8a8'});skin.normalScale.setScalar(.35);
 await MeshoptSimplifier.ready;
 const remove:Mesh[]=[];root.updateMatrixWorld(true);root.traverse(o=>{if((o as any).isMesh&&(Array.isArray(o.material)?o.material:[o.material]).every(m=>m.name==='material_0'))remove.push(o);});remove.forEach(o=>o.removeFromParent());
 const meshes:Mesh[]=[];root.traverse(o=>{if((o as any).isMesh)meshes.push(o);});
 for(const mesh of meshes){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(!mats.some(m=>m.name==='Skin')){
  for(const m of mats)if((m as any).isMeshStandardMaterial){if(m.name==='Teeth')m.color.set('#b7ae94');else if(m.name==='Eyes')m.color.set('#8b632d');else if(m.name==='Toes')m.color.set('#555043');else if(m.name==='glass'){m.transparent=true;m.opacity=.18;m.depthWrite=false;}m.metalness=0;}
  continue;
 }
 let g=mesh.geometry.clone();deinterleaveGeometry(g);let p=g.getAttribute('position');
 if(g.index&&g.index.count>90000){const [index,error]=MeshoptSimplifier.simplify(new Uint32Array(g.index.array),new Float32Array(p.array),3,Math.floor(g.index.count*.30/3)*3,.0008,['LockBorder']);g.setIndex(new Uint32BufferAttribute(index,1));mesh.userData.simplificationError=error;
  const [remap,count]=MeshoptSimplifier.compactMesh(index);for(const [key,attribute] of Object.entries(g.attributes)){const a=attribute as BufferAttribute,Constructor=a.array.constructor as any,array=new Constructor(count*a.itemSize);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)for(let k=0;k<a.itemSize;k++)array[remap[i]*a.itemSize+k]=a.array[i*a.itemSize+k];g.setAttribute(key,new BufferAttribute(array,a.itemSize,a.normalized));}g.setIndex(new Uint32BufferAttribute(index,1));
 }
 g=g.toNonIndexed();p=g.getAttribute('position');const normals=g.getAttribute('normal'),uv=new Float32Array(p.count*2),colors=new Float32Array(p.count*3),world=new Vector3(),n=new Vector3(),normalMatrix=new Matrix4().copy(mesh.matrixWorld).invert().transpose(),tint=new Color();
 for(let i=0;i<p.count;i+=3){n.set(0,0,0);for(let k=0;k<3;k++)n.add(new Vector3().fromBufferAttribute(normals,i+k).transformDirection(normalMatrix));n.normalize();const ax=Math.abs(n.x),ay=Math.abs(n.y),az=Math.abs(n.z);
  for(let k=0;k<3;k++){const at=i+k;world.fromBufferAttribute(p,at).applyMatrix4(mesh.matrixWorld);uv[at*2]=(ax>=ay&&ax>=az?world.z:world.x)*.8;uv[at*2+1]=(ay>=ax&&ay>=az?world.z:world.y)*.8;const pattern=(Math.sin(world.z*.95+Math.sin(world.y*.85)*1.8)+Math.sin(world.x*1.7+world.y*.6))*.5,patch=clamp((pattern-.1)*.35);tint.setRGB(.83-patch*.23,.86-patch*.19,.76-patch*.18);colors.set(tint.toArray(),at*3);}
 }
 g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setAttribute('color',new Float32BufferAttribute(colors,3));mesh.geometry=mergeVertices(g,.00001);g.dispose();mesh.material=skin;
 }
}

function solveLeg(leg:any,target:Vector3){
 const hip=leg.upper.getWorldPosition(new Vector3()),delta=target.clone().sub(hip),d=clamp(delta.length(),Math.abs(leg.l1-leg.l2)+.0001,leg.l1+leg.l2-.0001),direction=delta.normalize(),along=(leg.l1**2-leg.l2**2+d*d)/(2*d),height=Math.sqrt(Math.max(0,leg.l1**2-along**2)),bend=leg.pole.clone().addScaledVector(direction,-leg.pole.dot(direction)).normalize(),knee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,height),end=hip.clone().addScaledVector(direction,d);
 orient(leg.upper,leg.upperAxis.clone().applyQuaternion(leg.upper.getWorldQuaternion(new Quaternion())),knee.clone().sub(hip));
 positionWorld(leg.lower,knee);orient(leg.lower,leg.lowerAxis.clone().applyQuaternion(leg.lower.getWorldQuaternion(new Quaternion())),end.clone().sub(knee));
 const deltaFoot=end.clone().sub(leg.ankle.getWorldPosition(new Vector3()));positionWorld(leg.ankle,end);
 if(leg.toe!==leg.ankle&&!isDescendant(leg.toe,leg.ankle))positionWorld(leg.toe,leg.toe.getWorldPosition(new Vector3()).add(deltaFoot));
 for(const b of [leg.ankle,leg.toe]){const q=leg.orientations.get(b) as Quaternion;b.quaternion.copy(b.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);}
}
function isDescendant(child:Bone,parent:Bone){let p=child.parent;while(p){if(p===parent)return true;p=p.parent;}return false;}

function bake(root:Group,cfg:any,sourceClips:AnimationClip[]){
 const bones:Bone[]=[];root.traverse(o=>{if((o as any).isBone)bones.push(o);});const rest=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()})),get=(name:string)=>root.getObjectByName(name) as Bone;
 const hips=get(cfg.hips),head=get(cfg.head),jaw=get(cfg.jaw),chest=get(cfg.chest),neck=(cfg.neck??[]).map(get).filter(Boolean),tail=(cfg.tail??[]).map(get).filter(Boolean);root.updateMatrixWorld(true);
 const legs=(cfg.legs??[]).map((names:string[],i:number)=>{const [upper,lower,ankle,toe]=names.map(get);if(!upper||!lower||!ankle||!toe)throw new Error(`${cfg.id}: missing leg ${names}`);const a=upper.getWorldPosition(new Vector3()),b=lower.getWorldPosition(new Vector3()),c=ankle.getWorldPosition(new Vector3());return {upper,lower,ankle,toe,l1:a.distanceTo(b),l2:b.distanceTo(c),base:c.clone(),pole:b.clone().sub(a.clone().add(c).multiplyScalar(.5)),upperAxis:b.clone().sub(a).applyQuaternion(upper.getWorldQuaternion(new Quaternion()).invert()).normalize(),lowerAxis:c.clone().sub(b).applyQuaternion(lower.getWorldQuaternion(new Quaternion()).invert()).normalize(),orientations:new Map([ankle,toe].map(b=>[b,b.getWorldQuaternion(new Quaternion())])),phase:legsPhase(i,(cfg.legs??[]).length)};});
 function reset(){bones.forEach((b,i)=>{b.position.copy(rest[i].p);b.quaternion.copy(rest[i].q);b.scale.copy(rest[i].s);});root.updateMatrixWorld(true);}
 if(cfg.id==='pterosaur'){
  const result=sourceClips.map(c=>{const copy=c.clone();copy.name=({flying:'fly',walking:'walk',standing:'idle'} as Record<string,string>)[c.name]??c.name;return copy;});
  const fly=result.find(c=>c.name==='fly')!,mixer=new AnimationMixer(root);mixer.clipAction(fly).play();mixer.setTime(fly.duration*.27);const times=[0,5],tracks=bones.flatMap(b=>[new QuaternionKeyframeTrack(`${b.name}.quaternion`,times,[...b.quaternion.toArray(),...b.quaternion.toArray()]),new VectorKeyframeTrack(`${b.name}.position`,times,[...b.position.toArray(),...b.position.toArray()])]);result.push(new AnimationClip('glide',5,tracks));mixer.stopAllAction();mixer.uncacheRoot(root);reset();return {clips:result,bones,legs};
 }
 const actions:Record<string,number>={idle:6,walk:2.8,run:1.5,roar:3.2,drink:5,rest:6,alert:4,[cfg.id==='triceratops'||cfg.id==='stegosaurus'?'graze':cfg.id==='brachiosaurus'?'browse':'hunt']:4};
 const clips:AnimationClip[]=[];
 for(const [action,duration] of Object.entries(actions)){const frames=Math.ceil(duration*24),times:number[]=[],values=bones.map(()=>({p:[] as number[],q:[] as number[],s:[] as number[]}));
  for(let f=0;f<=frames;f++){reset();const t=f/frames*duration,phase=t/duration*Math.PI*2,moving=action==='walk'||action==='run',run=action==='run',lower=(action==='drink'||action==='graze'?Math.sin(phase*.5)**2:0)*(cfg.id==='triceratops'?.70:cfg.id==='spinosaurus'?.80:1),resting=action==='rest'?(cfg.id==='spinosaurus'?.025:.08):0;const hp=hips.getWorldPosition(new Vector3());hp.y-=lower*(cfg.id==='brachiosaurus'?.08:cfg.id==='spinosaurus'?.045:.13)+resting;positionWorld(hips,hp);rotateWorld(chest,xAxis,lower*.13);if(chest)chest.scale.x*=1+Math.sin(phase)*.003;
   neck.forEach((b:Bone,i:number)=>rotateWorld(b,xAxis,lower*(cfg.id==='brachiosaurus'?1.6/neck.length:.7/neck.length)+(action==='browse'?Math.sin(phase)*.006:0)));
   rotateWorld(head,xAxis,lower*.30+(action==='roar'?-.10*Math.sin(phase*.5)**2:0)+(action==='hunt'?.07:0));rotateWorld(head,yAxis,action==='alert'?Math.sin(phase)*.19:Math.sin(phase)*.018);
   if(jaw&&cfg.id!=='triceratops')rotateWorld(jaw,xAxis,action==='roar'?Math.sin(phase*.5)**4*.38:action==='drink'?.025*lower*(1+Math.sin(phase*5)):.008*Math.sin(phase*2));
   tail.forEach((b:Bone,i:number)=>rotateWorld(b,yAxis,Math.sin(phase-i*.43)*(moving?.010:.006)));
   legs.forEach((leg:any)=>{const u=(t/duration+leg.phase)%1,stance=.64,stride=moving?(run?.34:.24):0,target=leg.base.clone();if(u<stance)target.z+=stride*(.5-u/stance);else{const v=(u-stance)/(1-stance);target.z-=stride*.5*Math.cos(v*Math.PI);target.y+=Math.sin(v*Math.PI)*(run?.15:.10);}solveLeg(leg,target);});
   root.updateMatrixWorld(true);times.push(t);bones.forEach((b,i)=>{values[i].p.push(...b.position.toArray());values[i].q.push(...b.quaternion.toArray());values[i].s.push(...b.scale.toArray());});
  }
  clips.push(new AnimationClip(action,duration,bones.flatMap((b,i)=>[new VectorKeyframeTrack(`${b.name}.position`,times,values[i].p),new QuaternionKeyframeTrack(`${b.name}.quaternion`,times,values[i].q),new VectorKeyframeTrack(`${b.name}.scale`,times,values[i].s)])));
 }
 reset();return {clips,bones,legs};
}
function legsPhase(i:number,count:number){return count===2?i*.5:[0,.5,.65,.15][i];}

export async function buildSpecies(id:string){
 const cfg:any=structuredClone(definitions.find(s=>s.id===id));if(!cfg)throw new Error(id);const sourceFile=id==='pterosaur'?'pteranodon-compatible':cfg.sourceFile,loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),gltf=await loader.loadAsync(`/qa-dinosaur-realistic/sources/${sourceFile}.glb`);let source=gltf.scene,featherCount=0;
 if(id==='velociraptor'){const made=await makeFeatheredVelociraptor(source);source=made.root;Object.assign(cfg,made.anatomy);featherCount=made.feathers;}
 if(id==='brachiosaurus')await textureBrachiosaurus(source);
 source.updateMatrixWorld(true);
 if(id==='brachiosaurus'){
  const bones:Bone[]=[],pieces:Mesh[]=[];source.traverse((o:any)=>{if(o.isBone)bones.push(o);if(o.isMesh&&!o.isSkinnedMesh)pieces.push(o);});
  for(const piece of pieces){const material=(Array.isArray(piece.material)?piece.material[0]:piece.material).name,center=new Box3().setFromObject(piece,true).getCenter(new Vector3());let joint:Bone|undefined;
   if(/Eyes|glass|Teeth/.test(material))joint=source.getObjectByName(material==='Teeth'&&center.y<15.45?'jawlower_89':cfg.head) as Bone;
   else if(material==='Toes'){let distance=Infinity;for(const b of bones.filter(b=>/finger|toe[1-5]|foot[lr]|hand[lr]/i.test(b.name))){const d=b.getWorldPosition(new Vector3()).distanceToSquared(center);if(d<distance){joint=b;distance=d;}}}
   joint?.attach(piece);
  }
 }
 // Static accessories in the Triceratops source must follow the animated skull.
 if(id==='triceratops'){const h=source.getObjectByName(cfg.head)!,accessories:Mesh[]=[];source.traverse(o=>{if((o as any).isMesh&&!((o as any).isSkinnedMesh))accessories.push(o);});accessories.forEach(o=>h.attach(o));}
 const root=new Group();root.name=`Sauria_${id}_realistic`;const normalizer=new Group();normalizer.name=`${id}_display_normalization`;normalizer.rotation.y=cfg.yaw;normalizer.add(source);root.add(normalizer);root.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(root,true),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3()),scale=cfg.dimension/Math.max(size.x,size.y,size.z);if(![...bounds.min.toArray(),...bounds.max.toArray(),scale].every(Number.isFinite))throw new Error(`${id}: invalid geometry bounds`);normalizer.scale.setScalar(scale);normalizer.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);root.updateMatrixWorld(true);
 const meshes:Mesh[]=[];root.traverse(o=>{if((o as any).isMesh){meshes.push(o);o.castShadow=o.name!=='Layered_body_wing_tail_feathers';o.receiveShadow=true;o.frustumCulled=false;const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats){if((mat as any).isMeshStandardMaterial){mat.metalness=0;if(id==='stegosaurus'){mat.roughness=Math.max(mat.roughness,.75);mat.normalScale.multiplyScalar(.65);}if(mat.map){mat.map.userData.mimeType=mat.alphaTest>0?'image/png':'image/jpeg';}for(const key of ['normalMap','roughnessMap','metalnessMap'] as const)if(mat[key])mat[key]!.userData.mimeType='image/jpeg';}}if((o as any).isSkinnedMesh){o.normalizeSkinWeights();const sw=o.geometry.getAttribute('skinWeight'),sj=o.geometry.getAttribute('skinIndex');for(let i=0;i<sw.count;i++)for(let k=0;k<4;k++)if(sw.getComponent(i,k)===0)sj.setComponent(i,k,0);}}});
 const {clips,bones,legs}=bake(root,cfg,gltf.animations);const finalBounds=new Box3().setFromObject(root,true),textures:any[]=[],seen=new Set();let triangles=0;
 for(const mesh of meshes){triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(!((mat as any).isMeshStandardMaterial))continue;for(const key of ['map','normalMap','roughnessMap'] as const){const texture=mat[key];if(texture&&!seen.has(texture.uuid)){seen.add(texture.uuid);textures.push({material:mat.name,kind:key,width:texture.image.width,height:texture.image.height});}}}}
 const metadata={...cfg,credit:`${cfg.latin} base model by ${cfg.author}, CC BY 4.0. Modified for this project.`,licenseUrl:'https://creativecommons.org/licenses/by/4.0/',triangles,bones:bones.length,meshes:meshes.length,feathers:featherCount,normalization:{scale,yaw:cfg.yaw,units:'display units; preserve relative proportions'},bounds:{min:finalBounds.min.toArray(),max:finalBounds.max.toArray()},textures,clips:clips.map(c=>({name:c.name,duration:c.duration,origin:id==='pterosaur'&&c.name!=='glide'?'original author':'project-authored'})),geometryOrigin:'Licensed original sculpt; not a museum scan.',materialOrigin:id==='brachiosaurus'?'Built-in image_gen skin with numerical normal/roughness derivatives':id==='velociraptor'?'Original skin maps plus built-in image_gen RGBA feathers':'Original source UV textures',rigOrigin:id==='velociraptor'?'New anatomical capsule-weighted skeleton and layered feather skinning':'Original author rig, with project-authored actions',limits:['Reference-based reconstruction. Skin colors and detailed behavior are interpretations.','Animation file validation does not establish scientific accuracy.'],integration:'Asset and review only; map integration belongs to Zip 파일 확인 chat.'};
 root.userData={...metadata,sourceCredit:metadata.credit};const buffer=await new GLTFExporter().parseAsync(root,{binary:true,animations:clips,onlyVisible:true,maxTextureSize:4096}) as ArrayBuffer;
 const bytes=new Uint8Array(buffer);let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return {base64:btoa(text),metadata:{...metadata,glbBytes:bytes.length}};
}
