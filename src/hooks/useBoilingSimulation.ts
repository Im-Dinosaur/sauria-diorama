import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { simulation } from '../config';
import { advanceBoiling,createBoilingSimulation } from '../world/boilingSimulation';

export function useBoilingSimulation(){
 const state=useRef(createBoilingSimulation(simulation.boilingSeed)),last=useRef(0);
 useFrame(()=>{
  const time=simulation.time,delta=time-last.current,settings=simulation.environment;
  // Development bookmarks rebuild the bounded pool, then continue with the normal clock.
  if(delta<0||delta>.11){state.current=createBoilingSimulation(simulation.boilingSeed);advanceBoiling(state.current,time,settings.boilingFrequency,settings.sparkStrength);}
  else advanceBoiling(state.current,delta,settings.boilingFrequency,settings.sparkStrength);
  last.current=time;
 },-50);
 return state;
}
