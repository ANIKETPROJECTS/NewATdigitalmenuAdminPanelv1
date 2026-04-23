# Deploying AT Digital Menu to a VPS (PM2 + Nginx + Certbot)

Target setup:
- KVM 2 VPS (Ubuntu/Debian assumed)
- Node app runs on **port 3012** behind Nginx
- Public domain: **https://admin.atdigitalmenu.com**
- All credentials live in `ecosystem.config.cjs` (no `.env` file used)

---

## 1. Push the project to your VPS

On your VPS:

```bash
sudo mkdir -p /var/www/at-digital-menu
sudo chown -R $USER:$USER /var/www/at-digital-menu
cd /var/www/at-digital-menu

# Clone or upload your project here, e.g.:
git clone <your-repo-url> .
# or use scp/rsync to copy the project files
```

Make sure the path matches the `cwd` value in `ecosystem.config.cjs`
(`/var/www/at-digital-menu`). If you place the app elsewhere, update `cwd`.

---

## 2. Install dependencies and build

```bash
cd /var/www/at-digital-menu
npm install
npm run build
```

This creates `dist/index.js` (server bundle) and `dist/public/` (built frontend).

---

## 3. Fill in real credentials in `ecosystem.config.cjs`

Open `ecosystem.config.cjs` and replace every placeholder inside the `env` block:

| Variable      | What to put                                                                 |
|---------------|------------------------------------------------------------------------------|
| `MONGODB_URI` | Your production MongoDB Atlas connection string (URL-encode special chars). |
| `JWT_SECRET`  | A long random string. Generate one with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `EMAIL_USER`  | The Gmail address used to send OTP / notifications.                         |
| `EMAIL_PASS`  | A Gmail **App Password** (not the account password).                        |
| `APP_URL`     | `https://admin.atdigitalmenu.com` (already preset).                         |

> If using MongoDB Atlas, whitelist your VPS public IP in
> Atlas → Network Access, otherwise the connection will fail.

---

## 4. Start the app with PM2

```bash
cd /var/www/at-digital-menu
pm2 start ecosystem.config.cjs
pm2 save                     # persist current process list
pm2 startup                   # follow the printed command to enable boot autostart
```

Useful commands:

```bash
pm2 status
pm2 logs at-digital-menu
pm2 restart at-digital-menu
pm2 reload  at-digital-menu   # zero-downtime reload after code changes
pm2 stop    at-digital-menu
```

Confirm the app is up locally on the VPS:

```bash
curl -I http://127.0.0.1:3012
```

You should get an HTTP response (200/302/etc.).

---

## 5. Configure Nginx for `admin.atdigitalmenu.com`

Copy the provided config:

```bash
sudo cp /var/www/at-digital-menu/nginx.conf.production \
        /etc/nginx/sites-available/admin.atdigitalmenu.com

sudo ln -s /etc/nginx/sites-available/admin.atdigitalmenu.com \
           /etc/nginx/sites-enabled/admin.atdigitalmenu.com

sudo nginx -t
sudo systemctl reload nginx
```

Make sure your DNS already has an **A record** pointing
`admin.atdigitalmenu.com` → your VPS public IP (and propagation has finished),
otherwise certbot will fail.

---

## 6. Issue an SSL certificate with Certbot

```bash
sudo certbot --nginx -d admin.atdigitalmenu.com
```

Certbot will:
- Verify domain ownership over HTTP
- Add a `listen 443 ssl http2;` server block to the Nginx config
- Add automatic redirect from HTTP → HTTPS
- Install a systemd timer that auto-renews the certificate

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

Your app should now be live at:

**https://admin.atdigitalmenu.com**

---

## 7. Updating the app later

```bash
cd /var/www/at-digital-menu
git pull                       # or rsync new files
npm install
npm run build
pm2 reload at-digital-menu
```

If you change credentials in `ecosystem.config.cjs`, you must
**reload the env** (a normal reload won't pick up env changes):

```bash
pm2 restart at-digital-menu --update-env
```

---

## 8. Troubleshooting

- **502 Bad Gateway** → app isn't listening on 3012. Check `pm2 logs at-digital-menu`.
- **MongoDB connection error** → verify `MONGODB_URI` and that the VPS IP is whitelisted in Atlas.
- **OTP emails not sending** → ensure `EMAIL_USER` and a valid Gmail **App Password** are set in `EMAIL_PASS`.
- **Port already in use** → another process is on 3012. Find it: `sudo lsof -i :3012`.
- **Nginx config errors** → `sudo nginx -t` shows the line; fix and `sudo systemctl reload nginx`.
- **Certbot failed** → confirm DNS A record resolves to your VPS:
  `dig +short admin.atdigitalmenu.com`.
