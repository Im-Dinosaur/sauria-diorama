import { createEnvironmentClock } from './world/environmentClock';
import type { WorldMode } from './world/layout';
export type View = 'default'|'side'|'top';
export const STAGE = Math.min(6,Math.max(1,Number(new URLSearchParams(location.search).get('stage')||6)));
export const CAMERA:Record<View,[number,number,number]>={default:[17,14,21],side:[18.5,5.2,21],top:[0,29,0.01]};
export const TIERS=[{name:'ULTRA',pixels:1900000,shadow:2048},{name:'BALANCED',pixels:1300000,shadow:1024},{name:'ECO',pixels:850000,shadow:512}];
export const simulation={time:0,organicTime:0,mode:'ember' as WorldMode,paused:false,heat:1,ash:0.7,meteors:true,surfaceLife:true,boilingSeed:Math.floor(Math.random()*1000000),environment:createEnvironmentClock()};
export const diagnostics={fps:0,frames:0,tier:0,drawCalls:0,triangles:0,camera:[0,0,0],target:[0,0,0],pixels:0,stage:STAGE,time:0,lavaShaderTime:0,lavaFlowShaderTime:0,riverFlowShaderTime:0,environment:createEnvironmentClock(),impactShaderAges:Array(6).fill(-1) as number[],meteorEffects:[] as {falling:boolean;impact:boolean}[],eruptionJetHeight:0,boiling:{emitted:0,active:0,visibleSparks:0,maxSparkHeight:0,time:0},boilingSites:[] as {x:number;z:number;cycle:number}[],lavaLife:{visible:false,age:0,site:0},materialAudit:{meshes:0,smooth:0,transparentCasters:0,texturedInterior:0},hoverTest:'not-run'};
declare global {interface Window {__EMBER__:typeof diagnostics;}}
window.__EMBER__=diagnostics;
