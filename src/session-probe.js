const fs = require('fs');
const path = require('path');
const { HttpSession } = require('./http-session');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function loadCookies(options = {}) {
  if (options.cookies && Object.keys(options.cookies).length) {
    return options.cookies;
  }
  const filePath = options.cookiesFile || process.env.FREELTC_COOKIES_FILE || path.join(process.cwd(), 'state', 'imported-cookies.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  const raw = process.env.FREELTC_COOKIES_JSON || '';
  if (raw) {
    return JSON.parse(raw);
  }
  throw new Error('No imported cookies found. Use state/imported-cookies.json or FREELTC_COOKIES_JSON.');
}

async function probeAuthenticatedSession(options = {}) {
  const baseUrl = options.baseUrl || 'https://freeltc.online';
  const stateDir = path.resolve(options.stateDir || path.join(process.cwd(), 'state'));
  ensureDir(stateDir);
  const stamp = nowStamp();

  const cookies = loadCookies(options);
  const session = new HttpSession({ initialCookies: cookies });
  const paths = options.paths || [
    '/dashboard',
    '/faucet',
    '/autofaucet',
    '/shortlinks',
    '/ptc',
    '/offerwalls',
    '/tasks',
    '/achievements',
    '/lottery',
    '/daily-bonus',
    '/withdraw',
    '/refer',
  ];

  const pages = {};
  for (const pathname of paths) {
    const { response, text } = await session.requestText(`${baseUrl}${pathname}`, {
      headers: {
        referer: `${baseUrl}/login`,
      },
    });
    pages[pathname] = {
      finalUrl: response.url,
      status: response.status,
      bodySnippet: text.replace(/\s+/g, ' ').slice(0, 3000),
      appearsLoggedIn: /logout|dashboard|balance|faucet|withdraw/i.test(text) && !/<title>FreeLTC - Instant Payments/i.test(text),
    };
    fs.writeFileSync(path.join(stateDir, `session-probe-${pathname.replace(/\//g, '_') || 'root'}-${stamp}.html`), text);
  }

  const result = {
    cookies: session.dumpCookies(),
    pages,
  };
  fs.writeFileSync(path.join(stateDir, `session-probe-${stamp}.json`), JSON.stringify(result, null, 2));
  return result;
}

module.exports = {
  probeAuthenticatedSession,
};
