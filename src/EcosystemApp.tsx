import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,AudioLines,ChevronDown,Compass,Crosshair,Flame,Info,Minus,Mountain,Pause,Play,Plus,RotateCcw,Settings2,Snowflake,Trees,Waves,X} from 'lucide-react';
import {useProgress} from '@react-three/drei';
import EcosystemScene from './EcosystemScene';
import type {HabitatSummary,HabitatView} from './EcosystemScene';
import {createEcosystem,ecosystemSummary,inhabitants,SPECIES_LABELS} from './world/ecosystem';
import {forest} from './world/habitat';
import {DIORAMA} from './world/layout';
import type {Species} from './world/paths';
import {MAP_WIDTH_METRES,MAP_DEPTH_METRES,METRES_PER_UNIT,SIZE_REFERENCE,SIZE_SPECIES_ORDER} from './world/physicalScale';
import {createDisaster,disasterSnapshot,resetDisaster,startDisaster} from './world/disaster';
import type {DisasterKind,DisasterSnapshot} from './world/disaster';
import type {QualityPreference} from './renderPerformance';
import {initialRenderTier,RENDER_BUDGETS} from './renderPerformance';
import './physical-scale.css';
import './performance.css';
import './observation.css';

export default function EcosystemApp(){
 const [quality,setQuality]=useState<QualityPreference>(()=>{try{const value=localStorage.getItem('sauria-quality');return value==='low'||value==='high'?value:'auto';}catch{return 'auto';}});
 const {progress,loaded,total}=useProgress();
 useEffect(()=>{const label=document.getElementById('load-label'),bar=document.getElementById('load-progress') as HTMLProgressElement|null;const value=Math.max(3,Math.min(99,Math.round(progress)));if(label)label.textContent=total?`세계를 불러오는 중 · ${loaded}/${total}`:'세계를 준비하는 중';if(bar)bar.value=value;},[progress,loaded,total]);
 useEffect(()=>{try{localStorage.setItem('sauria-quality',quality);}catch{}},[quality]);
 const compare=new URLSearchParams(location.search).has('compare');
 const world=useMemo(()=>createEcosystem('peaceful'),[]),sequence=useMemo(createDisaster,[]);
 const [disaster,setDisaster]=useState(()=>disasterSnapshot(sequence));
 const [paused,setPaused]=useState(compare),[view,setView]=useState<HabitatView>('top'),[reset,setReset]=useState(0),[zoom,setZoom]=useState(0),[ready,setReady]=useState(false),[notes,setNotes]=useState(false),[animalsOpen,setAnimalsOpen]=useState(false),[settings,setSettings]=useState(false),[followedId,setFollowedId]=useState<string|null>(null),[followZoom,setFollowZoom]=useState(0);
 const settingsButton=useRef<HTMLButtonElement>(null);
 const [summary,setSummary]=useState<HabitatSummary>(()=>({...ecosystemSummary(world),fps:0,trees:forest.length,quality:RENDER_BUDGETS[initialRenderTier(quality)].label}));
 const onReady=useCallback(()=>{setReady(true);const boot=document.getElementById('boot');if(boot){boot.classList.add('done');setTimeout(()=>boot.remove(),650);}},[]);
 const onDisasterUpdate=useCallback((snapshot:DisasterSnapshot)=>{setDisaster(snapshot);if(snapshot.progress>=.98)setFollowedId(null);},[]);
 const selectAnimal=useCallback((id:string)=>{if(sequence.kind&&sequence.elapsed/sequence.duration>=.98)return;if(world.actors.some(a=>a.id===id)){setFollowedId(id);setFollowZoom(0);}},[world,sequence]);
 const findSpecies=(species:Species)=>{const animals=world.actors.filter(a=>a.species===species),index=animals.findIndex(a=>a.id===followedId);selectAnimal(animals[(index+1)%animals.length].id);};
 const closeSettings=useCallback(()=>{setSettings(false);settingsButton.current?.focus();},[]);
 const restartWorld=useCallback(()=>{
  resetDisaster(sequence);Object.assign(world,createEcosystem('peaceful'));setDisaster(disasterSnapshot(sequence));setFollowedId(null);setFollowZoom(0);setPaused(false);setView('top');setZoom(0);setReset(n=>n+1);setSummary(s=>({...s,...ecosystemSummary(world),fps:0}));
 },[sequence,world]);
 const beginDisaster=(kind:DisasterKind)=>{restartWorld();startDisaster(sequence,kind);setDisaster(disasterSnapshot(sequence));closeSettings();};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{
  if(event.code==='Space'&&event.target===document.body){event.preventDefault();setPaused(p=>!p);}
  if(event.key==='Escape'){setNotes(false);setAnimalsOpen(false);setFollowedId(null);if(settings){setSettings(false);settingsButton.current?.focus();}}
 };addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[sequence,settings]);
 const mode=disaster.kind??'peaceful',followed=world.actors.find(a=>a.id===followedId),livingCount=disaster.finished?0:world.actors.length;
 const followingNumber=followed?world.actors.filter(a=>a.species===followed.species).findIndex(a=>a.id===followed.id)+1:0;
 const changeZoom=(amount:number)=>followedId?setFollowZoom(z=>Math.max(-3,Math.min(4,z+amount))):setZoom(z=>Math.max(-3,Math.min(4,z+amount)));
 return <main className={`habitat-app mode-${mode}${ready?' is-ready':''}${compare?' reference-compare':''}${view==='top'&&!followedId?' is-top':''}${followedId?' is-following':''}${disaster.kind?' has-disaster':''}${disaster.finished?' is-extinct':''}`}>
  <div className="habitat-canvas" aria-label="공룡 생태계 3D 디오라마"><EcosystemScene world={world} mode={mode} paused={paused} view={view} reset={reset} zoom={followedId?followZoom:zoom} onSummary={setSummary} onReady={onReady} quality={quality} followedId={followedId} onSelect={selectAnimal} sequence={sequence} disaster={disaster} onDisasterUpdate={onDisasterUpdate}/></div>
  <div className="habitat-shade"/>
  <header className="habitat-header">
   <a href="./" className="habitat-brand" aria-label="SAURIA 홈"><Mountain size={27} strokeWidth={1.2}/><span>SAURIA<small>A LIVING PREHISTORIC WORLD</small></span></a>
   <span className="reserve-label">A WORLD IN MOTION</span>
   <div className="header-actions"><button className="field-notes" onClick={()=>setNotes(true)} aria-label="세계 관찰 기록"><Info size={16}/><span>관찰 기록</span></button><button ref={settingsButton} className="settings-trigger" aria-expanded={settings} aria-controls="world-settings" onClick={()=>setSettings(s=>!s)}><Settings2 size={16}/><span>설정</span></button></div>
  </header>
  <section className="habitat-intro"><p><span className="world-status"/>{disaster.finished?'AFTER THE LAST FOOTSTEP':disaster.kind?'THE WORLD IS CHANGING':'BEFORE THE FALL'}</p><h1>{disaster.finished?<>생명이 사라진<br/><em>고요한 세계.</em></>:<>생명으로 가득한<br/><em>오래된 세계.</em></>}</h1><span className="habitat-caption">공룡을 클릭하면 가까이 따라가며 관찰합니다.</span></section>
  {followed&&<aside className="animal-follow-card" aria-label="선택한 공룡 추적" aria-live="polite"><div><Crosshair size={14}/><span>개체 추적 중</span><button onClick={()=>setFollowedId(null)} aria-label="추적 해제"><X size={17}/></button></div><strong>{SPECIES_LABELS[followed.species]} <small>#{followingNumber}</small></strong><p>{SIZE_REFERENCE[followed.species].measurement==='wingspan'?'날개폭':'몸길이'} {(SIZE_REFERENCE[followed.species].modelLength*followed.scale*METRES_PER_UNIT).toFixed(1)} m · 드래그 회전 · 휠 거리 조절</p><button className="follow-exit" onClick={()=>setFollowedId(null)}>지도 시점으로 돌아가기 <span>Esc</span></button></aside>}
  {disaster.kind&&<section className="disaster-status" aria-label="멸망 진행 상황"><div><span>{mode==='ice'?'빙하 멸망':'화산 멸망'}{paused&&!disaster.finished?' · 일시정지':''}</span><b>{Math.round(disaster.progress*100)}%</b></div><strong role="status">{disaster.phase}</strong><p>{disaster.description}</p><progress aria-label="멸망 진행률" max={1} value={disaster.progress}/>{disaster.finished?<button onClick={restartWorld}><RotateCcw size={12}/>세계 다시 시작</button>:<small>약 {disaster.secondsLeft}초 남음 · 관찰을 위한 가상 연출</small>}</section>}
  <section className={`population-card${animalsOpen?' expanded':''}`} aria-label="공룡 개체 현황">
   <button className="population-heading" onClick={()=>setAnimalsOpen(p=>!p)} aria-expanded={animalsOpen}><span><i/>{livingCount} ANIMALS <b>·</b> {disaster.finished?0:Object.keys(SPECIES_LABELS).length} SPECIES</span><ChevronDown size={14}/></button>
   <div className="species-list">{(Object.keys(SPECIES_LABELS) as Species[]).map(species=><button key={species} disabled={disaster.progress>=.98} aria-label={`${SPECIES_LABELS[species]} 찾아보기`} aria-pressed={followed?.species===species} title="클릭하면 한 마리씩 가까이 따라봅니다" onClick={()=>findSpecies(species)}><span>{SPECIES_LABELS[species]}</span><Crosshair size={11}/><b>{disaster.finished?0:inhabitants.filter(a=>a.species===species).length}</b></button>)}</div>
   <div className="behavior-summary">{disaster.finished?<span>생명의 흔적이 사라졌습니다.</span>:disaster.kind?<span><AudioLines size={13}/>공룡들이 피난처를 찾아 대피합니다.</span>:<><span><Trees size={13}/>{summary.feeding}마리 먹이 활동 · {summary.resting}마리 휴식</span><span><Waves size={13}/>{summary.drinking}마리 물 마시는 중</span></>}</div><a className="studio-open-link" href="dinosaur-report.html">공룡 제작 · 동작 보고서 ↗</a>
   <p className="model-credit">T. rex <a href="https://animalanimator.com/free-3d-animated-t-rex-reference/" target="_blank" rel="noreferrer">AnimalAnimator.com</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · <a href="./models/tyrannosaurus-study/CREDITS.txt" target="_blank" rel="noreferrer">보정본</a> · <a href="./models/realistic-dinosaurs/CREDITS.txt" target="_blank" rel="noreferrer">6종 모델 출처 · CC BY 4.0</a></p>
  </section>
  <aside className="map-size-guide" aria-label="지도와 성체 공룡 크기 기준"><p>맵 가로 {MAP_WIDTH_METRES} m <span>· 성체 대표치</span></p><dl>{(['brachiosaurus','rex','triceratops','velociraptor'] as const).map(species=><div key={species}><dt>{SPECIES_LABELS[species]}</dt><dd>{SIZE_REFERENCE[species].metres} m</dd></div>)}</dl><details className="size-sources"><summary>전체 7종 크기 · 출처</summary><p>화석 기반 성체 추정치를 기준으로 크기를 맞췄습니다. 개체차가 있으며 작은 개체의 상대 비율은 유지합니다.</p><ul>{SIZE_SPECIES_ORDER.map(species=><li key={species}><a href={SIZE_REFERENCE[species].sourceUrl} target="_blank" rel="noreferrer" aria-label={`${SPECIES_LABELS[species]} 크기 출처`}>{SPECIES_LABELS[species]} ↗</a><span>{SIZE_REFERENCE[species].measurement==='wingspan'?'날개폭':'몸길이'} {SIZE_REFERENCE[species].metres} m</span></li>)}</ul></details>{view==='top'&&!followedId&&<div className="map-distance"><span>20 m</span><i style={{width:Math.min(innerWidth/DIORAMA.width,innerHeight/DIORAMA.depth)*.94*Math.pow(.83,-zoom)*20/METRES_PER_UNIT}}/></div>}</aside>
  <div className="habitat-controls-wrap"><p><Compass size={12}/>{followedId?'드래그로 회전 · 휠로 거리 조절 · ESC로 추적 해제':'공룡 클릭: 따라보기 · 드래그 회전 · 휠 확대'}</p><nav className="habitat-controls" aria-label="장면 조작">
   <select className="quality-select" aria-label="화질 설정" value={quality} onChange={event=>setQuality(event.target.value as QualityPreference)}><option value="auto">화질 자동</option><option value="low">절약 모드</option><option value="high">고화질</option></select><i/>
   <button className="play-control" onClick={()=>setPaused(p=>!p)} aria-label={paused?'재생':'정지'}>{paused?<Play size={16} fill="currentColor"/>:<Pause size={16} fill="currentColor"/>}</button><i/>
   {(['perspective','top','close'] as HabitatView[]).map((v,i)=><button key={v} className="view-control" aria-pressed={!followedId&&view===v} onClick={()=>{setFollowedId(null);setView(v);}}>{['전체 보기','위에서 보기','가까이 보기'][i]}</button>)}<i/>
   <button onClick={()=>changeZoom(-1)} aria-label="축소"><Minus size={15}/></button><button onClick={()=>changeZoom(1)} aria-label="확대"><Plus size={15}/></button><button onClick={()=>{setFollowedId(null);setView('perspective');setReset(n=>n+1);setZoom(0);}} aria-label="기본 시점 복원"><RotateCcw size={15}/></button>
  </nav></div>
  <footer className="habitat-footer"><span>SAURIA <i>/</i> THE LIVING DIORAMA</span><span className="habitat-dimensions">{MAP_WIDTH_METRES} × {MAP_DEPTH_METRES.toFixed(1)} m <i>·</i> 숲 {forest.length}그루 <i>·</i> {disaster.finished?'멸망 이후':paused?'시간 정지':'시간이 흐르는 중'}</span><span className="habitat-performance"><b/>{disaster.finished?'AFTERMATH':paused?'PAUSED':`${summary.fps||'—'} FPS`} <i>/</i> {summary.quality}</span></footer>
  {settings&&<><div className="settings-backdrop" onClick={closeSettings}/><section id="world-settings" className="world-settings" role="dialog" aria-label="세계 설정"><div className="settings-heading"><strong>세계 설정</strong><button autoFocus aria-label="설정 닫기" onClick={closeSettings}><X size={18}/></button></div><p>평온한 세계에서 멸망이 진행되는 과정을 관찰합니다.</p><button className="disaster-start ice" onClick={()=>beginDisaster('ice')}><Snowflake size={20}/><span>빙하 멸망<small>눈보라 → 결빙 → 생명 없는 빙하 세계</small></span><ArrowUpRight size={15}/></button><button className="disaster-start ember" onClick={()=>beginDisaster('ember')}><Flame size={20}/><span>화산 멸망<small>섬광 → 화산재와 메테오 → 불탄 세계</small></span><ArrowUpRight size={15}/></button><p className="settings-fine">약 45초 · 재생/정지로 잠시 멈출 수 있습니다.<br/>각 재난은 평온한 세계에서 다시 시작합니다.</p><button className="world-restart" onClick={()=>{restartWorld();closeSettings();}}><RotateCcw size={14}/>세계 다시 시작</button></section></>}
  {notes&&<div className="habitat-modal-backdrop" onClick={()=>setNotes(false)}><article className="habitat-modal" role="dialog" aria-modal="true" aria-label="세계 관찰 기록" onClick={e=>e.stopPropagation()}><button className="notes-close" autoFocus aria-label="닫기" onClick={()=>setNotes(false)}><X size={21}/></button><p className="notes-kicker">SAURIA / FIELD NOTES</p><h2>움직이는 생명.<br/><em>변해가는 세계.</em></h2><p>가로 300m, 세로 약 169m의 디오라마입니다. 공룡을 클릭하거나 왼쪽 종 목록을 누르면 한 개체를 가까이 따라가며 관찰할 수 있습니다. Esc 또는 지도 시점 버튼으로 추적을 해제합니다.</p><dl><div><dt>평온한 세계</dt><dd>배회하고 먹이를 찾다가 물가로 이동해 물을 마십니다.</dd></div><div><dt>빙하 멸망</dt><dd>눈보라와 결빙이 퍼집니다. 대피하던 공룡들이 서서히 사라지고 얼어붙은 풍경이 남습니다.</dd></div><div><dt>화산 멸망</dt><dd>버튼을 누른 1초 뒤 먼 북서쪽의 섬광과 함께 화산재가 밀려옵니다. 하늘이 검어지고 메테오가 계속 떨어집니다.</dd></div></dl><p className="notes-fine">서로 다른 시대와 서식지의 공룡을 함께 배치했습니다. 두 멸망 과정과 압축된 시간은 관찰을 위한 가상의 연출입니다. 작은 개체의 비율과 무리 구성도 연출입니다.</p><div className="notes-actions"><button disabled={disaster.finished} onClick={()=>{setNotes(false);findSpecies('velociraptor');}}>작은 공룡 따라보기 <ArrowUpRight size={14}/></button></div></article></div>}
  <output id="scene-diagnostics" hidden aria-hidden="true">{JSON.stringify({...summary,paused,mode,followedId,disaster})}</output>
 </main>;
}
