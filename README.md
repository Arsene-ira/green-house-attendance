# The Green House — Attendance

Mobile web app for tracking daily attendance, replacing the paper log.

## Structure
- `public/` — the frontend (HTML/CSS/JS), served as static files
- `netlify/functions/data.js` — serverless function that reads/writes attendance data to Netlify Blobs (built-in persistent storage, no external database needed)
- `netlify.toml` — tells Netlify where the site and functions live

## Local development
```
npm install
npx netlify-cli dev
```
This runs the site + functions locally with working Blob storage (Netlify CLI emulates it).

## Deploy
See the deployment steps in chat. In short: push this folder to a GitHub repo, then connect that repo in Netlify — no extra database setup needed, Netlify Blobs is automatic.

## Notes
- `TERM_START` in `public/app.js` is set to `2026-08-10` — change it if your term starts on a different date. It controls where the Grid view begins.
- Status codes: P = Present, A = Absent, S = Sick, T = Tardy, Su = Suspended.
- A student is auto-flagged with a suspension note once their tardy count reaches 3 (see `TARDY_THRESHOLD` in `app.js`).
