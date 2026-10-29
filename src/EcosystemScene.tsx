import { Suspense,useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { OrbitControls,OrthographicCamera,PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Bloom,EffectComposer,FXAA,SSAO,ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { NoToneMapping,PCFSoftShadowMap } from 'three';
import type { PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import { DisasterParticles } from './scene/HabitatLandscape';
import { ReferenceLandscape } from './scene/ReferenceLandscape';
import { ReferenceForest } from './scene/LayeredForest';
import { MapTyrannosaurus } from './scene/MapTyrannosaurus';
import { DIORAMA } from './world/layout';
import { createOrganicDinosaur,disposeOrganicDinosaur,poseOrganicDinosaur } from './models/SkinnedDinosaurs';
import { advanceEcosystem,ecosystemSummary,setWorldMode,actorAction } from './world/ecosystem';
import type { Actor,Ecosystem } from './world/ecosystem';
import type { WorldMode } from './world/layout';
export type HabitatView='perspective'|'top'|'close';
export type HabitatSummary=ReturnType<typeof ecosystemSummary>&{fps:number;trees:number;quality:string};
function Animal({actor,index,world}:{actor:Actor;index:number;world:Ecosystem}){
 const rig=useMemo(()=>createOrganicDinosaur(actor.species,index),[actor.species,index]);
 const transition=useRef({action:'idle',blend:1,from:rig.bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}))});
 useEffect(()=>()=>disposeOrganicDinosaur(rig),[rig]);
 useFrame((_,dt)=>{
  rig.root.position.set(actor.x,actor.y,actor.z);rig.root.rotation.y=actor.heading;
  const reach=actor.target?Math.hypot(actor.target.lookX-actor.x,actor.target.lookZ-actor.z):1.15,action=actorAction(actor,world.mode),blend=transition.current;
  if(blend.action!==action){blend.action=action;blend.blend=0;rig.bones.forEach((b,i)=>{blend.from[i].p.copy(b.position);blend.from[i].q.copy(b.quaternion);blend.from[i].s.copy(b.scale);});}
  const clock=actor.moving&&actor.altitude===undefined?actor.gaitTime:action==='idle'||actor.altitude!==undefined?actor.age:actor.actionTime;
  poseOrganicDinosaur(rig,clock,actor,actor.scale,actor.drink,world.mode!=='peaceful',reach,action);
  if(blend.blend<1){blend.blend=Math.min(1,blend.blend+(world.paused?0:Math.min(dt,.05))/.24);const t=blend.blend*blend.blend*(3-2*blend.blend);rig.bones.forEach((b,i)=>{b.position.lerpVectors(blend.from[i].p,b.position.clone(),t);b.quaternion.slerpQuaternions(blend.from[i].q,b.quaternion.clone(),t);b.scale.lerpVectors(blend.from[i].s,b.scale.clone(),t);});rig.root.updateMatrixWorld(true);rig.skeleton.update();}
 });
 return <primitive object={rig.root} scale={actor.scale} dispose={null}/>;
}
function TopView({zoom}:{zoom:number}){
 const {size}=useThree(),compare=new URLSearchParams(location.search).has('compare');
 return <OrthographicCamera makeDefault position={[0,80,0]} rotation={[-Math.PI/2,0,0]} up={[0,0,-1]} near={.1} far={200} left={-size.width/2} right={size.width/2} top={size.height/2} bottom={-size.height/2} zoom={Math.min(size.width/DIORAMA.width,size.height/DIORAMA.depth)*(compare?1:.94)*Math.pow(.83,-zoom)}/>;
}
function OrbitView({view,reset,zoom}:{view:HabitatView;reset:number;zoom:number}){
 const camera=useRef<PerspectiveCameraImpl>(null),controls=useRef<OrbitControlsImpl>(null),lastZoom=useRef(zoom),{size}=useThree();
 useEffect(()=>{if(!camera.current)return;const p=view==='close'?[24,24,27]:[48,46,53];camera.current.position.set(p[0],p[1],p[2]);camera.current.position.multiplyScalar(Math.pow(.83,zoom));camera.current.zoom=Math.min(1.35,size.width/size.height*.85);camera.current.updateProjectionMatrix();controls.current?.target.set(0,.4,0);controls.current?.update();lastZoom.current=zoom;},[view,reset,size]);
 useEffect(()=>{const t=controls.current?.target;if(t&&camera.current){camera.current.position.sub(t).multiplyScalar(Math.pow(.83,zoom-lastZoom.current)).add(t);controls.current?.update();}lastZoom.current=zoom;},[zoom]);
 return <><PerspectiveCamera ref={camera} makeDefault fov={42} near={.1} far={220} position={[48,46,53]}/><OrbitControls ref={controls} makeDefault target={[0,.4,0]} enableDamping dampingFactor={.08} enablePan minDistance={12} maxDistance={120} minPolarAngle={.03} maxPolarAngle={Math.PI*.47} rotateSpeed={.55} zoomSpeed={.8}/></>;
}
function Studio({mode}:{mode:WorldMode}){
 const {gl}=useThree();useEffect(()=>{gl.toneMappingExposure=mode==='ice'?1.05:mode==='ember'?1.08:1.15;},[gl,mode]);
 const bg=mode==='ice'?'#8b9fa9':mode==='ember'?'#272a27':'#686e5d';
 return <><color attach="background" args={[bg]}/><fog attach="fog" args={[bg,mode==='peaceful'?150:60,mode==='peaceful'?300:165]}/>
  <ambientLight intensity={mode==='ember'?.65:1.1}/><hemisphereLight args={[mode==='ice'?'#d9eafa':'#f2f0df',mode==='ember'?'#66513b':'#8b8c70',.8]}/>
  <directionalLight position={[-18,35,18]} color={mode==='ice'?'#e4f1ff':mode==='ember'?'#ffc68f':'#fff0d8'} intensity={mode==='ember'?2.8:1.7} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-39} shadow-camera-right={39} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={100} shadow-bias={-.00015} shadow-normalBias={.045}/>
  <directionalLight position={[14,14,-18]} color="#cddce1" intensity={mode==='ember'?.75:.6}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.31,0]} receiveShadow><planeGeometry args={[160,160]}/><meshStandardMaterial color={bg} roughness={.92}/></mesh>
 </>;
}
function Runtime({world,mode,paused,onSummary,onReady,onTier}:{world:Ecosystem;mode:WorldMode;paused:boolean;onSummary:(s:HabitatSummary)=>void;onReady:()=>void;onTier:()=>void}){
 const timer=useRef(0),frames=useRef(0),age=useRef(0),bad=useRef(0),started=useRef(false);
 useFrame((_,dt)=>{
  setWorldMode(world,mode);world.paused=paused;advanceEcosystem(world,dt);timer.current+=dt;frames.current++;age.current+=dt;
  if(!started.current&&frames.current>3){started.current=true;onReady();}
  if(timer.current>1.25){const fps=Math.round(frames.current/timer.current);onSummary({...ecosystemSummary(world),fps,trees:0,quality:'HIGH'});if(age.current>12&&fps<40)bad.current++;else bad.current=0;if(bad.current>3){onTier();bad.current=0;}timer.current=0;frames.current=0;}
 },-100);return null;
}
export default function EcosystemScene({world,mode,paused,view,reset,zoom,onSummary,onReady}:{world:Ecosystem;mode:WorldMode;paused:boolean;view:HabitatView;reset:number;zoom:number;onSummary:(s:HabitatSummary)=>void;onReady:()=>void}){
 const [tier,setTier]=useState(0),[viewport,setViewport]=useState({w:innerWidth,h:innerHeight});
 useEffect(()=>{const fn=()=>setViewport({w:innerWidth,h:innerHeight});addEventListener('resize',fn);return()=>removeEventListener('resize',fn);},[]);
 const dpr=Math.min(devicePixelRatio,Math.sqrt((tier===0?1900000:1000000)/(viewport.w*viewport.h)));
 return <Canvas shadows dpr={dpr} camera={{position:[30,29,34],fov:43,near:.1,far:200}} gl={{antialias:false,powerPreference:'high-performance',toneMapping:NoToneMapping}} onCreated={({gl})=>{gl.shadowMap.type=PCFSoftShadowMap;}}>
  <Suspense fallback={null}>
   <Studio mode={mode}/><ReferenceLandscape mode={mode} time={()=>world.time}/><ReferenceForest mode={mode}/>
   {world.actors.map((actor,index)=>actor.species==='rex'?<MapTyrannosaurus key={actor.id} actor={actor} world={world}/>:<Animal key={actor.id} actor={actor} index={index} world={world}/>)}
   <DisasterParticles mode={mode} time={()=>world.time}/>{view==='top'?<TopView zoom={zoom}/>:<OrbitView view={view} reset={reset} zoom={zoom}/>}
   <Runtime world={world} mode={mode} paused={paused} onReady={onReady} onSummary={s=>onSummary({...s,quality:tier===0?'HIGH':'BALANCED'})} onTier={()=>setTier(1)}/>
   <EffectComposer multisampling={0} enableNormalPass={tier===0} resolutionScale={.5}>
    {tier===0?<SSAO samples={12} rings={3} radius={.22} intensity={1.25} luminanceInfluence={.6} resolutionScale={.5}/>:<></>}
    <Bloom intensity={mode==='ember'?.4:.06} luminanceThreshold={1.4} luminanceSmoothing={.4} mipmapBlur resolutionScale={.5}/>
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><FXAA/>
   </EffectComposer>
  </Suspense>
 </Canvas>;
}
