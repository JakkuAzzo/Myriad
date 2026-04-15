import { chromium } from 'playwright';

const outDir = '/Users/nathanbrown-bennett/Said Osman/artifacts/dissertation';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${outDir}/myriad_home.png`, fullPage: true });

await page.goto('http://localhost:3000/stats', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/myriad_stats.png`, fullPage: true });

await browser.close();

console.log('SCREENSHOTS_OK');
