import {useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import type {Group} from 'three';
import {PoseClock} from '../renderPerformance';
import type {Actor,Ecosystem} from '../world/ecosystem';
interface Rig{root:Group;pose(actor:Actor,mode:Ecosystem['mode'],dt:number,paused:boolean):void;}
const frames=new WeakMap<object,{time:number;index:number}>();
export function useRigPose(rig:Rig,actor:Actor,world:Ecosystem,hz:number){
 const clock=useMemo(()=>new PoseClock([...actor.id].reduce((sum,c)=>sum+c.charCodeAt(0),0)%31/31),[rig,actor.id]);
 const slot=world.actors.indexOf(actor),groups=hz>=60?1:hz>=30?2:4;
 useFrame((state,dt)=>{
  let frame=frames.get(state.clock);if(!frame){frame={time:state.clock.elapsedTime,index:0};frames.set(state.clock,frame);}else if(frame.time!==state.clock.elapsedTime){frame.time=state.clock.elapsedTime;frame.index++;}
  // A slow frame must not force all 32 rigs to catch up together and lock the UI at a low FPS.
  const elapsed=clock.sample(dt,hz,world.paused,slot%groups===frame.index%groups);
  if(elapsed!==null)rig.pose(actor,world.mode,elapsed,world.paused);
  else{rig.root.position.set(actor.x,actor.y,actor.z);rig.root.rotation.y=actor.heading;rig.root.scale.setScalar(actor.scale);}
 });
}
