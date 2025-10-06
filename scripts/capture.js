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
  const filePath = path.join(saveDir, `screenshot_${domain}_${timestamp}.png`);

  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`✅ Screenshot saved: ${filePath}`);
  } catch (err) {
    console.error('❌ Screenshot capture failed:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

main();
