# FreeLTC Surface Map

## Public pages
- `/` -> public homepage
- `/login` -> public login page
- `/dashboard` -> redirects back to `/` when unauthenticated
- `/faucet` -> redirects back to `/` when unauthenticated
- `/ptc` -> redirects back to `/` when unauthenticated

## Candidate authenticated pages queued for probe
These are not yet confirmed on `freeltc.online`, but they are the next practical probe set because the target identifies as `Vie Faucet Script` and public sister sites advertise these features:
- `/autofaucet`
- `/shortlinks`
- `/offerwalls`
- `/tasks`
- `/achievements`
- `/lottery`
- `/daily-bonus`
- `/withdraw`
- `/refer`

## Login form
- Method: `POST /auth/login`
- Visible fields:
  - `email`
  - `password`
  - `captcha=anti_captcha`
- Hidden fields observed live:
  - `csrf_token_name`
  - `anti_captcha_key`
  - `anti_captcha_token`
  - `anti_captcha_selected_icon`
  - `anti_hash`
  - `uf`
  - `utt`
  - `ls`

## Custom anti-captcha flow
1. Open `/login`.
2. Page script renders `.anti-captcha`.
3. Clicking the widget triggers:
   - `GET /anticap/get_token`
   - `GET /anticap/get_challenge` with a computed `X-Server-Hash`
4. Challenge returns:
   - `anti_captcha_key`
   - `question_image`
   - six icon filenames
5. Selecting the correct icon posts `selected + key + token` to `/anticap/validate_choice`.
6. On success the page writes the hidden inputs used by `/auth/login`.

## Proven solver behavior
- The preview image is not a plain filename leak. It must be matched visually.
- A simple local alpha-shape matcher is enough here.
- Live stability test from this workspace: `12/12` successful solves in a row.

## Proven login oracle from this VPS/browser
- Fully solved anti-captcha + real submit -> `VPN/ Proxy is not allowed!`

Meaning:
- solver is working
- submit lane is working
- current blocker is site-side egress reputation, not missing login logic

## Best next path
1. import authenticated cookies from a normal browser session into `state/imported-cookies.json`, or
2. run the browser lane from a residential/mobile egress the site accepts
3. then probe `/dashboard` and `/faucet`
4. only after that map timer, claim button, and downstream reward oracle
