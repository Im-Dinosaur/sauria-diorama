import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { diagnostics } from '../config';
import { BufferGeometry,Float32BufferAttribute,DoubleSide,ShaderMaterial } from 'three';
import { useLavaSimulation } from '../hooks/useLavaSimulation';
import { lavaFlows,flowPoint } from '../world/lavaFlows';
import { noiseGLSL } from '../shaders/lavaNoise';
import { lavaReliefVertex, lavaReliefGLSL } from '../shaders/lavaRelief';
const fragment=`varying vec2 vUv;varying vec3 vWorldPosition;uniform float uFlowTime;uniform float uHeat;uniform float uEruption;${noiseGLSL}${lavaReliefGLSL}
void main(){
 float edge=abs(vUv.x*2.-1.);vec2 p=vec2(vUv.x*3.6,vUv.y*30.-uFlowTime*1.65);
 float n=fbm(p+vec2(sin(vUv.y*27.-uFlowTime*.7)*.35,0.));
 float ribs=.5+.5*sin(vUv.x*23.+n*9.+vUv.y*8.);
 float core=(1.-smoothstep(.18,.96,edge+.24*(n-.5)));
 float hot=clamp(core*.83+(n-.42)*1.25+ribs*.13,0.,1.);
 float crustMask=smoothstep(.49,.69,n);
 float relief=.022*crustMask+.008*ribs+.006*n;
 vec3 normal=reliefNormal(relief);
 vec3 crust=shadeLavaCrust(mix(vec3(.005,.006,.007),vec3(.031,.024,.02),n),normal,.76,.8);
 vec3 molten=mix(vec3(1.3,.055,.002),vec3(3.2,.68,.055),hot*hot);
 vec3 color=mix(crust,molten,smoothstep(.16,.64,hot))*uHeat*(1.+uEruption*.25);
 color=mix(color,crust,crustMask*.92);
 float alpha=(1.-smoothstep(.88,1.,edge))*(1.-smoothstep(.94,1.,vUv.y));
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
function geometry(index:number){const pos:number[]=[],uv:number[]=[],steps=200,across=8;
 const point=(t:number,s:number)=>{const p=flowPoint(index,t,s);return [p.x,p.y,p.z];};
 for(let i=0;i<steps;i++)for(let j=0;j<across;j++){
  const t=i/steps,tt=(i+1)/steps,u=j/across,uu=(j+1)/across;
  for(const [s,v] of [[u,t],[u,tt],[uu,t],[uu,t],[u,tt],[uu,tt]]){pos.push(...point(v,s*2-1));uv.push(s,v);}
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
export function LavaFlows(){const geometries=useMemo(()=>lavaFlows.map((_,i)=>geometry(i)),[]),materials=useRef<(ShaderMaterial|null)[]>([]),uniforms=useLavaSimulation(materials);useFrame(()=>{if(materials.current[0])diagnostics.riverFlowShaderTime=materials.current[0].uniforms.uFlowTime.value;});return <group>{geometries.map((g,i)=><mesh key={i} geometry={g}><shaderMaterial ref={m=>{materials.current[i]=m;}} vertexShader={lavaReliefVertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide}/></mesh>)}</group>}
