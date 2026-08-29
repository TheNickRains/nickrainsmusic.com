# nickrainsmusic.com

Fan site, show-night platform, EPK, and fan capture — one Cloudflare Pages project serving everything at `nickrainsmusic.com`.

**Stack:** Vite · React · TypeScript · Tailwind v4 · Cloudflare Pages · Cloudflare D1 · Pages Functions

**Live:** [nickrainsmusic.com](https://nickrainsmusic.com)

---

## What's in here

### Fan site (`/`)
Full-bleed hero, evergreen music player (Spotify artist embed, self-updates), Bandsintown tour dates, fan list signup, and photos. EPK is footer-only — not in fan nav.

### Show-night platform
Real-time song request queue with Stripe-powered boosts. Fans request free, pay to float. Nick runs everything from a keyed admin URL on his phone at the mic stand.

- **`/songs`** — 782-song searchable list (master + Nashville tabs, decade chips). Tap to request; goal-song strip shows campaigns fans can chip into.
- **`/queue`** — Live queue, 8s poll. Boosts surface with dollar badges; your own requests get a Boost button (device-scoped). PWA chime + vibration alerts for Nick on stage.
- **`/queue?key=`** (admin) — PLAYED buttons that link to Ultimate Guitar charts, goal-song admin (add / seed / delete / clear all), two-tap **End the show** that sweeps open phones to `/#fanlist` and clears the queue.

### Fan capture (`/join`)
Conversational "The Club" funnel — email → SMS opt-in → hometown ZIP. Five entry variants: Kiosk (XL, auto-reset for fixed POE device), Live (printed QR), Digital (IG bio), Stripe redirect (post-tip), Website (home embed). Every signup forwards to Google Sheets via a GAS gateway as source of truth, and triggers a Resend notification email. End-of-show sends a fan CSV digest to Nick.

### EPK (`/epk`)
Industry press kit following Nick's canonical outline: contact above fold → bios → music → config-labeled video → downloadable photos → track record → tech/downloads → dates. Audience orderings at `/epk/venues`, `/epk/listening`, `/epk/agency`. No press section — no fabricated quotes.

### Linktree replacement (`/links`)
Zero-embed show-night hub (loads on venue cell service): Join The Club, tip jar, song list, social chips, "book me" → EPK.

### Ticketed shows (`live.nickrainsmusic.com/<city/date>`)
Story-first show landing pages. Stripe payment link issues QR tickets; door scanner at `/checkin?key=` burns them on entry.

---

## Subdomains

| Subdomain | Purpose |
|---|---|
| `songs.nickrainsmusic.com` | Bare repertoire browser (buyer-facing, no queue/tips) |
| `epk.nickrainsmusic.com` | Press kit |
| `join.nickrainsmusic.com` | Fan capture (default: live QR) |
| `live.nickrainsmusic.com` | Show landing pages |
| `tip.` / `donate.` | Redirect to Stripe tip link |

---

## API (Pages Functions · D1)

| Endpoint | Purpose |
|---|---|
| `POST /api/requests` | Fan adds song to queue |
| `GET /api/queue` | Queue sorted paid → amount → time |
| `POST /api/played` | Mark request played (admin) |
| `GET /api/goals` | Active goal campaigns |
| `POST /api/goals` | Create / seed / delete / clear goals (admin) |
| `POST /api/webhook/stripe` | Boosts, goal chip-ins, device-verified tips, ticket purchases |
| `POST /api/checkin` | Door QR scan — mark ticket used, return tally |
| `GET /api/tipped` | Has this device completed a payment? (drives idle tip nudge) |
| `GET /api/show` | Last sweep timestamp |
| `POST /api/show` | End-the-show broadcast (admin) |
| `POST /api/join` | Club signup → D1 + GAS→Sheets + Resend |
| `GET /api/fans` | Export The Club as CSV (admin) |

---

## Data (D1)

`requests` · `goals` · `tips` · `fans` · `settings` · `tickets`

Google Sheets remains the fan CRM source of truth — D1 `fans` is a site copy, synced on every signup via the GAS gateway in `Repos/GAS`.

---

## Files

- `onesheets/tech-rider.html` → `public/Nick-Rains-Tech-Rider.pdf` — SM58 lead vox, channel map 1–15
- `onesheets/entertainment.html` / `artist.html` → one-sheet PDFs
- `booking-platform-kit.md` — copy-paste kit for The Bash / GigSalad / WeddingWire
- `src/songs.json` — 782-song master list (scraped from Notion, UG chart links, Nashville/goal flags)
- `ROUTES.md` — full route and API reference

---

## Local dev

```bash
npm install
npm run dev -- --host                              # Vite on :5173
npx wrangler pages dev dist --ip 0.0.0.0 --port 8788   # Functions + D1
```

Secrets live in `.dev.vars` (gitignored): `ADMIN_KEY`, `STRIPE_WEBHOOK_SECRET`, `GAS_TALLY_URL`, `GAS_AUTH_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_TO`.

---

## Deploy (Cloudflare Pages)

See `ROUTES.md` deploy checklist. Short version: `wrangler login` → create D1 → apply `schema.sql` → set secrets → configure Stripe webhook at `/api/webhook/stripe` → add custom domains.
