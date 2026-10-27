# Vercel deployment

Import the existing `Ishita221/urbanlytics-air-intelligence` GitHub repository into the connected Vercel account. Use the repository root. The checked-in `vercel.json` selects Vite, runs `npm run build:vercel`, and publishes `dist-vercel`.

This deployment serves the Lucknow React workspace on Vercel. Same-origin Node API functions in `api/[...path].ts` relay validated API paths to the existing public Cloudflare Worker. The Worker keeps its D1 database, forecasting, rate limits, data-provider connections and anonymous browser-owner checks. This is a Vercel frontend/API gateway with a Cloudflare data backend, not a migration of D1 into Vercel.

The gateway checks browser origin before relaying writes, enforces JSON and an 8 KiB body limit, restricts target endpoints, forwards the browser capability cookie, and returns private no-store responses. No platform credential or data-provider key belongs in the browser bundle. Browser notebooks are origin-specific, so an existing notebook on the old domain is not automatically visible on the Vercel domain.

Upstream rate limits may aggregate requests by the gateway's egress IP. Validate expected concurrent traffic before wider production use; trusted per-client rate-limit forwarding requires a separately authenticated gateway protocol. The original deployment remains available.

After publishing, test `/api/health`, Lucknow live data, two-browser scenario isolation, save/delete, city comparison, and the public blueprint and demo links. GitHub pushes can trigger Vercel redeployment after its Git integration is connected. Cloudflare backend changes must also be published through its existing workflow.
