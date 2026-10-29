import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { IcosahedronGeometry,InstancedBufferAttribute,InstancedMesh,Object3D,Vector3 } from 'three';
import { simulation } from '../config';
import { SMOKE_COUNT,smokeSample } from '../world/volcanicSmoke';
import { noiseGLSL } from '../shaders/lavaNoise';

const vertexShader=`
 attribute float aOpacity; attribute float aHeat;
 varying vec3 vNormal; varying vec3 vLocal; varying vec3 vEye;
 varying float vOpacity; varying float vHeat;
 void main(){
  vec4 local=instanceMatrix*vec4(position,1.);
  vec4 mv=modelViewMatrix*local;
  vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);
  vLocal=position;
  vEye=normalize(transpose(mat3(modelViewMatrix*instanceMatrix))*(-mv.xyz));
  vOpacity=aOpacity;vHeat=aHeat;
  gl_Position=projectionMatrix*mv;
 }`;
const fragmentShader=`
 varying vec3 vNormal; varying vec3 vLocal; varying vec3 vEye;
 varying float vOpacity; varying float vHeat;
 ${noiseGLSL}
 void main(){
  float facing=abs(dot(normalize(vLocal),normalize(vEye)));
  float edge=smoothstep(.05,.66,facing);
  float detail=fbm(vLocal.xz*4.3+vLocal.y*2.8);
  float light=.55+.45*max(0.,dot(normalize(vNormal),normalize(vec3(-.5,.8,.7))));
  vec3 ash=mix(vec3(.046,.051,.049),vec3(.22,.225,.21),detail)*light;
  vec3 ember=vec3(1.5,.29,.045)*vHeat*(.32+.68*detail)*max(.15,.8-vLocal.y*.5);
  gl_FragColor=vec4(ash+ember,vOpacity*edge*(.65+detail*.35));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

export function VolcanicSmoke(){
 const ref=useRef<InstancedMesh>(null);
 const {geometry,dummy,opacity,heat,order,center}=useMemo(()=>{
  const geometry=new IcosahedronGeometry(1,2);
  const opacity=new InstancedBufferAttribute(new Float32Array(SMOKE_COUNT),1),heat=new InstancedBufferAttribute(new Float32Array(SMOKE_COUNT),1);
  geometry.setAttribute('aOpacity',opacity);geometry.setAttribute('aHeat',heat);
  return {geometry,opacity,heat,dummy:new Object3D(),center:new Vector3(),order:Array.from({length:SMOKE_COUNT},(_,i)=>({i,depth:0,sample:smokeSample(0,i)}))};
 },[]);
 useFrame(({camera})=>{
  if(!ref.current)return;
  // Back-to-front instance order avoids overlapping transparent billows flashing on orbit.
  for(const item of order){item.sample=smokeSample(simulation.time,item.i,simulation.environment.age,simulation.environment.eventIntensity);const p=item.sample;item.depth=center.set(p.x,p.y,p.z).applyMatrix4(camera.matrixWorldInverse).z;}
  order.sort((a,b)=>a.depth-b.depth);
  order.forEach(({sample:p},slot)=>{
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rotation*.3,p.rotation,p.rotation*.12);
   dummy.scale.set(p.radius,p.radius*p.stretch,p.radius);dummy.updateMatrix();ref.current!.setMatrixAt(slot,dummy.matrix);
   opacity.setX(slot,p.opacity);heat.setX(slot,p.heat);
  });
  ref.current.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;heat.needsUpdate=true;
 });
 return <instancedMesh ref={ref} args={[geometry,undefined,SMOKE_COUNT]} frustumCulled={false} castShadow={false} renderOrder={2}>
  <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false}/>
 </instancedMesh>;
}
