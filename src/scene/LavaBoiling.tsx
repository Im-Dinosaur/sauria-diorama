import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,InstancedBufferAttribute,InstancedMesh,Object3D,RingGeometry,ShaderMaterial,SphereGeometry,Vector3 } from 'three';
import { simulation,diagnostics } from '../config';
import { LAVA_LEVEL } from '../world/lavaFlows';
import { boilSpark } from '../world/lavaEvents';
import { BOILING_POOL_SIZE,BOILING_SPARKS,boilingEventState } from '../world/boilingSimulation';
import { useBoilingSimulation } from '../hooks/useBoilingSimulation';
import { useLavaSimulation } from '../hooks/useLavaSimulation';
import { noiseGLSL } from '../shaders/lavaNoise';

function crownGeometry(){
 const positions:number[]=[],uvs:number[]=[];
 for(let i=0;i<16;i++)for(const [j,h] of [[i,0],[i+1,0],[i,1],[i,1],[i+1,0],[i+1,1]]){
  const a=j/16*Math.PI*2,r=.82+h*.3,tip=.65+.25*Math.sin(a*5)+.1*Math.cos(a*9);
  positions.push(Math.cos(a)*r,h*tip,Math.sin(a)*r);uvs.push(j/16,h);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}
const bubbleVertex=`attribute float aPressure;varying vec2 vUv;varying float vHeight;varying vec3 vNormal;varying float vPressure;
void main(){vUv=uv;vHeight=position.y;vNormal=normal;vPressure=aPressure;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const bubbleFragment=`varying vec2 vUv;varying float vHeight;varying vec3 vNormal;varying float vPressure;uniform float uTime;uniform float uHeat;${noiseGLSL}
void main(){
 float n=fbm(vUv*vec2(9.,7.)+vec2(0.,uTime*.045));
 float cracks=1.-smoothstep(.018,.046+vPressure*.025,abs(n-.5));
 float rim=pow(1.-clamp(vHeight,0.,1.),5.);float hot=clamp(cracks*(.25+vPressure*.65)+rim*.55,0.,1.);
 float light=.35+.6*max(dot(normalize(vNormal),normalize(vec3(-.4,1.,.7))),0.);
 vec3 crust=mix(vec3(.024,.012,.008),vec3(.12,.046,.014),n)*light;
 vec3 molten=mix(vec3(1.4,.12,.006),vec3(3.2,.85,.07),pow(hot,3.));
 gl_FragColor=vec4(mix(crust,molten,hot)*uHeat,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const effectVertex=`attribute float aOpacity;varying vec2 vUv;varying float vOpacity;void main(){vUv=uv;vOpacity=aOpacity;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const crownFragment=`varying vec2 vUv;varying float vOpacity;uniform float uHeat;
void main(){vec3 color=mix(vec3(.5,.025,.002),vec3(3.6,.92,.08),pow(vUv.y,1.4));gl_FragColor=vec4(color*uHeat,vOpacity*(1.-vUv.y*.2));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const ringFragment=`varying vec2 vUv;varying float vOpacity;uniform float uHeat;
void main(){float r=length(vUv*2.-1.);float band=smoothstep(.72,.88,r)*(1.-smoothstep(.94,1.,r));
vec3 color=mix(vec3(.13,.012,.002),vec3(2.4,.42,.025),smoothstep(.82,.91,r));gl_FragColor=vec4(color*uHeat,band*vOpacity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export function LavaBoiling(){
 const state=useBoilingSimulation(),materials=useRef<(ShaderMaterial|null)[]>([]),uniforms=useLavaSimulation(materials);
 const domes=useRef<InstancedMesh>(null),crowns=useRef<InstancedMesh>(null),sparks=useRef<InstancedMesh>(null),rings=useRef<InstancedMesh>(null);
 const {dummy,color,up,direction,dome,crown,ringShape,pressure,crownOpacity,ringOpacity}=useMemo(()=>{
  const dome=new SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2).toNonIndexed();dome.computeVertexNormals();
  const crown=crownGeometry(),pressure=new InstancedBufferAttribute(new Float32Array(BOILING_POOL_SIZE),1),crownOpacity=new InstancedBufferAttribute(new Float32Array(BOILING_POOL_SIZE),1),ringOpacity=new InstancedBufferAttribute(new Float32Array(BOILING_POOL_SIZE*2),1);
  const ringShape=new RingGeometry(.72,1,24).toNonIndexed();ringShape.computeVertexNormals();
  dome.setAttribute('aPressure',pressure);crown.setAttribute('aOpacity',crownOpacity);ringShape.setAttribute('aOpacity',ringOpacity);
  return {dummy:new Object3D(),color:new Color(),up:new Vector3(0,1,0),direction:new Vector3(),dome,crown,ringShape,pressure,crownOpacity,ringOpacity};
 },[]);
 useFrame(()=>{
  if(!domes.current||!crowns.current||!sparks.current||!rings.current)return;
  if(!sparks.current.instanceColor){color.setRGB(0,0,0);for(let i=0;i<BOILING_POOL_SIZE*BOILING_SPARKS;i++)sparks.current.setColorAt(i,color);}
  diagnostics.boilingSites.length=0;let visibleSparks=0,maxSparkHeight=0,active=0;
  for(let i=0;i<BOILING_POOL_SIZE;i++){
   const event=state.current.events[i];
   if(!event){
    dummy.position.set(0,0,0);dummy.scale.setScalar(0);dummy.updateMatrix();domes.current.setMatrixAt(i,dummy.matrix);crowns.current.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<2;j++)rings.current.setMatrixAt(i*2+j,dummy.matrix);
    for(let j=0;j<BOILING_SPARKS;j++)sparks.current.setMatrixAt(i*BOILING_SPARKS+j,dummy.matrix);
    continue;
   }
   active++;const p=boilingEventState(event,state.current.time),site=p.site;
   diagnostics.boilingSites.push({x:site.x,z:site.z,cycle:p.id});
   const domeRadius=p.bulge>0?site.r*(.45+p.bulge*.55):0;
   dummy.position.set(site.x,LAVA_LEVEL+.006,site.z);dummy.rotation.set(0,0,0);dummy.scale.set(domeRadius,p.bulge*.25,domeRadius);dummy.updateMatrix();domes.current.setMatrixAt(i,dummy.matrix);pressure.setX(i,p.pressure);
   dummy.scale.set(site.r*(1+p.crown*.12),p.crown*(.14+p.strength*.06),site.r*(1+p.crown*.12));dummy.updateMatrix();crowns.current.setMatrixAt(i,dummy.matrix);crownOpacity.setX(i,Math.min(1,p.crown*1.7));
   for(let ring=0;ring<2;ring++){
    const age=p.burstAge-ring*.16,visible=age>=0&&age<.95,radius=site.r+Math.max(0,age)*.23;
    dummy.position.y=LAVA_LEVEL+.009+ring*.002;dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(visible?radius:0);dummy.updateMatrix();rings.current.setMatrixAt(i*2+ring,dummy.matrix);
    ringOpacity.setX(i*2+ring,visible?(1-age/.95)**1.4*(ring===0?.8:.4):0);
   }
   for(let j=0;j<BOILING_SPARKS;j++){
    const s=boilSpark(event.id,j,p,p.strength);dummy.position.set(s.x,s.y,s.z);direction.set(s.vx,s.vy,s.vz).normalize();dummy.quaternion.setFromUnitVectors(up,direction);
    dummy.scale.set(s.visible?s.radius:0,s.visible?s.radius*s.stretch:0,s.visible?s.radius:0);dummy.updateMatrix();sparks.current.setMatrixAt(i*BOILING_SPARKS+j,dummy.matrix);
    const heat=(1-s.life)**1.7;color.setRGB(.12+heat*3.2,.012+heat*.85,.002+heat*.07).multiplyScalar(simulation.heat);sparks.current.setColorAt(i*BOILING_SPARKS+j,color);
    if(s.visible){visibleSparks++;maxSparkHeight=Math.max(maxSparkHeight,s.y-LAVA_LEVEL);}
   }
  }
  for(const mesh of [domes.current,crowns.current,sparks.current,rings.current])mesh.instanceMatrix.needsUpdate=true;
  if(sparks.current.instanceColor)sparks.current.instanceColor.needsUpdate=true;
  pressure.needsUpdate=true;crownOpacity.needsUpdate=true;ringOpacity.needsUpdate=true;
  Object.assign(diagnostics.boiling,{emitted:state.current.count,active,visibleSparks,maxSparkHeight,time:state.current.time});
 });
 return <group>
  <instancedMesh ref={domes} args={[dome,undefined,BOILING_POOL_SIZE]} frustumCulled={false} castShadow={false}><shaderMaterial ref={m=>{materials.current[0]=m;}} vertexShader={bubbleVertex} fragmentShader={bubbleFragment} uniforms={uniforms}/></instancedMesh>
  <instancedMesh ref={crowns} args={[crown,undefined,BOILING_POOL_SIZE]} frustumCulled={false} castShadow={false}><shaderMaterial ref={m=>{materials.current[1]=m;}} vertexShader={effectVertex} fragmentShader={crownFragment} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide}/></instancedMesh>
  <instancedMesh ref={sparks} args={[undefined,undefined,BOILING_POOL_SIZE*BOILING_SPARKS]} frustumCulled={false} castShadow={false}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial color="#ffffff" toneMapped/></instancedMesh>
  <instancedMesh ref={rings} args={[ringShape,undefined,BOILING_POOL_SIZE*2]} frustumCulled={false} castShadow={false}><shaderMaterial ref={m=>{materials.current[2]=m;}} vertexShader={effectVertex} fragmentShader={ringFragment} uniforms={uniforms} transparent depthWrite={false}/></instancedMesh>
 </group>;
}
