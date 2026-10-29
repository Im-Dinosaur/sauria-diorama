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
2. **사실적인 공룡 3D 애니메이션 제작**: the user approved the Tyrannosaurus and asked this chat to model the other six species from research and realistic source assets. New GLBs, source assets, licenses, generated materials, rigging/build scripts and a review screen are present under `public/models/realistic-dinosaurs/`, `qa-dinosaur-realistic/`, `scripts/realistic-dinosaurs/` and `src/RealisticDinosaurStudio.tsx`. The modeling work has delivered six GLBs and 44 checked clips, plus the updated `public/dinosaur-report.html`. Those models have not been applied to the main map. Bone names, foot-cycle distances and integration constraints are in `public/models/realistic-dinosaurs/integration.json`; source/author details are in `manifest.json` and CREDITS.txt. Further map integration must retarget foot/drinking IK, remeasure physical body lengths, remove duplicate vertical motion from the Pteranodon's fly clip, and check device performance/LOD for five 326,988-triangle Brachiosaurus instances. The other models have 156,920/19,839/70,018/122,058/13,494 triangles for Triceratops/Stegosaurus/Spinosaurus/Velociraptor/Pteranodon respectively. Some older asset-production/browser-QA scripts reference the Windows bundled runtime or Chrome and need their dependency paths adapted before running on Linux. The current npm build/verification entry points are portable and use checked-in assets.
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

## Continued modeling and map integration — 2026-10-29

The user explicitly requested continued modeling **and main-map application** in this cloud chat.

- `RealisticMapRig.ts` and `MapRealisticDinosaur.tsx` replace the six procedural map species with the prepared realistic assets. The approved Tyrannosaurus renderer remains in use; population remains 32.
- Four new `*-map.glb` files are generated by `node scripts/realistic-dinosaurs/build-map-lod.mjs`. Index-only simplification keeps original vertex attributes, skin weights, skeletons, clips and textures. Full-detail originals remain in the review studio. `map-lod.json` records source and output counts and geometric simplification error.
- Rendered neutral lengths match the previous map models before actor scaling: Brachiosaurus 22m and Triceratops 9m adults, younger animals' ratios, and the 300m map remain intact. Other species retain prior map dimensions; these are not new scientific size claims.
- Each animal has independent rendered and animation-sampling skeletons/mixers and shares GPU assets with its conspecifics. Distance-based gait uses the exported foot-goal cycle distance. Body crouch, fixed-offset neck aiming, terrain leg IK and independent Brachiosaurus foot controllers adapt source clips to map terrain. Fly clips no longer add authored vertical motion to simulated flight altitude.
- `npm run verify:realistic-map` checks the actual map GLBs: independent rigs/shared GPU assets, scale, finite joint transforms, fixed anatomical offsets/neck lengths, pause determinism, flight altitude and one representative water-contact site per terrestrial species. It is part of `npm run verify`. Contact sampling is not exhaustive for all banks or terrain.
- This environment started at local snapshot `a48293d`, with no configured Git remote. Fetching the known private GitHub URL failed because the configured proxy could not connect. Remote main `3187282` could not be rechecked here; no push was performed.
- Validation after this change: all seven existing verification suites passed; the new six-species suite and updated actual-model physical-size suite passed; TypeScript/production build passed. Chromium software WebGL rendered 32 animals and passed pause, top view and observation-notes controls with no page errors. Screenshot capture timed out under software rendering, so device FPS and visual comparison remain unverified. Development server is running on `0.0.0.0:5173`.

## GitHub Pages deployment

- `.github/workflows/pages.yml` builds and deploys pushes to `main` with Node 24, `actions/configure-pages` and `actions/deploy-pages`.
- `GITHUB_PAGES=true npm run build` sets Vite base to `/sauria-diorama/`; `publicAsset()` scopes runtime model/texture requests to that project path. Local development retains `/`.
- Intended Pages endpoint: `https://im-dinosaur.github.io/sauria-diorama/`. Deployment success must be checked before treating this URL as live. Repository visibility is unchanged.

## Local continuation: researched size calibration

The local continuation enabled public GitHub Pages and subsequently audited all seven species at the user's request. Earlier statements that non-reference species retain prototype dimensions are superseded by `docs/physical-size-research.md` and the complete `SIZE_REFERENCE` table. Velociraptor is 1.8m, Stegosaurus 9m, Spinosaurus 14m, and Pteranodon 6m extended flight wingspan. The original 22/12/9m references and younger/adult ratios remain. Original review assets are preserved.

## Individual observation and progressive extinction — 2026-10-29

The user requested click-to-zoom tracking, then replaced the three static world buttons with two extinction buttons in Settings. They explicitly chose animals fleeing and gradually disappearing into an uninhabited aftermath.

- Click a rendered animal or a species-row button to smoothly approach and follow one actor. Repeated species clicks cycle individuals. Mouse orbit/wheel and zoom buttons remain available. Escape, exit or view buttons restore the map. The selected rig gets at least 30Hz pose sampling. Physical body sizes are unchanged.
- Screen-space shortlisting expands tiny click targets; only a completed tap raycasts shortlisted animal meshes. Terrain and forest meshes are excluded. Drag, cancelled and multi-touch gestures do not select animals. Neutral bounds are cached per source model rather than measured per frame.
- Settings starts a 45-second sequence from a fresh peaceful population. Ice: early snowfall, accumulating ground/forest snow, a later river-freeze front, heavy blowing snow, fleeing and fading animals, then an uninhabited ice age.
- Volcano: one distant northwest flash at simulation second 1, an ash front moving from that direction, darkening/black sky, continuous falling meteors with trails and impact glows, fleeing/fading animals and a burned, ash-covered aftermath. Precipitation and meteors continue after completion. Pause freezes event time and atmosphere; restart restores everything.
- Terrain and foliage transition through shared shader uniforms. Water uniforms are updated explicitly. Forest placement is re-uploaded when quality geometry changes, retaining instanced transforms; gravel remains stable. Weather and meteors use small shared, instanced geometries and add no network assets. Shared animal materials fade globally and restore on reset.
- Verification: existing eight suites, new actual-model portrait/landscape framing and picking/gesture checks, sequence pause/flash/fade/reset checks, performance checks, TypeScript and Pages build. Browser checks must also cover selecting a small actor, mouse picking, exit, both full extinction sequences, reset, and quality changes. See verification-observation-disaster.json.
