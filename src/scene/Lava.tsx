import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial } from 'three';
import { diagnostics } from '../config';
import { noiseGLSL } from '../shaders/lavaNoise';
import { lavaReliefGLSL, lavaReliefVertex } from '../shaders/lavaRelief';
import { LavaBoiling } from './LavaBoiling';
import { useLavaSimulation } from '../hooks/useLavaSimulation';
import { METEOR_TARGETS } from '../world/meteorImpacts';
export const lavaVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const lavaFragment=`
 varying vec2 vUv; varying vec3 vWorldPosition; uniform float uTime; uniform float uFlowTime; uniform float uHeat; uniform float uEruption;uniform vec3 uImpacts[${METEOR_TARGETS.length}];
 ${noiseGLSL}
 ${lavaReliefGLSL}
 // Warped cellular boundaries form separated crust rafts, not luminous cloud-shaped blobs.
 vec2 crustCells(vec2 p){
  vec2 cell=floor(p),local=fract(p);float nearest=8.,second=8.,identity=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   vec2 offset=vec2(float(x),float(y)),id=cell+offset;
   vec2 center=.18+.64*vec2(hash(id),hash(id+53.71));
   vec2 delta=offset+center-local;float distance=dot(delta,delta);
   if(distance<nearest){second=nearest;nearest=distance;identity=hash(id+9.2);}
   else second=min(second,distance);
  }
  return vec2(sqrt(second)-sqrt(nearest),identity);
 }
 void main(){
 vec2 p=vUv*vec2(15.,7.5);
 vec2 world=(vUv-.5)*vec2(12.,-6.);float impactLight=0.;vec2 impactFlow=vec2(0.);
 for(int i=0;i<${METEOR_TARGETS.length};i++){
  float age=uImpacts[i].z;
  if(age>=0.&&age<2.65){vec2 delta=world-uImpacts[i].xy;float distance=length(delta);float radius=.28+age*1.06;
   float band=exp(-abs(distance-radius)*10.)*(1.-age/2.65);
   impactFlow+=delta/max(.05,distance)*sin((distance-radius)*20.)*band*.18;
   impactLight+=band*.24+exp(-distance*distance*9.)*exp(-age*8.)*.7;
  }
 }
 // Advect coherent crust rafts eastward; hot seams travel slightly faster beneath them.
 vec2 flow=vec2(uFlowTime*.22,-uFlowTime*.045);
 vec2 drift=p-flow+impactFlow;
 vec2 warp=vec2(fbm(drift*.85),fbm(drift*.85+19.));
 vec2 q=drift+warp*1.9;
 vec2 cell=crustCells((q+vec2(noise(q*4.),noise(q*4.+31.))*.13)*1.75);
 float foldNoise=fbm(q*4.2);
 float ropes=.5+.5*sin(q.y*39.+warp.x*30.+foldNoise*8.);
 float fineFade=1.-smoothstep(.35,1.2,max(length(dFdx(q*38.)),length(dFdy(q*38.))));
 float grain=mix(.5,noise(q*38.),fineFade);
 float opening=.012+.075*noise(q*2.1);
 float raft=smoothstep(.32,.52,fbm(q*.95));
 float plate=smoothstep(opening,opening+.13,cell.x)*raft;
 float hot=max(1.-smoothstep(.008,opening+.06,cell.x),1.-raft);
 float relief=plate*(.078+.045*foldNoise+.025*ropes)+.008*grain*plate;
 vec3 normal=reliefNormal(relief);
 float roughness=mix(.43,.86,plate)+grain*.08;
 vec3 albedo=mix(vec3(.004,.005,.006),vec3(.028,.029,.031),foldNoise*.8+ropes*.2);
 float cavity=mix(.32,1.,smoothstep(.035,.21,cell.x))*mix(.65,1.,ropes);
 vec3 color=shadeLavaCrust(albedo,normal,roughness,cavity);
 float undercurrent=fbm((p-flow*1.35)*3.3);
 float temperature=clamp(hot*.77+undercurrent*.3,0.,1.);
 vec3 molten=mix(vec3(.65,.009,.0005),vec3(3.4,.58,.018),pow(temperature,1.65));
 molten=mix(molten,vec3(4.1,1.3,.12),smoothstep(.92,1.,temperature)*.38);
 // Red cooling rims retain contrast; only narrow, exposed seams are incandescent.
 color+=molten*pow(1.-plate,1.5)*uHeat*(1.+uEruption*.13);
 color+=vec3(.25,.008,.0005)*(1.-plate)*plate*uHeat;
 color+=vec3(1.8,.28,.015)*impactLight;
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
const lavaSideFragment=`
 varying vec2 vUv; uniform float uFlowTime; uniform float uHeat;
 ${noiseGLSL}
 void main(){
 float grain=fbm(vUv*vec2(31.,8.));
 float band=smoothstep(.73,.99,vUv.y+grain*.09);
 float seams=pow(noise(vUv*vec2(48.,5.)+vec2(uFlowTime*.01,0.)),7.);
 vec3 c=mix(vec3(.018,.008,.005),vec3(.19,.025,.006),grain);
 c+=vec3(1.3,.13,.008)*(band*.28+seams*.25)*uHeat;
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
export function Lava(){const materials=useRef<(ShaderMaterial|null)[]>([]),uniforms=useLavaSimulation(materials);useFrame(()=>{if(materials.current[0]){diagnostics.lavaShaderTime=materials.current[0].uniforms.uTime.value;diagnostics.lavaFlowShaderTime=materials.current[0].uniforms.uFlowTime.value;}});return <group>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.116,0]}><planeGeometry args={[11.998,5.998]}/><shaderMaterial ref={m=>{materials.current[0]=m;}} uniforms={uniforms} vertexShader={lavaReliefVertex} fragmentShader={lavaFragment}/></mesh>
 <mesh position={[0,-.31,0]}><boxGeometry args={[11.998,.85,5.998]}/><shaderMaterial ref={m=>{materials.current[1]=m;}} uniforms={uniforms} vertexShader={lavaVertex} fragmentShader={lavaSideFragment}/></mesh>
 <LavaBoiling/>
 </group>}
