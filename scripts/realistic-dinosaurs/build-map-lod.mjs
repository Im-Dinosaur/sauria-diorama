import fs from 'node:fs';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
const folder='public/models/realistic-dinosaurs',reports=[];
for(const species of ['brachiosaurus','triceratops','velociraptor','spinosaurus']){
 const source=fs.readFileSync(`${folder}/${species}.glb`),jsonLength=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+jsonLength)),bin=source.subarray(28+jsonLength);
 const chunks=[bin];let binLength=bin.length,before=0,after=0,maxError=0;
 const read=(id)=>{const a=json.accessors[id],view=json.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType],result=a.componentType===5126?new Float32Array(a.count*width):new Uint32Array(a.count*width),offset=(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??width*bytes;for(let i=0;i<a.count;i++)for(let j=0;j<width;j++)result[i*width+j]=a.componentType===5126?bin.readFloatLE(offset+i*stride+j*bytes):a.componentType===5125?bin.readUInt32LE(offset+i*stride+j*bytes):a.componentType===5123?bin.readUInt16LE(offset+i*stride+j*bytes):bin.readUInt8(offset+i*stride+j*bytes);return result;};
 for(const mesh of json.meshes)for(const primitive of mesh.primitives){
  if(primitive.indices===undefined||(primitive.mode??4)!==4)continue;
  const indices=read(primitive.indices),positions=read(primitive.attributes.POSITION);before+=indices.length/3;
  // Preserve small parts and feather cards; simplify only large continuous surfaces.
  let reduced=indices,error=0;if(indices.length>18000)[reduced,error]=MeshoptSimplifier.simplify(indices,positions,3,Math.floor(indices.length*.22/3)*3,.004,['LockBorder']);
  after+=reduced.length/3;maxError=Math.max(maxError,error);
  const data=Buffer.from(reduced.buffer,reduced.byteOffset,reduced.byteLength),padding=Buffer.alloc((4-binLength%4)%4);chunks.push(padding);binLength+=padding.length;
  const view=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:binLength,byteLength:data.length,target:34963});chunks.push(data);binLength+=data.length;
  primitive.indices=json.accessors.length;json.accessors.push({bufferView:view,componentType:5125,count:reduced.length,type:'SCALAR'});
 }
 json.buffers[0].byteLength=binLength;json.asset.extras={...json.asset.extras,mapLOD:{algorithm:'meshoptimizer index simplification',maxRelativeError:maxError,beforeTriangles:before,afterTriangles:after,source:`${species}.glb`,preserves:'All original vertex attributes, skin weights, skeletons, clips and textures'}};
 const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(padded);const binary=Buffer.concat(chunks),output=Buffer.alloc(28+padded.length+binary.length);
 output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);output.writeUInt32LE(padded.length,12);output.writeUInt32LE(0x4e4f534a,16);padded.copy(output,20);output.writeUInt32LE(binary.length,20+padded.length);output.writeUInt32LE(0x004e4942,24+padded.length);binary.copy(output,28+padded.length);
 fs.writeFileSync(`${folder}/${species}-map.glb`,output);reports.push({species,before,after,maxRelativeError:maxError});
}
fs.writeFileSync(`${folder}/map-lod.json`,JSON.stringify(reports,null,2));console.log(reports);
