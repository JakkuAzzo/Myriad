import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const projectRoot = path.resolve(decodeURIComponent(path.dirname(new URL(import.meta.url).pathname)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const iosRoot = path.join(workspaceRoot, 'Myriad_iOS_XCODE');
const xcodeProject = path.join(iosRoot, 'MyriadIOS.xcodeproj');
const derivedData = path.join(iosRoot, 'build', 'DerivedData');
const artifactsDir = path.join(projectRoot, 'artifacts', 'videos');
const outputMov = path.join(artifactsDir, 'myriad-ios-simulator-demo.mov');
const outputMp4 = path.join(artifactsDir, 'myriad-ios-simulator-demo.mp4');

const scheme = process.env.MYRIAD_IOS_SCHEME || 'MyriadIOS';
const simulatorName = process.env.MYRIAD_IOS_SIM_NAME || 'iPhone 16';
const recordSeconds = Number.isFinite(Number(process.env.MYRIAD_IOS_RECORD_SECONDS))
  ? Math.max(8, Number(process.env.MYRIAD_IOS_RECORD_SECONDS))
  : 25;
const skipBuild = process.env.MYRIAD_IOS_SKIP_BUILD === 'true';
const require = createRequire(import.meta.url);
const backendPort = Number.isFinite(Number(process.env.MYRIAD_IOS_BACKEND_PORT))
  ? Math.max(1, Number(process.env.MYRIAD_IOS_BACKEND_PORT))
  : 3000;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed. ${stderr || stdout}`);
  }

  return result.stdout;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (_) {
      // Ignore and retry.
    }
    await sleep(300);
  }
  return false;
}

async function startBackendIfNeeded() {
  const healthUrl = `http://127.0.0.1:${backendPort}/api/health`;
  if (await waitForHealth(healthUrl, 1500)) {
    return { handle: null, baseUrl: `http://127.0.0.1:${backendPort}` };
  }

  const { createApp } = require(path.join(projectRoot, 'src', 'server.js'));
  const app = createApp();

  const handle = await new Promise((resolve, reject) => {
    const server = app.listen(backendPort, () => resolve(server));
    server.on('error', (err) => reject(err));
  });

  const healthy = await waitForHealth(healthUrl, 12000);
  if (!healthy) {
    await new Promise((resolve) => handle.close(() => resolve()));
    throw new Error(`Backend did not become healthy at ${healthUrl}`);
  }

  return { handle, baseUrl: `http://127.0.0.1:${backendPort}` };
}

function findBootedDevice() {
  const output = run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
  const parsed = JSON.parse(output);
  const devicesByRuntime = parsed.devices || {};
  for (const runtime of Object.keys(devicesByRuntime)) {
    const devices = devicesByRuntime[runtime] || [];
    if (devices.length > 0) {
      return devices[0];
    }
  }
  return null;
}

function findAvailableDeviceByName(name) {
  const output = run('xcrun', ['simctl', 'list', 'devices', 'available', '-j']);
  const parsed = JSON.parse(output);
  const devicesByRuntime = parsed.devices || {};

  for (const runtime of Object.keys(devicesByRuntime)) {
    const devices = devicesByRuntime[runtime] || [];
    const exact = devices.find((d) => d.isAvailable && d.name === name);
    if (exact) {
      return exact;
    }
  }

  for (const runtime of Object.keys(devicesByRuntime)) {
    const devices = devicesByRuntime[runtime] || [];
    const fuzzy = devices.find((d) => d.isAvailable && d.name.toLowerCase().includes(name.toLowerCase()));
    if (fuzzy) {
      return fuzzy;
    }
  }

  return null;
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
    throw new Error('ffmpeg conversion failed for iOS simulator recording.');
  }

  console.log(`MP4 created: ${outputPath}`);
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.mkdirSync(derivedData, { recursive: true });
  if (fs.existsSync(outputMov)) {
    fs.rmSync(outputMov, { force: true });
  }
  if (fs.existsSync(outputMp4)) {
    fs.rmSync(outputMp4, { force: true });
  }

  const backend = await startBackendIfNeeded();

  try {
    let device = findAvailableDeviceByName(simulatorName);
    if (!device) {
      device = findBootedDevice();
    }
    if (!device) {
      throw new Error(`No available simulator found matching '${simulatorName}'.`);
    }

    if (device.state !== 'Booted') {
      run('xcrun', ['simctl', 'boot', device.udid]);
    }

    run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);

    const appPath = path.join(derivedData, 'Build', 'Products', 'Debug-iphonesimulator', `${scheme}.app`);
    if (!skipBuild) {
      const build = spawnSync(
        'xcodebuild',
        [
          '-project', xcodeProject,
          '-scheme', scheme,
          '-configuration', 'Debug',
          '-destination', `platform=iOS Simulator,id=${device.udid}`,
          '-derivedDataPath', derivedData,
          'build',
        ],
        {
          cwd: iosRoot,
          stdio: 'inherit',
          encoding: 'utf8',
        }
      );
      if (build.status !== 0) {
        throw new Error('xcodebuild failed for iOS simulator recording.');
      }
    }

    if (!fs.existsSync(appPath)) {
      if (skipBuild) {
        throw new Error(`Build skipped and no existing app found at ${appPath}`);
      }
      throw new Error(`Built app not found at ${appPath}`);
    }

    run('xcrun', ['simctl', 'install', device.udid, appPath]);

    const bundleId = run('/usr/libexec/PlistBuddy', ['-c', 'Print:CFBundleIdentifier', path.join(appPath, 'Info.plist')]).trim();
    run('xcrun', ['simctl', 'launch', device.udid, bundleId]);

    const recorder = spawn('xcrun', ['simctl', 'io', device.udid, 'recordVideo', outputMov], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let recorderError = '';
    recorder.stderr.on('data', (buf) => {
      recorderError += String(buf || '');
    });

    await sleep(recordSeconds * 1000);

    recorder.kill('SIGINT');
    await new Promise((resolve) => recorder.on('exit', () => resolve()));

    if (!fs.existsSync(outputMov)) {
      throw new Error(`Simulator recording was not produced. ${recorderError}`);
    }

    console.log(`iOS simulator video created: ${outputMov}`);
    console.log(`iOS recording used backend at ${backend.baseUrl}`);
    convertToMp4IfRequested(outputMov, outputMp4);
  } finally {
    if (backend.handle) {
      await new Promise((resolve) => backend.handle.close(() => resolve()));
    }
  }
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
