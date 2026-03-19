import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
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

  let device = findBootedDevice();
  if (!device) {
    device = findAvailableDeviceByName(simulatorName);
    if (!device) {
      throw new Error(`No available simulator found matching '${simulatorName}'.`);
    }
    run('xcrun', ['simctl', 'boot', device.udid]);
  }

  run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);

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

  const appPath = path.join(derivedData, 'Build', 'Products', 'Debug-iphonesimulator', `${scheme}.app`);
  if (!fs.existsSync(appPath)) {
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
  convertToMp4IfRequested(outputMov, outputMp4);
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
