# Change Log

## 2026-04-22
- Created new project `freeltc-autoclaim` for Boskuu's request to automate `https://freeltc.online/dashboard`.
- Mapped the public auth boundary enough to pin these facts:
  - `/login` is public and serves a normal email/password form plus a custom anti-captcha widget.
  - unauthenticated `/dashboard`, `/faucet`, and `/ptc` requests bounce back to `/`.
  - the real login submit endpoint is `POST /auth/login`.
- Deobfuscated the relevant front-door scripts enough to recover the important runtime behavior:
  - the page publishes `window.app_url`, `window.litoshi_api_key`, and `window.litoshi_secret_key`.
  - `source/anticap.js` renders `.anti-captcha`, fetches `/anticap/get_token`, fetches `/anticap/get_challenge`, then posts to `/anticap/validate_choice`.
  - successful client-side solve writes `anti_captcha_key`, `anti_captcha_token`, `anti_captcha_selected_icon`, and `anti_hash` into hidden inputs before submit.
- Built a reusable local solver in `src/anti-captcha.js` that compares the preview image to the six option images using alpha-bounded normalization plus mean absolute RGBA distance.
- Live evidence for that solver:
  - repeated challenge test ran for 12 consecutive live widgets.
  - result was `12/12` successful solves.
- Built a Playwright-based login lane in `src/freeltc-browser.js` with:
  - persistent session storage support
  - artifact capture under `state/`
  - login outcome logging
  - optional proxy support through environment variables
- Real login validation with the provided credentials reached a clean server oracle:
  - outcome: `VPN/ Proxy is not allowed!`
  - meaning: the anti-captcha and form submit are working, but this VPS/browser egress is being rejected on reputation grounds.
- Added `src/session-probe.js` so an imported authenticated cookie jar can be tested immediately against `/dashboard`, `/faucet`, and related candidate routes without reworking the repo.
- Published the scaffold repo to GitHub at `https://github.com/IndraYuda13/freeltc-autoclaim`.
