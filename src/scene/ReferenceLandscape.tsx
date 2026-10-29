import {publicAsset} from '../publicAsset';
import { useEffect,useLayoutEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { BufferGeometry,DataTexture,Float32BufferAttribute,InstancedMesh,LinearFilter,MeshStandardMaterial,Object3D,RGBAFormat,ShaderMaterial,SRGBColorSpace } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HABITAT_GRID,habitatGround,reference,referencePoint,rockOutcrops,noise,WATER_LEVEL } from '../world/habitat';
import { DIORAMA } from '../world/layout';
import type { WorldMode } from '../world/layout';
import { noiseGLSL } from '../shaders/lavaNoise';
import { fracturedSlab } from '../world/rockGeometry';
import {disasterCoverageGLSL} from './disasterShader';
export function referenceMask(){
 const pixels=new Uint8Array(reference.columns*reference.rows*4);
 for(let z=0;z<reference.rows;z++)for(let x=0;x<reference.columns;x++){
  const i=z*reference.columns+x,j=((reference.rows-1-z)*reference.columns+x)*4;pixels[j]=reference.water[i]*255;pixels[j+1]=reference.canopy[i]*255;pixels[j+2]=reference.wetland[i]*255;pixels[j+3]=Math.min(255,reference.landDistanceCentimeters[i]);
 }
 const texture=new DataTexture(pixels,reference.columns,reference.rows,RGBAFormat);texture.minFilter=texture.magFilter=LinearFilter;texture.needsUpdate=true;return texture;
}
function terrainGeometry(){
 const {nx,nz,width,depth,minX,minZ}=HABITAT_GRID,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const xx=minX+x*width/nx,zz=minZ+z*depth/nz;positions.push(xx,reference.heightMillimeters[z*reference.columns+x]/1000,zz);uvs.push(x/nx,1-z/nz);}
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const a=z*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
const waterVertex=`varying vec2 vUv;varying vec3 vWorldPosition;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vWorldPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`;
const waterFragment=`
 varying vec2 vUv;varying vec3 vWorldPosition;uniform sampler2D uMap;uniform sampler2D uMask;uniform float uTime;uniform int uMode;
 ${noiseGLSL}
 ${disasterCoverageGLSL}
 float cells(vec2 p){vec2 cell=floor(p),local=fract(p);float d1=8.,d2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)),id=cell+o,c=.18+.64*vec2(hash(id),hash(id+53.71));float d=length(o+c-local);if(d<d1){d2=d1;d1=d;}else d2=min(d2,d);}return d2-d1;}
 void main(){
  vec2 p=vWorldPosition.xz,drift=p-vec2(uTime*.07,uTime*.025);vec2 ripple=vec2(sin(p.y*2.5+uTime*.7),cos(p.x*3.1-uTime*.5))*.00028;
  vec3 base=texture2D(uMap,vUv+ripple).rgb,color=base;float grain=noise(p*35.);
  if(uMode==2){float ash=fbm(drift*.8);color=mix(base*.13,vec3(.026,.024,.022),.72)+vec3(.025,.012,.005)*ash;}
  else if(uMode==1){float crack=1.-smoothstep(.004,.022,cells(p*.7+fbm(p)*.2));color=mix(vec3(.28,.50,.63),vec3(.68,.81,.86),fbm(p*.8));color=mix(color,vec3(.13,.30,.43),crack*.5);color+=pow(grain,16.)*.1;}
  else{vec3 normal=normalize(vec3(cos(p.x*4.+uTime*.7)*.08,1.,cos(p.y*4.4-uTime*.6)*.07)),eye=normalize(cameraPosition-vWorldPosition),light=normalize(vec3(-.4,1.,.6));float spec=pow(max(0.,dot(normal,normalize(eye+light))),95.);color=base*.96+vec3(.35,.48,.48)*spec*.2;}
  if(uMode!=0)color=mix(base*.96,color,disasterCoverage(vWorldPosition));
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
export function ReferenceLandscape({mode,time,transition,waterTransition}:{mode:WorldMode;time:()=>number;transition?:()=>number;waterTransition?:()=>number}){
 const image=useTexture(publicAsset('/textures/reference-valley-web.webp')),mask=useMemo(referenceMask,[]),geometry=useMemo(terrainGeometry,[]),surface=useRef<ShaderMaterial>(null);
 image.colorSpace=SRGBColorSpace;image.anisotropy=8;
 const disasterUniforms=useMemo(()=>({uDisasterProgress:{value:0},uDisasterKind:{value:0}}),[]);
 const stones=useRef<InstancedMesh>(null),stoneGeometry=useMemo(()=>new RoundedBoxGeometry(1,1,1,3,.07),[]),rockShapes=useMemo(()=>Array.from({length:11},(_,i)=>fracturedSlab(i+17)),[]);
 const stoneMaterial=useMemo(()=>{const m=new MeshStandardMaterial({color:'#a99c7a',roughness:.94});m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,disasterUniforms);shader.uniforms.uRockImage={value:image};shader.uniforms.uRockMode=disasterUniforms.uDisasterKind;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStonePosition;varying vec3 vStoneNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 stoneLocal=vec4(position,1.);\n#ifdef USE_INSTANCING\nstoneLocal=instanceMatrix*stoneLocal;\n#endif\nvStonePosition=(modelMatrix*stoneLocal).xyz;vStoneNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform sampler2D uRockImage;uniform int uRockMode;varying vec3 vStonePosition;varying vec3 vStoneNormal;\n${noiseGLSL}\n${disasterCoverageGLSL}`)
   .replace('#include <color_fragment>',`#include <color_fragment>\nvec2 rockUv=vec2(vStonePosition.x/${DIORAMA.width.toFixed(8)}+.5,.5-vStonePosition.z/${DIORAMA.depth.toFixed(8)});vec3 tracedRock=texture2D(uRockImage,rockUv).rgb;float upward=smoothstep(.15,.8,vStoneNormal.y);diffuseColor.rgb=mix(diffuseColor.rgb,tracedRock,upward*.96);if(uRockMode!=0)diffuseColor.rgb=mix(diffuseColor.rgb,uRockMode==1?vec3(.62,.72,.77):vec3(.065,.045,.03),disasterCoverage(vStonePosition)*.9);float weather=fbm(vStonePosition.xz*9.+vStonePosition.y*3.),strata=pow(.5+.5*sin(vStonePosition.y*75.+weather*4.),12.),cracks=pow(1.-abs(sin(vStonePosition.x*7.+fbm(vStonePosition.xz*2.)*4.)),32.);diffuseColor.rgb*=.88+weather*.22;diffuseColor.rgb*=1.-strata*.12-cracks*.18;`)
   .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>\nvec2 stoneUv=vec2(vStonePosition.x/${DIORAMA.width.toFixed(8)}+.5,.5-vStonePosition.z/${DIORAMA.depth.toFixed(8)});float originalRelief=dot(texture2D(uRockImage,stoneUv).rgb,vec3(.25,.6,.15));float relief=fbm(vStonePosition.xz*48.+vStonePosition.y*7.)*.3+originalRelief;normal=normalize(normal+vec3(dFdx(relief),dFdy(relief),0.)*.65);`);
 };m.customProgramCacheKey=()=>`traced-stone-transition`;return m;},[image,disasterUniforms]);
 const gravel=useMemo(()=>{const sites=[] as {x:number;z:number;s:number}[];for(let i=0;i<reference.water.length;i+=3){const d=reference.landDistanceCentimeters[i];if(reference.water[i]||d<30||d>140||noise(i+37)>.26)continue;const p=referencePoint(i);sites.push({...p,s:.018+noise(i+12)*.060});if(sites.length>=650)break;}return sites;},[]);
 useLayoutEffect(()=>{const dummy=new Object3D();gravel.forEach((p,i)=>{dummy.position.set(p.x,habitatGround(p.x,p.z)+p.s*.18,p.z);dummy.rotation.set(i,i*2.4,i*.3);dummy.scale.set(p.s*1.6,p.s*.55,p.s);dummy.updateMatrix();stones.current?.setMatrixAt(i,dummy.matrix);});if(stones.current)stones.current.instanceMatrix.needsUpdate=true;},[gravel]);
 const material=useMemo(()=>{const m=new MeshStandardMaterial({map:image,roughness:.94,color:'#ffffff'});m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,disasterUniforms);shader.uniforms.uMask={value:mask};shader.uniforms.uWorldMode=disasterUniforms.uDisasterKind;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vTerrainUv;varying vec3 vGroundPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainUv=uv;vGroundPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uMask;uniform int uWorldMode;varying vec2 vTerrainUv;varying vec3 vGroundPosition;\n'+disasterCoverageGLSL+'\nfloat groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float groundGrain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(groundHash(i),groundHash(i+vec2(1.,0.)),f.x),mix(groundHash(i+vec2(0.,1.)),groundHash(i+vec2(1.,1.)),f.x),f.y);}')
   .replace('#include <color_fragment>','#include <color_fragment>\nvec4 layers=texture2D(uMask,vTerrainUv);float grains=groundGrain(vGroundPosition.xz*95.);vec3 litter=vec3(.064,.080,.026)*(.96+grains*.08);diffuseColor.rgb=mix(diffuseColor.rgb,litter,layers.g*.94);diffuseColor.rgb*=.98+grains*.04;vec3 originalGround=diffuseColor.rgb;if(uWorldMode==1){diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.76,.85,.89),.82);}else if(uWorldMode==2){diffuseColor.rgb=mix(diffuseColor.rgb*.22,vec3(.055,.038,.024),.55);}diffuseColor.rgb=mix(originalGround,diffuseColor.rgb,disasterCoverage(vGroundPosition));')
   .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nfloat grit=groundGrain(vGroundPosition.xz*180.);normal=normalize(normal+vec3(dFdx(grit),dFdy(grit),0.)*.013);');
 };m.customProgramCacheKey=()=>`reference-ground-transition`;return m;},[image,mask,disasterUniforms]);
 const uniforms=useMemo(()=>({uMap:{value:image},uMask:{value:mask},uTime:{value:0},uMode:disasterUniforms.uDisasterKind,...disasterUniforms,uDisasterProgress:{value:0}}),[image,mask,disasterUniforms]);
 useEffect(()=>()=>{material.dispose();stoneMaterial.dispose();},[material,stoneMaterial]);useEffect(()=>()=>{geometry.dispose();mask.dispose();stoneGeometry.dispose();rockShapes.forEach(g=>g.dispose());},[geometry,mask,stoneGeometry,rockShapes]);
 useFrame(()=>{disasterUniforms.uDisasterProgress.value=transition?transition():mode==='peaceful'?0:1;disasterUniforms.uDisasterKind.value=mode==='peaceful'?0:mode==='ice'?1:2;if(surface.current){surface.current.uniforms.uTime.value=time();surface.current.uniforms.uMode.value=disasterUniforms.uDisasterKind.value;surface.current.uniforms.uDisasterKind.value=disasterUniforms.uDisasterKind.value;surface.current.uniforms.uDisasterProgress.value=waterTransition?waterTransition():disasterUniforms.uDisasterProgress.value;}});
 return <group>
  <mesh position={[0,-.85,0]} castShadow receiveShadow><boxGeometry args={[DIORAMA.width,.65,DIORAMA.depth]}/><meshStandardMaterial color={mode==='ice'?'#778e98':'#74644a'} roughness={1}/></mesh>
  <mesh geometry={geometry} material={material} receiveShadow/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,WATER_LEVEL,0]}><planeGeometry args={[DIORAMA.width,DIORAMA.depth]}/><shaderMaterial ref={surface} uniforms={uniforms} vertexShader={waterVertex} fragmentShader={waterFragment}/></mesh>
  {rockOutcrops.map((p,i)=><group key={i} position={[p.x,habitatGround(p.x,p.z),p.z]}>{Array.from({length:11},(_,j)=>{const angle=j*2.399+i*.4,r=Math.sqrt((j+.5)/11)*.65;return <mesh key={j} geometry={rockShapes[j]} material={stoneMaterial} position={[Math.cos(angle)*r*p.rx,.09+noise(i*71+j)*.20,Math.sin(angle)*r*p.rz]} scale={[p.rx*(.30+noise(j+11)*.19),Math.min(p.rx,p.rz)*(.24+noise(j+77)*.18),p.rz*(.25+noise(j+22)*.18)]} rotation={[(noise(j)-.5)*.27,(noise(j+51)-.5)*.6,(noise(j+6)-.5)*.20]} castShadow receiveShadow/>;})}</group>)}
  <instancedMesh name="riverbank-gravel" ref={stones} args={[undefined,undefined,gravel.length]} geometry={stoneGeometry} material={stoneMaterial} receiveShadow/>
 </group>;
}
