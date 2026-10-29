# SAURIA cloud handoff — 2026-10-29

## Runtime

React 19, TypeScript, Vite, Three.js, React Three Fiber. Node.js >=22.12; tested with 24.21.0.

```sh
npm ci
npm run verify
npm run build
npm run dev -- --host 0.0.0.0
```

The development server normally uses port 5173. The host override allows a cloud environment's preview proxy to reach it. No API key or application secret is required.

## User-approved state

- The main scene contains 32 natural animals across seven species. There are no mechanical dinosaurs.
- Peaceful, ice-age and Ember modes share the reference valley. Disasters interrupt resource activities and increase escape speed by 2.8.
- Terrain follows the supplied aerial map's river, tributaries, sandbars, forest and four rock outcrops. `public/textures/reference-valley.png` is unchanged. The elevation, vegetation and water data are saved in `src/world/reference-map.json`.
- The map spans 60 × 33.7679426 engine units, interpreted as 300 × 168.8397 metres. The user explicitly chose the numeric size chart over its enlarged illustrative dinosaur drawings. Adults measure Brachiosaurus 22m, Tyrannosaurus 12m and Triceratops 9m, using neutral-pose front-to-back rendered bounds. Younger individuals retain their prior relative scale. The calibration is in `src/world/physicalScale.ts`; `verification-physical-scale.json` contains measured results.
- All three map Tyrannosaurus instances now use the approved `public/models/tyrannosaurus-study/tyrannosaurus-reference-study.glb`: 42,676 triangles, 84 bones, shared GPU assets and separate skeletons/mixers. The source is AnimalAnimator.com, CC BY 4.0, with derivative credits beside the GLB and in the map UI.
- `TyrannosaurusMapRig.ts` aligns this model, samples native idle/walk/run/threat clips, synchronizes gait with distance, solves feet against the visible terrain and bends the neck without changing anatomical offsets while drinking. Animation sampling uses a separate internal rig so mixer caching cannot accumulate procedural pose edits.
- Other map species still use `SkinnedDinosaurs.ts`. Their neck IK also preserves bone length, with crouching and body lean. Reachable bank destinations depend on species/size. `navigation.ts` and `locomotion.ts` provide swept-footprint routing and stable avoidance.
- The main page includes the physical size guide and a zoom-correct 20m ruler in top view. `/?compare=1` is a paused orthographic reference view without UI.

## Prior chats and remaining model work

The local conversations are not copied as resumable cloud threads. This document preserves their actionable context:

1. **Zip 파일 확인**: main map, environment modes, locomotion, drinking fix, approved Tyrannosaurus integration, numeric physical scale and cloud migration. All current npm verification suites and the production build passed at the checkpoint. The main map rendered at approximately 60FPS on the local test computer; cloud/browser performance still needs its own check.
2. **사실적인 공룡 3D 애니메이션 제작**: the user approved the Tyrannosaurus and asked this chat to model the other six species from research and realistic source assets. New draft GLBs, source assets, licenses, generated materials, rigging/build scripts and a review screen are present under `public/models/realistic-dinosaurs/`, `qa-dinosaur-realistic/`, `scripts/realistic/` and `src/RealisticDinosaurStudio.tsx`. At handoff the local modeling conversation was still preparing its report after checking six GLBs and 44 clips. Those models have not been applied to the main map. Review `public/models/realistic-dinosaurs/manifest.json` and their credits before continuing; coordinate any later local changes rather than silently replacing approved map integration.
3. **공룡시대 지형 예시 이미지 제작**: produced the reference and reviewed the reconstructed terrain against it. River/forest/clearing placement, irregular rock surfaces and world transitions were reviewed. Hidden surfaces, tree heights and bathymetry were inferred from the single image; this is not an exact 3D scan. The original composition and mask are verified by hash and coordinate tests.

## Useful entry points

- `/`: main ecosystem.
- `/?trex=study`: approved Tyrannosaurus review screen.
- `/?specimen=triceratops` or `/?models=realistic`: newer six-species draft review screen.
- `/?studio=brachiosaurus`: procedural model/action inspector; `?studio=rex&legacy=1` selects the earlier procedural Tyrannosaurus.
- `/dinosaur-report.html`: model report, including source references.
- `qa/drinking-fixed.png`: fixed-length neck pose.
- `qa/map-scale-applied.png`: main map with the 300m / 22m / 12m / 9m guide.

The broad README below its current-state introduction retains historical prototype notes. Prefer this handoff and the current entry points over those older descriptions.
