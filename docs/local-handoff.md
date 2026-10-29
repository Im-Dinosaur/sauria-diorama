# SAURIA local Codex continuation

## User request
Move cloud development to this computer's local Codex and finish publication on GitHub Pages. The user authorized uploading the app and making its website publicly accessible. On 2026-10-29, the authenticated Pages screen showed a private-plan restriction and the user explicitly authorized making the source repository public. That change and Pages activation are complete. No paid upgrade was made.

## Repository and implementation
- Repository: https://github.com/Im-Dinosaur/sauria-diorama (public).
- Current implementation commit: 125ad5086c78f6bd5f2357ffe386328a3a035cec on main (this handoff is a later documentation commit).
- Read AGENTS.md and docs/cloud-handoff.md first.
- Six realistic species are integrated into the main 32-animal map. Four map LOD GLBs preserve original skeletons, skin weights, clips and textures. Approved Tyrannosaurus remains integrated separately.
- Map width 300m; adult Brachiosaurus/Tyrannosaurus/Triceratops 22/12/9m. Preserve age ratios.
- Eight verification suites, TypeScript/production build and Chromium WebGL/UI smoke checks passed in cloud. Water-contact tests cover representative bank sites, not every bank; physical GPU FPS remains unverified.

## Local checkout
Use an existing local checkout if present: inspect git status before updating; preserve local edits. Otherwise clone the private repository with the user's existing GitHub authentication. Node >=22.12 (tested 24.21.0), npm ci, npm run dev -- --host 127.0.0.1 --port 5173.
For a local standard build: npm run build. For the Pages path build, set GITHUB_PAGES=true in the shell's native syntax before npm run build; preview with the same environment variable. Windows PowerShell: $env:GITHUB_PAGES='true'; npm run build; npm run preview.

## GitHub Pages publication — completed locally

- Live URL: https://im-dinosaur.github.io/sauria-diorama/
- Pages source is GitHub Actions. Deployment run https://github.com/Im-Dinosaur/sauria-diorama/actions/runs/40819089520 succeeded after activation.
- The live main scene loaded all seven species, and pause, camera changes and field notes were checked. Model/texture HTTP paths returned 200.
- The original blocker notes below are historical; Pages is now enabled.

## Hotspot/laptop optimization and river artifact

- The user reported both slow first loading and low FPS, then asked to remove a square block in the river.
- Web delivery models are committed as `*-web.glb.gz`; original review GLBs and licenses remain intact. `npm run build:web-assets` regenerates them and ignored, uncompressed web GLBs for local QA. Node rig tests can read either form.
- Main model transfer is 17,509,814 bytes versus 80,997,396 bytes before this change (78.4% less). See `public/models/web-delivery.json` and `verification-performance.json`.
- Delivery uses meshopt without quantization, original bone transforms and clips, removal of unused map vertices, and resized web textures. `src/useWebGLTF.ts` decodes gzip locally; browsers without DecompressionStream fall back to the preserved originals.
- Auto quality starts balanced, can fall back to low, and has an explicit high/low control. Pixel budgets, foliage detail, shadows, postprocessing and staggered skeleton/IK sampling reduce work. World simulation, 32 animals, physical sizes and navigation remain unchanged. Paused scenes render on demand.
- The river block came from bank-gravel instances being recreated when a mode-dependent material was passed in constructor args. Geometry/material now use ordinary props, so changing worlds keeps placement matrices. Check peaceful → ice → ember → peaceful and inspect the river after future edits.
- Full `npm run verify`, `npm run verify:performance`, TypeScript and the Pages production build passed locally. Mode cycling and a river screenshot were checked in the in-app browser. Physical laptop FPS is not a portable benchmark: concurrent tabs and the embedded browser affect it.

## Historical GitHub Pages blocker
- Workflow: .github/workflows/pages.yml; builds main and deploys via GitHub Pages.
- Intended URL (NOT confirmed live): https://im-dinosaur.github.io/sauria-diorama/
- First run: https://github.com/Im-Dinosaur/sauria-diorama/actions/runs/40818652468
- Build passed, but actions/configure-pages@v5 failed creating the Pages site: Resource not accessible by integration. Its GITHUB_TOKEN has Pages: write but cannot perform initial activation.
- Open https://github.com/Im-Dinosaur/sauria-diorama/settings/pages in an authenticated browser. Inspect the actual screen. If available, set Build and deployment > Source to GitHub Actions. The user explicitly requested browser operation; use the local browser/computer-use tools only if actually available.
- If sign-in or account verification blocks the task, ask the user to complete that step. If the private-repository plan prevents Pages, explain the observed message and ask before changing source visibility or starting a paid upgrade.
- After activation, rerun the failed workflow (or trigger its workflow_dispatch), monitor deployment, and verify the actual published URL and model/texture paths before reporting success.
- If browser/computer-use tools are absent locally, state that accurately. Merely opening an in-app browser tab does not establish control access.

## Cloud/local transfer status
The local checkout now exists under this task's `work/sauria-diorama`, on `main`. Initial status was clean and no existing local edits were overwritten. The initial transfer uses a shallow checkout; older history remains available on GitHub. Dependencies were installed with npm ci. The in-app browser is authenticated and was used for Pages activation. No passwords or API tokens should be pasted into chat.
