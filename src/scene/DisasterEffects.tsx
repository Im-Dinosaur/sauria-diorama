import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard} from '@react-three/drei';
import {AdditiveBlending,Color,Object3D,Vector3} from 'three';
import type {DirectionalLight,InstancedMesh,MeshBasicMaterial,ShaderMaterial} from 'three';
import {DIORAMA} from '../world/layout';
import {habitatGround,MOUNTAIN,noise} from '../world/habitat';
import {disasterProgress,distantFlash,smoothRange} from '../world/disaster';
import type {DisasterSequence} from '../world/disaster';
import type {RenderTier} from '../renderPerformance';

const glowVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const glowFragment='varying vec2 vUv;uniform float uFlash;void main(){float r=length(vUv-.5)*2.;float a=pow(max(0.,1.-r),2.)*uFlash;gl_FragColor=vec4(mix(vec3(1.,.35,.05),vec3(1.,.95,.8),pow(max(0.,1.-r),3.)),a);}';

/** Small shared geometries, instanced precipitation/ash/meteors; no new downloads. */
export function DisasterEffects({sequence,time,tier}:{sequence:DisasterSequence;time:()=>number;tier:RenderTier}){
 const flakes=useRef<InstancedMesh>(null),clouds=useRef<InstancedMesh>(null),meteors=useRef<InstancedMesh>(null),tails=useRef<InstancedMesh>(null),impacts=useRef<InstancedMesh>(null);
 const flakeMaterial=useRef<MeshBasicMaterial>(null),cloudMaterial=useRef<MeshBasicMaterial>(null),flash=useRef<ShaderMaterial>(null),light=useRef<DirectionalLight>(null);
 const dummy=useMemo(()=>new Object3D(),[]),down=useMemo(()=>new Vector3(),[]),up=useMemo(()=>new Vector3(0,1,0),[]),ashColor=useMemo(()=>new Color('#9a9690'),[]),snowColor=useMemo(()=>new Color('#f0f8ff'),[]);
 const flashUniforms=useMemo(()=>({uFlash:{value:0}}),[]);
 useFrame(()=>{
  const kind=sequence.kind,elapsed=sequence.elapsed,p=disasterProgress(sequence),t=time(),ice=kind==='ice',flashAmount=distantFlash(sequence),storm=smoothRange(.35,.78,p),ash=smoothRange(1.25,16,elapsed);
  if(flash.current)flash.current.uniforms.uFlash.value=flashAmount;if(light.current)light.current.intensity=flashAmount*8;
  if(!kind){for(const ref of [flakes,clouds,meteors,tails,impacts])if(ref.current)ref.current.visible=false;return;}
  const count=Math.round((ice?180+1120*storm:700*ash)*(tier===2?.48:tier===1?.72:1));
  if(flakes.current){flakes.current.visible=count>0;flakes.current.count=count;}
  if(flakeMaterial.current){flakeMaterial.current.color.copy(ice?snowColor:ashColor);flakeMaterial.current.opacity=ice?.5+storm*.4:ash*.7;}
  for(let i=0;i<count;i++){
   const seed=noise(i*13+5),fall=(t*(ice?.12+storm*.15:.10)+seed)%1;
   const x=(noise(i*3)-.5)*DIORAMA.width,z=(noise(i*3+1)-.5)*DIORAMA.depth,ground=habitatGround(x,z),wind=ice?storm*2.8:3.5;
   dummy.position.set(x+(fall-.5)*wind,ground+(1-fall)*(ice?15:12),z+Math.sin(t*.4+i)*.5);
   dummy.rotation.set(t+i,i*.7,0);dummy.scale.setScalar(ice?.018+seed*.035:.015+seed*.024);dummy.updateMatrix();flakes.current?.setMatrixAt(i,dummy.matrix);
  }
  if(flakes.current)flakes.current.instanceMatrix.needsUpdate=true;
  if(clouds.current){
   clouds.current.visible=!ice&&elapsed>1.25;const travel=smoothRange(1.25,36,elapsed)*83;
   for(let i=0;i<60;i++){
    const across=(i%12-5.5)*5.3,layer=Math.floor(i/12),front=travel-layer*3;
    dummy.position.set(MOUNTAIN.x+front*.82-across*.57,3+noise(i+48)*7+layer*.3,MOUNTAIN.z+front*.57+across*.82);
    dummy.rotation.set(i*.3,t*.015,i);dummy.scale.set(4.2+noise(i)*2,2.6+noise(i+1)*2,3.2+noise(i+2)*2);dummy.updateMatrix();clouds.current.setMatrixAt(i,dummy.matrix);
   }
   clouds.current.instanceMatrix.needsUpdate=true;
  }
  if(cloudMaterial.current)cloudMaterial.current.opacity=ash*.18;
  const meteorCount=tier===2?12:20,active=!ice&&elapsed>=2.4;
  for(const ref of [meteors,tails,impacts])if(ref.current){ref.current.visible=active;ref.current.count=meteorCount;}
  if(!active)return;
  for(let i=0;i<meteorCount;i++){
   const life=(t*(.24+noise(i+31)*.18)+noise(i+17))%1,cycle=Math.floor(t*(.24+noise(i+31)*.18)+noise(i+17));
   const startX=(noise(i*71+cycle*13)-.5)*DIORAMA.width-6,startZ=(noise(i*43+cycle*17)-.5)*DIORAMA.depth-4,height=17+noise(i+44)*12;
   const x=startX+life*12,z=startZ+life*8,ground=habitatGround(x,z),y=ground+(1-life)*height;
   dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(.07+noise(i+7)*.075);dummy.updateMatrix();meteors.current?.setMatrixAt(i,dummy.matrix);
   down.set(12,-height,8).normalize();dummy.quaternion.setFromUnitVectors(up,down);dummy.position.set(x-down.x*.7,y-down.y*.7,z-down.z*.7);dummy.scale.set(.035,1.4+noise(i)*1.6,.035);dummy.updateMatrix();tails.current?.setMatrixAt(i,dummy.matrix);
   const impact=life>.93?Math.sin((life-.93)/.07*Math.PI):0;dummy.rotation.set(0,0,0);dummy.position.set(startX+12,habitatGround(startX+12,startZ+8)+.04,startZ+8);dummy.scale.set(impact*.65,impact*.12,impact*.65);dummy.updateMatrix();impacts.current?.setMatrixAt(i,dummy.matrix);
  }
  for(const ref of [meteors,tails,impacts])if(ref.current)ref.current.instanceMatrix.needsUpdate=true;
 });
 return <group name="disaster-atmosphere">
  <instancedMesh ref={flakes} args={[undefined,undefined,1400]} frustumCulled={false} visible={false}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial ref={flakeMaterial} transparent opacity={0} depthWrite={false}/></instancedMesh>
  <instancedMesh ref={clouds} args={[undefined,undefined,60]} frustumCulled={false} visible={false}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial ref={cloudMaterial} color="#171717" transparent opacity={0} depthWrite={false}/></instancedMesh>
  <instancedMesh ref={meteors} args={[undefined,undefined,20]} frustumCulled={false} visible={false}><icosahedronGeometry args={[1,1]}/><meshBasicMaterial color="#fff1ae" toneMapped={false}/></instancedMesh>
  <instancedMesh ref={tails} args={[undefined,undefined,20]} frustumCulled={false} visible={false}><cylinderGeometry args={[.25,1,1,5]}/><meshBasicMaterial color="#ff792e" toneMapped={false} transparent opacity={.8} depthWrite={false} blending={AdditiveBlending}/></instancedMesh>
  <instancedMesh ref={impacts} args={[undefined,undefined,20]} frustumCulled={false} visible={false}><sphereGeometry args={[1,8,5]}/><meshBasicMaterial color="#ffb053" toneMapped={false} transparent opacity={.65} depthWrite={false} blending={AdditiveBlending}/></instancedMesh>
  <Billboard position={[MOUNTAIN.x-4,6,MOUNTAIN.z-3]}><mesh><planeGeometry args={[22,22]}/><shaderMaterial ref={flash} uniforms={flashUniforms} vertexShader={glowVertex} fragmentShader={glowFragment} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false}/></mesh></Billboard>
  <directionalLight ref={light} position={[MOUNTAIN.x-10,15,MOUNTAIN.z-15]} color="#fff0cf" intensity={0}/>
 </group>;
}
