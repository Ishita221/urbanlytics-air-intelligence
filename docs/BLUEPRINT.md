# Urbanlytics Advanced — Project Blueprint

Default demonstration city: Lucknow, Uttar Pradesh, India (26.8467 N, 80.9462 E). The city selector still supports other locations. The policy simulator always uses the selected city’s current model baseline.

Version 2 · 27 October 2026

## 1. Purpose and delivered scope

Urbanlytics is a public full-stack environmental intelligence workspace. It combines live atmospheric model data, forecast evaluation, city comparison, pollution alerts, explicit policy assumptions, browser-private saved scenarios, and pipeline visibility. No account or sign-in is required by the application.

Delivered: live CAMS and weather data; fourteen days of archived provider history; 72-hour provider outlook; experimental 48-hour predictions; rolling-origin comparison of three predictors; empirical uncertainty envelopes; threshold alerts; anomaly and completeness checks; multi-city comparison; durable snapshots; ingestion metrics and distributed refresh locks; private browser scenario storage; CSV/JSON export; secure OpenAQ and FIRMS adapters; this blueprint.

Provider access still required: OpenAQ ground stations and NASA FIRMS satellite detections need separately provisioned server secrets. Until configured, these feeds show “key required” and return empty datasets. No measurements, fires or source percentages are invented. This release is not a calibrated atmospheric digital twin, an independently validated station forecasting service, or a continuously scheduled municipal data platform.

## 2. Architecture

Browser workspace → same-origin REST API → validation / rate limiting → SQL cache and collection lease → fixed external provider endpoints → validated hourly series → forecast and analytics engines → SQL snapshots / run metadata → timestamped API response.

Browser scenario requests → same-origin check → random HttpOnly cookie capability → SHA-256 owner key → parameterized SQL constrained by that owner. The API never accepts a client-supplied owner identifier. The cookie is not an account and is not a cross-device identity.

Frontend: React 19, TypeScript, responsive CSS, Lucide icons and SVG charts. Server: Vinext Next-compatible routing on Cloudflare Workers. Database: Cloudflare D1 SQLite, versioned through Drizzle. Build and CI: npm lockfile, TypeScript checks, Node tests, compiled Worker and GitHub Actions. Hosting: Sites; public audience preserved.

## 3. Product modules

- Overview: US AQI category, six pollutant concentrations, weather context, map and historical chart.
- Forecast and insights: provider outlook, experimental selected forecast, one-step diagnostic error, rolling multi-hour errors and uncertainty ranges.
- Policy simulator: user-assumed traffic, industry and open-burning PM2.5 fractions; editable emission reductions; server-verified live baseline.
- Saved scenarios: no-login browser-private records; latest 50 shown; JSON backup and owner-constrained removal. Maximum 200 records per browser.
- City comparison: up to six selected Indian cities; two concurrent city refreshes at a time; timestamps, cache states and partial failures preserved.
- Alerts and quality: configurable device-local US AQI threshold, forecast exceedance hours, 24-hour change, exploratory PM2.5 deviation score, missing fields, time gaps and collected snapshots.
- Source evidence: nearby OpenAQ station measurements and nearby VIIRS hotspots when credentials are present; delayed measurements remain flagged.
- System health: database-backed refresh attempts, success ratio, mean latency, stored snapshots and provider configuration state.

## 4. Data contracts and provenance

Air quality comes from CAMS through Open-Meteo; weather from Open-Meteo models. Air concentrations are in µg/m³, wind in km/h, temperature in °C and humidity in %. US AQI is provider-supplied; it is not the Indian CPCB AQI. CAMS global data is approximately 45 km resolution, with approximately 11 km European coverage. The map is location context, not a street-level pollution raster.

The API requests fourteen past days and five forecast days. The main display uses the next available 72 hourly values; the experimental model predicts up to 48 hours. Past rows are archived model outputs, not independent measurements. Missing values remain null. Both valid time and retrieval time are retained.

OpenAQ: query up to five locations within 25 km, then request each location's latest sensor readings. Parameter units and measurement timestamps are retained. Values more than three hours old are marked delayed. Latest readings do not guarantee complete historical coverage.

FIRMS: query VIIRS NOAA-20 near-real-time detections over the provider's last-day window, filter to within 150 km, return up to 100 closest detections with coordinates, acquisition time, confidence flag and fire radiative power. A hotspot does not establish stubble burning, transport to the city, or a causal source share.

## 5. Forecast design and evaluation

Candidate 1: ridge autoregression with lag-1, lag-24 and lag-48 PM2.5, cyclical hour, temperature, humidity and wind. Candidate 2: persistence. Candidate 3: daily seasonal persistence. Historical fitting uses only targets before each evaluation origin.

Origins step forward every six hours over up to the last 144 historical hours, requiring sufficient earlier training data. Each candidate predicts recursively. Compare absolute errors at 6, 12 and 24 hours. Select the candidate with the lowest mean 24-hour error, then forecast recursively from all available historical samples. A separate last-24-sample one-step ridge diagnostic remains visible.

Indicative envelope: selected forecast ± empirical 80th percentile absolute error at the applicable evaluated horizon. At least five residuals are required. Lower concentrations are bounded at zero; no envelope is provided beyond 24 hours. These are exploratory envelopes, not a guarantee of 80% coverage. Selection and envelope estimation reuse residuals; origins overlap. Historical target-time weather is used for hindcasts, making them more optimistic than an operational forecast with uncertain future weather. Independent station validation and archived issuance-time weather are needed before accuracy claims.

## 6. Alerts, quality and simulation

Forecast threshold rule: count the next 72 available hourly US AQI values at or above a user-selected threshold from 50 to 500. Show first exceedance and the peak. Rule evaluation happens while the dashboard is open; no email, SMS or background push is configured.

Pattern rule: compare current PM2.5 with up to 168 preceding values; flag an absolute z-score of at least three. This is a descriptive deviation, not an event detector validated against fires or emissions. Completeness measures presence of seven air fields over the latest available 24 rows; timeline gaps are counted separately. Neither completeness nor connection status proves accuracy.

Simulation: PM2.5_after = PM2.5_baseline × [1 − Σ(assumed source fraction × emission cut fraction)]. Fractions must lie between zero and one and source fractions must total at most one. Background stays unchanged. Default fractions and cuts are zero. The server re-fetches its own fresh baseline when saving; stale baselines are rejected. No dispersion, weather feedback, chemistry or verified source apportionment is implied.

## 7. Database blueprint

| Table | Primary key and fields | Purpose |
| --- | --- | --- |
| air_cache | key; payload; fetched_at | Shared air and evidence responses |
| rate_limits | key; count; expires | Atomic fixed-window request limits |
| scenarios | id; user_id; name; payload; created_at | Browser-owned scenario assumptions and verified baseline |
| snapshots | id; location_key; name; valid_at; retrieved_at; payload | Latest retrieved current-model record per city/hour |
| ingestion_runs | id; location_key; status; started_at; duration_ms | Collection success/failure and latency |
| ingestion_leases | key; token; expires | Distributed single-refresh coordination |

Indexes: scenario owner/date, snapshot location/time and ingestion time. Migrations 0000 and 0001 are immutable once deployed. Local and production databases are separate. Snapshots and ingestion records older than 30 days are trimmed during subsequent collection. Existing account-era scenario rows remain stored and are not exposed to anonymous browsers; recovery would require a separately authorized administrative migration.

## 8. API blueprint

| Route | Contract |
| --- | --- |
| GET /api/air | Validated name/latitude/longitude; live or explicitly cached/stale air response and model evaluation |
| GET /api/places | City geocoding, query length 2–80 |
| GET /api/compare | Selected city indices, maximum six; partial results and per-city failures |
| GET /api/evidence | Station/fire data or explicit configuration/unavailability status |
| GET /api/history | Latest 168 stored current-model hours for validated coordinates |
| GET /api/operations | Public aggregate run metrics and connector readiness; no secrets or per-user records |
| GET /api/health | SQL connectivity and service status |
| GET /api/scenarios | Latest 50 records belonging to this browser capability; creates a cookie if needed |
| POST /api/scenarios | Same-origin JSON, validated assumptions, fresh server baseline, browser owner |
| DELETE /api/scenarios | Same-origin JSON UUID; delete only if the browser owns it |

Air responses are cached for ten minutes. Dashboard checks every five minutes. During provider failure, a stored response retrieved within six hours can be returned with a stale warning and original timestamps; otherwise the API errors. Expiring SQL leases prevent cross-isolate overlapping refreshes. Provider requests have bounded retries/timeouts. In-memory request coalescing reduces duplicate work within an isolate.

## 9. Privacy and security

Production browser token: 32 random bytes in a Secure, HttpOnly, SameSite=Lax, host-only cookie. The database stores only a SHA-256-derived browser owner key. Development uses a separate non-Secure loopback cookie name. Cookie lifetime is one year. Clearing cookies, switching browser profiles or using another device creates a different private notebook. Export JSON before clearing browser data. This is not account recovery or cross-device sync.

Scenario SQL always includes owner scope. Writes require the exact request origin and application/json; streamed bodies are capped at 8 KiB. API inputs are validated with Zod, SQL values are bound parameters, provider hosts are fixed, and rate-limit keys hash the source IP. No data-provider credential is returned to clients or stored in Git. Public operational metrics expose aggregate collection state only.

## 10. Provider setup and deployment

Optional server secrets: OPENAQ_API_KEY and FIRMS_MAP_KEY. Provision them through the hosting environment's secret controls, not frontend forms, source files or chat messages. After provisioning, inspect Source evidence to verify actual reachability; “configured” only means the secret exists. The initial advanced deployment has neither optional credential provisioned.

Local workflow: npm ci; npm run build; npm run db:migrate:local; npm run dev. The local migration script tracks applied migration files to avoid replay. Validate with npm test, npm run typecheck and npm run build.

Release workflow: open the existing Sites source repository; retain project identity and public access; implement and validate; package the exact pushed commit; save the version and deploy it; verify terminal deployment status, SQL health and public API behavior. Push the same tested source to GitHub. GitHub CI validates source; a GitHub push alone does not publish the hosted Site.

## 11. Verification and next production milestone

Verify browser A cannot list/delete browser B's scenarios; invalid/cross-origin writes fail; missing provider keys return empty explicitly disconnected feeds; forecasts never train on future pollutant targets; comparison preserves partial failure; collected snapshots come from actual requests; no application links invoke external sign-in.

Next production milestone: provision and validate station/fire feeds; accumulate months of monitored observations; use issuance-time archived weather; independently backtest by station, season and horizon; calibrate intervals on a disjoint set; add externally monitored ingestion scheduling and incident alerts; load-test against expected traffic; set backup/recovery procedures; obtain an emissions inventory and calibrate dispersion before calling the simulator a digital twin. These are future work, not represented as delivered capabilities.

## References

- Open-Meteo air quality documentation: https://open-meteo.com/en/docs/air-quality-api
- OpenAQ latest readings: https://docs.openaq.org/resources/latest
- OpenAQ API authentication: https://docs.openaq.org/api
- NASA FIRMS Area API: https://firms.modaps.eosdis.nasa.gov/api/area

Team: Ishita Srimali · Divya Thakur · Anisha Kumari.
