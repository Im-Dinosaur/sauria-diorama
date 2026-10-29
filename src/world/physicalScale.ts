import { DIORAMA } from './layout';
import type { Species } from './paths';

export const MAP_WIDTH_METRES=300;
export const METRES_PER_UNIT=MAP_WIDTH_METRES/DIORAMA.width;
export const MAP_DEPTH_METRES=DIORAMA.depth*METRES_PER_UNIT;
interface SizeReference{metres:number;modelLength:number;previousAdultScale:number;measurement:'length'|'wingspan';source:string;sourceUrl:string;}
export const SIZE_SPECIES_ORDER=['brachiosaurus','spinosaurus','rex','triceratops','stegosaurus','velociraptor','pterosaur'] as const;
/** Adult reference estimates, not a claim that every specimen had an identical size.
 * modelLength is measured from the rendered neutral silhouette, except the pterosaur:
 * its calibration uses the maximum fully extended flight wingspan, not folded idle wings.
 */
export const SIZE_REFERENCE:Record<Species,SizeReference>={
 brachiosaurus:{metres:22,modelLength:3.407539618877635,previousAdultScale:.80,measurement:'length',source:'Natural History Museum',sourceUrl:'https://www.nhm.ac.uk/discover/dino-directory/brachiosaurus.html'},
 rex:{metres:12,modelLength:3.2414555780638947,previousAdultScale:.72,measurement:'length',source:'Natural History Museum',sourceUrl:'https://www.nhm.ac.uk/discover/dino-directory/tyrannosaurus.html'},
 triceratops:{metres:9,modelLength:2.8968732712496577,previousAdultScale:.67,measurement:'length',source:'Natural History Museum',sourceUrl:'https://www.nhm.ac.uk/discover/dino-directory/triceratops.html'},
 stegosaurus:{metres:9,modelLength:3.230002991207847,previousAdultScale:.78,measurement:'length',source:'Natural History Museum',sourceUrl:'https://www.nhm.ac.uk/discover/dino-directory/Stegosaurus.html'},
 spinosaurus:{metres:14,modelLength:3.803583816860927,previousAdultScale:.64,measurement:'length',source:'Natural History Museum',sourceUrl:'https://www.nhm.ac.uk/discover/dino-directory/spinosaurus.html'},
 velociraptor:{metres:1.8,modelLength:2.941741335618999,previousAdultScale:.61,measurement:'length',source:'American Museum of Natural History',sourceUrl:'https://www.amnh.org/explore/ology/ology-cards/018-velociraptor-mongoliensis'},
 pterosaur:{metres:6,modelLength:7.241184476831859,previousAdultScale:.84,measurement:'wingspan',source:'American Museum of Natural History',sourceUrl:'https://www.amnh.org/explore/ology/paleontology/pterosaurs-the-card-game/meet-the-pterosaurs'},
};
export function speciesSizeFactor(species:Species){const reference=SIZE_REFERENCE[species];return reference.metres/(METRES_PER_UNIT*reference.modelLength*reference.previousAdultScale);}
