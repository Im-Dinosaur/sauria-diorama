import type {WorldMode} from './layout';
export type DisasterKind=Exclude<WorldMode,'peaceful'>;
export const DISASTER_DURATION=45;
export interface DisasterSequence{kind:DisasterKind|null;elapsed:number;duration:number;}
export interface DisasterSnapshot{kind:DisasterKind|null;progress:number;finished:boolean;phase:string;description:string;secondsLeft:number;}
export function createDisaster():DisasterSequence{return {kind:null,elapsed:0,duration:DISASTER_DURATION};}
export function startDisaster(sequence:DisasterSequence,kind:DisasterKind){sequence.kind=kind;sequence.elapsed=0;}
export function resetDisaster(sequence:DisasterSequence){sequence.kind=null;sequence.elapsed=0;}
export function advanceDisaster(sequence:DisasterSequence,dt:number,paused:boolean){if(sequence.kind&&!paused&&Number.isFinite(dt)&&dt>0)sequence.elapsed=Math.min(sequence.duration,sequence.elapsed+Math.min(dt,.25));}
export function disasterProgress(sequence:DisasterSequence){return sequence.kind?Math.min(1,sequence.elapsed/sequence.duration):0;}
export function smoothRange(from:number,to:number,value:number){const t=Math.max(0,Math.min(1,(value-from)/(to-from)));return t*t*(3-2*t);}
export function disasterAppearance(sequence:DisasterSequence){return sequence.kind==='ice'?smoothRange(.12,.95,disasterProgress(sequence)):smoothRange(1.5,34,sequence.elapsed);}
export function disasterWaterAppearance(sequence:DisasterSequence){return sequence.kind==='ice'?smoothRange(.32,.9,disasterProgress(sequence)):disasterAppearance(sequence);}
export function distantFlash(sequence:DisasterSequence){const age=sequence.elapsed-1;return sequence.kind==='ember'&&age>=0&&age<1?Math.exp(-age*7):0;}
export function animalPresence(sequence:DisasterSequence){return 1-smoothRange(.62,.98,disasterProgress(sequence));}
export function disasterWorldMode(sequence:DisasterSequence):WorldMode{return sequence.kind==='ember'&&sequence.elapsed>=1.2||sequence.kind==='ice'&&disasterProgress(sequence)>.18?sequence.kind??'peaceful':'peaceful';}
const phases={
 ice:[['차가운 바람','기온이 떨어지고 눈구름이 골짜기로 밀려옵니다.'],['눈보라의 시작','눈이 쌓이고 공룡들이 피난처를 찾아 움직입니다.'],['얼어붙는 강','결빙이 강을 따라 퍼지고 숲이 눈에 덮입니다.'],['사라지는 생명','먹이와 물을 잃은 생명의 흔적이 희미해집니다.'],['빙하 멸망 완료','얼어붙은 강과 고요한 숲만 남았습니다.']],
 ember:[['멀리서 번지는 섬광','1초 뒤 북서쪽에서 섬광이 일고 화산재가 밀려옵니다.'],['밀려오는 화산재','하늘이 검게 변하고 메테오가 쏟아집니다.'],['검은 하늘 아래','화산재와 메테오를 피해 공룡들이 대피합니다.'],['사라지는 생명','검은 재가 쌓이고 생명의 흔적이 희미해집니다.'],['화산 멸망 완료','검게 탄 세계 위로 화산재와 메테오가 계속 떨어집니다.']],
} as const;
export function disasterSnapshot(sequence:DisasterSequence):DisasterSnapshot{
 const progress=disasterProgress(sequence),finished=Boolean(sequence.kind&&progress>=1),stage=finished?4:progress<.18?0:progress<.4?1:progress<.66?2:3;
 const [phase,description]=sequence.kind?phases[sequence.kind][stage]:['평온한 세계','공룡을 클릭하면 가까이 따라가며 관찰할 수 있습니다.'];
 return {kind:sequence.kind,progress,finished,phase,description,secondsLeft:Math.ceil(sequence.duration-sequence.elapsed)};
}
