# SAURIA project guide

The current application starts at `src/main.tsx`, `src/EcosystemApp.tsx` and `src/EcosystemScene.tsx`. Earlier EMBER components remain as archive history; they are not the current main scene.

- Use Node.js 22.12 or newer; the tested version is in `.nvmrc`. Install with `npm ci`.
- Run `npm run build` and the relevant suites in `npm run verify` after behavioral, geometry or animation changes. Tests use saved local assets and do not require live third-party services.
- Read `docs/cloud-handoff.md` for the current user requirements and the map integration status of each asset set.
- Preserve user-defined physical scale in `src/world/physicalScale.ts`: the map spans 300 metres, and adult Brachiosaurus/Tyrannosaurus/Triceratops lengths are 22/12/9 metres. Retain younger animals' relative sizes.
- The visible terrain and navigation must use the same height/clearance data. Do not reintroduce per-frame repulsion direction reversals or extend neck bones to reach a target.
- Imported models need independent skeletons and animation mixers per animal, with geometry/material/texture sharing. Retain source credits and licenses under `public/models/`.
- The user authorized six-species modeling and map integration on 2026-10-29. `RealisticMapRig.ts` now drives these map species; preserve original review GLBs and the separate review screen. Four `*-map.glb` variants reduce triangle counts while retaining original rig, skin weights, clips and textures. Run `npm run verify:realistic-map` after changes.
- Use `publicAsset` at browser asset-loading boundaries to respect the Vite base path on GitHub Pages.
