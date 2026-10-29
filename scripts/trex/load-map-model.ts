import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Load the actual mesh/rig/clips in Node; image decoding is irrelevant to IK tests. */
export async function loadMapModel(path='public/models/tyrannosaurus-study/tyrannosaurus-reference-study.glb'){
 const source=readFileSync(path),jsonLength=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+jsonLength).toString());
 delete json.images;delete json.textures;delete json.samplers;json.materials=json.materials.map(()=>({pbrMetallicRoughness:{baseColorFactor:[.6,.5,.3,1],roughnessFactor:1}}));
 const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(padded);const binary=source.subarray(20+jsonLength),out=Buffer.alloc(20+padded.length+binary.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);binary.copy(out,20+padded.length);
 return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}
