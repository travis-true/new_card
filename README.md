# CardScout

A mobile-first web app (installable PWA) for scanning sports cards. Take or upload photos of the **front and back** of a card and
CardScout identifies it with Claude vision. Users create accounts, build collections, and can flag cards **for sale or trade**.
The site never sells anything, takes payments or ships cards: deals happen off-site, at the users' own risk.

## Features

- Scan with the phone camera or upload photos (front required, back recommended); photos are downscaled in the browser first.
- Identification by Claude vision (player, year, brand, set, card number, team, sport, parallel, rookie, grade) with a review-and-correct step before saving.
- Accounts (email + password), multiple collections, public or private.
- Public profiles, a market page of cards flagged For Sale / For Trade, a contact link chosen by each user, and an at-your-own-risk disclaimer.
- **Contact** and **Feature Requests** links in the footer open an email to true.travis@gmail.com (plain `mailto:` links, no forms).

Not included: eBay or other sales data, in-app selling, payments, messaging, valuation.

## Quick start

Requires Node 22.13 or newer (the app uses the built-in `node:sqlite`).

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the scan page still works: it tells the user identification is unavailable and they enter details by hand.
Set `IDENTIFY_MODE=mock` to get a fixed sample result for development.

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables Claude identification |
| `ANTHROPIC_MODEL` | Override the model (default `claude-opus-5-5`) |
| `SESSION_SECRET` | Signs session cookies. Required in production (16+ chars); generated into `data/` in development |
| `DATA_DIR` | SQLite file and uploaded photos (default `./data`) |
| `IDENTIFY_MODE` | `mock` for a fixed sample identification |

## Scripts

```bash
npm run lint       # type check
npm test           # unit tests (vitest)
npm run build && npm run test:e2e   # browser tests (Playwright); needs a Chromium
```

Playwright uses `/opt/pw-browsers/chromium` when present, or set `CHROMIUM_PATH`; otherwise run `npx playwright install chromium`.

## How it works

- Next.js (App Router, TypeScript). Server pages read SQLite directly; mutations go through `src/app/api/*` route handlers.
- `src/lib/identify.ts` sends the photos to the Messages API with a JSON schema (`output_config.format`) and validates the result with zod.
- `src/lib/db.ts` + `src/lib/repo.ts`: SQLite via `node:sqlite` (experimental in Node, isolated behind `repo.ts` so it is easy to swap for Postgres).
- Photos are validated by magic bytes (JPEG/PNG/WebP/GIF, max 8 MB), stored on disk, and served through `/api/images/[id]`, which only serves
  a photo to its owner or when its card is in a public collection. Abandoned uploads are purged after 24 hours.
- Auth: scrypt password hashes, HMAC-signed HttpOnly SameSite=Lax session cookie, same-origin check on every mutating route, in-memory rate limits on login, signup and scan.
- Contact links are restricted to email addresses and http(s) links.

## Known limits before production

- Rate limiting is in memory, so it is per server instance.
- Photos live on local disk. On serverless or multi-instance hosting, move them (and SQLite) to shared storage such as Postgres and S3.
- Identification of parallels and variants is a best guess; the review step exists for that reason.
- There is no password reset, email verification, moderation or reporting yet.
