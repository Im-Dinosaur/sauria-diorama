import {useLoader} from '@react-three/fiber';
import {LoaderUtils} from 'three';
import type {LoadingManager} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';

/** Pages cannot configure Content-Encoding for GLBs, so decode our gzip delivery files locally. */
class WebGLTFLoader extends GLTFLoader{
 constructor(manager?:LoadingManager){super(manager);this.setMeshoptDecoder(MeshoptDecoder);}
 load(url:string,onLoad:(asset:GLTF)=>void,_onProgress?:(event:ProgressEvent)=>void,onError?:(error:unknown)=>void){
  const original=url.includes('/tyrannosaurus-study/')?url.replace(/tyrannosaurus(?:-map)?-web\.glb$/,'tyrannosaurus-reference-study.glb'):url.replace(/-web\.glb$/,'.glb');
  const request=this.manager.resolveURL((this.path??'')+(typeof DecompressionStream==='undefined'?original:url+'.gz'));
  this.manager.itemStart(request);
  void fetch(request,{headers:this.requestHeader,credentials:this.withCredentials?'include':'same-origin'})
   .then(async response=>{
    if(!response.ok)throw new Error(`Model request failed (${response.status}): ${request}`);
    const bytes=await response.arrayBuffer(),header=new Uint8Array(bytes,0,Math.min(bytes.byteLength,2));
    // A host may already decode Content-Encoding; never decompress twice.
    if(header[0]===0x1f&&header[1]===0x8b){const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream).arrayBuffer();}
    return bytes;
   })
   .then(bytes=>this.parseAsync(bytes,this.resourcePath||LoaderUtils.extractUrlBase(request)))
   .then(asset=>{onLoad(asset);this.manager.itemEnd(request);})
   .catch(error=>{onError?.(error);this.manager.itemError(request);this.manager.itemEnd(request);});
 }
}
export const useWebGLTF=Object.assign((url:string)=>useLoader(WebGLTFLoader,url),{preload:(url:string)=>useLoader.preload(WebGLTFLoader,url)});
