# Physical size references — 2026-10-29

The largest adult of each species is calibrated to the following museum reference estimate. These are illustrative adult reference sizes, not exact measurements of every individual or universal maxima. Fossil completeness, species and individual variation affect estimates. Smaller actors retain their existing relative size ratios; those ratios are an artistic population choice, not a reconstructed growth curve.

| Animal | Applied reference | Source |
| --- | --- | --- |
| Brachiosaurus | 22 m body length | [Natural History Museum](https://www.nhm.ac.uk/discover/dino-directory/brachiosaurus.html) |
| Tyrannosaurus rex | 12 m body length | [Natural History Museum](https://www.nhm.ac.uk/discover/dino-directory/tyrannosaurus.html) |
| Triceratops | 9 m body length | [Natural History Museum](https://www.nhm.ac.uk/discover/dino-directory/triceratops.html) |
| Stegosaurus | 9 m body length | [Natural History Museum](https://www.nhm.ac.uk/discover/dino-directory/Stegosaurus.html) |
| Spinosaurus | 14 m body length | [Natural History Museum](https://www.nhm.ac.uk/discover/dino-directory/spinosaurus.html) |
| Velociraptor mongoliensis | 1.8 m body length | [American Museum of Natural History](https://www.amnh.org/explore/ology/ology-cards/018-velociraptor-mongoliensis) |
| Pteranodon longiceps | 6 m maximum extended wingspan | [American Museum of Natural History](https://www.amnh.org/explore/ology/paleontology/pterosaurs-the-card-game/meet-the-pterosaurs) |

The existing 22/12/9 m user-defined values agree with these sources and are retained. Previously, the other species used prototype display scales: the largest Velociraptor was about 8.97 m long. All seven species now pass through `speciesSizeFactor`, including pterosaurs added after the terrestrial population.

The map remains 300 m wide. Terrestrial calibration uses the rendered neutral nose-to-tail silhouette, the project's established measurement convention. Pteranodon uses the maximum rendered flight wingspan sampled at 120 Hz, rather than the width of its partially folded idle wings. `scripts/verify-physical-scale.ts` loads the actual web delivery models and checks every species, including the full flight sweep.

The small raptor's navigation origin is aligned with its feet instead of the imported tail-inclusive bounding-box centre. Its standing clearance follows its foot spread rather than tail length. Lower but still dry drinking stations are sampled from the same visible terrain height data; bone lengths remain fixed. Source/review GLBs, textures, the 32-animal population and the 78% transfer reduction are unchanged.
