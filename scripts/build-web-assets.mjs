import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression,EXTTextureWebP} from '@gltf-transform/extensions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {gzip,gunzipSync} from 'node:zlib';
import {promisify} from 'node:util';
sharp.concurrency(2);

// Derive web delivery files; never edit the modeling/review originals.
const root=path.resolve(process.argv[2]??'.');
const folder='public/models/realistic-dinosaurs';
const species=['brachiosaurus','triceratops','stegosaurus','spinosaurus','velociraptor','pterosaur'];
const lod=new Set(['brachiosaurus','triceratops','spinosaurus','velociraptor']);
const jobs=species.flatMap(id=>[
 {id,source:`${folder}/${id}.glb`,output:`${folder}/${id}-web.glb`,size:2048,role:'review'},
 ...(lod.has(id)?[{id,source:`${folder}/${id}-map.glb`,output:`${folder}/${id}-map-web.glb`,size:1024,role:'map'}]:[]),
]);
jobs.push({id:'rex',source:'public/models/tyrannosaurus-study/tyrannosaurus-reference-study.glb',output:'public/models/tyrannosaurus-study/tyrannosaurus-web.glb',size:2048,role:'review'});
jobs.push({id:'rex',source:'public/models/tyrannosaurus-study/tyrannosaurus-reference-study.glb',output:'public/models/tyrannosaurus-study/tyrannosaurus-map-web.glb',size:1024,role:'map'});
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
function hash(array){return createHash('sha256').update(Buffer.from(Float64Array.from(array??[]).buffer)).digest('hex');}
function usedVertices(primitive){return primitive.getIndices()?Array.from(new Set(primitive.getIndices().getArray())).sort((a,b)=>a-b):Array.from({length:primitive.getAttribute('POSITION').getCount()},(_,i)=>i);}
function indexHash(primitive,compact){
 const remap=new Map(usedVertices(primitive).map((v,i)=>[v,i]));
 const values=Array.from(primitive.getIndices()?.getArray()??[],i=>compact?remap.get(i):i);
 // The meshopt triangle codec may cyclically rotate a face; winding and geometry are unchanged.
 if(primitive.getMode()===4)for(let i=0;i<values.length;i+=3){const face=values.slice(i,i+3),rotations=[face,[face[1],face[2],face[0]],[face[2],face[0],face[1]]];rotations.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);for(let j=0;j<3;j++)values[i+j]=rotations[0][j];}
 return hash(values);
}
function structure(document,compact=false){
 const r=document.getRoot(),nodes=r.listNodes();
 const attributeHash=(primitive,accessor)=>{if(!compact)return hash(accessor.getArray());const array=accessor.getArray(),width=accessor.getElementSize(),used=usedVertices(primitive),values=new Float64Array(used.length*width);used.forEach((index,i)=>{for(let j=0;j<width;j++)values[i*width+j]=array[index*width+j];});return hash(values);};
 return {
  nodes:nodes.map(n=>({name:n.getName(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale(),children:n.listChildren().map(c=>nodes.indexOf(c)),skin:n.getSkin()?.listJoints().map(j=>nodes.indexOf(j))})),
  skins:r.listSkins().map(s=>({joints:s.listJoints().map(j=>nodes.indexOf(j)),bind:hash(s.getInverseBindMatrices()?.getArray())})),
  meshes:r.listMeshes().map(m=>m.listPrimitives().map(p=>({mode:p.getMode(),indices:indexHash(p,compact),attributes:p.listSemantics().map(s=>[s,attributeHash(p,p.getAttribute(s))]),targets:p.listTargets().map(t=>t.listSemantics().map(s=>[s,attributeHash(p,t.getAttribute(s))]))}))),
  animations:r.listAnimations().map(a=>({name:a.getName(),channels:a.listChannels().map(c=>({node:nodes.indexOf(c.getTargetNode()),path:c.getTargetPath(),interpolation:c.getSampler().getInterpolation(),input:hash(c.getSampler().getInput().getArray()),output:hash(c.getSampler().getOutput().getArray())}))})),
 };
}
const reports=[];
function compactMap(document){
 const root=document.getRoot();
 for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){
  const indices=primitive.getIndices();if(!indices)continue;
  const used=usedVertices(primitive),remap=new Map(used.map((index,i)=>[index,i]));
  const compactAccessor=accessor=>{const source=accessor.getArray(),width=accessor.getElementSize(),array=new source.constructor(used.length*width);used.forEach((old,i)=>{for(let j=0;j<width;j++)array[i*width+j]=source[old*width+j];});return accessor.clone().setArray(array);};
  for(const semantic of primitive.listSemantics())primitive.setAttribute(semantic,compactAccessor(primitive.getAttribute(semantic)));
  for(const target of primitive.listTargets())for(const semantic of target.listSemantics())target.setAttribute(semantic,compactAccessor(target.getAttribute(semantic)));
  const array=indices.getArray(),next=new array.constructor(array.length);array.forEach((old,i)=>{next[i]=remap.get(old);});primitive.setIndices(indices.clone().setArray(next));
 }
 for(const accessor of root.listAccessors())if(accessor.listParents().every(parent=>parent===root))accessor.dispose();
}
async function preserveNodeTransforms(source,output){
 const original=await fs.readFile(source),encoded=await fs.readFile(output);
 const originalJson=JSON.parse(original.subarray(20,20+original.readUInt32LE(12)).toString()),jsonLength=encoded.readUInt32LE(12),json=JSON.parse(encoded.subarray(20,20+jsonLength).toString());
 assert.equal(json.nodes.length,originalJson.nodes.length,'Node order changed');
 json.nodes.forEach((node,i)=>{assert.equal(node.name,originalJson.nodes[i].name);for(const key of ['matrix','translation','rotation','scale']){delete node[key];if(originalJson.nodes[i][key]!==undefined)node[key]=originalJson.nodes[i][key];}});
 // NodeIO omits near-identity transforms. Keep the original bone transforms byte-for-byte in JSON.
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
 const tail=encoded.subarray(20+jsonLength),result=Buffer.alloc(20+padded.length+tail.length);encoded.copy(result,0,0,20);result.writeUInt32LE(result.length,8);result.writeUInt32LE(padded.length,12);padded.copy(result,20);tail.copy(result,20+padded.length);await fs.writeFile(output,result);
}
for(const job of jobs){
 const source=path.join(root,job.source),output=path.join(root,job.output),document=await io.read(source),before=structure(document,job.role==='map');
 if(job.role==='map')compactMap(document);
 const normals=new Set(document.getRoot().listMaterials().map(m=>m.getNormalTexture()).filter(Boolean));
 for(const texture of document.getRoot().listTextures()){
  const originalImage=texture.getImage(),originalMime=texture.getMimeType(),metadata=await sharp(originalImage).metadata();
  const resize=image=>sharp(image).resize({width:job.size,height:job.size,fit:'inside',withoutEnlargement:true});
  let image=await resize(originalImage).webp({quality:90,lossless:normals.has(texture),alphaQuality:100,effort:4}).toBuffer(),mime='image/webp';
  if(originalMime==='image/jpeg'&&!metadata.hasAlpha){const jpeg=await resize(originalImage).jpeg({quality:normals.has(texture)?96:90,chromaSubsampling:'4:4:4'}).toBuffer();if(jpeg.length<image.length){image=jpeg;mime='image/jpeg';}}
  if(Math.max(metadata.width,metadata.height)<=job.size&&originalImage.length<image.length){image=originalImage;mime=originalMime;}
  texture.setImage(image).setMimeType(mime);
  if(texture.getURI())texture.setURI(texture.getURI().replace(/\.[^.]+$/,mime==='image/webp'?'.webp':mime==='image/jpeg'?'.jpg':'.png'));
 }
 if(document.getRoot().listTextures().some(t=>t.getMimeType()==='image/webp'))document.createExtension(EXTTextureWebP).setRequired(true);
 // No quantization, reordering, simplification, or animation resampling: numeric data stays exact.
 document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 await io.write(output,document);
 await preserveNodeTransforms(source,output);
 const raw=await fs.readFile(output),compressed=await promisify(gzip)(raw,{level:9});
 assert.deepEqual(gunzipSync(compressed),raw,'Gzip round trip');
 await fs.writeFile(output+'.gz',compressed);
 const decoded=await io.read(output);
 const actual=structure(decoded,job.role==='map'),changes=[];
 function differences(a,b,p=''){if(changes.length>=20||JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[key],b[key],`${p}.${key}`);else changes.push(p);}
 differences(before,actual);
 assert.equal(changes.length,0,`${job.output}: changed ${changes.join(', ')}`);
 const bytes=(await fs.stat(output)).size,originalBytes=(await fs.stat(source)).size;
 const textures=await Promise.all(decoded.getRoot().listTextures().map(async texture=>{const metadata=await sharp(texture.getImage()).metadata();return {name:texture.getName(),width:metadata.width,height:metadata.height,mimeType:texture.getMimeType()};}));
 const report={...job,source:job.source.replace('public/','/'),output:job.output.replace('public/','/'),bytes,transferBytes:compressed.length,originalBytes,reduction:1-compressed.length/originalBytes,geometrySkinAnimationUnchanged:true,textures};
 reports.push(report);console.log(`${job.output}: ${(originalBytes/1048576).toFixed(2)} -> ${(compressed.length/1048576).toFixed(2)} MiB transferred`);
}
// The original reference PNG remains the calibration/verification source.
await sharp(path.join(root,'public/textures/reference-valley.png')).resize({width:1536,withoutEnlargement:true}).webp({quality:92}).toFile(path.join(root,'public/textures/reference-valley-web.webp'));
await fs.writeFile(path.join(root,'public/models/web-delivery.json'),JSON.stringify(reports,null,2)+'\n');
