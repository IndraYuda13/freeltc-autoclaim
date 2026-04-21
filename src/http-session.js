class HttpSession {
  constructor(options = {}) {
    this.cookies = new Map(Object.entries(options.initialCookies || {}));
    this.defaultHeaders = {
      'user-agent':
        options.userAgent ||
        process.env.FREELTC_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value])),
    };
  }

  cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  updateCookies(response) {
    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
    for (const raw of setCookies) {
      const firstPart = raw.split(';', 1)[0];
      const eqIndex = firstPart.indexOf('=');
      if (eqIndex <= 0) continue;
      const name = firstPart.slice(0, eqIndex).trim();
      const value = firstPart.slice(eqIndex + 1).trim();
      this.cookies.set(name, value);
    }
  }

  async request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = {
      ...this.defaultHeaders,
      ...Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value])),
    };
    const cookie = this.cookieHeader();
    if (cookie) {
      headers.cookie = cookie;
    }

    let body = options.body;
    if (options.form) {
      body = new URLSearchParams();
      for (const [key, value] of Object.entries(options.form)) {
        body.set(key, value);
      }
      headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: options.redirect || 'follow',
    });
    this.updateCookies(response);
    return response;
  }

  async requestText(url, options = {}) {
    const response = await this.request(url, options);
    const text = await response.text();
    return { response, text };
  }

  dumpCookies() {
    return Object.fromEntries(this.cookies.entries());
  }
}

module.exports = {
  HttpSession,
};

