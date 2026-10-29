import { useEffect,useLayoutEffect,useMemo,useRef } from 'react';
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,InstancedMesh,MeshStandardMaterial,Object3D } from 'three';
import { forest,habitatGround,noise } from '../world/habitat';
import type { WorldMode } from '../world/layout';
function palmGeometry(){
 const p:number[]=[],colors:number[]=[],c=new Color();
 const tri=(a:number[],b:number[],d:number[],shade:number)=>{p.push(...a,...b,...d);c.setRGB(.12*shade,.24*shade,.055*shade);for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);};
 for(let frond=0;frond<10;frond++){
  const angle=frond*Math.PI*2/10+noise(frond)*.35,dx=Math.cos(angle),dz=Math.sin(angle),length=.85+noise(frond+32)*.38;
  for(let j=0;j<11;j++){
   const t=.1+j*.075,r=length*t,y=.36*Math.sin(t*Math.PI)-.34*t,spread=.20*Math.sin(t*Math.PI),stem=[dx*r,y,dz*r],tip=[dx*(r+.1),y-.025,dz*(r+.1)];
   for(const side of [-1,1]){const leaf=[dx*(r-.07)-dz*spread*side,y-.07, dz*(r-.07)+dx*spread*side],leaf2=[dx*(r+.05)-dz*spread*.76*side,y-.10,dz*(r+.05)+dx*spread*.76*side];tri(stem,leaf,leaf2,.8+noise(frond*21+j)*.4);tri(stem,leaf2,tip,.8+noise(frond*31+j)*.4);}
  }
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function broadGeometry(){
 const p:number[]=[],normals:number[]=[];
 // Fine leaves, rather than a single spherical crown. Each branch carries overlapping curved blades.
 for(let i=0;i<150;i++){
  const a=i*2.399,r=Math.sqrt(noise(i+31))*.66,y=.18+(noise(i+77)-.5)*.92+Math.sqrt(1-r*r)*.20,x=Math.cos(a)*r,z=Math.sin(a)*r,l=.10+noise(i+91)*.13,w=l*.40,dx=Math.cos(a),dz=Math.sin(a);
  const center=[x,y,z],tip=[x+dx*l,y-.045,z+dz*l],left=[x+dx*l*.45-dz*w,y+.018,z+dz*l*.45+dx*w],right=[x+dx*l*.45+dz*w,y+.018,z+dz*l*.45-dx*w];
  p.push(...center,...left,...tip,...center,...tip,...right);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
export function ReferenceForest({mode}:{mode:WorldMode}){
 const trunks=useRef<InstancedMesh>(null),palms=useRef<InstancedMesh>(null),broad=useRef<InstancedMesh>(null),shrubs=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]),color=useMemo(()=>new Color(),[]);
 const palm=useMemo(palmGeometry,[]),leaves=useMemo(broadGeometry,[]);
 useEffect(()=>()=>{palm.dispose();leaves.dispose();},[palm,leaves]);
 useLayoutEffect(()=>{
  forest.forEach((p,i)=>{const y=habitatGround(p.x,p.z),s=p.scale,h=p.kind===0?1.2+noise(i+18)*.7:.85+noise(i+18)*1.1;
   dummy.position.set(p.x,y+h*s/2,p.z);dummy.rotation.set((noise(i)-.5)*.10,i*2.399,(noise(i+1)-.5)*.10);dummy.scale.set(.07*s,p.kind===2?0:h*s,.07*s);dummy.updateMatrix();trunks.current?.setMatrixAt(i,dummy.matrix);
   dummy.position.set(p.x,y+h*s,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.setScalar(p.kind===0?s:0);dummy.updateMatrix();palms.current?.setMatrixAt(i,dummy.matrix);
   for(let j=0;j<4;j++){dummy.position.set(p.x+Math.cos(j*2.4)*s*.24,y+(h-.15+(noise(i*7+j)-.5)*.5)*s,p.z+Math.sin(j*2.4)*s*.24);dummy.rotation.set((noise(i+j)-.5)*.45,j*2.4+i,(noise(i+j+5)-.5)*.45);dummy.scale.setScalar(p.kind===1?s:0);dummy.updateMatrix();broad.current?.setMatrixAt(i*4+j,dummy.matrix);}
   dummy.position.set(p.x+.15,y+.18*s,p.z+.16);dummy.rotation.set(0,i,0);dummy.scale.setScalar(s*(p.kind===2?.65:.32));dummy.updateMatrix();shrubs.current?.setMatrixAt(i,dummy.matrix);
   if(mode==='peaceful')color.setHex(p.color).lerp(new Color('#6f842f'),.30);else color.set(mode==='ice'?'#cddcdb':'#514831');palms.current?.setColorAt(i,color);for(let j=0;j<4;j++)broad.current?.setColorAt(i*4+j,color);shrubs.current?.setColorAt(i,color);
  });for(const ref of [trunks,palms,broad,shrubs])if(ref.current){ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;}
 },[mode,dummy,color]);
 return <group>
  <instancedMesh ref={trunks} args={[undefined,undefined,forest.length]} castShadow receiveShadow><cylinderGeometry args={[.70,1,1,10,5]}/><meshStandardMaterial color={mode==='ice'?'#878d80':mode==='ember'?'#332b25':'#716345'} roughness={.98}/></instancedMesh>
  <instancedMesh ref={palms} geometry={palm} args={[undefined,undefined,forest.length]} castShadow receiveShadow><meshStandardMaterial color="#ffffff" vertexColors={false} side={DoubleSide} roughness={.86}/></instancedMesh>
  <instancedMesh ref={broad} geometry={leaves} args={[undefined,undefined,forest.length*4]} castShadow receiveShadow><meshStandardMaterial color="#ffffff" side={DoubleSide} roughness={.87}/></instancedMesh>
  <instancedMesh ref={shrubs} geometry={palm} args={[undefined,undefined,forest.length]} receiveShadow><meshStandardMaterial color="#ffffff" side={DoubleSide} roughness={.93}/></instancedMesh>
 </group>;
}
