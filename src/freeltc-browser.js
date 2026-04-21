const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { rankAntiCaptchaOptions, solveAntiCaptcha } = require('./anti-captcha');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildProxyConfig() {
  const server = process.env.FREELTC_PROXY_SERVER || '';
  if (!server) {
    return undefined;
  }
  return {
    server,
    username: process.env.FREELTC_PROXY_USERNAME || undefined,
    password: process.env.FREELTC_PROXY_PASSWORD || undefined,
  };
}

class FreeLtcBrowser {
  constructor(options = {}) {
    this.chromePath = options.chromePath || process.env.CHROME_PATH || '/usr/bin/google-chrome';
    this.baseUrl = options.baseUrl || 'https://freeltc.online';
    this.stateDir = path.resolve(options.stateDir || path.join(process.cwd(), 'state'));
    this.logsDir = path.resolve(options.logsDir || path.join(process.cwd(), 'logs'));
    this.storageStatePath = path.resolve(options.storageStatePath || path.join(this.stateDir, 'storage-state.json'));
    this.headless = options.headless !== false;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    ensureDir(this.stateDir);
    ensureDir(this.logsDir);

    this.browser = await chromium.launch({
      executablePath: this.chromePath,
      headless: this.headless,
      proxy: buildProxyConfig(),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const contextOptions = {
      viewport: { width: 1440, height: 1200 },
      userAgent:
        process.env.FREELTC_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Asia/Jakarta',
    };

    if (fs.existsSync(this.storageStatePath)) {
      contextOptions.storageState = this.storageStatePath;
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    return this;
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async goto(pathname, waitUntil = 'networkidle') {
    return this.page.goto(`${this.baseUrl}${pathname}`, { waitUntil, timeout: 120000 });
  }

  async captureLoginCaptcha() {
    await this.goto('/login');
    const ranking = await solveAntiCaptcha(this.page);
    const stamp = nowStamp();
    const screenshotPath = path.join(this.stateDir, `login-captcha-solved-${stamp}.png`);
    const jsonPath = path.join(this.stateDir, `login-captcha-solved-${stamp}.json`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(jsonPath, JSON.stringify(ranking, null, 2));
    return { screenshotPath, jsonPath, ...ranking };
  }

  async loginOnce({ email, password }) {
    if (!email || !password) {
      throw new Error('email and password are required');
    }

    await this.goto('/login');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);

    const requestLog = [];
    const stamp = nowStamp();
    const logRequest = (request) => {
      if (!request.url().startsWith(this.baseUrl)) return;
      requestLog.push({
        kind: 'request',
        method: request.method(),
        url: request.url(),
        postData: request.postData() || null,
      });
    };
    const logResponse = async (response) => {
      if (!response.url().startsWith(this.baseUrl)) return;
      const item = {
        kind: 'response',
        status: response.status(),
        url: response.url(),
        location: response.headers().location || null,
      };
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript')) {
          const text = await response.text();
          item.bodyText = text.slice(0, 2000);
        }
      } catch (error) {
        item.bodyReadError = error.message;
      }
      requestLog.push(item);
    };

    this.page.on('request', logRequest);
    this.page.on('response', logResponse);

    let captcha = null;
    try {
      captcha = await solveAntiCaptcha(this.page);
      await Promise.allSettled([
        this.page.waitForLoadState('networkidle', { timeout: 30000 }),
        this.page.locator('button[type="submit"]').click(),
      ]);
      await this.page.waitForTimeout(3000);
    } finally {
      this.page.off('request', logRequest);
      this.page.off('response', logResponse);
    }

    const result = await this.page.evaluate(() => ({
      url: location.href,
      title: document.title,
      alerts: Array.from(document.querySelectorAll('.alert, .toast, .invalid-feedback, .text-danger'))
        .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
      bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 6000),
      hiddenInputs: Array.from(document.querySelectorAll('input[type="hidden"]')).map((node) => ({
        name: node.getAttribute('name'),
        value: node.value,
      })),
      links: Array.from(document.querySelectorAll('a')).map((node) => ({
        href: node.getAttribute('href'),
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
      })).filter((item) => item.text || item.href).slice(0, 80),
    }));

    const success = /dashboard|logout|balance|faucet/i.test(result.url) ||
      result.links.some((item) => /logout|dashboard|faucet/i.test(item.text || ''));

    const screenshotPath = path.join(this.stateDir, `login-result-${stamp}.png`);
    const htmlPath = path.join(this.stateDir, `login-result-${stamp}.html`);
    const jsonPath = path.join(this.stateDir, `login-result-${stamp}.json`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(htmlPath, await this.page.content());
    fs.writeFileSync(jsonPath, JSON.stringify({ captcha, result, success, requestLog }, null, 2));

    if (success) {
      await this.context.storageState({ path: this.storageStatePath });
    }

    return {
      captcha,
      result,
      success,
      requestLog,
      artifacts: {
        screenshotPath,
        htmlPath,
        jsonPath,
      },
    };
  }

  async rankLoginCaptcha() {
    await this.goto('/login');
    await this.page.evaluate(() => document.querySelector('.anticap-toggle')?.click());
    await this.page.waitForSelector('.anticap-item img', { timeout: 30000 });
    return rankAntiCaptchaOptions(this.page);
  }
}

module.exports = {
  FreeLtcBrowser,
};

