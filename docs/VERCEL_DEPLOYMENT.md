# Hosting FootballBank on Vercel

This repository contains two independent Next.js applications in one Git repository:

| Vercel project | Root Directory | Production domain |
| --- | --- | --- |
| FootballBank main website and admin | `.` (repository root) | `footballbank.soccer` and optionally `www.footballbank.soccer` |
| Private media portal | `apps/media-portal` | `media.footballbank.soccer` |

Create **two Vercel projects** connected to the same GitHub repository. Each project builds only its own Next.js app. The main app handles admin access, media publishing and Bunny uploads; the portal serves recipient links and generates signed Bunny playback access. Both apps currently connect to MongoDB using `DATABASE_URL`.

## Before deploying

1. Make sure the latest working code is pushed to the Git branch you intend to deploy.
2. Confirm you can access the MongoDB database from a hosted application. Use MongoDB Atlas or another managed MongoDB service; do not run MongoDB on the Vercel filesystem.
3. Keep your local `.env`, `.env.local`, and `apps/media-portal/.env` files out of Git. **Do not upload or commit those files.** Enter required values individually in Vercel's Environment Variables settings.
4. Have access to the DNS provider for `footballbank.soccer`, Resend, Firebase, Stripe (if using payments), and Bunny Stream.
5. Decide how Preview deployments should work. Do not let a Preview deployment use production credentials or send real media invites by accident. Use staging services and a separate staging database, or restrict testing to Production deployments.

## Create the main website project

1. Sign in at [Vercel](https://vercel.com/) and select the account/team that should own the deployments.
2. Select **Add New → Project**, import `austinjasper007/footballBank.soccer`, and configure:
   - **Root Directory:** `.` (repository root).
   - **Framework Preset:** Next.js (normally detected automatically).
   - **Build Command:** use the project default. The repository build script is `npm run build` and runs `next build --webpack`.
   - **Install Command:** leave automatic detection enabled initially; the repository contains an npm lockfile.
   - **Output Directory:** leave the Next.js default.
3. Add the main-app Environment Variables listed below. Add each variable to the appropriate Vercel environment; use production values only in **Production**.
4. Deploy and inspect the build logs. Do not add a custom output directory or run `next start` as the build command.

## Create the private media portal project

1. From the Vercel dashboard, add another project and import the same GitHub repository.
2. Set **Root Directory** to `apps/media-portal`.
3. Keep the Next.js framework, build command, output directory and package-manager detection on their defaults unless the deployment logs identify a specific setting that needs correction. The app's package script is `npm run build`.
4. Add the media-portal Environment Variables listed below. Use the same production MongoDB database as the main app if you intend both apps to serve the same publications, shares and media records.
5. Deploy and check the build logs.

Vercel's monorepo support lets both projects watch the same repository. Initially, expect a push to trigger deployments for both projects. Once both projects are stable, configure Vercel's monorepo deployment-skipping options if you want to avoid building an app when only the other app changed.

## Environment variables

Use the real values from your secret manager or local environment files, but enter them directly into Vercel. Never place secret values in this document, Git, or a `NEXT_PUBLIC_` variable. Select Production, Preview, and Development scopes deliberately. Redeploy after changing variables; `NEXT_PUBLIC_` values are compiled into the browser bundle at build time.

### Main website project (`.`)

Set these for the main production app:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MongoDB connection string. Configure the database user with only the permissions the app needs. |
| `JWT_SECRET` | Secret used to sign and verify application login tokens. Use a strong, independently generated production secret. |
| `RESEND_API_KEY` | Resend API key used for transactional mail, including private media invitations. |
| `MEDIA_PORTAL_URL` | The media portal's production origin, for example `https://media.footballbank.soccer`. It must be an origin only, with no path, query, or trailing route. |
| `BUNNY_STREAM_API_KEY` | Bunny Stream API key used by the admin upload and media-management endpoints. |
| `BUNNY_STREAM_LIBRARY_ID` **or** `BUNNY_LIBRARY_ID` | Bunny Stream library ID. The app accepts either name. |
| `BUNNY_STREAM_TOKEN_AUTH_KEY` **or** `BUNNY_TOKEN_AUTH_KEY` | Bunny Stream token-authentication key, if configured for signed playback. |
| `BUNNY_WEBHOOK_SECRET` | Bunny webhook secret used by the processing webhook. |
| `BUNNY_STREAM_READ_ONLY_API_KEY` | Read-only Bunny API key where required by collection or webhook verification. The Bunny helper can fall back to `BUNNY_WEBHOOK_SECRET`, but separate credentials are preferable. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web-app configuration. This is public client configuration, not a Firebase Admin/service-account secret. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket used for player files and photos. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web-app configuration. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web-app configuration. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional Firebase Analytics configuration if Analytics is enabled. |
| `NEXT_PUBLIC_SITE_URL` | Set to the canonical production website origin if email links should be generated from an explicit value. The code currently falls back to `https://footballbank.soccer`. |

If the Stripe payment integration is active in production, also configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from the correct live Stripe account. Do not use test keys for production or expose secret keys with the `NEXT_PUBLIC_` prefix.

### Media portal project (`apps/media-portal`)

Set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | The MongoDB connection string for the same database used by the main app. |
| `BUNNY_STREAM_LIBRARY_ID` **or** `BUNNY_LIBRARY_ID` | The Bunny Stream library containing the portal videos. |
| `BUNNY_STREAM_TOKEN_AUTH_KEY` **or** `BUNNY_TOKEN_AUTH_KEY` | Bunny Stream token-authentication key used to sign playback access. |
| `RESEND_API_KEY` | Resend API key used to email private-portal visits and video playback starts to `media@footballbank.soccer`. |

The portal does not need the Bunny write API key for its current playback flow. Do not copy every main-app secret into the portal project without a code requirement.

The sender for media invites is configured in the app as `FootballBank Media <media@footballbank.soccer>`. Verify `footballbank.soccer` as a sending domain in Resend and publish the DNS records Resend requests. This is a sender identity; it does not by itself create a mailbox. Preserve existing MX, SPF, DKIM, and DMARC records when configuring website DNS.

## Connect the domains

Do this after both projects have a successful deployment:

1. In the main Vercel project, open **Settings → Domains** and add `footballbank.soccer`. Add `www.footballbank.soccer` if you want the `www` variant and choose one canonical host/redirect.
2. In the media portal project, open **Settings → Domains** and add `media.footballbank.soccer`.
3. Follow the exact DNS records Vercel displays for each domain. DNS requirements can differ depending on the registrar and existing records; do not assume an old A record or CNAME is correct.
4. At your DNS provider, update only the website records Vercel identifies. **Do not remove or overwrite email-related MX, SPF, DKIM, or DMARC records.**
5. Wait for Vercel to confirm the domains and TLS certificates.
6. Confirm `MEDIA_PORTAL_URL` in the main project is exactly `https://media.footballbank.soccer`, then redeploy the main project so the deployment uses that value.

## External service and production checks

- **MongoDB Atlas:** Permit database connections from the deployed app using the networking/egress options available for your Vercel plan. Prefer a narrowly scoped/static egress option where available. Do not leave a broad `0.0.0.0/0` database allowlist in place without understanding and accepting the exposure.
- **Bunny Stream:** Point the Bunny processing webhook to `https://footballbank.soccer/api/media/bunny-webhook` (or the chosen canonical main-site domain). Confirm the configured Bunny library, webhook secret, and API key match the production environment.
- **Large video uploads:** The app uses Bunny's upload flow; keep video bytes on the direct Bunny upload path rather than proxying large files through a Vercel Function. Verify the browser upload succeeds from the production domain and that Bunny reports the video ready.
- **Firebase Storage:** Confirm Firebase Storage security rules allow the intended signed-in admin workflow and deny unauthorized writes. Firebase web configuration is public; security comes from Firebase rules and authentication, not secrecy of the web API key.
- **Resend:** Send a real test invite to a controlled address. Verify the sender shows as `media@footballbank.soccer`, the link opens the deployed portal, and the time-limited share works.
- **Admin authentication:** Test login, logout, session cookies, admin-only dashboard actions, and a hard refresh on the production domain. HTTPS is required for secure production cookies.
- **Private media access:** Publish a test player with consent, publish at least one ready video, send an invite, play the video, then revoke the share and confirm the old link no longer works.
- **Player profile photos:** Upload and delete a test photo. Confirm it is stored below `players/<player-email>/media-portal/` in the configured Firebase Storage bucket and that deletion removes only that managed object.
- **Payments, if enabled:** Register the production Stripe webhook URL and secret in Stripe. Run a small end-to-end payment test according to Stripe's production test process.
- **Monitoring and cost:** Configure Vercel usage alerts/limits where available, review function logs after deployment, and monitor MongoDB, Bunny, Resend, Firebase, and Stripe usage separately.

## Preview and staging deployments

Vercel creates Preview deployments for non-production branches and pull requests. Avoid sending real invitations from a preview build or exposing private production data through a preview URL.

For safe previews:

1. Create a separate staging MongoDB database and separate Bunny/Firebase/Resend credentials where practical.
2. Use staging environment variables under **Preview** in both Vercel projects.
3. Give the preview portal a stable staging domain (for example `media-staging.footballbank.soccer`) and set the main app's Preview `MEDIA_PORTAL_URL` to that origin.
4. Keep Preview email/API credentials unable to send real invitations or charge real customers.
5. If staging is not ready, limit production environment variables to Production and test after a controlled production deployment instead.

## Rollback

Vercel keeps prior deployments. If a deployment fails or causes a production issue, use the Vercel project deployment page to promote a known-good deployment back to Production. Check both projects after a rollback: the main app and media portal are separate deployments, and their environment variables and domains are managed independently.

## Is Vercel cost-effective for this startup?

Vercel is the lowest-operations option: it builds both Next.js projects from Git, provides previews, domains, TLS and logs without managing a server. Pricing is usage-based beyond included plan quotas, so check the current [Vercel pricing](https://vercel.com/pricing) and set spend alerts.

As of **29 October 2026**, Vercel lists Hobby at $0/month and Pro at $20/month. Vercel's [Hobby terms](https://vercel.com/legal/terms#hobby-plan) restrict Hobby to personal or non-commercial use, so it is not the appropriate production plan for FootballBank as a startup. The terms also state that Vercel may use content on Hobby (and Pro trials) to train or improve AI/ML models. Since private player profiles can contain passport, birth-date, and injury information, use a paid plan, review its current data terms and privacy controls, and do not opt into model training for this project. Pro's included usage and any overages should be checked against expected traffic and media activity.

## Lower-cost alternatives

| Option | Current starting price seen on provider pricing pages | Trade-off |
| --- | --- | --- |
| [Railway](https://railway.com/pricing) | Hobby: $5/month including $5 usage credit; usage beyond that is billed separately. | Managed deployment is simpler than a VPS; a good small-project candidate, but calculate runtime, egress, storage, and plan/custom-domain limits for two apps. |
| [Hetzner Cloud](https://www.hetzner.com/cloud/) | Shared cloud plans currently start at €5.99/month, excluding VAT. | Cheapest traditional VPS option in this comparison. You manage Linux, Node, process supervision, Nginx, TLS, firewall, backups, updates, monitoring, and deployments. Choose a server with enough RAM for both apps and production builds; keep MongoDB managed. |
| [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets) | Basic plans currently list $6/month for 1 GiB RAM and $12/month for 2 GiB RAM. | Predictable, beginner-friendly VPS with documentation. You still manage the operating system and deployment stack; 1 GiB is likely tight for two Next.js apps and builds. |

Prices can change and exclude some taxes, backups, bandwidth, storage, and usage. Review each provider's current terms before choosing.

### Recommendation

- **Choose Vercel Pro** if minimizing maintenance is more important than minimizing the monthly platform bill.
- **Try Railway Hobby** for a lower-operations starting point if its current commercial-use terms and usage limits fit your setup; keep an eye on usage charges.
- **Choose Hetzner Cloud** if the lowest predictable server cost is the priority and you are comfortable maintaining a Linux server. The repository already has Hostinger-oriented deployment configuration, so moving to another VPS would still require adapting and operating the server setup; it is not a one-click Vercel-equivalent.

For any option, keep MongoDB managed, Bunny for video, and Firebase Storage for player files rather than using a small application server as a media-storage host.

## Provider references

- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Vercel build configuration and Root Directory](https://vercel.com/docs/builds/configure-a-build)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains)
- [Vercel pricing](https://vercel.com/pricing)
