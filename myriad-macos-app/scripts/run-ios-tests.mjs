import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const iosRoot = path.join(workspaceRoot, 'Myriad_iOS_XCODE');
const xcodeProject = path.join(iosRoot, 'MyriadIOS.xcodeproj');
const derivedData = path.join(iosRoot, 'build', 'DerivedData');
const scheme = process.env.MYRIAD_IOS_SCHEME || 'MyriadIOS';
const preferredSimulatorName = process.env.MYRIAD_IOS_SIM_NAME || 'iPhone 16';
const projectSpec = path.join(iosRoot, 'project.yml');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });
}

function ensureProjectGenerated() {
  const pbxproj = path.join(xcodeProject, 'project.pbxproj');
  if (fs.existsSync(pbxproj)) {
    return;
  }

  if (!fs.existsSync(projectSpec)) {
    console.error('IOS_TESTS_FAILED: Missing complete iOS project and no project.yml to regenerate from.');
    process.exit(1);
  }

  const result = runCapture('xcodegen', ['generate'], { cwd: iosRoot });
  if (result.status !== 0 || !fs.existsSync(pbxproj)) {
    const details = (result.stderr || result.stdout || '').trim();
    console.error(`IOS_TESTS_FAILED: Could not generate iOS project. ${details}`);
    process.exit(result.status || 1);
  }
}

function parseIOSVersion(sectionLine) {
  const match = sectionLine.match(/^-- iOS\s+([0-9]+(?:\.[0-9]+)*)\s+--$/);
  if (!match) {
    return null;
  }

  const parts = match[1].split('.').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    text: match[1],
    parts,
  };
}

function compareVersions(a, b) {
  const maxLength = Math.max(a.parts.length, b.parts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = a.parts[index] || 0;
    const right = b.parts[index] || 0;
    if (left !== right) {
      return left - right;
    }
  }
  return 0;
}

function resolveSimulatorDestination() {
  const explicitSimulator = process.env.MYRIAD_IOS_SIM_NAME;
  const list = runCapture('xcrun', ['simctl', 'list', 'devices', 'available']);
  if (list.status !== 0) {
    return {
      destination: `platform=iOS Simulator,name=${explicitSimulator || preferredSimulatorName}`,
      simulatorName: explicitSimulator || preferredSimulatorName,
    };
  }

  const devices = [];
  let currentVersion = null;
  for (const rawLine of (list.stdout || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const version = parseIOSVersion(line);
    if (version) {
      currentVersion = version;
      continue;
    }

    const deviceMatch = line.match(/^(iPhone[^\(]+)\(([0-9A-F-]+)\)\s+\((Booted|Shutdown)\)$/);
    if (deviceMatch && currentVersion) {
      devices.push({
        name: deviceMatch[1].trim(),
        id: deviceMatch[2].trim(),
        version: currentVersion,
      });
    }
  }

  if (!devices.length) {
    return {
      destination: `platform=iOS Simulator,name=${explicitSimulator || preferredSimulatorName}`,
      simulatorName: explicitSimulator || preferredSimulatorName,
    };
  }

  let latestVersion = devices[0].version;
  for (const device of devices) {
    if (compareVersions(device.version, latestVersion) > 0) {
      latestVersion = device.version;
    }
  }

  const latestDevices = devices.filter((device) => compareVersions(device.version, latestVersion) === 0);

  if (explicitSimulator) {
    const explicitMatch = latestDevices.find((device) => device.name === explicitSimulator)
      || devices.find((device) => device.name === explicitSimulator);
    if (explicitMatch) {
      return {
        destination: `platform=iOS Simulator,id=${explicitMatch.id}`,
        simulatorName: explicitMatch.name,
      };
    }
    console.warn(`IOS_TESTS_WARNING: Requested simulator ${explicitSimulator} is unavailable. Falling back to ${latestDevices[0].name}.`);
  }

  const preferredMatch = latestDevices.find((device) => device.name === preferredSimulatorName);
  if (preferredMatch) {
    return {
      destination: `platform=iOS Simulator,id=${preferredMatch.id}`,
      simulatorName: preferredMatch.name,
    };
  }

  return {
    destination: `platform=iOS Simulator,id=${latestDevices[0].id}`,
    simulatorName: latestDevices[0].name,
  };
}

if (process.platform !== 'darwin') {
  console.error('IOS_TESTS_FAILED: iOS tests require macOS runners.');
  process.exit(1);
}

ensureProjectGenerated();
const simulator = resolveSimulatorDestination();
console.log(`IOS_TESTS_INFO: Using simulator ${simulator.simulatorName}`);

run('xcodebuild', [
  '-project', xcodeProject,
  '-scheme', scheme,
  '-destination', simulator.destination,
  '-derivedDataPath', derivedData,
  'test',
], {
  cwd: iosRoot,
});
