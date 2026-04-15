const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const dbPath = path.join(os.tmpdir(), `myriad-e2e-${Date.now()}.sqlite`);
process.env.MYRIAD_DB_PATH = dbPath;
process.env.MYRIAD_SALT = process.env.MYRIAD_SALT || 'test-salt-e2e';

const { createApp } = require('../src/server');

async function startServer() {
  const app = createApp();

  return new Promise((resolve, reject) => {
    const handle = app.listen(0, () => {
      const address = handle.address();
      if (!address || typeof address !== 'object') {
        reject(new Error('Unable to determine server port.'));
        return;
      }
      resolve({ handle, baseUrl: `http://127.0.0.1:${address.port}` });
    });

    handle.on('error', reject);
  });
}

test('E2E flow: seed, goals, consent, and delete data', { timeout: 60000 }, async () => {
  const { handle, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('dialog', (dialog) => dialog.accept());

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    await page.click('#seedBtn');
    await page.waitForURL(`${baseUrl}/stats`);

    const cardsText = await page.locator('#cards').innerText();
    assert.match(cardsText, /Total Events/i);

    await page.fill('#goalTitleInput', 'Reduce social usage');
    await page.fill('#goalCategoryInput', 'social');
    await page.fill('#goalMaxDailyMinutesInput', '60');
    await page.fill('#goalPlanInput', 'Switch to reading after 10pm');
    await page.click('#saveGoalBtn');

    await page.waitForTimeout(300);
    const goalsText = await page.locator('#goalList').innerText();
    assert.match(goalsText, /Reduce social usage/i);

    const consentChecked = await page.locator('#consentToggle').isChecked();
    if (consentChecked) {
      await page.locator('#consentToggle').uncheck();
    }

    const eventStatus = await page.evaluate(async () => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'browser',
          category: 'browsing',
          durationMinutes: 4,
          identifier: 'consent-check',
        }),
      });
      return response.status;
    });
    assert.equal(eventStatus, 403);

    await page.click('#deleteBtn');
    await page.waitForTimeout(400);

    const cardsAfterDelete = await page.locator('#cards').innerText();
    assert.match(cardsAfterDelete, /Total Events\s*0/i);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => handle.close(resolve));
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  }
});
