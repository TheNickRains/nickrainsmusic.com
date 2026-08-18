# nickrainsmusic.com — Route Map

One codebase serving the fan site, show-night platform, lead capture, and EPK.
Local dev: `npm run dev -- --host` (vite, :5173, hot reload, proxies /api)
+ `npx wrangler pages dev dist --ip 0.0.0.0 --port 8788` (Functions + D1).

## Pages

| Route | Audience | What it does |
|---|---|---|
| `/` | Fans | Home — Catbird hero, "Get Nick to play your hometown →", evergreen Songs (Spotify artist embed self-updates), Tour (Bandsintown), Club signup (`#fanlist`), photos, contact. EPK linked footer-only. |
| `/songs` | Fans at shows | 782-song list: search (always spans master list), Master/Nashville tabs, decade chips, tap-to-request → queue, custom "don't see it?" requests, goal-song strip, sliding tip bar, idle tip sheet. |
| `/queue` | Fans + band | Live queue (8s poll): boosts float up with $ badges, own requests highlighted w/ Boost button (device-scoped), goal bars, ALERTS toggle (PWA-only: chime + banner + screen wake lock). |
| `/queue?key=<ADMIN_KEY>` | Nick | + PLAYED buttons (tap song title → Ultimate Guitar chart), goal admin (add w/ autocomplete, price, Seed +$5/20/50, delete, clear all), two-tap **End the show** (sweeps open phones → `/#fanlist`, clears queue + goals). |
| `/join` | Capture | The Club funnel (conversational, explicit opt-ins, "Tell a friend" share CTA). Variants: `?src=kiosk` (XL, auto-reset 8s) · `live` (default — printed QR) · `digital` (IG bio) · `stripe` (post-tip entry — set Stripe payment-link confirmation redirect here). |
| `/links` | Linktree replacement | Show-night hub: Join The Club, tip jar, song list, social icons, music/tour, "book me" → EPK. |
| `/epk` | Industry | Press kit, outline order (contact above fold → bios by length → recordings → config-labeled video → downloadable photos → track record → tech + downloads → dates). Orderings: `?for=venues` · `?for=listening` · `?for=agency`. |

Redirects: `/linktree`, `/club` → `/links` · `/entertainment` → `/epk?for=venues` · `/artist` → `/epk?for=listening` · `*` → `/`.

## Subdomains (Pages custom domains; routed by hostname in `src/main.tsx`)

- `songs.` — bare repertoire browser (no requests/queue/goals/tips — buyer-facing)
- `epk.` — press kit
- `join.` — capture funnel (default src=live)
- `tip.` / `donate.` — redirect to Stripe tip link

Note: localStorage (device id, tip verification) does not cross subdomains.

## API (Pages Functions, `functions/api/`, D1 binding `DB`)

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/requests` | rate-limited | Fan adds song to queue → `{id, position}` |
| `GET /api/queue` | public | Queue sorted paid DESC, amount DESC, time ASC + playedTonight |
| `POST /api/played` | ADMIN_KEY | Mark request played |
| `GET /api/goals` | public | Active goal campaigns, price DESC (tiers: $250+ grand / $100+ major / standard) |
| `POST /api/goals` | ADMIN_KEY | `create` / `seed` (salt the jar) / `delete` / `clear` |
| `POST /api/webhook/stripe` | Stripe signature | Boosts (`client_reference_id` = request id), goal chip-ins (`goal-<id>`, auto-unlock at 100%), device-verified tips (`_d_<device>` suffix → `tips` table) |
| `GET /api/tipped?device=` | public | Has this device COMPLETED a payment in 6h (drives tip nudge) |
| `GET /api/show` | public | Last sweep timestamp (pages redirect only if open during sweep) |
| `POST /api/show` | ADMIN_KEY | `end-show`: broadcast sweep + clear queue & goals |
| `POST /api/join` | honeypot + rate-limit | Club signup → D1 `fans` + forward to GAS→Google Sheets CRM + Resend notify (both env-gated) |
| `GET /api/fans?key=` | ADMIN_KEY | The Club as CSV |

## Data (D1 `nick-rains-queue`, `schema.sql`)

`requests` · `goals` · `tips` (webhook-verified, per device) · `fans` (site copy; **Google Sheets stays the CRM source of truth** via GAS forward) · `settings` (sweep timestamp).

## Files

- `onesheets/tech-rider.html` → `public/Nick-Rains-Tech-Rider.pdf` — exact channel map 1–15 (multitrack mirrors it; Logic template = `Logic-Track-Names.txt`). SM58 lead vox, venue provides DI.
- `onesheets/entertainment.html` / `artist.html` → one-sheet PDFs
- `booking-platform-kit.md` — The Bash / GigSalad / WeddingWire copy-paste kit
- `src/songs.json` — master list (782). Update: export UG CSV → merge script strips `(ver N)`, dedupes; `scripts/tag-songs.py` + `scripts/nashville-list.txt` re-tag Nashville/$100 flags.
- PWA: `public/manifest.json` (no start_url so keyed installs keep the key), `public/sw.js`, icons.

## Deploy checklist (Cloudflare Pages)

1. `git init` + first commit (do this first)
2. `wrangler login` → create D1 → real `database_id` in `wrangler.toml` → apply `schema.sql`
3. Secrets: `ADMIN_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `GAS_TALLY_URL`, `GAS_AUTH_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_TO`
4. Stripe: webhook → `https://<domain>/api/webhook/stripe` (`checkout.session.completed`); payment-link confirmation redirect → `join.nickrainsmusic.com?src=stripe`; optional dedicated "Boost a Song" link → `LINKS.songRequestLink` in `src/data.ts`
5. Custom domains: apex + `songs.` `epk.` `join.` `tip.`
6. Print new QRs (`/links`, `/join`), then cancel Linktree + Tally
