import { Suspense,useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { Environment,Lightformer,OrbitControls,useGLTF } from '@react-three/drei';
import { ACESFilmicToneMapping,AnimationMixer,Mesh,MeshNormalMaterial,MeshStandardMaterial,SkeletonHelper,SkinnedMesh } from 'three';
import { ArrowLeft,Download,Pause,Play,RotateCcw } from 'lucide-react';
import './tyrannosaurus-study.css';

type View='threequarter'|'side'|'front'|'head';type Layer='skin'|'clay'|'normal';
const FILE='/models/tyrannosaurus-study/tyrannosaurus-reference-study.glb';
const REFERENCE='https://www.amnh.org/explore/news-blogs/t-rex-size-evolution';
const ACTIONS=[['reference','외형 확인 자세',8],['01_Idle','대기 · 호흡',8],['02_Walk','걷기',3],['03_Run','빠른 이동',1.2],['04_Attack','턱 벌리기 · 위협',4]] as const;
function Camera({view,reset}:{view:View;reset:number}){
 const {camera}=useThree();useEffect(()=>{const positions:Record<View,[number,number,number]>={threequarter:[4.2,1.9,4.8],side:[6.1,1.5,-.4],front:[0,1.6,6.5],head:[1.7,1.6,3.0]};camera.position.set(...positions[view]);camera.updateProjectionMatrix();},[camera,view,reset]);
 return <OrbitControls key={`${view}-${reset}`} makeDefault target={view==='head'?[-.1,1.23,1.02]:[0,.88,-.4]} enablePan minDistance={view==='head'?.65:2} maxDistance={12} maxPolarAngle={Math.PI*.51} enableDamping dampingFactor={.08}/>;
}
function Specimen({action,paused,speed,layer,wire,bones,clock,onTime,onStats}:{action:string;paused:boolean;speed:number;layer:Layer;wire:boolean;bones:boolean;clock:{current:number};onTime:(t:number)=>void;onStats:(v:{triangles:number;bones:number;meshes:number})=>void}){
 const gltf=useGLTF(FILE),mixer=useMemo(()=>new AnimationMixer(gltf.scene),[gltf.scene]),helper=useMemo(()=>new SkeletonHelper(gltf.scene),[gltf.scene]),last=useRef(0);
 const originals=useMemo(()=>{const map=new Map<Mesh,MeshStandardMaterial|MeshStandardMaterial[]>();gltf.scene.traverse(o=>{if(o instanceof Mesh){map.set(o,o.material as MeshStandardMaterial);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});return map;},[gltf.scene]);
 const clay=useMemo(()=>new MeshStandardMaterial({color:'#918b80',roughness:.76}),[]),normal=useMemo(()=>new MeshNormalMaterial(),[]);
 useEffect(()=>{let triangles=0,boneCount=0,meshes=0;gltf.scene.traverse(o=>{if(o instanceof Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;}if(o instanceof SkinnedMesh)boneCount=Math.max(boneCount,o.skeleton.bones.length);});onStats({triangles,bones:boneCount,meshes});return()=>{mixer.stopAllAction();helper.dispose();clay.dispose();normal.dispose();};},[gltf.scene,mixer,helper,clay,normal,onStats]);
 useEffect(()=>{mixer.stopAllAction();const clip=gltf.animations.find(c=>c.name===action);if(clip)mixer.clipAction(clip).reset().play();clock.current=0;mixer.setTime(0);},[action,mixer,gltf.animations,clock]);
 useEffect(()=>{originals.forEach((original,mesh)=>{mesh.material=layer==='clay'?clay:layer==='normal'?normal:original;for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if('wireframe'in mat)mat.wireframe=wire;mat.needsUpdate=true;}});helper.visible=bones;},[originals,clay,normal,layer,wire,bones,helper]);
 useFrame((_,dt)=>{const duration=gltf.animations.find(c=>c.name===action)?.duration??6;if(!paused)clock.current=(clock.current+Math.min(dt,.05)*speed)%duration;mixer.setTime(clock.current);last.current+=dt;if(last.current>.1){last.current=0;onTime(clock.current);}});
 return <><primitive object={gltf.scene} dispose={null}/><primitive object={helper}/></>;
}
export default function TyrannosaurusStudy(){
 const [view,setView]=useState<View>('threequarter'),[layer,setLayer]=useState<Layer>('skin'),[wire,setWire]=useState(false),[bones,setBones]=useState(false),[paused,setPaused]=useState(true),[action,setAction]=useState('reference'),[speed,setSpeed]=useState(1),[reset,setReset]=useState(0),[time,setTime]=useState(0),[stats,setStats]=useState({triangles:0,bones:0,meshes:0}),clock=useRef(0);
 useEffect(()=>{document.getElementById('boot')?.remove();document.title='Tyrannosaurus rex · 단일 모델 검수';},[]);
 const duration=ACTIONS.find(([id])=>id===action)?.[2]??8;
 return <main className="trex-study">
  <header><a href="/dinosaur-report.html?revision=2"><ArrowLeft size={15}/>제작 기록</a><span>TYRANNOSAURUS REX <b>/</b> ANATOMY STUDY</span><a className="trex-download" href={FILE} download><Download size={15}/>GLB 모델 받기</a></header>
  <section className="trex-stage" aria-label="티라노사우루스 단일 3D 모델 검수">
   <Canvas shadows dpr={[1,1.75]} camera={{position:[4.2,1.9,4.8],fov:35,near:.01,far:100}} gl={{antialias:true,toneMapping:ACESFilmicToneMapping,toneMappingExposure:.95}}>
    <color attach="background" args={['#292b2a']}/><fog attach="fog" args={['#292b2a',18,40]}/>
    <hemisphereLight args={['#e1e4df','#6b6256',.65]}/><directionalLight position={[3.5,5,4]} intensity={2.2} color="#fff3df" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-normalBias={.004}/><directionalLight position={[-3,2,-3]} intensity={1.3} color="#b7cedb"/>
    <Environment resolution={128}><Lightformer form="rect" position={[0,4,1]} rotation={[Math.PI/2,0,0]} scale={[5,5,1]} intensity={2}/><Lightformer form="rect" position={[-4,2,1]} rotation={[0,Math.PI/2,0]} scale={[3,4,1]} intensity={1.2}/></Environment>
    <Suspense fallback={null}><Specimen action={action} paused={paused} speed={speed} layer={layer} wire={wire} bones={bones} clock={clock} onTime={setTime} onStats={setStats}/></Suspense>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.012,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color="#3b3c38" roughness={.92}/></mesh><Camera view={view} reset={reset}/>
   </Canvas>
   <div className="trex-caption"><span>ADULT SPECIMEN / 01</span><h1>Tyrannosaurus rex</h1><p>AMNH 성체 복원을 시각 기준으로 삼은<br/>티라노사우루스 참조 보정본</p></div>
   <div className="trex-metrics"><span>{stats.triangles.toLocaleString()} TRIANGLES</span><span>{stats.bones} BONES</span><span>4K COLOR / 2–4K NORMAL</span></div>
   <button className="trex-reset" title="시점 초기화" onClick={()=>setReset(n=>n+1)}><RotateCcw size={16}/></button>
  </section>
  <aside>
   <p className="trex-kicker">FORM / 형태 확인</p><div className="trex-options">{([['threequarter','전체 ¾'],['side','정측면'],['front','정면'],['head','머리 확대']] as const).map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
   <p className="trex-kicker">SURFACE / 표면 확인</p><div className="trex-options">{([['skin','피부 재질'],['clay','무채색 조형'],['normal','표면 법선']] as const).map(([id,label])=><button key={id} aria-pressed={layer===id} onClick={()=>setLayer(id)}>{label}</button>)}</div>
   <div className="trex-checks"><label><input type="checkbox" checked={wire} onChange={e=>setWire(e.target.checked)}/>와이어프레임</label><label><input type="checkbox" checked={bones} onChange={e=>setBones(e.target.checked)}/>뼈대</label></div>
   <p className="trex-kicker">POSE / 자세·애니메이션</p><div className="trex-options">{ACTIONS.map(([id,label])=><button key={id} aria-pressed={action===id} onClick={()=>{setAction(id);setTime(0);}}>{label}</button>)}</div>
   <div className="trex-playback"><button aria-label={paused?'애니메이션 재생':'애니메이션 정지'} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><select aria-label="재생 속도" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.25,.5,1,2].map(v=><option key={v} value={v}>{v}×</option>)}</select><span>{time.toFixed(2)} / {duration}s</span></div><input aria-label="자세 타임라인" type="range" min={0} max={duration} step={.01} value={time} onChange={e=>{clock.current=Number(e.target.value);setTime(clock.current);setPaused(true);}}/>
   <article><h2>조형·텍스처 보정</h2><p>공개 리깅 모델을 바탕으로 흉곽 폭을 10% 넓히고, 두개골의 폭·깊이와 황갈색 피부·등 반점을 보정했습니다. 눈 크기를 줄이고 머리 위의 가는 털을 추가했습니다. 원본의 UV, 비늘·주름 맵과 84개 관절을 유지했습니다.</p><p>머리와 몸통 색상은 4K, 머리 법선은 2K, 몸통 법선은 4K입니다. 대기·걷기·빠른 이동·위협은 원작자의 클립이며, 외형 확인 자세를 추가했습니다.</p><a href={REFERENCE} target="_blank" rel="noreferrer">시각 기준: AMNH 성체 복원 확인 ↗</a></article>
   <details><summary>사용 중인 재질 파일</summary>{[['trex_v3_head_basecolor.jpg','머리 색상 · 4K'],['Tirannosaurus_Rex_v2_PRE_RETOPO_HEAD.fbx_normal.jpg','머리 법선 · 2K'],['trex_v3_body_basecolor.jpg','몸통 색상 · 4K'],['trex_v3_body_normal.jpg','몸통 법선 · 4K'],['trex_v3_body_metallic-trex_v3_body_roughness.jpg','몸통 거칠기 · 2K']].map(([file,label])=><a key={file} href={`/models/tyrannosaurus-study/${file}`} target="_blank" rel="noreferrer">{label} ↗</a>)}</details>
   <article><h2>모델 원작·사용 조건</h2><p>Tyrannosaurus rex 3D model by <a href="https://animalanimator.com/free-3d-animated-t-rex-reference/" target="_blank" rel="noreferrer">AnimalAnimator.com ↗</a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 ↗</a></p><a href="/models/tyrannosaurus-study/CREDITS.txt" target="_blank" rel="noreferrer">출처·수정 내역 받기 ↗</a></article>
   <p className="trex-note">현재는 참조 보정본입니다. AMNH 실물과 머리 윤곽·깃털·반점이 아직 다르며, 동일 외형 재현은 완료되지 않았습니다. 이 화면에서 단일 모델을 검수하며, 메인 디오라마에는 아직 교체하지 않았습니다.</p>
  </aside>
  <output id="trex-diagnostics" hidden>{JSON.stringify({...stats,view,layer,action,paused,time})}</output>
 </main>;
}
