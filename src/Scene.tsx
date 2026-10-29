import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { PCFSoftShadowMap } from 'three';
import { CAMERA, diagnostics, simulation, STAGE, TIERS } from './config';
import type { View } from './config';
import { Studio } from './scene/Studio';
import { Block } from './scene/Block';
import { Lava } from './scene/Lava';
import { Island } from './scene/Island';
import { Life } from './scene/Life';
import { LavaLife } from './scene/LavaLife';
import { Props } from './scene/Props';
import { Weather } from './scene/Weather';
import { PostEffects } from './scene/PostEffects';
import { SceneAudit } from './scene/SceneAudit';
import { creaturePath } from './world/paths';
import type { Species } from './world/paths';
import { advanceEnvironmentClock } from './world/environmentClock';
function CameraRig({view,reset}:{view:View;reset:number}){
 const ref=useRef<OrbitControlsImpl>(null);const {camera,size}=useThree();
 useEffect(()=>{camera.zoom=Math.min(1,size.width/size.height*1.04);camera.updateProjectionMatrix();},[camera,size]);
 useEffect(()=>{
  camera.position.set(...CAMERA[view]);ref.current?.target.set(0,.25,0);
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa')){
   const specimen=new URLSearchParams(location.search).get('specimen');
   if(specimen==='lava'){
    const positions:Record<View,[number,number,number]>={default:[5.8,3.7,4.2],side:[5.8,1.0,4.2],top:[3,6,.01]};
    camera.position.set(...positions[view]);ref.current?.target.set(3,.116,0);
    if(new URLSearchParams(location.search).has('reflection'))camera.position.set(5,4.116,-5/3);
   }
   if(['rex','triceratops','pterosaur'].includes(specimen??'')){
    const p=creaturePath(specimen as Species,20),f=specimen==='pterosaur'?1.3:1,h=specimen==='rex'?.75:specimen==='triceratops'?.55:0,side=specimen==='triceratops'?-2.8:2.8;
    camera.position.set(p.x+(side*Math.cos(p.heading)+3*Math.sin(p.heading))*f,p.y+(specimen==='pterosaur'?3:1.7)*f,p.z+(-side*Math.sin(p.heading)+3*Math.cos(p.heading))*f);ref.current?.target.set(p.x,p.y+h,p.z);
   }
  }
  ref.current?.update();
 },[view,reset,camera]);
 useFrame(()=>{diagnostics.camera=camera.position.toArray();if(ref.current)diagnostics.target=ref.current.target.toArray();});
 return <OrbitControls ref={ref} makeDefault enableDamping={false} enablePan={false} enableZoom={false} autoRotate={false} rotateSpeed={.5} minPolarAngle={.015} maxPolarAngle={Math.PI*.47} target={[0,.25,0]}/>;
}
function Runtime({onReady,onTier}:{onReady:()=>void;onTier:(n:number)=>void}){
 const {gl}=useThree();const tier=useRef(0),age=useRef(0),count=useRef(0),elapsed=useRef(0),bad=useRef(0),didReady=useRef(false);
 useFrame((_,dt)=>{
  age.current+=dt;count.current++;elapsed.current+=dt;
  diagnostics.frames++;
  diagnostics.pixels=gl.domElement.width*gl.domElement.height;
  diagnostics.drawCalls=gl.info.render.calls;diagnostics.triangles=gl.info.render.triangles;gl.info.reset();
  const step=Math.min(dt,.05);
  if(!simulation.paused)simulation.time+=step;
  advanceEnvironmentClock(simulation.environment,step,simulation.paused);
  diagnostics.time=simulation.time;Object.assign(diagnostics.environment,simulation.environment);
  if(count.current===3&&!didReady.current){didReady.current=true;onReady();}
  if(elapsed.current>2){
   const fps=count.current/elapsed.current;diagnostics.fps=Math.round(fps);
   if(age.current>10&&fps<52)bad.current++;else bad.current=0;
   if(bad.current>=3&&tier.current<2){tier.current++;onTier(tier.current);diagnostics.tier=tier.current;bad.current=0;}
   count.current=0;elapsed.current=0;
  }
 },-100);
 return null;
}
export default function Scene({view,reset,onReady}:{view:View;reset:number;onReady:()=>void}){
 const [tier,setTier]=useState(0),[viewport,setViewport]=useState({width:innerWidth,height:innerHeight});
 useEffect(()=>{const surface=document.querySelector('.scene')!;const observer=new ResizeObserver(([entry])=>setViewport({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(surface);return()=>observer.disconnect();},[]);
 const dpr=Math.min(devicePixelRatio,Math.sqrt(TIERS[tier].pixels/Math.max(1,viewport.width*viewport.height)));
 return <Canvas shadows camera={{position:CAMERA.default,fov:38,near:.1,far:120}} dpr={dpr} gl={{antialias:false,powerPreference:'high-performance',alpha:false}} onCreated={({gl})=>{gl.shadowMap.type=PCFSoftShadowMap;gl.toneMappingExposure=1.05;gl.info.autoReset=false;}}>
 <Suspense fallback={null}><Studio tier={tier}/><Block/>{STAGE>=2&&<Lava/>}{STAGE>=3&&<Island/>}{STAGE>=4&&<><Props/><Life/><LavaLife/></>}{STAGE>=5&&<Weather/>}<CameraRig view={view} reset={reset}/><Runtime onReady={onReady} onTier={setTier}/>{STAGE>=6&&<PostEffects tier={tier}/>}<SceneAudit/></Suspense>
 </Canvas>;
}
