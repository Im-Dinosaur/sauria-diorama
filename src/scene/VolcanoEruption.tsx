import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry,Color,Float32BufferAttribute,Group,InstancedMesh,Object3D,PointLight,ShaderMaterial,Vector3 } from 'three';
import { simulation,diagnostics } from '../config';
import { EJECTA_COUNT,ejectaSample,eruptionState } from '../world/eruption';
import { VOLCANO } from '../world/terrain';
import { noiseGLSL } from '../shaders/lavaNoise';

function makeJet(){
 const positions:number[]=[],uvs:number[]=[];
 const point=(j:number,k:number)=>{const y=j/24,a=k/9*Math.PI*2,r=(1-y*.89)*(.9+.1*Math.sin(j*2.6+k));return [Math.cos(a)*r,y,Math.sin(a)*r];};
 for(let j=0;j<24;j++)for(let k=0;k<9;k++)for(const [jj,kk] of [[j,k],[j+1,k],[j,k+1],[j,k+1],[j+1,k],[j+1,k+1]]){positions.push(...point(jj,kk));uvs.push(kk/9,jj/24);}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();return geometry;
}
const vertexShader=`uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*13.-uTime*9.)*p.y*.18;p.z+=cos(p.y*15.-uTime*7.)*p.y*.16;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const fragmentShader=`uniform float uTime;uniform float uPower;varying vec2 vUv;${noiseGLSL}
 void main(){float turbulent=fbm(vec2(vUv.x*7.,vUv.y*8.-uTime*3.4));
  vec3 color=mix(vec3(1.15,.085,.008),vec3(3.7,1.55,.22),smoothstep(.19,.75,turbulent))*(1.-vUv.y*.35);
  float alpha=uPower*(1.-smoothstep(.68,1.,vUv.y))*(.55+.45*turbulent);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

export function VolcanoEruption(){
 const bombs=useRef<InstancedMesh>(null),trails=useRef<InstancedMesh>(null),jets=useRef<Group>(null),light=useRef<PointLight>(null);
 const materials=useRef<(ShaderMaterial|null)[]>([]);
 const {dummy,color,up,direction,geometry,uniforms}=useMemo(()=>({dummy:new Object3D(),color:new Color(),up:new Vector3(0,1,0),direction:new Vector3(),geometry:makeJet(),uniforms:{uTime:{value:0},uPower:{value:0}}}),[]);
 useFrame(()=>{
  const intensity=simulation.environment.eventIntensity;
  const {phase,strength,pulse,flash}=eruptionState(simulation.time,simulation.environment.age,intensity);
  uniforms.uTime.value=simulation.time;uniforms.uPower.value=Math.min(1,strength*.92);
  for(const material of materials.current)if(material){material.uniforms.uTime.value=simulation.time;material.uniforms.uPower.value=Math.min(1,strength*.92);}
  if(light.current)light.current.intensity=3+pulse*30+flash*24;
  if(jets.current){jets.current.visible=strength>0;jets.current.children.forEach((object,i)=>{
   const side=i-1,height=(i===1?2.8:2.1)*pulse;
   if(i===1)diagnostics.eruptionJetHeight=height;
   object.position.set(VOLCANO.x+side*.09,2.4,VOLCANO.z+(i===2?.09:0));
   object.rotation.set(side*.13,side*.6,side*-.19);object.scale.set((i===1?.28:.19)*(.7+strength*.3),height,.22);
  });}
  for(let i=0;i<EJECTA_COUNT;i++){
   const p=ejectaSample(phase,i,0,intensity);
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(i+p.age*2.6,i*2,p.age*3.1);dummy.scale.setScalar(p.visible?p.radius*Math.sqrt(p.fade):0);dummy.updateMatrix();bombs.current?.setMatrixAt(i,dummy.matrix);
   color.setRGB(1,Math.max(.12,.5-p.age*.14),.025);bombs.current?.setColorAt(i,color);
   for(let j=0;j<4;j++){
    const t=ejectaSample(phase,i,(j+1)*.038,intensity),visible=p.visible&&t.visible;
    dummy.position.set(t.x,t.y,t.z);direction.set(t.vx,t.vy,t.vz).normalize();dummy.quaternion.setFromUnitVectors(up,direction);
    const size=t.radius*(.68-j*.12);dummy.scale.set(visible?size:0,visible?size*(2.4-j*.28):0,visible?size:0);dummy.updateMatrix();trails.current?.setMatrixAt(i*4+j,dummy.matrix);
    color.setRGB(1.7-j*.29,.37-j*.075,.012);trails.current?.setColorAt(i*4+j,color);
   }
  }
  for(const mesh of [bombs.current,trails.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 });
 return <group>
  <pointLight ref={light} position={[VOLCANO.x,3.2,VOLCANO.z]} color="#ff701e" distance={8} castShadow={false}/>
  <group ref={jets}>{[0,1,2].map(i=><mesh key={i} geometry={geometry} castShadow={false}><shaderMaterial ref={m=>{materials.current[i]=m;}} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false}/></mesh>)}</group>
  <instancedMesh ref={bombs} args={[undefined,undefined,EJECTA_COUNT]} frustumCulled={false} castShadow={false}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#fff2c2" emissive="#ff7822" emissiveIntensity={2.3} roughness={.85} flatShading/></instancedMesh>
  <instancedMesh ref={trails} args={[undefined,undefined,EJECTA_COUNT*4]} frustumCulled={false} castShadow={false}><octahedronGeometry args={[1,0]}/><meshBasicMaterial toneMapped transparent opacity={.65} depthWrite={false}/></instancedMesh>
 </group>;
}
