import { Suspense,useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { OrbitControls,OrthographicCamera,PerspectiveCamera,useTexture } from '@react-three/drei';
import {useWebGLTF as useGLTF} from './useWebGLTF';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Bloom,EffectComposer,FXAA,SSAO,ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ACESFilmicToneMapping,Color,NoToneMapping,PCFSoftShadowMap } from 'three';
import type { AmbientLight,DirectionalLight,Fog,HemisphereLight,MeshStandardMaterial,PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import {DisasterEffects} from './scene/DisasterEffects';
import { ReferenceLandscape } from './scene/ReferenceLandscape';
import { ReferenceForest } from './scene/LayeredForest';
import { MapTyrannosaurus } from './scene/MapTyrannosaurus';
import { DIORAMA } from './world/layout';
import { MapRealisticDinosaur } from './scene/MapRealisticDinosaur';
import { advanceEcosystem,ecosystemSummary,setWorldMode } from './world/ecosystem';
import type { Actor,Ecosystem } from './world/ecosystem';
import type { WorldMode } from './world/layout';
import {publicAsset} from './publicAsset';
import {realisticModel} from './models/RealisticMapRig';
import {TYRANNOSAURUS_MODEL} from './models/TyrannosaurusMapRig';
import {initialRenderTier,renderDpr,RENDER_BUDGETS} from './renderPerformance';
import type {QualityPreference,RenderTier} from './renderPerformance';
import {AnimalPicking,ObservationCamera} from './scene/AnimalObservation';
import type {ObservationSubjects} from './scene/observationMath';
import {AnimalPresence} from './scene/AnimalPresence';
import {advanceDisaster,animalPresence,disasterAppearance,disasterWaterAppearance,disasterProgress,disasterSnapshot,disasterWorldMode,distantFlash} from './world/disaster';
import type {DisasterSequence,DisasterSnapshot} from './world/disaster';
// Start the independent requests together instead of waiting for suspended siblings.
useGLTF.preload(publicAsset(TYRANNOSAURUS_MODEL));
for(const species of ['brachiosaurus','triceratops','stegosaurus','spinosaurus','velociraptor','pterosaur'] as const)useGLTF.preload(publicAsset(realisticModel(species)));
useTexture.preload(publicAsset('/textures/reference-valley-web.webp'));
export type HabitatView='perspective'|'top'|'close';
export type HabitatSummary=ReturnType<typeof ecosystemSummary>&{fps:number;trees:number;quality:string};
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
function Studio({mode,tier,sequence}:{mode:WorldMode;tier:RenderTier;sequence:DisasterSequence}){
 const {gl}=useThree(),background=useRef<Color>(null),fog=useRef<Fog>(null),ambient=useRef<AmbientLight>(null),sun=useRef<DirectionalLight>(null),sky=useRef<HemisphereLight>(null),floor=useRef<MeshStandardMaterial>(null);
 const colours=useMemo(()=>({base:new Color('#686e5d'),ice:new Color('#8b9fa9'),ember:new Color('#08090b'),flash:new Color('#fff0ca'),sun:new Color('#fff0d8'),coldSun:new Color('#e4f1ff'),hotSun:new Color('#b5a79a'),sky:new Color('#f2f0df'),coldSky:new Color('#d9eafa'),hotSky:new Color('#67676b')}),[]);
 useEffect(()=>{gl.toneMapping=tier===0?NoToneMapping:ACESFilmicToneMapping;},[gl,tier]);
 useFrame(()=>{
  const p=disasterAppearance(sequence),ice=mode==='ice',target=ice?colours.ice:colours.ember;
  background.current?.copy(colours.base).lerp(target,p).lerp(colours.flash,distantFlash(sequence)*.88);
  if(fog.current){fog.current.color.copy(colours.base).lerp(target,p);fog.current.near=150-100*p;fog.current.far=300-160*p;}
  if(ambient.current)ambient.current.intensity=1.1-(ice?.12:.62)*p;
  sun.current?.color.copy(colours.sun).lerp(ice?colours.coldSun:colours.hotSun,p);if(sun.current)sun.current.intensity=1.7+(ice?-.25:.8)*p;
  sky.current?.color.copy(colours.sky).lerp(ice?colours.coldSky:colours.hotSky,p);if(sky.current)sky.current.intensity=.8-.25*p;
  floor.current?.color.copy(colours.base).lerp(target,p);gl.toneMappingExposure=1.15-(ice?.1:.07)*p;
 });
 return <><color ref={background} attach="background" args={['#686e5d']}/><fog ref={fog} attach="fog" args={['#686e5d',150,300]}/>
  <ambientLight ref={ambient} intensity={1.1}/><hemisphereLight ref={sky} args={['#f2f0df','#8b8c70',.8]}/>
  <directionalLight ref={sun} position={[-18,35,18]} color="#fff0d8" intensity={1.7} castShadow shadow-mapSize={[RENDER_BUDGETS[tier].shadowSize,RENDER_BUDGETS[tier].shadowSize]} shadow-camera-left={-39} shadow-camera-right={39} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={100} shadow-bias={-.00015} shadow-normalBias={.045}/>
  <directionalLight position={[14,14,-18]} color="#cddce1" intensity={.6}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.31,0]} receiveShadow><planeGeometry args={[160,160]}/><meshStandardMaterial ref={floor} color="#686e5d" roughness={.92}/></mesh>
 </>;
}
function Runtime({world,sequence,visualTime,paused,onDisasterUpdate,onSummary,onReady,onTier}:{world:Ecosystem;sequence:DisasterSequence;visualTime:{current:number};paused:boolean;onDisasterUpdate:(s:DisasterSnapshot)=>void;onSummary:(s:HabitatSummary)=>void;onReady:()=>void;onTier:()=>void}){
 const timer=useRef(0),disasterTimer=useRef(0),reportedFinished=useRef(false),frames=useRef(0),age=useRef(0),bad=useRef(0),started=useRef(false);
 useFrame((_,dt)=>{
  advanceDisaster(sequence,dt,paused);if(!paused)visualTime.current+=Math.min(dt,.25);const finished=disasterProgress(sequence)>=1;
  setWorldMode(world,disasterWorldMode(sequence));world.paused=paused||finished;advanceEcosystem(world,dt);timer.current+=dt;disasterTimer.current+=dt;frames.current++;age.current+=dt;
  if(sequence.kind&&(!finished&&disasterTimer.current>.25||finished!==reportedFinished.current)){onDisasterUpdate(disasterSnapshot(sequence));disasterTimer.current=0;}reportedFinished.current=finished;
  if(!started.current){started.current=true;onReady();}
  if(timer.current>1.25){const fps=Math.round(frames.current/timer.current);onSummary({...ecosystemSummary(world),fps,trees:0,quality:'HIGH'});if(age.current>4&&!paused&&document.visibilityState!=='hidden'&&fps<28)bad.current++;else bad.current=0;if(bad.current>=2){onTier();bad.current=0;}timer.current=0;frames.current=0;}
 },-100);return null;
}
export default function EcosystemScene({world,mode,paused,view,reset,zoom,onSummary,onReady,quality,followedId,onSelect,sequence,disaster,onDisasterUpdate}:{world:Ecosystem;mode:WorldMode;paused:boolean;view:HabitatView;reset:number;zoom:number;onSummary:(s:HabitatSummary)=>void;onReady:()=>void;quality:QualityPreference;followedId:string|null;onSelect:(id:string)=>void;sequence:DisasterSequence;disaster:DisasterSnapshot;onDisasterUpdate:(s:DisasterSnapshot)=>void}){
 const subjects=useMemo<ObservationSubjects>(()=>new Map(),[]),visualTime=useRef(0);
 const [tier,setTier]=useState<RenderTier>(()=>initialRenderTier(quality)),[viewport,setViewport]=useState({w:innerWidth,h:innerHeight});
 useEffect(()=>{const fn=()=>setViewport({w:innerWidth,h:innerHeight});addEventListener('resize',fn);return()=>removeEventListener('resize',fn);},[]);
 useEffect(()=>setTier(initialRenderTier(quality)),[quality]);
 useEffect(()=>onSummary({...ecosystemSummary(world),fps:0,trees:0,quality:RENDER_BUDGETS[tier].label}),[tier,world,onSummary]);
 const dpr=renderDpr(tier,viewport.w,viewport.h,devicePixelRatio),budget=RENDER_BUDGETS[tier];
 return <Canvas shadows frameloop={paused?'demand':'always'} dpr={dpr} camera={{position:[30,29,34],fov:43,near:.1,far:200}} gl={{antialias:false,powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping}} onCreated={({gl})=>{gl.shadowMap.type=PCFSoftShadowMap;}}>
  <Suspense fallback={null}>
   <Studio mode={mode} tier={tier} sequence={sequence}/><ReferenceLandscape mode={mode} time={()=>visualTime.current} transition={()=>disasterAppearance(sequence)} waterTransition={()=>disasterWaterAppearance(sequence)}/><ReferenceForest mode={mode} tier={tier} transition={()=>disasterAppearance(sequence)}/>
   <AnimalPresence sequence={sequence}>{world.actors.map(actor=>actor.species==='rex'?<MapTyrannosaurus key={actor.id} actor={actor} world={world} subjects={subjects} poseHz={actor.id===followedId?Math.max(30,budget.poseHz):budget.poseHz}/>:<MapRealisticDinosaur key={actor.id} actor={actor} world={world} subjects={subjects} poseHz={actor.id===followedId?Math.max(30,budget.poseHz):budget.poseHz}/>)}</AnimalPresence>
   <AnimalPicking subjects={subjects} onSelect={onSelect} enabled={animalPresence(sequence)>.05}/>
   <DisasterEffects sequence={sequence} time={()=>visualTime.current} tier={tier}/>{followedId?<ObservationCamera key={followedId} id={followedId} subjects={subjects} zoom={zoom}/>:view==='top'?<TopView zoom={zoom}/>:<OrbitView view={view} reset={reset} zoom={zoom}/>}
   <Runtime world={world} sequence={sequence} visualTime={visualTime} paused={paused} onDisasterUpdate={onDisasterUpdate} onReady={onReady} onSummary={s=>onSummary({...s,quality:budget.label})} onTier={()=>{if(quality==='auto')setTier(2);}}/>
   {tier===0&&<EffectComposer multisampling={0} enableNormalPass={tier===0} resolutionScale={.5}>
    {tier===0?<SSAO samples={12} rings={3} radius={.22} intensity={1.25} luminanceInfluence={.6} resolutionScale={.5}/>:<></>}
    <Bloom intensity={mode==='ember'?.4:.06} luminanceThreshold={1.4} luminanceSmoothing={.4} mipmapBlur resolutionScale={.5}/>
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><FXAA/>
   </EffectComposer>}
  </Suspense>
 </Canvas>;
}
