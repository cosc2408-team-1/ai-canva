// This generates a file, not a web server. Open report.html directly in a browser.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function embedHistory(template, runs) {
  // JSON is embedded as data. Escape '<' so output text cannot close the script tag.
  const data = JSON.stringify(runs).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  return template.replace('<!-- RUN_DATA -->', () => `<script type="application/json" id="run-data">${data}</script>`);
}

export async function buildReport(directory) {
  let files = [];
  try { files = await readdir(join(directory, '.runs')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const runs = [];
  for (const file of files.filter(name => name.endsWith('.json')).sort()) {
    try {
      const run = JSON.parse(await readFile(join(directory, '.runs', file), 'utf8'));
      if (run.formatVersion !== 1 || !Array.isArray(run.results) || !Array.isArray(run.snapshot?.prompts)) throw new Error('Unsupported run format');
      runs.push(run);
    } catch (error) { throw new Error(`Cannot read history file ${file}: ${error.message}`); }
  }
  const template = await readFile(join(directory, 'dashboard.html'), 'utf8');
  await writeFile(join(directory, 'report.html'), embedHistory(template, runs));
  return runs.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('.', import.meta.url));
  buildReport(directory).then(count => console.log(`Report includes ${count} runs. Open evals/report.html.`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
