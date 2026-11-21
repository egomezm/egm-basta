# Basta Online – Implementation Plan (DRAFT for review)

Repo: egm-basta (Vite + React 19 + TS, HashRouter, base /egm-basta/, GitHub Pages, Supabase).
Note: HashRouter + `?session=code` — join links are `https://…/egm-basta/?session=a1b2c3` (query before the hash); the app reads it on load and routes to `#/join`.

## 1. Decisions confirmed
- Realtime: Supabase Realtime (Postgres changes for state, Broadcast for transient events). No SDK-free option for websockets → add `@supabase/supabase-js` (realtime only) OR use raw Phoenix websocket. **Open: allow the SDK for realtime?** (REST stays plain fetch.)
- Identity: no accounts. Display name suggested from device/browser (e.g. "iPhone · Safari"), editable, stored in localStorage. (Browsers cannot read real device names.) A random player token in localStorage identifies the player/rejoin.
- Scoring: configurable per session; default unique 100 / shared 50 / invalid 0.
- Validation: auto-check starting letter + normalized comparison (case/accents/whitespace ignored); on Results, players can challenge an answer, others vote, majority decides; creator breaks ties.
- Letter picker rotation: players ordered by join order (`join_seq`). Round 1: 1st joiner spins, 2nd stops; round 2: 2nd spins, 3rd stops; … the last joiner stops → wraps so the 1st is the stopper. Continues until creator closes or all 26 letters used. Late joiners are appended to the order. Absent players are skipped. Creator has a "Siguiente ronda" button to advance after results.
- Letter picker: Player A clicks "A…" (spinner), Player B clicks "Para"; roles rotate each round.
- Game end: creator "Close Game" (confirm) or all 26 letters used → final standings.
- Join anytime (from next round, start at 0); rejoin by same player token keeps points.

## 2. Flow / pages
1. **Landing**: "Nueva sesión" / "Unirse (código)"; top-right language switch EN / ES / Spanglish.
2. **Create**: session name → categories editor (quick chips: Nombre, Apellido, Ciudad o país, Animal, Fruta o verdura, Color, Cosa/Objeto, Personalizada; add/edit/remove/reorder) → settings (Basta countdown default 10s, scoring values) → "Empezar juego".
3. **Session page**: header (logo + title left; creator-only "Close Game" w/ confirm; "Basta" button right, enabled only when all categories filled); session details + player count + code + QR; letter-picker bar; one row of category inputs for current round; previous letters shown A→Z (completed ones marked).
4. **Basta countdown**: when anyone presses Basta, all clients show pulsing "Basta… Basta 1 … Basta N"; at end inputs lock, answers submitted.
5. **Rules page** (`#/rules`, linked from landing and session header): plain-language, non-technical explanation for players (goal, how a round works, picking the letter, Basta countdown, scoring, challenges, turn order, ending the game), localized EN/ES/Spanglish.
6. **Results**: per-category table, points, challenge/vote, top-right "Round B: +650 · Total 1350"; next round button (creator or auto); leaderboard.
7. **Final standings** on close.

## 3. Letter selection (important design note)
10 ms/letter cannot be synced by streaming over the network. Instead: server stores `spin_started_at` (server time). Every client computes `letter = alphabet[floor((now - start + offset)/10) mod 26]` locally (skipping used letters), so all see the same rotation. When "Para" is pressed, the server records `stopped_at`; the letter is computed from it deterministically (server-side function) and is authoritative. Rotation skips already-used letters.

## 4. Data model (Supabase / Postgres)
Table naming: `basta_<table>` (personal EGM convention). Sessions expire 24h after creation (`expires_at`; pg_cron purge or lazy check in RPCs). Codes are 6 chars. Supabase URL/anon key come from `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and GitHub Actions variables.
- basta_session(id, code, name, creator_player_id, status[lobby|playing|closed], categories jsonb, settings jsonb{basta_seconds, pts_unique, pts_shared, lang}, used_letters text[], created_at)
- basta_player(id, session_id, token_hash, name, joined_at, last_seen, is_creator)
- basta_round(id, session_id, number, letter, spinner_id, stopper_id, status[picking|writing|countdown|locked|scored], spin_started_at, stopped_at, basta_by, basta_at)
- basta_answer(round_id, player_id, category_idx, text, normalized, status[valid|duplicate|invalid|challenged], points)
- basta_vote(round_id, answer ref, voter_id, vote)
- RPC functions (security definer) for: create_session, join_session, start_spin, stop_spin (computes letter), press_basta, submit_answers, score_round, vote. Anon key + RLS: clients can only read their own session by code; all writes go through RPCs (validated server-side, e.g. Basta only if all fields filled, scoring computed in DB, not on client).
- Realtime: subscribe to session/rounds/players/answers rows for the session; presence for player count.

## 5. Design system
- Background: paper sheet texture with blue square grid and red left margin (CSS gradients/SVG, no heavy images).
- Fonts: handwriting for user input (e.g. "Patrick Hand"/"Caveat" – legible); electronic board / scoreboard (e.g. "DSEG7" or "Orbitron"-style) for headings, letter, countdown and totals. Self-host fonts (static site).
- Mexican accents, subtle: papel picado border strip at top, talavera/otomí-style corner ornaments, a muted palette (marigold, deep teal, terracotta, ink blue) on the paper.
- Pulsing Basta warning, letter "flip board" animation, reduced-motion respected.
- i18n: simple dictionary (en, es, spanglish) via context; no library.

## 5b. Versioning
Major.Minor.Patch (semver) in `package.json`, injected at build time and shown as a small muted footer (e.g. `v0.1.0`). Starts at 0.1.0; Minor per milestone/feature, Patch per fix, 1.0.0 at first full playable release. Plan is kept at `Docs/basta-plan.md` and updated in place as the app evolves, written as if originally planned that way.

## 6. Milestones
1. Design tokens, layout, fonts, background, i18n scaffold.
2. Supabase schema + RLS + RPCs (SQL migration files in repo `supabase/`), local test.
3. Landing, create flow, category editor, code + QR (small QR lib or inline generator).
4. Session lobby, join, presence.
5. Letter picker synced rotation.
6. Round writing, Basta button/countdown/lock.
7. Scoring, results, challenges/votes, totals.
8. Close game, final standings, previous-letter strip.
9. Rules page (user-friendly) + version footer.
10. Polish, accessibility pass, mobile-first QA, README + deploy.
Testing: user chose ESLint-only; I recommend adding Vitest for the scoring/normalization/letter functions (small, high-value) — to confirm.

## 7. Open questions
Resolved: supabase-js allowed for realtime; Vitest added for scoring/normalization/letter/rotation logic; creator advances rounds; 6-char code, 24h expiry; env config; blanks allowed for non-pressers (score 0).
