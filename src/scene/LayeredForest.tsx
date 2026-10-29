import { useEffect,useLayoutEffect,useMemo,useRef } from 'react';
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,InstancedMesh,Object3D } from 'three';
import { forest,habitatGround,noise } from '../world/habitat';
import type { WorldMode } from '../world/layout';
import type {RenderTier} from '../renderPerformance';
function foliageGeometry(kind:'palm'|'broad'|'conifer'|'fern',tier:RenderTier){
 const fronds=tier===0?9:tier===1?7:5,segments=tier===0?10:tier===1?6:4,leaves=tier===0?110:tier===1?75:50,layers=tier===0?7:5,branches=tier===0?8:6,needles=tier===0?5:3;
 const positions:number[]=[],colors:number[]=[],color=new Color();
 const tri=(a:number[],b:number[],c:number[],seed:number)=>{positions.push(...a,...b,...c);const light=.76+noise(seed)*.45;color.setRGB(light,light,light);for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);};
 if(kind==='palm'||kind==='fern')for(let frond=0;frond<fronds;frond++){
  const angle=frond*Math.PI*2/fronds+noise(frond)*.3,dx=Math.cos(angle),dz=Math.sin(angle),len=.80+noise(frond+32)*.35;
  for(let j=0;j<segments;j++){const t=.08+j*.86/segments,r=len*t,y=.34*Math.sin(t*Math.PI)-.32*t,spread=.18*Math.sin(t*Math.PI),stem=[dx*r,y,dz*r],tip=[dx*(r+.09),y-.025,dz*(r+.09)];for(const side of [-1,1]){const a=[dx*(r-.06)-dz*spread*side,y-.06,dz*(r-.06)+dx*spread*side],b=[dx*(r+.04)-dz*spread*.76*side,y-.08,dz*(r+.04)+dx*spread*.76*side];tri(stem,a,b,frond*29+j);tri(stem,b,tip,frond*13+j);}}
 }else if(kind==='broad')for(let i=0;i<leaves;i++){
  const a=i*2.399,r=Math.sqrt(noise(i+31))*.68,y=.22+(noise(i+77)-.5)*.87+Math.sqrt(1-r*r)*.15,x=Math.cos(a)*r,z=Math.sin(a)*r,l=.13+noise(i+91)*.14,w=l*.40,dx=Math.cos(a),dz=Math.sin(a),c=[x,y,z],tip=[x+dx*l,y-.05,z+dz*l];tri(c,[x+dx*l*.4-dz*w,y+.02,z+dz*l*.4+dx*w],tip,i);tri(c,tip,[x+dx*l*.4+dz*w,y+.02,z+dz*l*.4-dx*w],i+25);
 }else for(let layer=0;layer<layers;layer++)for(let branch=0;branch<branches;branch++){
  const a=branch*Math.PI*2/branches+layer*1.17,dx=Math.cos(a),dz=Math.sin(a),span=(.68-layer*(.511/layers))*( .8+noise(layer*37+branch)*.25),height=layer*(1.54/layers);
  for(let j=0;j<needles;j++){const t=.12+j*.9/needles,r=span*t,y=height+.09*t,stem=[dx*r,y,dz*r],tip=[dx*(r+.12),y-.015,dz*(r+.12)];for(const s of [-1,1]){const spread=.15*(1-t*.55);tri(stem,[dx*(r+.03)-dz*spread*s,y+.015,dz*(r+.03)+dx*spread*s],tip,branch*37+layer*17+j);}}
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function ReferenceForest({mode,tier=0}:{mode:WorldMode;tier?:RenderTier}){
 const trunks=useRef<InstancedMesh>(null),palms=useRef<InstancedMesh>(null),broad=useRef<InstancedMesh>(null),conifers=useRef<InstancedMesh>(null),shrubs=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]),color=useMemo(()=>new Color(),[]);
 const groups=useMemo(()=>({trunks:forest.filter(p=>p.kind!==2),palms:forest.filter(p=>p.kind===0),broad:forest.filter(p=>p.kind===1),conifers:forest.filter(p=>p.kind===3),shrubs:forest.filter((p,i)=>p.kind===2||i%3===0)}),[]);
 const geometry=useMemo(()=>({palm:foliageGeometry('palm',tier),broad:foliageGeometry('broad',tier),conifer:foliageGeometry('conifer',tier),fern:foliageGeometry('fern',tier)}),[tier]);
 useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
 const tint=(p:typeof forest[number],index:number)=>{if(mode==='peaceful')color.setHex(p.color).lerp(new Color(index%3?'#425c25':'#6f8135'),.35);else color.set(mode==='ice'?'#d8e2de':'#493e2e');return color;};
 useLayoutEffect(()=>{
  groups.trunks.forEach((p,i)=>{const h=p.kind===0?1.45+noise(i+18)*.55:p.kind===3?1.6:1.05+noise(i+18)*.9,y=habitatGround(p.x,p.z);dummy.position.set(p.x,y+h*p.scale/2,p.z);dummy.rotation.set((noise(i)-.5)*.06,i*2.399,0);dummy.scale.set(.065*p.scale,h*p.scale,.065*p.scale);dummy.updateMatrix();trunks.current?.setMatrixAt(i,dummy.matrix);});
  groups.palms.forEach((p,i)=>{const y=habitatGround(p.x,p.z),h=1.45+noise(i+18)*.55;dummy.position.set(p.x,y+h*p.scale,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();palms.current?.setMatrixAt(i,dummy.matrix);palms.current?.setColorAt(i,tint(p,i));});
  groups.broad.forEach((p,i)=>{const y=habitatGround(p.x,p.z),h=1.05+noise(i+18)*.9;for(let j=0;j<3;j++){dummy.position.set(p.x+Math.cos(j*2.4)*p.scale*.20,y+(h-.1+(noise(i*7+j)-.5)*.35)*p.scale,p.z+Math.sin(j*2.4)*p.scale*.20);dummy.rotation.set((noise(i+j)-.5)*.4,j*2.4+i,(noise(i+j+5)-.5)*.4);dummy.scale.setScalar(p.scale);dummy.updateMatrix();broad.current?.setMatrixAt(i*3+j,dummy.matrix);broad.current?.setColorAt(i*3+j,tint(p,i+j));}});
  groups.conifers.forEach((p,i)=>{dummy.position.set(p.x,habitatGround(p.x,p.z)+.35*p.scale,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.set(p.scale,1.1*p.scale,p.scale);dummy.updateMatrix();conifers.current?.setMatrixAt(i,dummy.matrix);conifers.current?.setColorAt(i,tint(p,i));});
  groups.shrubs.forEach((p,i)=>{dummy.position.set(p.x+.05,habitatGround(p.x,p.z)+.08,p.z-.05);dummy.rotation.set(0,i*2.399,0);dummy.scale.setScalar(p.scale*.65);dummy.updateMatrix();shrubs.current?.setMatrixAt(i,dummy.matrix);shrubs.current?.setColorAt(i,tint(p,i));});
  for(const ref of [trunks,palms,broad,conifers,shrubs])if(ref.current){ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;}
 },[mode,groups,dummy,color]);
 return <group>
  <instancedMesh ref={trunks} args={[undefined,undefined,groups.trunks.length]} castShadow={tier===0} receiveShadow><cylinderGeometry args={[.70,1,1,9,3]}/><meshStandardMaterial color={mode==='ice'?'#92998c':mode==='ember'?'#332a23':'#67563b'} roughness={.98}/></instancedMesh>
  <instancedMesh ref={palms} geometry={geometry.palm} args={[undefined,undefined,groups.palms.length]} castShadow={tier===0} receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.86}/></instancedMesh>
  <instancedMesh ref={broad} geometry={geometry.broad} args={[undefined,undefined,groups.broad.length*3]} castShadow={tier===0} receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.88}/></instancedMesh>
  <instancedMesh ref={conifers} geometry={geometry.conifer} args={[undefined,undefined,groups.conifers.length]} castShadow={tier===0} receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.91}/></instancedMesh>
  <instancedMesh ref={shrubs} geometry={geometry.fern} args={[undefined,undefined,groups.shrubs.length]} receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.94}/></instancedMesh>
 </group>;
}
