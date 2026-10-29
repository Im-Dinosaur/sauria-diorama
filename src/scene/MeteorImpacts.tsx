import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group,InstancedMesh,Mesh,Object3D,PointLight } from 'three';
import { simulation,diagnostics } from '../config';
import { ShaderMaterial } from 'three';
import { LAVA_LEVEL } from '../world/lavaFlows';
import { METEOR_TARGETS,SPLASH_COUNT,WAVE_SEGMENTS,meteorState,splashSample,waveLimits } from '../world/meteorImpacts';
import { noiseGLSL } from '../shaders/lavaNoise';

function crownGeometry(){
 const pos:number[]=[],uv:number[]=[];
 for(let a=0;a<64;a++)for(let y=0;y<5;y++)for(const [i,j] of [[a,y],[a+1,y],[a,y+1],[a,y+1],[a+1,y],[a+1,y+1]]){
  const angle=i/64*Math.PI*2,h=j/5,tip=.62+.25*Math.sin(angle*9+1.2)+.13*Math.sin(angle*17);
  const radius=.62+h*.38;
  pos.push(Math.cos(angle)*radius,h*tip,Math.sin(angle)*radius);uv.push(i/64,h);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function rippleGeometry(index:number,ring:number){
 const pos:number[]=[],data:number[]=[];
 for(let i=0;i<WAVE_SEGMENTS;i++)for(let cross=0;cross<3;cross++)for(const [j,edge] of [[i,cross/1.5-1],[i+1,cross/1.5-1],[i,(cross+1)/1.5-1],[i,(cross+1)/1.5-1],[i+1,cross/1.5-1],[i+1,(cross+1)/1.5-1]]){
  const a=j/WAVE_SEGMENTS*Math.PI*2;pos.push(Math.cos(a)*(1+edge*.1),0,Math.sin(a)*(1+edge*.1));data.push(waveLimits[index][j],edge,ring);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('aWave',new Float32BufferAttribute(data,3));g.setAttribute('normal',new Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));return g;
}
function jetGeometry(){
 const pos:number[]=[],uv:number[]=[];
 const point=(i:number,j:number)=>{const a=i/12*Math.PI*2,h=j/10,r=(1-h)**.65*(.8+.13*Math.sin(a*3+h*8));return [Math.cos(a)*r+Math.sin(h*4)*h*.2,h,Math.sin(a)*r];};
 for(let i=0;i<12;i++)for(let j=0;j<10;j++)for(const [a,h] of [[i,j],[i,j+1],[i+1,j],[i+1,j],[i,j+1],[i+1,j+1]]){pos.push(...point(a,h));uv.push(a/12,h/10);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
const surfaceVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const crownFragment=`varying vec2 vUv;uniform float uAge;uniform float uOpacity;${noiseGLSL}
 void main(){float n=fbm(vec2(vUv.x*15.,vUv.y*4.-uAge*1.5));
 float molten=smoothstep(.48,.75,n)+pow(vUv.y,3.)*.65;
 vec3 color=mix(vec3(.14,.012,.002),vec3(3.1,.45,.025),clamp(molten,0.,1.));
 color=mix(color,vec3(4.,1.2,.16),pow(vUv.y,7.)*.8);
 float alpha=uOpacity*(.78+.22*n)*(1.-smoothstep(.88,1.,vUv.y)*.22);
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
const rippleVertex=`attribute vec3 aWave;uniform float uAge;varying float vOpacity;varying float vEdge;varying vec3 vWorld;
 float ease(float t){t=clamp(t,0.,1.);return t*t*(3.-2.*t);}
 void main(){float age=uAge-aWave.z*.23;float r=.28+max(0.,age)*1.06;float width=.075+max(0.,age)*.025;
 float limit=aWave.x;float distance=min(r+aWave.y*width,limit);
 vOpacity=step(0.,age)*(1.-ease(age/2.3))*(.72-aWave.z*.15)*(1.-smoothstep(limit-.12,limit,r));vEdge=aWave.y;
 vec3 p=normalize(position)*max(0.,distance);p.y=.012+sin((aWave.y+1.)*1.5708)*.035*vOpacity;
 vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`;
const rippleFragment=`varying float vOpacity;varying float vEdge;varying vec3 vWorld;uniform float uAge;${noiseGLSL}
 void main(){float breakup=.72+.28*noise(vWorld.xz*13.+uAge*.2);float edge=1.-smoothstep(.5,1.,abs(vEdge));
 float lip=1.-smoothstep(.08,.38,abs(vEdge-.3));
 vec3 color=mix(vec3(.035,.004,.001),vec3(3.8,1.1,.08)*breakup,lip);
 gl_FragColor=vec4(color,min(1.,vOpacity*1.45)*edge*breakup);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
const poolFragment=`varying vec2 vUv;uniform float uAge;uniform float uOpacity;${noiseGLSL}
 void main(){vec2 p=vUv*2.-1.;float r=length(p);float n=fbm(p*5.-uAge*.6);float edge=1.-smoothstep(.65,1.,r);
 vec3 c=mix(vec3(.12,.009,.002),vec3(3.8,.6,.025),smoothstep(.34,.8,n)*smoothstep(.1,.55,r));
 gl_FragColor=vec4(c,edge*uOpacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;

function Impact({index}:{index:number}){
 const root=useRef<Group>(null),crown=useRef<Mesh>(null),jet=useRef<Mesh>(null),pool=useRef<Mesh>(null),droplets=useRef<InstancedMesh>(null),light=useRef<PointLight>(null);
 const materials=useRef<(ShaderMaterial|null)[]>([]);
 const {crownShape,jetShape,ripples,uniforms,dummy,color}=useMemo(()=>({crownShape:crownGeometry(),jetShape:jetGeometry(),ripples:[0,1,2].map(r=>rippleGeometry(index,r)),uniforms:{uAge:{value:-1},uOpacity:{value:0}},dummy:new Object3D(),color:new Color()}),[index]);
 useFrame(()=>{
  const s=meteorState(simulation.time,index,simulation.environment.age,simulation.environment.eventMeteorCount),visible=s.impact&&simulation.meteors;
  diagnostics.meteorEffects[index]={falling:s.falling&&simulation.meteors,impact:visible};
  if(root.current)root.current.visible=visible;
  uniforms.uAge.value=s.age;uniforms.uOpacity.value=s.fade;
  for(const material of materials.current)if(material){material.uniforms.uAge.value=s.age;material.uniforms.uOpacity.value=s.fade;}
  if(crown.current)diagnostics.impactShaderAges[index]=((crown.current.material as ShaderMaterial).uniforms.uAge.value);
  if(light.current)light.current.intensity=visible?s.flash*26+s.rebound*5:0;
  if(crown.current){crown.current.visible=s.crownHeight>.001;crown.current.scale.set(s.crownRadius,s.crownHeight,s.crownRadius);}
  if(jet.current){jet.current.visible=s.rebound>.001;jet.current.scale.set(.18+s.rebound*.16,s.rebound*1.7,.18+s.rebound*.16);jet.current.position.y=.018;}
  if(pool.current)pool.current.scale.setScalar(.34+Math.max(0,s.age)*.13);
  for(let j=0;j<SPLASH_COUNT;j++){
   const p=splashSample(index,j,s.age),site=METEOR_TARGETS[index];
   dummy.position.set(p.x-site.x,p.y-LAVA_LEVEL,p.z-site.z);dummy.rotation.set(p.age*3.5+j,p.angle,p.age*2.1);
   const size=p.visible?p.radius*Math.sqrt(p.fade):0;dummy.scale.set(size,size*p.stretch,size);dummy.updateMatrix();droplets.current?.setMatrixAt(j,dummy.matrix);
   color.setRGB(1,.25+Math.max(0,1-p.age)*.45,.025);droplets.current?.setColorAt(j,color);
  }
  if(droplets.current){droplets.current.instanceMatrix.needsUpdate=true;if(droplets.current.instanceColor)droplets.current.instanceColor.needsUpdate=true;}
 });
 const p=METEOR_TARGETS[index];
 // Keep the light count fixed; hiding a parent light would recompile every lit material at impact.
 return <group><pointLight ref={light} position={[p.x,LAVA_LEVEL+.4,p.z]} intensity={0} color="#ff8b2a" distance={4.5} castShadow={false}/>
 <group ref={root} position={[p.x,LAVA_LEVEL,p.z]}>
  <mesh ref={pool} position={[0,.009,0]} rotation={[-Math.PI/2,0,0]} castShadow={false}><planeGeometry args={[2,2]}/><shaderMaterial ref={m=>{materials.current[0]=m;}} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={poolFragment} transparent depthWrite={false}/></mesh>
  <mesh ref={crown} geometry={crownShape} position={[0,.018,0]} castShadow={false}><shaderMaterial ref={m=>{materials.current[1]=m;}} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={crownFragment} transparent depthWrite={false} side={DoubleSide}/></mesh>
  <mesh ref={jet} geometry={jetShape} castShadow={false}><shaderMaterial ref={m=>{materials.current[2]=m;}} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={crownFragment} transparent depthWrite={false} side={DoubleSide}/></mesh>
  {ripples.map((geometry,r)=><mesh key={r} geometry={geometry} castShadow={false} frustumCulled={false}><shaderMaterial ref={m=>{materials.current[3+r]=m;}} uniforms={uniforms} vertexShader={rippleVertex} fragmentShader={rippleFragment} transparent depthWrite={false} side={DoubleSide}/></mesh>)}
  <instancedMesh ref={droplets} args={[undefined,undefined,SPLASH_COUNT]} castShadow={false} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#f87426" emissive="#ff5d0b" emissiveIntensity={1.7} roughness={.6} flatShading/></instancedMesh>
 </group></group>;
}
export function MeteorImpacts(){return <group>{METEOR_TARGETS.map((_,index)=><Impact key={index} index={index}/>)}</group>;}
