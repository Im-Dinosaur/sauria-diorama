import { useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { ContactShadows,OrbitControls } from '@react-three/drei';
import { ACESFilmicToneMapping,SkeletonHelper } from 'three';
import { ArrowLeft,Download,Pause,Play,RotateCcw } from 'lucide-react';
import { createOrganicDinosaur,disposeOrganicDinosaur,poseDinosaurAction,speciesActions,ACTION_DURATIONS } from './models/SkinnedDinosaurs';
import type { DinosaurAction } from './models/SkinnedDinosaurs';
import { downloadDinosaur } from './models/exportDinosaur';
import { TEXTURE_SIZE } from './models/DinosaurSkin';
import { speciesNames } from './world/paths';
import type { Species } from './world/paths';
import { ACTION_LABELS,SPECIES_PROFILES } from './world/dinosaurProfiles';
import { DESIGN_REFERENCES } from './world/dinosaurDesignReferences';
import './dinosaur-studio.css';

function CameraRig({species,reset}:{species:Species;reset:number}){const {camera}=useThree();useEffect(()=>{camera.position.set(species==='brachiosaurus'?5.6:4.2,species==='brachiosaurus'?3.3:1.9,species==='brachiosaurus'?5.6:4.1);camera.updateProjectionMatrix();},[camera,species,reset]);return null;}
function Preview({species,action,paused,speed,bones,wire,skin,clock,onTime,onStats}:{species:Species;action:DinosaurAction;paused:boolean;speed:number;bones:boolean;wire:boolean;skin:boolean;clock:{current:number};onTime:(v:number)=>void;onStats:(s:{triangles:number;bones:number})=>void}){
 const rig=useMemo(()=>createOrganicDinosaur(species),[species]),helper=useMemo(()=>new SkeletonHelper(rig.root),[rig]),last=useRef(0);
 useEffect(()=>{onStats({triangles:rig.mesh.geometry.index!.count/3,bones:rig.bones.length});return()=>{helper.dispose();disposeOrganicDinosaur(rig);};},[rig,helper,onStats]);
 useEffect(()=>{rig.root.position.y=species==='pterosaur'?1.1:0;},[rig,species]);
 useEffect(()=>{for(const m of Object.values(rig.materials)){m.wireframe=wire;m.needsUpdate=true;}const m=rig.materials.skin;m.map=skin?rig.materials.membrane.map:null;m.normalMap=skin?rig.materials.membrane.normalMap:null;m.roughnessMap=skin?rig.materials.membrane.roughnessMap:null;m.needsUpdate=true;helper.visible=bones;},[rig,helper,bones,wire,skin]);
 useFrame((_,dt)=>{if(!paused)clock.current=(clock.current+Math.min(dt,.05)*speed)%ACTION_DURATIONS[action];poseDinosaurAction(rig,clock.current,action);last.current+=dt;if(last.current>.1){onTime(clock.current);last.current=0;}});
 return <><primitive object={rig.root} dispose={null}/><primitive object={helper}/></>;
}
export default function DinosaurStudio(){
 const query=new URLSearchParams(location.search).get('studio'),initial=query&&query in speciesNames?query as Species:'rex';
 const [species,setSpecies]=useState<Species>(initial),[action,setAction]=useState<DinosaurAction>(initial==='pterosaur'?'fly':'idle'),[paused,setPaused]=useState(false),[speed,setSpeed]=useState(1),[bones,setBones]=useState(false),[wire,setWire]=useState(false),[skin,setSkin]=useState(true),[time,setTime]=useState(0),[stats,setStats]=useState({triangles:0,bones:0}),[exporting,setExporting]=useState(false),[error,setError]=useState(''),[reset,setReset]=useState(0);
 const clock=useRef(0),profile=SPECIES_PROFILES[species],tall=species==='brachiosaurus',centerY=tall?1.45:.85;
 useEffect(()=>{document.getElementById('boot')?.remove();document.title='SAURIA · 공룡 모델 검수';},[]);
 const selectSpecies=(next:Species)=>{setSpecies(next);setAction(next==='pterosaur'?'fly':'idle');clock.current=0;setTime(0);setReset(n=>n+1);history.replaceState(null,'',`?studio=${next}`);};
 return <main className="dino-studio">
  <header className="studio-header"><a href="./"><ArrowLeft size={16}/>디오라마로 돌아가기</a><span>SAURIA <b>/</b> SPECIMEN STUDIO</span><button disabled={exporting} onClick={async()=>{setExporting(true);setError('');try{await downloadDinosaur(species);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setExporting(false);}}}><Download size={15}/>{exporting?'내보내는 중…':'GLB 다운로드'}</button></header>
  <section className="studio-viewport" aria-label="회전하고 확대할 수 있는 공룡 3D 모델">
   <Canvas shadows dpr={[1,1.5]} camera={{position:[4.2,tall?2.7:1.9,4.1],fov:37}} gl={{antialias:true,toneMapping:ACESFilmicToneMapping}}>
    <color attach="background" args={['#202a28']}/><hemisphereLight args={['#d8e8dd','#6a6553',2.1]}/><directionalLight position={[3,6,5]} intensity={3.2} color="#fff0d8" castShadow shadow-mapSize={[2048,2048]}/><directionalLight position={[-4,3,-3]} intensity={2.4} color="#a4c4d7"/>
    <Preview species={species} action={action} paused={paused} speed={speed} bones={bones} wire={wire} skin={skin} clock={clock} onTime={setTime} onStats={setStats}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.018,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color="#323c36" roughness={.9}/></mesh>
    <gridHelper args={[10,20,'#687261','#465148']} position={[0,-.012,0]}/><ContactShadows position={[0,-.01,0]} opacity={.35} scale={12} blur={2} far={5}/>
    <CameraRig species={species} reset={reset}/><OrbitControls key={`${species}-${reset}`} target={[0,centerY,-.15]} minDistance={2} maxDistance={12} maxPolarAngle={Math.PI*.51} enablePan/>
   </Canvas>
   <div className="studio-title"><p>SPECIMEN {String(Object.keys(speciesNames).indexOf(species)+1).padStart(2,'0')} / 07</p><h1>{speciesNames[species]}</h1><em>{profile.latin}</em></div>
   <div className="studio-stats"><span>{stats.triangles.toLocaleString()} TRIANGLES</span><span>{stats.bones} BONES</span><span>{TEXTURE_SIZE}² PBR MAPS</span></div>
   <button className="studio-reset" aria-label="모델 시점 초기화" onClick={()=>setReset(n=>n+1)}><RotateCcw size={16}/></button>
  </section>
  <aside className="studio-panel">
   <p className="studio-kicker">공룡 선택</p><div className="studio-species">{(Object.keys(speciesNames) as Species[]).map(s=><button key={s} aria-pressed={species===s} onClick={()=>selectSpecies(s)}>{speciesNames[s]}</button>)}</div>
   <p className="studio-kicker">생활 동작</p><div className="studio-actions">{speciesActions(species).map(a=><button key={a} aria-pressed={action===a} onClick={()=>{setAction(a);clock.current=0;setTime(0);}}>{ACTION_LABELS[a]}</button>)}</div>
   <div className="studio-playback"><button aria-label={paused?'애니메이션 재생':'애니메이션 정지'} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><select aria-label="재생 속도" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.25}>0.25×</option><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select><span>{time.toFixed(2)} / {ACTION_DURATIONS[action].toFixed(2)}s</span></div>
   <input aria-label="애니메이션 타임라인" type="range" min={0} max={ACTION_DURATIONS[action]} step={.01} value={time} onChange={e=>{clock.current=Number(e.target.value);setTime(clock.current);setPaused(true);}}/>
   <div className="studio-checks"><label><input type="checkbox" checked={bones} onChange={e=>setBones(e.target.checked)}/>뼈대 표시</label><label><input type="checkbox" checked={wire} onChange={e=>setWire(e.target.checked)}/>와이어프레임</label><label><input type="checkbox" checked={skin} onChange={e=>setSkin(e.target.checked)}/>피부 PBR</label></div>
   <article className="studio-research"><p className="studio-kicker">외형·피부 참고 자료</p><p>{DESIGN_REFERENCES[species].changes}</p><p>{DESIGN_REFERENCES[species].texture}</p>{DESIGN_REFERENCES[species].sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}<p className="studio-kicker" style={{marginTop:25}}>생활사 · {profile.diet}</p><p>{profile.facts}</p><p>{profile.interpretation}</p>{profile.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</article>
   <p className="studio-fine">실시간 디오라마용 절차적 복원 1차본입니다. 피부색·세부 동작·발성 자세는 제작상 추정이며, 포효 음원은 포함하지 않습니다. GLB에는 스키닝·PBR 맵·종별 동작 클립이 포함됩니다.</p>{error&&<p role="alert">내보내기 오류: {error}</p>}
  </aside>
 </main>;
}
