# Digital Signage

## Deploy on your own domain
1. Get any small VPS (Ubuntu) with Docker installed. Point a DNS A record, e.g. `signage.yourdomain.com`, at its IP.
2. Upload this folder. Edit `Caddyfile` (your domain) and `docker-compose.yml` (ADMIN_PASSWORD, TZ).
3. Run `docker compose up -d`. HTTPS certificates are automatic.
4. Open `https://signage.yourdomain.com/admin` (any username, your password).

No Docker? `ADMIN_PASSWORD=secret node server.js` (Node 18+), then put any HTTPS reverse proxy in front.

## Use
- Screens tab: add a screen, copy its Player URL.
- Media: upload images/videos, add text slides or web pages.
- Playlists: order items, set seconds.
- Schedule: rules by screen, days, time range, date range. Later rules win; otherwise the screen's default playlist plays.

## Samsung signage display
Set the display's content source to the URL Launcher / web browser and enter the Player URL
(`https://signage.yourdomain.com/player?s=SCREEN_ID`). Each screen uses its own `s=` ID.
The dashboard shows a screen as online when it has checked in within the last 45 seconds.
