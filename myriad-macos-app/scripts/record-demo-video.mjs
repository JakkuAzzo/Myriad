import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const scriptDir = decodeURIComponent(path.dirname(new URL(import.meta.url).pathname));
const projectRoot = path.resolve(scriptDir, '..');
const artifactsDir = path.join(projectRoot, 'artifacts', 'videos');
const outputVideo = path.join(artifactsDir, 'myriad-setup-to-visualisation.webm');
const outputVideoMp4 = path.join(artifactsDir, 'myriad-setup-to-visualisation.mp4');
const requestedPort = 0;
const require = createRequire(import.meta.url);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function convertToMp4IfRequested(inputPath, outputPath) {
  const enabled = process.env.MYRIAD_CONVERT_MP4 === 'true';
  if (!enabled) {
    return;
  }

  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.status !== 0) {
    console.warn('MYRIAD_CONVERT_MP4=true but ffmpeg is not available. Skipping MP4 conversion.');
    return;
  }

  const convert = spawnSync(
    'ffmpeg',
    ['-y', '-i', inputPath, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', outputPath],
    { stdio: 'inherit' }
  );

  if (convert.status !== 0) {
    throw new Error('ffmpeg conversion failed.');
  }

  console.log(`MP4 created: ${outputPath}`);
}

async function waitForHealth(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (_) {
      // Retry until timeout.
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

function startServer() {
  const { createApp } = require(path.join(projectRoot, 'src', 'server.js'));
  const app = createApp();

  return new Promise((resolve, reject) => {
    const handle = app.listen(requestedPort, () => {
      const address = handle.address();
      const boundPort = address && typeof address === 'object' ? address.port : null;
      if (!boundPort) {
        reject(new Error('Failed to determine bound server port.'));
        return;
      }
      resolve({ handle, port: boundPort });
    });
    handle.on('error', (err) => reject(err));
  });
}

async function run() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  process.env.MYRIAD_ADMIN_KEY = process.env.MYRIAD_ADMIN_KEY || 'admin-test-key';

  const { handle: serverHandle, port } = await startServer();
  const baseUrl = `http://localhost:${port}`;
  try {
    await waitForHealth(`${baseUrl}/api/health`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: artifactsDir,
        size: { width: 1280, height: 720 },
      },
    });

    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    await page.locator('#deviceLabel').selectOption('laptop');
    await page.waitForTimeout(400);

    await page.locator('#seedBtn').click();
    await page.waitForURL(`${baseUrl}/stats`, { timeout: 15000 });
    await page.waitForTimeout(1200);

    await page.locator('#scopeSelect').selectOption('global');
    await page.waitForTimeout(300);

    await page.locator('#adminKeyInput').fill('admin-test-key');
    await page.waitForTimeout(250);

    await page.locator('#refreshBtn').click();
    await page.waitForTimeout(1300);

    await page.locator('#daysSelect').selectOption('14');
    await page.waitForTimeout(1000);

    await page.locator('#deviceSelect').selectOption('all');
    await page.waitForTimeout(800);

    await page.locator('#reassignUnknownBtn').click();
    await page.waitForTimeout(1200);

    await page.locator('#goalTitleInput').fill('Reduce distraction before bedtime');
    await page.locator('#goalCategoryInput').fill('social');
    await page.locator('#goalDeviceInput').selectOption('phone');
    await page.locator('#goalMaxDailyMinutesInput').fill('45');
    await page.locator('#goalPlanInput').fill('Enable app limits after 9:30pm and move phone away from bed.');
    await page.locator('#saveGoalBtn').click();
    await page.waitForTimeout(1300);

    await page.locator('#attainmentGoalInput').fill('Finish dissertation chapter draft with fewer phone interruptions');
    await page.locator('#attainmentDaysInput').fill('30');
    await page.locator('#attainmentDeviceInput').selectOption('all');
    await page.locator('#generatePlanBtn').click();
    await page.waitForTimeout(1800);

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(900);

    const videoPathPromise = page.video().path();
    await context.close();
    await browser.close();

    const recordedPath = await videoPathPromise;
    fs.copyFileSync(recordedPath, outputVideo);

    console.log(`Video created: ${outputVideo}`);
    convertToMp4IfRequested(outputVideo, outputVideoMp4);
  } finally {
    await new Promise((resolve) => serverHandle.close(() => resolve()));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
