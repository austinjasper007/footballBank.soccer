# Hostinger VPS deployment

The main application and media portal are separate Next.js processes. The PM2
configuration uses ports 3000/3001 in production and 3100/3101 in staging.
Deploy each environment from its own checkout so its `.env` files, build output,
and rollback history remain independent.

## Environment

Set the following in the main app's environment:

- `DATABASE_URL`: MongoDB connection string for that environment.
- `BUNNY_LIBRARY_ID` (or `BUNNY_STREAM_LIBRARY_ID`): Bunny Stream library ID.
- `BUNNY_STREAM_API_KEY`: server-only library API key with video create/delete access.
- `BUNNY_STREAM_READ_ONLY_API_KEY` (or `BUNNY_WEBHOOK_SECRET`): the Bunny
  Stream library's Read-Only API key, used to validate webhook signatures.
- `BUNNY_TOKEN_AUTH_KEY` (or `BUNNY_STREAM_TOKEN_AUTH_KEY`): Bunny Stream
  embed-view token-authentication key.
- `MEDIA_PORTAL_URL`: portal origin used in access email links.

Set the following in `apps/media-portal/.env`:

- `DATABASE_URL`: the same environment's MongoDB database as the main app.
- `BUNNY_LIBRARY_ID` (or `BUNNY_STREAM_LIBRARY_ID`): the same Bunny Stream library ID.
- `BUNNY_TOKEN_AUTH_KEY` (or `BUNNY_STREAM_TOKEN_AUTH_KEY`): the server-only embed token key.

Use separate MongoDB databases and Bunny libraries/credentials for staging and
production. Never prefix these secrets with `NEXT_PUBLIC_`. The checked-in
`apps/media-portal/env.example` contains only variable names.

## Bunny configuration

1. Enable embed-view token authentication for the Stream library and set
   `BUNNY_TOKEN_AUTH_KEY` (or `BUNNY_STREAM_TOKEN_AUTH_KEY`) to its token-authentication key.
2. Set the library's allowed embed domains to `media.footballbank.soccer`
   (and the staging hostname only in the staging library).
3. Configure the Bunny Stream webhook URL as
   `https://footballbank.soccer/api/media/bunny-webhook`. Bunny signs requests
   with the library's Read-Only API key; set that exact key as
   `BUNNY_STREAM_READ_ONLY_API_KEY` or `BUNNY_WEBHOOK_SECRET` in the main app
   environment.
4. Allow MP4/MOV source uploads and adaptive streaming in Bunny Stream. Bunny
   receives resumable TUS uploads directly from the browser using credentials
   scoped to one video ID and expiring after 24 hours; the library API key never
   leaves the server.
5. Uploads are automatically placed in the Bunny `Match` or `Highlights`
   collection based on their selected footage type. Use **Organize Bunny
   collections** in the admin Media Portal to move existing FootballBank videos
   into the corresponding collection.

### Local development webhook

Bunny cannot send webhook requests to `localhost`. Run the main app on port
3000, then expose that port through an HTTPS tunnel. On Windows, install ngrok
from PowerShell:

```powershell
winget install --id Ngrok.Ngrok -e
```

If PowerShell still says `ngrok` is not recognized, locate `ngrok.exe`:

```powershell
Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter ngrok.exe -Recurse -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty DirectoryName
```

Add the directory printed by that command to your **user Path**:

1. Open Start and search for **Edit environment variables for your account**.
2. Under **User variables**, select **Path** → **Edit** → **New**.
3. Paste the ngrok directory (the folder containing `ngrok.exe`), then click **OK**.
4. Close and reopen the VS Code terminal.

Check that PowerShell can now find it, then configure the auth token from your
ngrok account once and start the tunnel:

```powershell
Get-Command ngrok
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
ngrok http 3000
```

Do not type `sh` before these commands. Keep the tunnel terminal open while
testing.

In Bunny Stream's library webhook settings, use the tunnel's public HTTPS URL
with `/api/media/bunny-webhook` appended, such as
`https://<your-tunnel-host>/api/media/bunny-webhook`. The webhook belongs to the
main app on port 3000, not the separate media portal on port 3001. Keep the
tunnel running while testing and update Bunny's webhook URL whenever the
tunnel hostname changes. Set the library's Read-Only API key in the main app's
local environment as `BUNNY_STREAM_READ_ONLY_API_KEY` (or
`BUNNY_WEBHOOK_SECRET`), then restart the development server.

## Build and start

Install dependencies and build each checkout before starting or reloading it:

```sh
npm ci
npm run build
npm --prefix apps/media-portal ci
npm --prefix apps/media-portal run build
pm2 start deploy/hostinger/ecosystem.config.cjs
pm2 save
```

For staging, set `FOOTBALLBANK_ROOT` to the staging checkout and `DEPLOY_ENV=staging`
when invoking PM2. Configure a staging reverse-proxy hostname to ports 3100 and
3101 and issue its own TLS certificate. The production Nginx example routes
`footballbank.soccer` to port 3000 and `media.footballbank.soccer` to port 3001.
Review certificate paths and existing virtual hosts before enabling it.

After deploying a new version, build and reload only the affected process:

```sh
pm2 reload footballbank-main
pm2 reload footballbank-media-portal
```

For rollback, check out the previous known-good release in that app's deployment
checkout, rebuild it, and reload only its PM2 process. Keep the two process
names, build outputs, and release directories separate so either app can be
rolled back independently. Do not run production database reset commands as
part of deployment.
