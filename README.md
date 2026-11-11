# Atelier storefront & back office

The Next.js front end of **Atelier**, a bilingual (Arabic-first, full RTL) department-store experience, plus the `/admin` back office.
Next.js 16 (App Router, **Cache Components**) · React 19 · Tailwind v4 · shadcn/ui (RTL) · TanStack Query/Table · Zustand · nuqs · Zod.

> The data and business rules live in a separate service: the **Atelier API** (repository `MarketPlace`). This app only renders and calls it over HTTP —
> you need the API running (or deployed) to use the storefront.

## Quick start

```bash
# 1 — run the API (see its README): from the API repo
#       npm run dev:db   &&   npm run seed   &&   npm run dev      → http://localhost:4000

# 2 — this repo
npm install
cp .env.example .env.local        # BACKEND_URL=http://localhost:4000
npm run dev                       # http://localhost:3000  → redirects to /ar
```

Demo accounts (created by the API's seed): admin `admin@atelier.test` / `Admin#12345`,
read-only reviewer `demo@atelier.test` / `Demo#12345`, customer `customer@atelier.test` / `Demo#12345`.

## Configuration

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | URL of the deployed API. Next **rewrites `/api/*` to it**, so the browser only ever talks to this origin |
| `NEXT_PUBLIC_SITE_URL` | public URL of this site (canonical links, sitemap, Open Graph) |
| `REVALIDATE_SECRET` | shared secret for `POST /revalidate`; must equal the API's `REVALIDATE_SECRET` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | optional "Continue with Google" |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | optional error tracking |

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit tests (variant selection, ICU plurals in AR/EN, money, stores, redirect guard…) |
| `npm run e2e` | Playwright against a **running stack** (API + seeded DB + this app). `E2E_BASE_URL` defaults to `http://localhost:3000` |
| `npm run lint` · `typecheck` | ESLint · `tsc --noEmit` |

E2E scenarios: guest cart → sign-in merge → COD order; admin confirms → customer sees the timeline; cancel before processing;
online methods shown as "coming soon" and unselectable; RTL + language switch; filters in the URL.
Re-seed the API before each run, and start the API with `RATE_LIMIT_SCALE=100` (login is rate-limited).

## Deployment (Vercel)

1. Deploy the **API first** and check its `/health` returns `{"status":"ok","db":"up"}` — this app's build fetches the catalogue for its static shell.
2. Import this repo into Vercel (framework: Next.js, no special settings).
3. Set `BACKEND_URL` (API URL, no trailing path), `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`, then deploy.
4. In the API project set `APP_URL=<this site>` and `REVALIDATE_URL=<this site>/revalidate`.

If the build fails with `Backend … answered 500 …`, the API is unhealthy — the message includes the URL and endpoint that failed.

## How it is built

- **Locale routing** — `src/proxy.ts` redirects `/` to `/ar` or `/en`; every route lives under `app/[locale]`. A small typed i18n layer (`src/i18n`) reads the locale
  from Next's `root-params` so pages stay statically cacheable. The Arabic catalogue is type-checked against the English one, and a test asserts key parity and all six Arabic plural forms.
- **Caching** — public catalogue reads are `"use cache"` functions tagged `products` / `categories` / …; the API calls `POST /revalidate` after edits, so pages refresh in seconds without ever being fully dynamic.
  Private areas (account, checkout, admin) are client-gated and opt out of instant-navigation validation.
- **Auth** — the access token lives only in memory; an httpOnly refresh cookie restores it on load. Refreshes are single-flight because the API treats a re-used refresh token as theft.
- **Design system** — "Alabaster & Walnut" tokens in `globals.css` only (no hex in components), a fixed type scale, 2–4px radii, thin borders, 4:5 imagery, logical (`start`/`end`) classes everywhere so RTL flips by itself.
- **Catalogue UI is data-driven** — filters, swatches and variant pickers are generated from the category's attribute definitions returned by the API.

## Engineering notes

**Why call the API through a rewrite instead of directly?** Same origin ⇒ the refresh cookie is first-party (Safari blocks it between two `*.vercel.app` sites) and no CORS is configured at all.
Server components skip the hop and call the API directly.

**Deviations from the original brief:** `next-intl` was replaced by the small typed i18n layer above (it would force dynamic rendering under Cache Components); the demo imagery is monochrome placeholder photography —
swap the seed URLs for curated Unsplash/Cloudinary assets. Lighthouse ≥ 90 should be verified on the deployed build.
