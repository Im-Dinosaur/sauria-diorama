import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace, Vector2 } from 'three';
import { useMemo } from 'react';
import { TIERS } from '../config';
export function Studio({tier=0}:{tier?:number}){
 const maps=useTexture(['/textures/wood-color.jpg','/textures/wood-normal.jpg','/textures/wood-roughness.jpg']);
 useMemo(()=>{maps.forEach(t=>{t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(12,12);t.anisotropy=4;});maps[0].colorSpace=SRGBColorSpace;},[maps]);
 return <><color attach="background" args={['#20221d']}/><fog attach="fog" args={['#20221d',22,55]}/>
 <ambientLight intensity={0.6}/><hemisphereLight args={['#f5dfb5','#4c5050',1.2]}/>
 <directionalLight position={[-6,12,5]} intensity={3.5} color="#ffe8c8" castShadow shadow-mapSize={[TIERS[tier].shadow,TIERS[tier].shadow]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={0.04} shadow-bias={-0.0001}/>
 <directionalLight position={[3,7,-8]} intensity={2.2} color="#c6dad3"/>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.405,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new Vector2(0.3,0.3)} color="#676559" roughness={0.9} flatShading/></mesh>
 <mesh position={[0,-1.399,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[16,10]}/><shaderMaterial transparent depthWrite={false} vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'} fragmentShader={'varying vec2 vUv; void main(){vec2 p=abs((vUv-.5)*vec2(16.,10.))-vec2(5.8,2.8);float d=length(max(p,0.));float a=exp(-d*d*3.)*.45;gl_FragColor=vec4(.025,.027,.02,a);}'}/></mesh>
 </>;
}
