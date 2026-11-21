# Basta

Online version of the paper game *Basta* (Tutti Frutti). Vite + React 19 + TypeScript, HashRouter, static hosting on GitHub Pages, data on Supabase (REST via plain `fetch`; `@supabase/supabase-js` only for realtime Broadcast pings). UI in English, Spanish and Spanglish. Plan: [`Docs/basta-plan.md`](Docs/basta-plan.md).

## Setup

1. In the Supabase SQL editor, run [`supabase/001_basta.sql`](supabase/001_basta.sql). It creates the `basta_*` tables (RLS on, no direct access) and the RPC functions the app calls.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `npm install`

## Scripts

- `npm run dev` – dev server
- `npm run lint` – ESLint
- `npm test` – Vitest (normalization, letters, scoring, votes, rotation)
- `npm run build` – type-check and build into `dist/`
- `npm run preview` – serve the build

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml` (lint, test, build, deploy to GitHub Pages). Set the repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and set Pages source to *GitHub Actions*. The app is served from `/egm-basta/`; invite links look like `/egm-basta/?session=CODE`.

## Versioning

Major.Minor.Patch in `package.json`, shown in the footer.
