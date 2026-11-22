Read skill `deploy-to-hosting`
Completed with input: {"skill":"deploy-to-hosting"}

Read 
Completed with input: {
  "path": "C:\\Users\\Augustine Ugochukwu\\Desktop\\WEB PROJECTS\\football_bank_js\\deploy\\hostinger\\README.md"
}

Search for `VPS|PM2|Nginx|3000|3001|MEDIA_PORTAL_URL|DATABASE_URL|systemd|ecosystem`

Find files matching `deploy/hostinger/**/*`

Read 
Completed with input: {
  "path": "C:\\Users\\Augustine Ugochukwu\\Desktop\\WEB PROJECTS\\football_bank_js\\deploy\\hostinger\\nginx-footballbank.conf"
}

Read 
Completed with input: {
  "path": "C:\\Users\\Augustine Ugochukwu\\Desktop\\WEB PROJECTS\\football_bank_js\\apps\\media-portal\\env.example"
}
Tool execution failed: Path does not exist

Read 
Completed with input: {
  "path": "C:\\Users\\Augustine Ugochukwu\\Desktop\\WEB PROJECTS\\football_bank_js\\deploy\\hostinger\\ecosystem.config.cjs"
}

Read , lines 1 to 48
Completed with input: {
  "path": "C:\\Users\\Augustine Ugochukwu\\Desktop\\WEB PROJECTS\\football_bank_js\\deploy\\hostinger\\README.md",
  "view_range": [
    1,
    48
  ]
}

Read , lines 90 to 127
Completed with input: {
  "path": "C:\\Users\\Augustine Ugochukwu\\Desktop\\WEB PROJECTS\\football_bank_js\\deploy\\hostinger\\README.md",
  "view_range": [
    90,
    127
  ]
}

Search for `process\.env\.[A-Z0-9_]+`

Search for `process\.env\.(DATABASE_URL|JWT_SECRET|RESEND_API_KEY|BUNNY|MEDIA_PORTAL_URL|...`

Ran terminal command: Get-ChildItem apps\media-portal -Force -Name | Where-Object { $_ -match 'env|lock|package' }; Get-Content apps\media-portal\package.json; Get-Content package.json -TotalCount 20

The repository already includes a PM2 process configuration and an Nginx example: `Hostinger deployment guide`, `PM2 config` and `Nginx config`. The steps below deploy both apps on **one Hostinger VPS**, using ports **3000** and **3001** behind Nginx.

## 1. Prepare the VPS and domains

1. In Hostinger, provision an Ubuntu VPS and note its public IP.
2. In your DNS provider, point `footballbank.soccer` and `media.footballbank.soccer` to that IP. Add `www.footballbank.soccer` too if you use it.
3. In Hostinger’s firewall and the VPS firewall, allow SSH (`22`), HTTP (`80`) and HTTPS (`443`). Don’t expose ports `3000` or `3001` publicly.
4. Connect over SSH and install the server tools:

```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
apt install -y git nginx curl ufw certbot python3-certbot-nginx
```

Create a non-root account for deployment, then enable the firewall after allowing SSH:

```bash
adduser deploy
usermod -aG sudo deploy
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Confirm you can SSH in as `deploy` before closing your root session.

## 2. Install Node.js and PM2

SSH in as `deploy`, then install Node.js 22 and PM2:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm alias default 22
npm install -g pm2
```

Check the installation:

```bash
node --version
npm --version
pm2 --version
```

## 3. Get the code onto the server

Give the VPS read access to your GitHub repository using an SSH deploy key, then clone it. Don’t put a GitHub access token in the clone URL.

```bash
mkdir -p ~/apps
git clone git@github.com:austinjasper007/footballBank.soccer.git ~/apps/footballbank
cd ~/apps/footballbank
```

If you use HTTPS, use it only for a public repository or configure private-repository credentials securely.

## 4. Configure environment variables

Create the main app’s environment file and restrict its permissions:

```bash
cd ~/apps/footballbank
nano .env
chmod 600 .env
```

Add the production values your main app uses, including:

- `DATABASE_URL` — a MongoDB connection string. **This app uses MongoDB, not Hostinger’s MySQL database.**
- `JWT_SECRET`
- `RESEND_API_KEY`
- `MEDIA_PORTAL_URL=https://media.footballbank.soccer`
- Bunny credentials: `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_TOKEN_AUTH_KEY`, and `BUNNY_STREAM_READ_ONLY_API_KEY` (or the documented alternatives)
- Firebase `NEXT_PUBLIC_FIREBASE_*` configuration values used by the app
- `NEXT_PUBLIC_SITE_URL=https://footballbank.soccer`
- Stripe keys only if payments are enabled

Then create the portal’s separate environment file:

```bash
nano apps/media-portal/.env
chmod 600 apps/media-portal/.env
```

Set `DATABASE_URL`, the same Bunny library ID and playback token key, and `RESEND_API_KEY` for portal activity notifications. Use the same production database and Bunny library for both production apps. Keep staging data and credentials separate.

**Do not commit either `.env` file or use `NEXT_PUBLIC_` for secrets.** You can edit the files without sharing their values here.

## 5. Configure Bunny

In Bunny Stream:

1. Enable token-authenticated embed playback and use its token key in the portal environment.
2. Allow `media.footballbank.soccer` as an embed domain.
3. Set the processing webhook URL to `https://footballbank.soccer/api/media/bunny-webhook`.
4. Use the Bunny Read-Only API key expected by the main app’s webhook verification.

## 6. Install dependencies and build both apps

From the repository root:

```bash
cd ~/apps/footballbank
npm ci
npm run build
npm ci --prefix apps/media-portal
npm run build --prefix apps/media-portal
```

The portal has its own `package.json` and lockfile, so install and build it separately.

## 7. Start the apps with PM2

Start both processes using the included production configuration:

```bash
cd ~/apps/footballbank
pm2 start deploy/hostinger/ecosystem.config.cjs
pm2 status
pm2 save
pm2 startup
```

`pm2 startup` prints a command to enable PM2 at boot. Run the exact command it prints, then run `pm2 save` again. The included config starts the main app on `3000` and the portal on `3001`.

Check local responses:

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:3001
```

If either app fails, inspect its logs with `pm2 logs footballbank-main` or `pm2 logs footballbank-media-portal`.

## 8. Set up HTTPS and Nginx

Once DNS points to the VPS and ports 80/443 are open, obtain a certificate. Include `www` only if you configured its DNS record:

```bash
sudo certbot --nginx \
  -d footballbank.soccer \
  -d media.footballbank.soccer \
  -d www.footballbank.soccer
```

Install the repository’s Nginx config:

```bash
sudo cp ~/apps/footballbank/deploy/hostinger/nginx-footballbank.conf /etc/nginx/sites-available/footballbank
sudo ln -s /etc/nginx/sites-available/footballbank /etc/nginx/sites-enabled/footballbank
sudo nginx -t
sudo systemctl reload nginx
```

If `ln` reports that the link already exists, inspect the existing site configuration rather than overwriting it. The provided file routes the main domain to port 3000 and the media subdomain to port 3001. Its certificate paths expect the Let’s Encrypt certificate named `footballbank.soccer`; make sure Certbot created that certificate with all the hostnames you use.

Check that renewal works:

```bash
sudo certbot renew --dry-run
```

## 9. Verify both sites

Open `https://footballbank.soccer` and `https://media.footballbank.soccer`. Test admin sign-in and publishing, open a private player link, play a video, and check the Bunny webhook. Review app logs with PM2 if anything fails.

For future updates, pull the intended branch, rebuild, then reload the relevant PM2 process:

```bash
cd ~/apps/footballbank
git pull --ff-only
npm ci
npm run build
npm ci --prefix apps/media-portal
npm run build --prefix apps/media-portal
pm2 reload footballbank-main
pm2 reload footballbank-media-portal
```

One staging caveat: the PM2 config maps the staging portal to port `3101`, but the portal’s current start script specifies port `3001`. Use the production setup above for now; staging needs a small configuration adjustment first.