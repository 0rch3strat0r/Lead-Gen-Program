# Lead Gen Program – Architecture (Single Source of Truth)

## Goals
- One repo owns config and deploys (no split ownership across chats).
- Backend stays **ESM**; API routes on Vercel use **CommonJS wrappers** that `await import()` the ESM code.
- Frontend serves static dashboard (old AI Command Center landing page) from `/public` and calls API routes.

## Repo Layout
```
/public/                      # landing page + dashboard assets (from original AI Command Center)
/frontend/templates/          # HTML/NEPQ templates (exec brief, vetting, ROI, etc.)
/backend/src/services/research/engine.ts  # deep research orchestrator (ESM)
/api/research/run.js          # Vercel API: POST runs deep research job (CJS wrapper → dynamic import ESM)
ARCHITECTURE.md
vercel.json
.env.example
```

## Hard Rules (avoid CJS/ESM breakage)
1) Do **not** change `package.json` type mid-stream.
2) All backend code is **ESM** (`export`/`import`). Compile to JS if using TS.
3) All Vercel API files remain **.js CommonJS** and use `await import()` to load backend modules.
4) No `require()` inside backend modules.
5) Only this repo is the source of truth. Other AIs produce **single files**; we paste/commit here.

## Who does what
- **You**: manage repo, drop in legacy landing page → `/public`, templates → `/frontend/templates`.
- **Me (GPT‑5 Thinking)**: integrate files, wire API, enforce ESM/CJS boundary, review PRs.
- **GPT‑5 desktop / Claude**: generate **single files** on request (no config edits). You paste them here.
- **WSL shell**: run build/dev scripts and quick tests.

## Vercel Basics
- Root Dir: repo root
- Build: `npm run build` (or `pnpm build`)
- Output: framework default
- Env Vars: set in Vercel Project → Settings → Environment Variables

## Prompts to give GPT‑5 / Claude (examples)
- “Create a module that **exports** `async function runDeepResearch(options)` returning `{ summary, findings: Array }`. ESM only. No external deps. Target path: `backend/src/services/research/engine.ts`.”
- “Generate a HTML template section for an **Executive Brief** using placeholders like `{{company_name}}`, `{{industry}}`. Save as `/frontend/templates/exec_brief.html`.”
- “Write a function `scoreOpportunity(profile)` that returns `{score, reasons}`. ESM. Path: `backend/src/services/research/score.ts`.”

## API Contract (initial)
- `POST /api/research/run`
  - body: `{ companyUrl?: string, companyName?: string, notes?: string }`
  - response: `{ jobId, summary, findings }`

## Next steps
1) Copy landing page into `/public`.
2) Move templates into `/frontend/templates`.
3) Commit. I’ll wire the API to the dashboard calls.
