import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('❌ Please provide a URL:\n   pnpm capture https://example.com');
    process.exit(1);
  }

  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    console.error('❌ Invalid URL. Please include the protocol (e.g. https://example.com)');
    process.exit(1);
  }

  // Ensure screenshots directory exists
  const saveDir = './screenshots';
  try {
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
  } catch (err) {
    console.error('❌ Failed to create screenshots directory:', err.message);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const domain = parsedUrl.hostname.replace(/\./g, '_');
  const imgFilePath = path.join(saveDir, `screenshot_${domain}_${timestamp}.png`);
  const serializedContentFilePath = path.join(saveDir, `serialized_${domain}_${timestamp}.json`)

  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Wait for the page to fully load and settle
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for all <img> elements to finish loading
    await page.waitForFunction(() => {
      const imgs = Array.from(document.images);
      return imgs.every(img => img.complete && img.naturalHeight !== 0);
    }, { timeout: 15000 }).catch(() => console.warn("⚠️ Some images may not have finished loading."));

    // Allow animations to stabilize instead of waiting for zero
    const animationSettled = await page.evaluate(async () => {
      if (!document.getAnimations) return true;

      function runningCount() {
        return document.getAnimations().filter(a => a.playState === 'running').length;
      }

      const start = runningCount();
      let stableCount = 0;

      for (let i = 0; i < 20; i++) { // check for ~10 seconds total
        await new Promise(res => setTimeout(res, 500));
        const now = runningCount();
        if (Math.abs(now - start) <= 1) stableCount++;
        else stableCount = 0;
        if (stableCount >= 3) return true;
      }
      return false; // give up after ~10s
    });

    if (!animationSettled) {
      console.warn("⚠️ Animations did not fully settle, proceeding anyway.");
    }

    // final short buffer to ensure render complete
    await new Promise(res => setTimeout(res, 1000));

    // get the content
    const dom = await page.evaluate(() => {
      function serialize(node) {
        return {
          tag: node.tagName,
          text: node.innerText || "",
          attrs: Object.fromEntries([...node.attributes].map(a => [a.name, a.value])),
          children: [...node.children].map(serialize)
        };
      }
      return serialize(document.body);
    });
    fs.writeFileSync(serializedContentFilePath, JSON.stringify(dom, null, 2));

    // take a picture
    // await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 }); // make it larger to help model see it better
    await page.screenshot({ path: imgFilePath, fullPage: true });
    console.log(`✅ Screenshot saved: ${imgFilePath}`);
  } catch (err) {
    console.error('❌ Screenshot capture failed:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

main();
