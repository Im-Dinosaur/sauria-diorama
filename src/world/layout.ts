import reference from './reference-map.json';
export type WorldMode = 'peaceful' | 'ice' | 'ember';
export const DIORAMA = { width: reference.width, depth: reference.depth, halfWidth: reference.width/2, halfDepth: reference.depth/2 };
export const FLEE_SPEED = 2.8;
export function advanceLifeTimes(worldTime: number, organicTime: number, delta: number, paused: boolean, mode: WorldMode) {
  if (paused) return { worldTime, organicTime };
  return { worldTime: worldTime + delta, organicTime: organicTime + delta * (mode === 'peaceful' ? 1 : FLEE_SPEED) };
}
