# freeltc-autoclaim

Autoclaim scaffold for `https://freeltc.online/dashboard`.

## Current status
- custom login anti-captcha solved locally with a reusable alpha-shape matcher
- browser login lane implemented with persistent session storage
- current real blocker is the site rejecting this VPS/browser egress with `VPN/ Proxy is not allowed!`
- authenticated faucet mapping is still pending until a clean residential/mobile session is available

## Commands
- `npm run capture-login-captcha`
- `FREELTC_EMAIL=... FREELTC_PASSWORD=... npm run login-once`
- `npm run probe-session` after placing imported cookies in `state/imported-cookies.json`

## Environment
- `FREELTC_EMAIL`
- `FREELTC_PASSWORD`
- `FREELTC_PROXY_SERVER`
- `FREELTC_PROXY_USERNAME`
- `FREELTC_PROXY_PASSWORD`
- `FREELTC_USER_AGENT`
- `CHROME_PATH` default `/usr/bin/google-chrome`

## Local structure
- `src/` automation code
- `docs/` target notes
- `state/` runtime artifacts and imported cookies
- `logs/` long-run logs
- `ROADMAP.md` live checklist
- `CHANGELOG.md` durable change log

## Practical next step
If Boskuu can provide either:
- a residential/mobile proxy that this site accepts, or
- imported authenticated cookies from a normal browser session,

then `npm run probe-session` can continue the dashboard and faucet mapping immediately.

