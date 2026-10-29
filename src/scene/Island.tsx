import { useMemo } from 'react';
import { LavaFlows } from './LavaFlows';
import { BufferGeometry, Float32BufferAttribute, Color } from 'three';
import { GRID,rawHeight,groundHeight,VOLCANO,landmarks,random } from '../world/terrain';
function terrainGeometry(){
 const positions:number[]=[],colors:number[]=[];const {minX,minZ,width,depth,nx,nz}=GRID;
 const palette=['#41433f','#444640','#3d403a','#484940','#3f423c','#4b4a40'];
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
 const x0=minX+x*width/nx,x1=minX+(x+1)*width/nx,z0=minZ+z*depth/nz,z1=minZ+(z+1)*depth/nz;
 const a=[x0,rawHeight(x0,z0),z0],b=[x1,rawHeight(x1,z0),z0],c=[x0,rawHeight(x0,z1),z1],d=[x1,rawHeight(x1,z1),z1];
 for(const [k,tri] of [[a,c,b],[b,c,d]].entries()){
 const avg=tri.reduce((s,p)=>s+p[1],0)/3;if(avg<=-.7399)continue;const color=new Color(avg<.15?'#a98b61':palette[Math.floor(random(x*131+z*17+k)*palette.length)]);if(avg>1)color.multiplyScalar(.74+random(x*7+z*3)*.22);
 tri.forEach(p=>{positions.push(...p);colors.push(color.r,color.g,color.b);});
 }}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
export function Island(){const geometry=useMemo(terrainGeometry,[]);
 return <group>
 <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors flatShading roughness={1}/></mesh>
 <LavaFlows/>
 <mesh position={[VOLCANO.x,2.35,VOLCANO.z]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.33,11]}/><meshStandardMaterial color="#ffbb50" emissive="#ff4b06" emissiveIntensity={3} flatShading/></mesh>
 <pointLight position={[VOLCANO.x,3,VOLCANO.z]} intensity={4} distance={5} color="#ff5f16"/>
 {landmarks.map((p,i)=><group key={i} position={[p.x,-.74,p.z]}><mesh position={[0,(p.h+.42)/2,0]} rotation={[0,i*.7,0]} castShadow receiveShadow><cylinderGeometry args={[p.r*.64,p.r,p.h+.42,5,1]}/><meshStandardMaterial color={i%2?'#373a34':'#515146'} flatShading roughness={.95}/></mesh><mesh position={[0,.05,0]} castShadow><cylinderGeometry args={[p.r*1.3,p.r*1.55,.1,7]}/><meshStandardMaterial color="#685f4c" flatShading/></mesh></group>)}
 </group>;
}
