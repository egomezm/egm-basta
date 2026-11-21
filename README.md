# Basta

Personal static app: Vite + React + TypeScript, HashRouter, CSS modules, data via plain `fetch` to Supabase REST (PostgREST).

## Setup

```sh
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

The example feature expects a table `items` (`id` bigint identity PK, `title` text, `created_at` timestamptz default now()) with RLS policies allowing the anon role to select/insert/delete.

## Scripts

- `npm run dev` – dev server at http://localhost:5173/egm-basta/
- `npm run lint` – ESLint
- `npm run build` – typecheck + build to `dist/`
- `npm run preview` – serve the build

## Deploy (GitHub Pages)

1. Repo Settings → Pages → Source: **GitHub Actions**.
2. Repo Settings → Variables → Actions: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Push to `main`; `.github/workflows/deploy.yml` builds and deploys to `https://<user>.github.io/egm-basta/`.

The anon key is public by design; protect data with RLS. Never commit `.env`.
