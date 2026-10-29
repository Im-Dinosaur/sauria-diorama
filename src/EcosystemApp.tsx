import { useCallback,useEffect,useMemo,useState } from 'react';
import { ArrowUpRight,AudioLines,ChevronDown,Compass,Flame,Info,Leaf,Minus,Mountain,Pause,Play,Plus,RotateCcw,Snowflake,Trees,Waves,X } from 'lucide-react';
import EcosystemScene from './EcosystemScene';
import type { HabitatSummary,HabitatView } from './EcosystemScene';
import { createEcosystem,ecosystemSummary,inhabitants,SPECIES_LABELS } from './world/ecosystem';
import { forest } from './world/habitat';
import { DIORAMA } from './world/layout';
import type { WorldMode } from './world/layout';
import type { Species } from './world/paths';
import { MAP_WIDTH_METRES,MAP_DEPTH_METRES,METRES_PER_UNIT,SIZE_REFERENCE,SIZE_SPECIES_ORDER } from './world/physicalScale';
import './physical-scale.css';
import './performance.css';
import type {QualityPreference} from './renderPerformance';
import {initialRenderTier,RENDER_BUDGETS} from './renderPerformance';
import {useProgress} from '@react-three/drei';
const MODES=[{id:'peaceful',name:'멸망 전 세계',tag:'BEFORE THE FALL',icon:Leaf},{id:'ice',name:'빙하시대',tag:'THE LONG WINTER',icon:Snowflake},{id:'ember',name:'EMBER',tag:'A WORLD ON FIRE',icon:Flame}] as const;
export default function EcosystemApp(){
 const [quality,setQuality]=useState<QualityPreference>(()=>{try{const value=localStorage.getItem('sauria-quality');return value==='low'||value==='high'?value:'auto';}catch{return 'auto';}});
 const {progress,loaded,total}=useProgress();
 useEffect(()=>{const label=document.getElementById('load-label'),bar=document.getElementById('load-progress') as HTMLProgressElement|null;const value=Math.max(3,Math.min(99,Math.round(progress)));if(label)label.textContent=total?`세계를 불러오는 중 · ${loaded}/${total}`:'세계를 준비하는 중';if(bar)bar.value=value;},[progress,loaded,total]);
 useEffect(()=>{try{localStorage.setItem('sauria-quality',quality);}catch{}},[quality]);
 const compare=new URLSearchParams(location.search).has('compare');
 const [mode,setMode]=useState<WorldMode>('peaceful'),[paused,setPaused]=useState(compare),[view,setView]=useState<HabitatView>('top'),[reset,setReset]=useState(0),[zoom,setZoom]=useState(0),[ready,setReady]=useState(false),[notes,setNotes]=useState(false),[animalsOpen,setAnimalsOpen]=useState(false);
 const world=useMemo(()=>createEcosystem('peaceful'),[]),[summary,setSummary]=useState<HabitatSummary>(()=>({...ecosystemSummary(world),fps:0,trees:forest.length,quality:RENDER_BUDGETS[initialRenderTier(quality)].label}));
 const onReady=useCallback(()=>{setReady(true);const boot=document.getElementById('boot');if(boot){boot.classList.add('done');setTimeout(()=>boot.remove(),650);}},[]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.code==='Space'&&event.target===document.body){event.preventDefault();setPaused(p=>!p);}if(event.key==='Escape'){setNotes(false);setAnimalsOpen(false);}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[]);
 const current=MODES.find(m=>m.id===mode)!;
 return <main className={`habitat-app mode-${mode}${ready?' is-ready':''}${compare?' reference-compare':''}${view==='top'?' is-top':''}`}>
  <div className="habitat-canvas" aria-label="공룡 생태계 3D 디오라마"><EcosystemScene world={world} mode={mode} paused={paused} view={view} reset={reset} zoom={zoom} onSummary={setSummary} onReady={onReady} quality={quality}/></div>
  <div className="habitat-shade"/>
  <header className="habitat-header">
   <a href="./" className="habitat-brand" aria-label="SAURIA 홈"><Mountain size={27} strokeWidth={1.2}/><span>SAURIA<small>A LIVING PREHISTORIC WORLD</small></span></a>
   <nav className="world-switch" aria-label="세계 전환">{MODES.map(m=><button key={m.id} aria-pressed={mode===m.id} onClick={()=>setMode(m.id)}><m.icon size={15}/><span>{m.name}</span></button>)}</nav>
   <button className="field-notes" onClick={()=>setNotes(true)} aria-label="세계 관찰 기록"><Info size={16}/><span>관찰 기록</span><ArrowUpRight size={13}/></button>
  </header>
  <section className="habitat-intro" aria-live="polite"><p><span className="world-status"/>{current.tag}</p><h1>{mode==='peaceful'?<>생명으로 가득한<br/><em>오래된 세계.</em></>:mode==='ice'?<>얼어붙는 대지,<br/><em>끝나지 않는 겨울.</em></>:<>붉게 타오르는 섬,<br/><em>생존을 향한 질주.</em></>}</h1><span className="habitat-caption">{mode==='peaceful'?'강과 호수, 숲 사이로 이어지는 공룡들의 하루.':mode==='ice'?'눈보라 속에서 새로운 피난처를 찾아갑니다.':'끓는 강과 화산재를 피해 빠르게 이동합니다.'}</span></section>
  <aside className="habitat-readout"><span>FIELD RESERVE / 001</span><strong>{mode==='peaceful'?'MESOZOIC SANCTUARY':mode==='ice'?'GLACIAL FRONTIER':'EMBER CALDERA'}</strong><p><Waves size={13}/>{mode==='peaceful'?'강과 호수의 생태계':mode==='ice'?'얼어붙은 수면 · 눈보라':'용암 수로 · 화산 분출'}</p></aside>
  <section className={`population-card${animalsOpen?' expanded':''}`} aria-label="공룡 개체 현황">
   <button className="population-heading" onClick={()=>setAnimalsOpen(p=>!p)} aria-expanded={animalsOpen}><span><i/>{summary.total} ANIMALS <b>·</b> {Object.keys(SPECIES_LABELS).length} SPECIES</span><ChevronDown size={14}/></button>
   <div className="species-list">{(Object.keys(SPECIES_LABELS) as Species[]).map(species=><div key={species}><span>{SPECIES_LABELS[species]}</span><b>{inhabitants.filter(a=>a.species===species).length}</b></div>)}</div>
   <div className="behavior-summary">{mode==='peaceful'?<><span><Trees size={13}/>{summary.feeding}마리 먹이 활동 · {summary.resting}마리 휴식</span><span><Waves size={13}/>{summary.drinking}마리 물 마시는 중</span></>:<span><AudioLines size={13}/>일반 공룡 대피 속도 2.8배</span>}</div><a className="studio-open-link" href="dinosaur-report.html">공룡 제작 · 동작 보고서 ↗</a>
   <p className="model-credit">T. rex <a href="https://animalanimator.com/free-3d-animated-t-rex-reference/" target="_blank" rel="noreferrer">AnimalAnimator.com</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · <a href="./models/tyrannosaurus-study/CREDITS.txt" target="_blank" rel="noreferrer">보정본</a> · <a href="./models/realistic-dinosaurs/CREDITS.txt" target="_blank" rel="noreferrer">6종 모델 출처 · CC BY 4.0</a></p>
  </section>
  <aside className="map-size-guide" aria-label="지도와 성체 공룡 크기 기준"><p>맵 가로 {MAP_WIDTH_METRES} m <span>· 성체 대표치</span></p><dl>{(['brachiosaurus','rex','triceratops','velociraptor'] as const).map(species=><div key={species}><dt>{SPECIES_LABELS[species]}</dt><dd>{SIZE_REFERENCE[species].metres} m</dd></div>)}</dl><details className="size-sources"><summary>전체 7종 크기 · 출처</summary><p>화석 기반 성체 추정치를 기준으로 크기를 맞췄습니다. 개체차가 있으며 작은 개체의 상대 비율은 유지합니다.</p><ul>{SIZE_SPECIES_ORDER.map(species=><li key={species}><a href={SIZE_REFERENCE[species].sourceUrl} target="_blank" rel="noreferrer" aria-label={`${SPECIES_LABELS[species]} 크기 출처`}>{SPECIES_LABELS[species]} ↗</a><span>{SIZE_REFERENCE[species].measurement==='wingspan'?'날개폭':'몸길이'} {SIZE_REFERENCE[species].metres} m</span></li>)}</ul></details>{view==='top'&&<div className="map-distance"><span>20 m</span><i style={{width:Math.min(innerWidth/DIORAMA.width,innerHeight/DIORAMA.depth)*.94*Math.pow(.83,-zoom)*20/METRES_PER_UNIT}}/></div>}</aside>
  <div className="habitat-controls-wrap"><p><Compass size={12}/> 드래그로 회전 <span>·</span> 휠로 확대 <span>·</span> SPACE로 재생 / 정지</p><nav className="habitat-controls" aria-label="장면 조작">
   <select className="quality-select" aria-label="화질 설정" value={quality} onChange={event=>setQuality(event.target.value as QualityPreference)}><option value="auto">화질 자동</option><option value="low">절약 모드</option><option value="high">고화질</option></select><i/>
   <button className="play-control" onClick={()=>setPaused(p=>!p)} aria-label={paused?'재생':'정지'}>{paused?<Play size={16} fill="currentColor"/>:<Pause size={16} fill="currentColor"/>}</button><i/>
   {(['perspective','top','close'] as HabitatView[]).map((v,i)=><button key={v} className="view-control" aria-pressed={view===v} onClick={()=>setView(v)}>{['전체 보기','위에서 보기','가까이 보기'][i]}</button>)}<i/>
   <button onClick={()=>setZoom(z=>Math.max(-3,z-1))} aria-label="축소"><Minus size={15}/></button><button onClick={()=>setZoom(z=>Math.min(4,z+1))} aria-label="확대"><Plus size={15}/></button><button onClick={()=>{setView('perspective');setReset(n=>n+1);setZoom(0);}} aria-label="기본 시점 복원"><RotateCcw size={15}/></button>
  </nav></div>
  <footer className="habitat-footer"><span>SAURIA <i>/</i> THE LIVING DIORAMA</span><span className="habitat-dimensions">{MAP_WIDTH_METRES} × {MAP_DEPTH_METRES.toFixed(1)} m <i>·</i> 숲 {forest.length}그루 <i>·</i> {paused?'시간 정지':'시간이 흐르는 중'}</span><span className="habitat-performance"><b/>{paused?'PAUSED':`${summary.fps||'—'} FPS`} <i>/</i> {summary.quality}</span></footer>
  {notes&&<div className="habitat-modal-backdrop" onClick={()=>setNotes(false)}><article className="habitat-modal" role="dialog" aria-modal="true" aria-label="세계 관찰 기록" onClick={e=>e.stopPropagation()}><button className="notes-close" autoFocus aria-label="닫기" onClick={()=>setNotes(false)}><X size={21}/></button><p className="notes-kicker">SAURIA / FIELD NOTES</p><h2>하나의 세계.<br/><em>세 가지 운명.</em></h2><p>첨부 지도의 강·지류·모래톱과 숲 배치를 따르는 가로 300m, 세로 약 169m의 디오라마입니다. 서로 다른 시대와 서식지의 공룡을 한 생태계에 재구성했습니다.</p><dl><div><dt>멸망 전 세계</dt><dd>모든 개체는 일반 공룡입니다. 배회하다 물가로 이동해 잠시 물을 마십니다.</dd></div><div><dt>빙하시대</dt><dd>눈이 쌓인 숲과 얼어붙은 호수. 공룡들은 더 빠르게 피난처를 찾습니다.</dd></div><div><dt>EMBER</dt><dd>강과 호수가 용암으로 변하고 산에서 연기가 솟습니다. 공룡들은 2.8배의 속도로 대피합니다.</dd></div></dl><p className="notes-fine">트리케라톱스와 용각류는 작은 무리로 배치했습니다. 무리 구성과 빙하기·화산 재난은 관찰을 위한 가상의 연출입니다. 벨로시랩터의 협동 사냥은 확정된 행동으로 표현하지 않습니다.</p><div className="notes-actions"><button onClick={()=>{setNotes(false);setView('close');}}>공룡 가까이 관찰하기 <ArrowUpRight size={14}/></button></div></article></div>}
  <output id="scene-diagnostics" hidden aria-hidden="true">{JSON.stringify({...summary,paused,mode})}</output>
 </main>;
}
