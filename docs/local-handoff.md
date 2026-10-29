# SAURIA local Codex continuation

## User request
Move cloud development to this computer's local Codex and finish publication on GitHub Pages. The user authorized uploading the app and making its website publicly accessible. Repository source visibility has not been changed; do not assume a source-visibility change or paid upgrade is authorized.

## Repository and implementation
- Repository: https://github.com/Im-Dinosaur/sauria-diorama (private).
- Current implementation commit: 125ad5086c78f6bd5f2357ffe386328a3a035cec on main (this handoff is a later documentation commit).
- Read AGENTS.md and docs/cloud-handoff.md first.
- Six realistic species are integrated into the main 32-animal map. Four map LOD GLBs preserve original skeletons, skin weights, clips and textures. Approved Tyrannosaurus remains integrated separately.
- Map width 300m; adult Brachiosaurus/Tyrannosaurus/Triceratops 22/12/9m. Preserve age ratios.
- Eight verification suites, TypeScript/production build and Chromium WebGL/UI smoke checks passed in cloud. Water-contact tests cover representative bank sites, not every bank; physical GPU FPS remains unverified.

## Local checkout
Use an existing local checkout if present: inspect git status before updating; preserve local edits. Otherwise clone the private repository with the user's existing GitHub authentication. Node >=22.12 (tested 24.21.0), npm ci, npm run dev -- --host 127.0.0.1 --port 5173.
For a local standard build: npm run build. For the Pages path build, set GITHUB_PAGES=true in the shell's native syntax before npm run build; preview with the same environment variable. Windows PowerShell: $env:GITHUB_PAGES='true'; npm run build; npm run preview.

## Outstanding GitHub Pages blocker
- Workflow: .github/workflows/pages.yml; builds main and deploys via GitHub Pages.
- Intended URL (NOT confirmed live): https://im-dinosaur.github.io/sauria-diorama/
- First run: https://github.com/Im-Dinosaur/sauria-diorama/actions/runs/40818652468
- Build passed, but actions/configure-pages@v5 failed creating the Pages site: Resource not accessible by integration. Its GITHUB_TOKEN has Pages: write but cannot perform initial activation.
- Open https://github.com/Im-Dinosaur/sauria-diorama/settings/pages in an authenticated browser. Inspect the actual screen. If available, set Build and deployment > Source to GitHub Actions. The user explicitly requested browser operation; use the local browser/computer-use tools only if actually available.
- If sign-in or account verification blocks the task, ask the user to complete that step. If the private-repository plan prevents Pages, explain the observed message and ask before changing source visibility or starting a paid upgrade.
- After activation, rerun the failed workflow (or trigger its workflow_dispatch), monitor deployment, and verify the actual published URL and model/texture paths before reporting success.
- If browser/computer-use tools are absent locally, state that accurately. Merely opening an in-app browser tab does not establish control access.

## Cloud/local transfer status
Cloud cannot currently call a local executor, create a local chat, or perform a handoff: those tools are absent. GitHub is the transfer medium. No local copy or local browser connection has been established by the cloud agent. No passwords or API tokens should be pasted into chat.
