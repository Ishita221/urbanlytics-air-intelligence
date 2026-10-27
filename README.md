# Urbanlytics Advanced

Public full-stack air-quality intelligence. No sign-in is required.

## Delivered

Live CAMS/Open-Meteo air and weather; fourteen-day provider history; 72-hour outlook; 48-hour experimental forecast with rolling-origin ridge/persistence/seasonal comparison; uncertainty envelopes; city comparison; threshold alerts; anomaly/completeness checks; durable snapshots; ingestion health; SQL refresh leases; private browser scenario storage, export and removal. OpenAQ stations and NASA FIRMS fire adapters need optional server credentials and show honest disconnected states until configured.

## Architecture and full documentation

Read [the project blueprint](docs/BLUEPRINT.md), or open `/blueprint.html` in the deployed application. It covers all modules, data provenance, model limitations, API contracts, SQL schema, browser privacy, provider setup, migration and deployment.

## Local setup

Requires Node 22.13+, npm and Git.

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Use the printed loopback URL. Scenario storage uses its own anonymous browser capability, independently of the starter platform's reserved authentication routes. The app does not link to or call those routes. Production uses a Secure HttpOnly host-only cookie; local development uses a distinct loopback cookie. Clearing cookies loses notebook access; export JSON first. Existing account-era records remain private and require a separate administrative migration to recover.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

GitHub Actions runs these checks. Unit-test synthetic rows exist only in tests; no fabricated production readings are served. Local API checks exercise no-login save/read/delete, two-browser isolation, cross-origin rejection, actual provider data, optional-feed status, city comparison, snapshots and operations metrics.

## Provider secrets

Optional `OPENAQ_API_KEY` and `FIRMS_MAP_KEY` belong only in deployment server secrets. They are not provisioned in this release. CAMS and weather are connected through Open-Meteo. No fake station/fire responses or source percentages are generated. Check provider terms for commercial operation.

## Deployment

Cloudflare Workers + D1 on Sites. Preserve `.openai/hosting.json`, schema migrations and Sites build integration. Push, build and publish the same exact source commit through the Sites workflow; GitHub CI validates but does not itself deploy the Site. Existing public audience is preserved.

## Team

Ishita Srimali · Divya Thakur · Anisha Kumari

Data: CAMS / Copernicus and Open-Meteo, CC BY 4.0. Map © OpenStreetMap contributors.
