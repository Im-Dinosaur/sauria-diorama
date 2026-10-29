import { useEffect,useLayoutEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry,Color,Float32BufferAttribute,InstancedMesh,Object3D,ShaderMaterial,Vector3 } from 'three';
import { forest,HABITAT_GRID,habitatHeight,habitatGround,noise,MOUNTAIN,WATER_LEVEL } from '../world/habitat';
import { DIORAMA } from '../world/layout';
import type { WorldMode } from '../world/layout';
import { noiseGLSL } from '../shaders/lavaNoise';

function terrainGeometry(mode:WorldMode){
 const {nx,nz,width,depth,minX,minZ}=HABITAT_GRID,positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const grass=new Color(mode==='peaceful'?'#70834c':mode==='ice'?'#d2e0df':'#464137'),sand=new Color(mode==='peaceful'?'#b9aa77':mode==='ice'?'#a8c6d2':'#66503c'),rock=new Color(mode==='peaceful'?'#737962':mode==='ice'?'#c7d9df':'#393837');
 for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){
  const xx=minX+x*width/nx,zz=minZ+z*depth/nz,h=habitatHeight(xx,zz),c=(h>.9?rock:h<.35?sand:grass).clone();
  c.multiplyScalar(.87+noise(x*73+z*113)*.19);positions.push(xx,h,zz);colors.push(c.r,c.g,c.b);
 }
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const a=z*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
const waterVertex=`varying vec3 vWorldPosition;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorldPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`;
const waterFragment=`
 varying vec3 vWorldPosition;uniform float uTime;uniform int uMode;
 ${noiseGLSL}
 vec2 cellular(vec2 p){vec2 cell=floor(p),local=fract(p);float d1=8.,d2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)),id=cell+o,c=.18+.64*vec2(hash(id),hash(id+53.71));float d=length(o+c-local);if(d<d1){d2=d1;d1=d;}else d2=min(d2,d);}return vec2(d2-d1,d1);}
 void main(){
  vec2 p=vWorldPosition.xz;vec2 flow=p-vec2(uTime*.095,uTime*.026);float n=fbm(flow*1.7),fine=noise(p*65.);
  vec3 color;
  if(uMode==2){
   vec2 warp=vec2(fbm(flow*.6),fbm(flow*.6+31.));vec2 cells=cellular((flow+warp*1.2)*1.8);float crack=1.-smoothstep(.018,.14,cells.x);float fresh=1.-smoothstep(.34,.62,fbm(flow*.9));float heat=max(crack,fresh*.9);
   color=mix(vec3(.013,.012,.011),vec3(.045,.034,.026),n);color+=mix(vec3(.9,.018,.001),vec3(4.4,1.25,.055),pow(heat,1.8))*pow(heat,2.);color*=.94+fine*.1;
  }else if(uMode==1){
   vec2 cells=cellular(p*.78+fbm(p*1.3)*.4);float crack=1.-smoothstep(.006,.025,cells.x);color=mix(vec3(.38,.64,.72),vec3(.74,.88,.89),n);color=mix(color,vec3(.20,.43,.55),crack*.65);color+=pow(noise(p*30.),14.)*.3;
  }else{
   float wave=sin(p.x*3.1+uTime*.7)*.045+sin(p.y*4.2-uTime*.85)*.04;vec3 normal=normalize(vec3(cos(p.x*3.1+uTime*.7)*.11,1.,cos(p.y*4.2-uTime*.85)*.10));
   vec3 eye=normalize(cameraPosition-vWorldPosition),light=normalize(vec3(-.4,1.,.6));float fresnel=pow(1.-max(0.,dot(eye,normal)),3.);float spec=pow(max(0.,dot(normal,normalize(eye+light))),100.);
   color=mix(vec3(.025,.24,.28),vec3(.11,.47,.43),n*.65+.15);color+=vec3(.22,.33,.30)*fresnel+vec3(.8,.88,.75)*spec*.65;color+=wave*.12;
  }
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
export function HabitatLandscape({mode,time}:{mode:WorldMode;time:()=>number}){
 const g=useMemo(()=>terrainGeometry(mode),[mode]),surface=useRef<ShaderMaterial>(null);
 useEffect(()=>()=>g.dispose(),[g]);
 const uniforms=useMemo(()=>({uTime:{value:0},uMode:{value:0}}),[]);
 useFrame(()=>{if(surface.current){surface.current.uniforms.uTime.value=time();surface.current.uniforms.uMode.value=mode==='peaceful'?0:mode==='ice'?1:2;}});
 return <group>
  <mesh position={[0,-1.15,0]} castShadow receiveShadow><boxGeometry args={[36.15,.25,18.15]}/><meshStandardMaterial color={mode==='ice'?'#57666a':'#302c25'} roughness={.73}/></mesh>
  <mesh position={[0,-.65,0]} castShadow receiveShadow><boxGeometry args={[36,.8,18]}/><meshStandardMaterial color={mode==='ice'?'#7c8e94':'#7d6b4f'} roughness={1}/></mesh>
  <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.94}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,WATER_LEVEL,0]}><planeGeometry args={[DIORAMA.width-.015,DIORAMA.depth-.015]}/><shaderMaterial ref={surface} uniforms={uniforms} vertexShader={waterVertex} fragmentShader={waterFragment}/></mesh>
  <mesh position={[MOUNTAIN.x,3.67,MOUNTAIN.z]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.36,40]}/><meshStandardMaterial color={mode==='ember'?'#ffb244':mode==='ice'?'#c1e3ec':'#4e8b80'} emissive={mode==='ember'?'#ff4003':'#000000'} emissiveIntensity={mode==='ember'?3:0} roughness={.5}/></mesh>
 </group>;
}
export function HabitatForest({mode}:{mode:WorldMode}){
 const trunks=useRef<InstancedMesh>(null),crowns=useRef<InstancedMesh>(null),broad=useRef<InstancedMesh>(null),understory=useRef<InstancedMesh>(null);
 const dummy=useMemo(()=>new Object3D(),[]);
 useLayoutEffect(()=>{
  forest.forEach((p,i)=>{const y=habitatGround(p.x,p.z),s=p.scale;dummy.position.set(p.x,y+.86*s,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.set(.12*s,1.72*s,.12*s);dummy.updateMatrix();trunks.current?.setMatrixAt(i,dummy.matrix);
   for(let j=0;j<3;j++){dummy.position.set(p.x,y+(1.12+j*.43)*s,p.z);dummy.scale.set((.62-j*.12)*s,(1.1-j*.16)*s,(.62-j*.12)*s);if(mode==='ember')dummy.scale.multiplyScalar(.65);dummy.rotation.set(0,i+j*.7,0);dummy.updateMatrix();crowns.current?.setMatrixAt(i*3+j,dummy.matrix);}
   dummy.position.set(p.x,y+1.85*s,p.z);dummy.scale.setScalar(p.kind===1&&mode!=='ember'?s*.73:0);dummy.rotation.set(i,0,i*.3);dummy.updateMatrix();broad.current?.setMatrixAt(i,dummy.matrix);
   dummy.position.set(p.x+.29,y+.12,p.z-.25);dummy.scale.set(.44*s,.22*s,.45*s);dummy.rotation.set(0,i,0);dummy.updateMatrix();understory.current?.setMatrixAt(i,dummy.matrix);
  });for(const ref of [trunks,crowns,broad,understory])if(ref.current)ref.current.instanceMatrix.needsUpdate=true;
 },[dummy,mode]);
 return <group>
  <instancedMesh ref={trunks} args={[undefined,undefined,forest.length]} castShadow receiveShadow><cylinderGeometry args={[.68,1,1,12]}/><meshStandardMaterial color={mode==='ice'?'#7d8275':mode==='ember'?'#332b24':'#66523b'} roughness={.98}/></instancedMesh>
  <instancedMesh ref={crowns} args={[undefined,undefined,forest.length*3]} castShadow receiveShadow><coneGeometry args={[1,1,14]}/><meshStandardMaterial color={mode==='ice'?'#d3e0dd':mode==='ember'?'#3f3e2a':'#335c3f'} roughness={.92}/></instancedMesh>
  <instancedMesh ref={broad} args={[undefined,undefined,forest.length]} castShadow receiveShadow><icosahedronGeometry args={[1,3]}/><meshStandardMaterial color={mode==='ice'?'#e7eddf':'#557947'} roughness={.94}/></instancedMesh>
  <instancedMesh ref={understory} args={[undefined,undefined,forest.length]} receiveShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={mode==='ice'?'#b8d1d5':mode==='ember'?'#514734':'#677d40'} roughness={1}/></instancedMesh>
 </group>;
}
export function DisasterParticles({mode,time}:{mode:WorldMode;time:()=>number}){
 const particles=useRef<InstancedMesh>(null),smoke=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]),color=useMemo(()=>new Color(),[]);
 useFrame(()=>{if(mode==='peaceful')return;const t=time(),ice=mode==='ice';for(let i=0;i<420;i++){
  const r=noise(i*7+3),fall=(t*(ice?.13:.07)+r)%1;
  const x=(noise(i*3)-.5)*(DIORAMA.width-1),z=(noise(i*3+1)-.5)*(DIORAMA.depth-1);dummy.position.set(x+Math.sin(t*.4+i)*.4,ice?1+(1-fall)*11:habitatGround(x,z)+.3+fall*4,z);
  dummy.rotation.set(t+i,i*.7,0);dummy.scale.setScalar(ice?.023+r*.035:.012+r*.025);dummy.updateMatrix();particles.current?.setMatrixAt(i,dummy.matrix);
 }
 if(particles.current)particles.current.instanceMatrix.needsUpdate=true;
 for(let i=0;i<48;i++){const life=(t*.20+i/48)%1,spread=life*1.6;dummy.position.set(MOUNTAIN.x+life*.9+Math.sin(i*2.4+t*.1)*spread,habitatGround(MOUNTAIN.x,MOUNTAIN.z)+.8+life*4.3,MOUNTAIN.z+Math.cos(i*2.4)*spread*.7);dummy.rotation.set(i,t*.1,i*.4);dummy.scale.setScalar(.16+life*.66);dummy.updateMatrix();smoke.current?.setMatrixAt(i,dummy.matrix);color.setHSL(.055,.05,.15+life*.1);smoke.current?.setColorAt(i,color);}
 if(smoke.current){smoke.current.instanceMatrix.needsUpdate=true;if(smoke.current.instanceColor)smoke.current.instanceColor.needsUpdate=true;}
 });
 return <group visible={mode!=='peaceful'}>
  <instancedMesh ref={particles} args={[undefined,undefined,420]} frustumCulled={false}><sphereGeometry args={[1,5,4]}/><meshBasicMaterial color={mode==='ice'?'#dff4ff':'#d08f56'} transparent opacity={mode==='ice'?.8:.6} depthWrite={false}/></instancedMesh>
  <instancedMesh visible={mode==='ember'} ref={smoke} args={[undefined,undefined,48]} frustumCulled={false}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial transparent opacity={.19} roughness={1} depthWrite={false}/></instancedMesh>
  {mode==='ember'&&<pointLight position={[MOUNTAIN.x,4,MOUNTAIN.z]} color="#ff6828" intensity={15} distance={12}/>}
 </group>;
}
