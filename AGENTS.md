# SAURIA project guide

The current application starts at `src/main.tsx`, `src/EcosystemApp.tsx` and `src/EcosystemScene.tsx`. Earlier EMBER components remain as archive history; they are not the current main scene.

- Use Node.js 22.12 or newer; the tested version is in `.nvmrc`. Install with `npm ci`.
- Run `npm run build` and the relevant suites in `npm run verify` after behavioral, geometry or animation changes. Tests use saved local assets and do not require live third-party services.
- Read `docs/cloud-handoff.md` for the current user requirements and the map integration status of each asset set.
- Preserve physical scale in `src/world/physicalScale.ts`: the map spans 300 metres; adult Brachiosaurus/Tyrannosaurus/Triceratops lengths remain 22/12/9 metres. The user requested a seven-species size audit: Stegosaurus 9m, Spinosaurus 14m, Velociraptor 1.8m, Pteranodon 6m extended flight wingspan. Sources and measurement conventions are in `docs/physical-size-research.md`. Retain younger animals' relative sizes and verify all seven rendered models with `scripts/verify-physical-scale.ts`.
- The visible terrain and navigation must use the same height/clearance data. Do not reintroduce per-frame repulsion direction reversals or extend neck bones to reach a target.
- Imported models need independent skeletons and animation mixers per animal, with geometry/material/texture sharing. Retain source credits and licenses under `public/models/`.
- The user authorized six-species modeling and map integration on 2026-10-29. `RealisticMapRig.ts` now drives these map species; preserve original review GLBs and the separate review screen. Four `*-map.glb` variants reduce triangle counts while retaining original rig, skin weights, clips and textures. Run `npm run verify:realistic-map` after changes.
- Use `publicAsset` at browser asset-loading boundaries to respect the Vite base path on GitHub Pages.
- The current user flow starts peaceful. Settings has two 45-second extinction sequences instead of a three-world switch: snowfall → accumulating snow → river ice → blizzard; or a distant northwest flash after exactly one simulation second → incoming ash → black sky and continuous meteors. Animals flee, fade, and disappear; weather continues in the aftermath. Pause freezes both the sequence and weather; restart restores all 32 animals. These are fictional compressed scenes.
- `AnimalObservation.tsx` follows a selected individual without changing physical size. Keep click-only mesh raycasts, minimum screen tap targets, drag/pinch rejection, portrait framing, flight altitude, Escape/exit, and paused-camera transitions. `npm run verify:interaction` covers actual-model framing and sequence timing. Preserve instance transforms across automatic quality/material changes.
