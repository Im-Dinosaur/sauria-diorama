import { DIORAMA } from './layout';
import type { Species } from './paths';

export const MAP_WIDTH_METRES=300;
export const METRES_PER_UNIT=MAP_WIDTH_METRES/DIORAMA.width;
export const MAP_DEPTH_METRES=DIORAMA.depth*METRES_PER_UNIT;
/** Measured neutral-pose front-to-back silhouettes, before the actor's scale. */
export const SIZE_REFERENCE:Partial<Record<Species,{metres:number;modelLength:number;previousAdultScale:number}>>={
 brachiosaurus:{metres:22,modelLength:3.407539618877635,previousAdultScale:.80},
 rex:{metres:12,modelLength:3.2414555780638947,previousAdultScale:.72},
 triceratops:{metres:9,modelLength:2.8968732712496577,previousAdultScale:.67},
};
export function speciesSizeFactor(species:Species){const reference=SIZE_REFERENCE[species];return reference?reference.metres/(METRES_PER_UNIT*reference.modelLength*reference.previousAdultScale):1;}
