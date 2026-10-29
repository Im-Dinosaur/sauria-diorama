import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh,MeshStandardMaterial,InstancedBufferGeometry } from 'three';
import { diagnostics } from '../config';
export function SceneAudit(){const {scene}=useThree();useLayoutEffect(()=>{
 const counts={meshes:0,smooth:0,transparentCasters:0,texturedInterior:0};
 scene.traverse(object=>{if(!(object instanceof Mesh)||object.geometry instanceof InstancedBufferGeometry)return;counts.meshes++;
 // Geometric face normals are also flat in the AO normal pass.
 const geometry=object.geometry;if(geometry.index){object.geometry=geometry.toNonIndexed();object.geometry.computeVertexNormals();geometry.dispose();}else if(geometry.attributes.normal){geometry.computeVertexNormals();}
 const materials=Array.isArray(object.material)?object.material:[object.material];
 for(const m of materials){if(m instanceof MeshStandardMaterial&&!m.flatShading)counts.smooth++;if(m.transparent&&object.castShadow)counts.transparentCasters++;if(m instanceof MeshStandardMaterial&&m.map&&object.position.y> -1.4)counts.texturedInterior++;}
 });diagnostics.materialAudit=counts;
},[scene]);return null;}
