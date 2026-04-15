import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(projectRoot, 'artifacts', 'usability', 'results-template.csv');
const outPath = path.join(projectRoot, 'artifacts', 'usability', 'summary.md');

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });
    return row;
  });
}

function mean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function susScore(row) {
  const scores = [];
  for (let i = 1; i <= 10; i += 1) {
    const value = Number(row[`sus_q${i}`]);
    scores.push(Number.isFinite(value) ? value : 3);
  }

  let total = 0;
  scores.forEach((value, index) => {
    if (index % 2 === 0) {
      total += Math.max(0, value - 1);
    } else {
      total += Math.max(0, 5 - value);
    }
  });

  return total * 2.5;
}

const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(raw);

const connectTimes = rows.map((row) => Number(row.task_connect_import_sec)).filter(Number.isFinite);
const goalTimes = rows.map((row) => Number(row.task_set_goal_sec)).filter(Number.isFinite);
const behaviorTimes = rows.map((row) => Number(row.task_reduce_behavior_sec)).filter(Number.isFinite);
const susScores = rows.map((row) => susScore(row));

const summary = `# Usability Summary\n\nGenerated: ${new Date().toISOString()}\n\n## Participants\n\n- Count: ${rows.length}\n\n## Task Timing (seconds)\n\n- Connect and import: mean ${mean(connectTimes).toFixed(1)}, median ${median(connectTimes).toFixed(1)}\n- Set a behavior-change goal: mean ${mean(goalTimes).toFixed(1)}, median ${median(goalTimes).toFixed(1)}\n- Use intervention plan to stop habit: mean ${mean(behaviorTimes).toFixed(1)}, median ${median(behaviorTimes).toFixed(1)}\n\n## SUS\n\n- Mean SUS score: ${mean(susScores).toFixed(1)} / 100\n\n## Qualitative Notes\n\n${rows.map((row) => `- ${row.participant_id || 'Unknown'}: ${row.qualitative_note || 'No note provided.'}`).join('\n')}\n`;

fs.writeFileSync(outPath, summary, 'utf8');
console.log(`USABILITY_SUMMARY_WRITTEN ${outPath}`);
