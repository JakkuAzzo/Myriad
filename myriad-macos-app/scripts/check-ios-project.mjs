import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const iosRoot = path.join(workspaceRoot, 'Myriad_iOS_XCODE');
const xcodeProj = path.join(iosRoot, 'MyriadIOS.xcodeproj');
const pbxproj = path.join(xcodeProj, 'project.pbxproj');
const projectSpec = path.join(iosRoot, 'project.yml');

function fail(message) {
  console.error(`IOS_PROJECT_CHECK_FAILED: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
  return result;
}

if (!fs.existsSync(iosRoot)) {
  fail(`Missing iOS root folder at ${iosRoot}`);
}

if (!fs.existsSync(xcodeProj)) {
  if (!fs.existsSync(projectSpec)) {
    fail(`Missing Xcode project folder at ${xcodeProj} and no project spec found at ${projectSpec}`);
  }

  const xcodegen = run('xcodegen', ['generate'], { cwd: iosRoot });
  if (xcodegen.status !== 0) {
    const details = (xcodegen.stderr || xcodegen.stdout || '').trim();
    fail(`Failed to generate project from ${projectSpec}. ${details}`);
  }
}

if (!fs.existsSync(pbxproj)) {
  if (!fs.existsSync(projectSpec)) {
    fail(`Missing required file ${pbxproj}. Commit the complete iOS project so clean clones can build.`);
  }

  const xcodegen = run('xcodegen', ['generate'], { cwd: iosRoot });
  if (xcodegen.status !== 0 || !fs.existsSync(pbxproj)) {
    const details = (xcodegen.stderr || xcodegen.stdout || '').trim();
    fail(`project.pbxproj is missing and regeneration failed. ${details}`);
  }
}

console.log('IOS_PROJECT_CHECK_OK');
