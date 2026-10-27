# Urbanlytics

Full-stack city air quality monitoring, forecasting and transparent policy sensitivity analysis.

## Features

- Live server-side CAMS / Open-Meteo air quality and weather integration. No demo data or generated production readings.
- Search cities globally, six India shortcuts, real location map and timestamped US AQI / pollutant concentrations.
- 24-hour, 72-hour and 7-day archived model trends; 72-hour provider forecast.
- Experimental ridge autoregression retrained from seven days of provider history. Chronological holdout MAE and persistence comparison.
- PM2.5 policy sensitivity using explicit user-entered source shares and emission cuts.
- Authenticated, owner-isolated SQL scenario storage and CSV export.
- Persistent shared caching, stale-if-error, bounded retries, provider response validation, parameterized queries and atomic SQL rate limits.

## Stack

React 19 + TypeScript + Vinext (Next-compatible routing), Cloudflare Workers, Cloudflare D1 SQLite, Drizzle schema migrations, Zod, Lucide icons, SVG charts. One deployment serves the frontend and API; no cross-origin backend dependency. The edge-compatible regression does not need a separate Python inference server.

## Run locally

Requires Node 22.13+, npm and Git. No API key is required for non-commercial use of the standard Open-Meteo endpoints. Check provider terms before commercial operation.

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Open the Local URL printed by the dev server (normally http://localhost:5173). For local account testing, visit `/signin-with-chatgpt?return_to=/`; the supplied starter only simulates identity on loopback development requests. Production uses hosting-owned ChatGPT sign-in. Do not trust identity headers on an unprotected custom origin: use an authentication gateway that strips and verifies them.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` previews the compiled Worker with persisted local D1. Local and production databases are separate. Never seed production with test readings. Synthetic unit-test rows exist only in `tests/` to verify numerical boundaries and leakage prevention.

## API

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | SQL connectivity and service status |
| `GET /api/air?name=Delhi&latitude=28.6139&longitude=77.209` | Validated live/cached model history, current conditions, forecast and model metrics |
| `GET /api/places?q=Delhi` | Provider city geocoding |
| `GET /api/scenarios` | Latest 50 scenarios belonging to the authenticated account |
| `POST /api/scenarios` | Same-origin JSON; signed-in user required; baseline re-fetched server-side |

Scenario JSON: `{ "name": "Transport plan", "place": { "name": "Delhi", "latitude": 28.6139, "longitude": 77.209 }, "shares": [40, 30, 0], "cuts": [20, 0, 0] }`. The numbers in this request example are **assumptions**, not source measurements. Contributions must sum to at most 100. Source order: road traffic, industry, open burning. The server ignores any client baseline and obtains its own fresh provider baseline.

## Data integrity and modelling

Air quality: [CAMS via Open-Meteo](https://open-meteo.com/en/docs/air-quality-api). Weather: [Open-Meteo](https://open-meteo.com/en/docs). Global CAMS resolution is about 45 km; European coverage about 11 km. Pollutants use micrograms per cubic metre, temperature Celsius, wind km/h. US AQI is provider-supplied and is not India's CPCB AQI. Values are model output, not a physical sensor feed. Past values are archived model output, not independent observations. Missing values remain null.

Dashboard refresh: five minutes. Shared SQL cache: ten minutes. Provider update frequency is independent of these intervals. During provider failure a response retrieved within six hours can be returned with `cache: stale`, a warning, and unchanged timestamps; otherwise return an error. The UI also preserves a previously loaded response on refresh failure with an explicit error. No random readings or fallback series are supplied.

The experimental regression uses lag-1, lag-24 and lag-48 PM2.5, periodic time features, temperature, wind and humidity. It uses ridge regularization and chronological holdout testing against one-hour persistence. Holdout metrics are one-step and cannot be interpreted as 48-hour forecast validation. Future weather is provider forecast input. Future pollutant targets do not enter fitting or recursive prediction. No claimed sensor accuracy or validated source attribution.

Simulator: `PM2.5_after = PM2.5_baseline * (1 - sum(source_share * emission_cut))`, with fractions in [0,1]. This is a sensitivity calculator, not a calibrated digital twin. Weather, chemistry and transport are held fixed. All default shares and cuts are zero. An emissions inventory or validated apportionment study is needed for real source percentages. CPCB station readings, NASA FIRMS fires and Google Earth Engine are not integrated in this release and are never shown as connected.

## Storage and security

Schema in `db/schema.ts`; immutable SQL migrations in `drizzle/`. Production binding `DB` is declared in `.openai/hosting.json`. Queries use bound parameters. Shared air responses contain public environmental data only. Scenario reads are filtered by the verified account ID; scenario writes never accept a client owner ID. Same-origin checks protect writes, JSON and size constraints limit accepted payloads, and atomic SQL counters limit requests. IP rate-limit keys are SHA-256 hashed and expire. Provider hosts are fixed, avoiding arbitrary server-side URLs. Credentials and local runtime state are ignored by Git.

## Deploy and operate

This checkout is configured for Sites on Cloudflare Workers with managed D1 provisioning and schema migration. The hosting source repository and GitHub repository are separate remotes. A GitHub push alone does not deploy the Site. Publish the tested source commit through the Sites workflow; migrations apply before the Worker is uploaded. New deployments are owner-private by default. CI runs tests, type checks and build; it does not embed deployment credentials.

Check `/api/health` after deployment. For production adoption, add load testing, external error/uptime monitoring, an API service plan where required, an independently observed validation dataset, and data governance appropriate to the deployment. Scaling limits depend on hosting and upstream quotas. This initial release has not been load-tested or independently validated.

## Team

Ishita Srimali · Divya Thakur · Anisha Kumari

Data attribution: CAMS / Copernicus Atmosphere Monitoring Service and Open-Meteo, CC BY 4.0. Map © OpenStreetMap contributors.
