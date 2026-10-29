import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createOrganicDinosaur,bakeDinosaurClips,disposeOrganicDinosaur } from './SkinnedDinosaurs';
import type { Species } from '../world/paths';

export async function exportDinosaurGLB(species:Species){
 const rig=createOrganicDinosaur(species);
 // Our packed texture already stores roughness in G and metalness=0 in B.
 // Reuse it directly; GLTFExporter cannot draw a DataTexture into its merge canvas.
 for(const material of Object.values(rig.materials))if(material.roughnessMap)material.metalnessMap=material.roughnessMap;
 try{return await new GLTFExporter().parseAsync(rig.root,{binary:true,animations:bakeDinosaurClips(rig),onlyVisible:true}) as ArrayBuffer;}
 finally{disposeOrganicDinosaur(rig);}
}
export async function downloadDinosaur(species:Species){
 const bytes=await exportDinosaurGLB(species),url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'})),a=document.createElement('a');
 a.href=url;a.download=`sauria-${species}.glb`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
