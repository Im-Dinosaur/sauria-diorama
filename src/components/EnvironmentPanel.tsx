import { useEffect, useState } from 'react';
import { Leva, useControls } from 'leva';
import { Flame } from 'lucide-react';
import { simulation } from '../config';
import { ENVIRONMENT_LIMITS, eruptionInProgress, setAutomaticEruptions, setEruptionInterval, setEruptionIntensity, setMeteorCount, setLavaFlowSpeed, setBoilingFrequency, setSparkStrength, triggerEruption } from '../world/environmentClock';

export function EnvironmentPanel({open,paused,onPlay}:{open:boolean;paused:boolean;onPlay:()=>void}){
 const [clock,setClock]=useState(()=>({...simulation.environment}));
 const values=useControls('환경 조절',{
  '자동 폭발':true,
  '폭발 간격 (초)':{value:26,min:ENVIRONMENT_LIMITS.interval.min,max:ENVIRONMENT_LIMITS.interval.max,step:1},
  '폭발 강도 (배)':{value:1,min:ENVIRONMENT_LIMITS.intensity.min,max:ENVIRONMENT_LIMITS.intensity.max,step:.1},
  '메테오':true,
  '메테오 개수':{value:3,min:ENVIRONMENT_LIMITS.meteors.min,max:ENVIRONMENT_LIMITS.meteors.max,step:1},
  '용암 흐름 (배)':{value:1,min:ENVIRONMENT_LIMITS.flow.min,max:ENVIRONMENT_LIMITS.flow.max,step:.1},
  '끓는 빈도 (배)':{value:1,min:ENVIRONMENT_LIMITS.boiling.min,max:ENVIRONMENT_LIMITS.boiling.max,step:.1},
  '불똥 강도 (배)':{value:1,min:ENVIRONMENT_LIMITS.sparks.min,max:ENVIRONMENT_LIMITS.sparks.max,step:.1},
  '용암 밝기':{value:1,min:.5,max:1.6,step:.05},
  '화산재':{value:.7,min:0,max:1,step:.05},
  '수면 공룡':true
 });
 useEffect(()=>{
  setEruptionInterval(simulation.environment,values['폭발 간격 (초)']);
  setAutomaticEruptions(simulation.environment,values['자동 폭발']);
  setLavaFlowSpeed(simulation.environment,values['용암 흐름 (배)']);
  setEruptionIntensity(simulation.environment,values['폭발 강도 (배)']);
  setMeteorCount(simulation.environment,values['메테오 개수']);
  setBoilingFrequency(simulation.environment,values['끓는 빈도 (배)']);
  setSparkStrength(simulation.environment,values['불똥 강도 (배)']);
  simulation.heat=values['용암 밝기'];simulation.ash=values['화산재'];simulation.meteors=values['메테오'];simulation.surfaceLife=values['수면 공룡'];
  setClock({...simulation.environment});
 },[values]);
 useEffect(()=>{if(!open)return;setClock({...simulation.environment});const id=setInterval(()=>setClock({...simulation.environment}),250);return()=>clearInterval(id);},[open]);
 const busy=eruptionInProgress(clock),remaining=clock.nextStart===null?null:Math.max(0,Math.ceil(clock.nextStart-clock.time));
 const pendingEffects=busy&&(clock.intensity!==clock.eventIntensity||clock.meteorCount!==clock.eventMeteorCount);
 const status=busy?(clock.age<3.4?'화산 분출 중':'충돌·연기 연출 중'):clock.automatic?`다음 폭발까지 ${remaining}초`:'자동 폭발 꺼짐';
 const start=()=>{if(triggerEruption(simulation.environment)){onPlay();setClock({...simulation.environment});}};
 return <section className={open?'leva-wrap open':'leva-wrap'} aria-label="환경 설정">
  <Leva fill collapsed={false} hidden={!open} titleBar={{title:'WORLD SETTINGS',drag:false,filter:false}} theme={{colors:{elevation1:'#23251f',elevation2:'#2c2e27',elevation3:'#3c3f34',accent1:'#735235',accent2:'#e7a269',accent3:'#f6bc8c',highlight1:'#8b8d7e',highlight2:'#c3c4b7',highlight3:'#f5f0e7'},radii:{lg:'10px'},sizes:{rootWidth:'300px'}}}/>
  <div className="environment-actions">
   <p className="boiling-help">빈도 0배: 새 기포 중지 · 강도는 새 기포부터 적용</p>
   <div className="eruption-status" role="timer" aria-live="off"><span className={busy?'eruption-indicator active':'eruption-indicator'}/>{paused?'일시정지 · ':''}{status}</div>
   <button className="eruption-trigger" disabled={busy} onClick={start}><Flame size={14}/>{busy?'폭발 연출 진행 중':'지금 폭발시키기'}</button>
   <p className="environment-help">{clock.pendingInterval!==null?`이번 연출이 끝나면 ${clock.pendingInterval}초 간격을 적용합니다.`:pendingEffects?`다음 폭발: 강도 ${clock.intensity.toFixed(1)}배 · 메테오 ${clock.meteorCount}개`:paused?'수동 폭발을 시작하면 시뮬레이션이 재생됩니다.':'강도와 메테오 개수는 다음 폭발부터 적용됩니다.'}</p>
  </div>
 </section>;
}
