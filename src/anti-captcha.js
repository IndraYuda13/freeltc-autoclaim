async function rankAntiCaptchaOptions(page, options = {}) {
  const previewSelector = options.previewSelector || '[data-id="anticap-preview"]';
  const optionSelector = options.optionSelector || '.anticap-item img';
  const size = options.size || 96;
  const scale = options.scale || 0.92;

  return page.evaluate(
    async ({ previewSelector: previewSel, optionSelector: optionSel, size: canvasSize, scale }) => {
      function waitImg(img) {
        return new Promise((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', (event) => reject(event), { once: true });
        });
      }

      function alphaBox(ctx, width, height) {
        const data = ctx.getImageData(0, 0, width, height).data;
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            if (data[index + 3] > 10) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0) {
          return { x: 0, y: 0, w: width, h: height };
        }
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      }

      function normalizedCanvas(img) {
        const source = document.createElement('canvas');
        source.width = img.naturalWidth;
        source.height = img.naturalHeight;
        const sourceCtx = source.getContext('2d');
        sourceCtx.clearRect(0, 0, source.width, source.height);
        sourceCtx.drawImage(img, 0, 0);

        const box = alphaBox(sourceCtx, source.width, source.height);
        const output = document.createElement('canvas');
        output.width = canvasSize;
        output.height = canvasSize;
        const outCtx = output.getContext('2d');
        outCtx.clearRect(0, 0, canvasSize, canvasSize);

        const factor = Math.min(canvasSize / box.w, canvasSize / box.h) * scale;
        const drawWidth = box.w * factor;
        const drawHeight = box.h * factor;
        const drawX = (canvasSize - drawWidth) / 2;
        const drawY = (canvasSize - drawHeight) / 2;
        outCtx.drawImage(source, box.x, box.y, box.w, box.h, drawX, drawY, drawWidth, drawHeight);
        return output;
      }

      function rgbaMae(canvasA, canvasB) {
        const dataA = canvasA.getContext('2d').getImageData(0, 0, canvasA.width, canvasA.height).data;
        const dataB = canvasB.getContext('2d').getImageData(0, 0, canvasB.width, canvasB.height).data;
        let total = 0;
        for (let index = 0; index < dataA.length; index += 4) {
          total += Math.abs(dataA[index] - dataB[index]);
          total += Math.abs(dataA[index + 1] - dataB[index + 1]);
          total += Math.abs(dataA[index + 2] - dataB[index + 2]);
          total += Math.abs(dataA[index + 3] - dataB[index + 3]);
        }
        return total / (canvasA.width * canvasA.height * 4);
      }

      const preview = document.querySelector(previewSel);
      const optionImages = Array.from(document.querySelectorAll(optionSel));
      if (!preview) {
        throw new Error(`Preview not found: ${previewSel}`);
      }
      if (!optionImages.length) {
        throw new Error(`No anti-captcha options found: ${optionSel}`);
      }

      await Promise.all([waitImg(preview), ...optionImages.map(waitImg)]);
      const previewCanvas = normalizedCanvas(preview);
      const ranked = optionImages.map((img, index) => ({
        index,
        src: img.src,
        score: rgbaMae(previewCanvas, normalizedCanvas(img)),
      })).sort((left, right) => left.score - right.score);

      return {
        previewSrc: preview.src,
        ranked,
      };
    },
    { previewSelector, optionSelector, size, scale }
  );
}

async function solveAntiCaptcha(page, options = {}) {
  const toggleSelector = options.toggleSelector || '.anticap-toggle';
  const itemSelector = options.itemSelector || '.anticap-item';

  await page.evaluate((selector) => document.querySelector(selector)?.click(), toggleSelector);
  await page.waitForSelector(`${itemSelector} img`, { timeout: options.timeout || 30000 });

  const ranking = await rankAntiCaptchaOptions(page, options);
  const best = ranking.ranked[0];
  if (!best) {
    throw new Error('No anti-captcha option ranked');
  }

  await page.locator(itemSelector).nth(best.index).click();
  await page.waitForFunction(() => {
    const feedback = document.querySelector('[data-id="anticap-feedback"]')?.textContent || '';
    const info = document.querySelector('[data-id="anticap-info-label"]')?.textContent || '';
    return /successful/i.test(feedback) || /success/i.test(info);
  }, { timeout: options.verifyTimeout || 30000 });

  const solvedState = await page.evaluate(() => ({
    feedback: document.querySelector('[data-id="anticap-feedback"]')?.textContent || null,
    info: document.querySelector('[data-id="anticap-info-label"]')?.textContent || null,
    hiddenInputs: Array.from(document.querySelectorAll('input[type="hidden"]')).map((node) => ({
      name: node.getAttribute('name'),
      value: node.value,
    })),
  }));

  return {
    ranking,
    chosen: best,
    solvedState,
  };
}

module.exports = {
  rankAntiCaptchaOptions,
  solveAntiCaptcha,
};

