export type QualityPreference='auto'|'low'|'high';
export type RenderTier=0|1|2;
export const RENDER_BUDGETS={
 0:{label:'HIGH',pixels:1900000,maxDpr:1.75,shadowSize:2048,poseHz:60},
 1:{label:'BALANCED',pixels:800000,maxDpr:1.25,shadowSize:1024,poseHz:30},
 2:{label:'LOW',pixels:450000,maxDpr:1,shadowSize:512,poseHz:20},
} as const;
export function initialRenderTier(preference:QualityPreference):RenderTier{
 if(preference==='high')return 0;
 if(preference==='low')return 2;
 const device=typeof navigator==='undefined'?undefined:navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean;effectiveType?:string}};
 return device?.connection?.saveData||['slow-2g','2g','3g'].includes(device?.connection?.effectiveType??'')||(device?.deviceMemory!==undefined&&device.deviceMemory<=4)?2:1;
}
export function renderDpr(tier:RenderTier,width:number,height:number,pixelRatio:number){
 const budget=RENDER_BUDGETS[tier];
 return Math.min(pixelRatio,budget.maxDpr,Math.sqrt(budget.pixels/Math.max(1,width*height)));
}

/** Stagger expensive skeleton/IK samples, while actor transforms still update every frame. */
export class PoseClock{
 private elapsed=0;private sinceSample=0;private initialized=false;private wasPaused=false;
 constructor(private readonly phase=0){}
 sample(dt:number,hz:number,paused:boolean,eligible=true):number|null{
  if(!this.initialized){this.initialized=true;this.wasPaused=paused;this.elapsed=this.phase/hz;return 0;}
  if(paused){if(this.wasPaused)return null;this.wasPaused=true;return 0;}
  this.wasPaused=false;const step=Math.min(dt,.1);this.elapsed+=step;this.sinceSample+=step;
  if(this.elapsed<1/hz||!eligible)return null;
  const elapsed=this.sinceSample;this.elapsed%=1/hz;this.sinceSample=0;return elapsed;
 }
}
