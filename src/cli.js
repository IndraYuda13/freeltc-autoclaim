#!/usr/bin/env node
const { FreeLtcBrowser } = require('./freeltc-browser');
const { probeAuthenticatedSession } = require('./session-probe');

function printUsage() {
  console.log(`Usage:
  node src/cli.js capture-login-captcha
  FREELTC_EMAIL=... FREELTC_PASSWORD=... node src/cli.js login-once
  node src/cli.js probe-session

Optional env:
  FREELTC_PROXY_SERVER=http://host:port
  FREELTC_PROXY_USERNAME=...
  FREELTC_PROXY_PASSWORD=...
  FREELTC_USER_AGENT=...
  FREELTC_COOKIES_FILE=state/imported-cookies.json
  CHROME_PATH=/usr/bin/google-chrome`);
}

async function main() {
  const command = process.argv[2];
  if (!command || ['-h', '--help', 'help'].includes(command)) {
    printUsage();
    return;
  }

  if (command === 'probe-session') {
    const result = await probeAuthenticatedSession();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const browser = new FreeLtcBrowser();
  await browser.launch();
  try {
    if (command === 'capture-login-captcha') {
      const result = await browser.captureLoginCaptcha();
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (command === 'login-once') {
      const result = await browser.loginOnce({
        email: process.env.FREELTC_EMAIL,
        password: process.env.FREELTC_PASSWORD,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});

