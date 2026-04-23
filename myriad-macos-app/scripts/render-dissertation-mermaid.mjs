import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const inputPath = path.resolve(
  process.argv[2] || path.join(projectRoot, 'artifacts', 'dissertation', 'design-artefacts-mermaid.md')
);
const outputDir = path.resolve(
  process.argv[3] || path.join(projectRoot, 'artifacts', 'dissertation', 'figures')
);

if (!fs.existsSync(inputPath)) {
  console.error(`MERMAID_SOURCE_NOT_FOUND ${inputPath}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const source = fs.readFileSync(inputPath, 'utf8');
const lines = source.split(/\r?\n/);

const blocks = [];
let currentTitle = 'diagram';
let inMermaid = false;
let mermaidLines = [];

for (const line of lines) {
  if (line.startsWith('## ')) {
    currentTitle = line.replace(/^##\s+/, '').trim();
    continue;
  }

  if (line.trim() === '```mermaid') {
    inMermaid = true;
    mermaidLines = [];
    continue;
  }

  if (inMermaid && line.trim() === '```') {
    inMermaid = false;
    const rawMarkup = mermaidLines.join('\n').trim();
    if (rawMarkup) {
      blocks.push({ title: currentTitle, markup: rawMarkup });
    }
    mermaidLines = [];
    continue;
  }

  if (inMermaid) {
    mermaidLines.push(line);
  }
}

if (!blocks.length) {
  console.error(`NO_MERMAID_BLOCKS_FOUND ${inputPath}`);
  process.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'diagram';
}

const manifest = [];

for (let i = 0; i < blocks.length; i += 1) {
  const block = blocks[i];
  const index = String(i + 1).padStart(2, '0');
  const baseName = `${index}-${slugify(block.title)}`;
  const mmdPath = path.join(outputDir, `${baseName}.mmd`);
  const pngPath = path.join(outputDir, `${baseName}.png`);

  fs.writeFileSync(mmdPath, `${block.markup}\n`, 'utf8');

  try {
    execFileSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        '-y',
        '@mermaid-js/mermaid-cli',
        '-i',
        mmdPath,
        '-o',
        pngPath,
        '-b',
        'transparent',
        '-s',
        '2'
      ],
      { stdio: 'pipe' }
    );
  } catch (err) {
    const stderr = err && err.stderr ? String(err.stderr) : String(err);
    console.error(`MERMAID_RENDER_FAILED ${baseName}`);
    console.error(stderr);
    process.exit(1);
  }

  manifest.push({
    index: i + 1,
    title: block.title,
    mermaidFile: mmdPath,
    imageFile: pngPath,
    caption: `Figure E${i + 1}: ${block.title}`,
  });
}

const manifestPath = path.join(outputDir, 'manifest.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`MERMAID_RENDER_OK ${manifest.length}`);
console.log(`MERMAID_MANIFEST ${manifestPath}`);
