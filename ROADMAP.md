# FreeLTC Autoclaim Roadmap

## Top-level checklist
- [done] 1. Map live login page and captcha boundary
- [done] 2. Build browser automation scaffold with persistent session storage
- [done] 3. Implement reusable anti-captcha solver for the new login widget
- [in progress] 4. Validate real login on the provided account, current blocker is site-side VPN/proxy rejection on this VPS/browser egress
- [pending] 5. Map authenticated dashboard and faucet boundaries
- [pending] 6. Implement faucet claim loop with downstream success oracle
- [done] 7. Commit and push project plus reusable solver update to GitHub

## Boundary catalog
| Boundary | Status | Notes |
| --- | --- | --- |
| Auth/session gate | in progress | `POST /auth/login` is reachable and the anti-captcha is solved, but the real submit from this VPS/browser returns the server oracle `VPN/ Proxy is not allowed!`. The active blocker is egress reputation, not missing form fields. |
| Login anti-captcha gate | done | The page injects `.anti-captcha` with a preview image plus six option images. A local alpha-aware image matcher was tested across 12 consecutive live challenges and solved `12/12`. |
| Dashboard gate | pending | `/dashboard` redirects to `/` when unauthenticated. Need imported cookies or clean egress to map the real authenticated surface. |
| Faucet gate | pending | `/faucet` redirects to `/` when unauthenticated. Real claim DOM, timer, and success oracle are still unknown because auth is blocked. |
| Reward/state mutation gate | pending | Must verify downstream balance or claim-history mutation once authenticated access is available. |

## Current known state
- Base target: `https://freeltc.online`
- Provided entrypoint: `https://freeltc.online/dashboard`
- Login page: `https://freeltc.online/login`
- Login form: `POST https://freeltc.online/auth/login`
- Core form fields seen live:
  - `csrf_token_name`
  - `email`
  - `password`
  - `anti_captcha_key`
  - `anti_captcha_token`
  - `anti_captcha_selected_icon`
  - `anti_hash`
  - `uf`
  - `utt`
  - `ls`
- Live JS globals from the target:
  - `window.app_url = https://freeltc.online/`
  - `window.litoshi_api_key = ...`
  - `window.litoshi_secret_key = ...`
- Current proven public-route behavior:
  - `/dashboard` -> redirects back to `/`
  - `/faucet` -> redirects back to `/`
  - `/ptc` -> redirects back to `/`
- Additional authenticated probe candidates prepared in the repo because the target advertises a `Vie Faucet Script` stack:
  - `/autofaucet`
  - `/shortlinks`
  - `/offerwalls`
  - `/tasks`
  - `/achievements`
  - `/lottery`
  - `/daily-bonus`
  - `/withdraw`
  - `/refer`
- Live blocker from the provided credentials on this host:
  - after a fully solved anti-captcha and real submit, the site returns `VPN/ Proxy is not allowed!`
