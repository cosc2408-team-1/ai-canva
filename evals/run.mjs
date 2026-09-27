// Run all archived versions three times: node evals/run.mjs --all
// Run the current scratch prompts once: node evals/run.mjs
// Check the input files without calling VAL: node evals/run.mjs --check
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { BOX_IDS, automaticChecks, readJudgeChecks, totalPoints, boxAverage } from './score.mjs';
import { callVal, ENDPOINT } from './val.mjs';
import { buildReport } from './report.mjs';

const directory = fileURLToPath(new URL('.', import.meta.url));
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

async function loadInputs(selection) {
  const file = selection ? 'prompt-versions.yaml' : 'prompts.yaml';
  const promptFile = parse(await readFile(join(directory, file), 'utf8'));
  let versions = selection ? promptFile.versions : [{id: 'current', prompts: promptFile.prompts}];
  if (!Array.isArray(versions) || !versions.length || versions.some(v => typeof v.id !== 'string' || !v.id.trim()) || new Set(versions.map(v => v.id)).size !== versions.length) throw new Error('Versions need distinct nonempty IDs');
  if (selection && selection !== 'all') {
    versions = versions.filter(version => version.id === selection);
    if (!versions.length) throw new Error(`Unknown version: ${selection}`);
  }
  const cases = parse(await readFile(join(directory, 'cases.yaml'), 'utf8'));
  const judge = parse(await readFile(join(directory, 'judge.yaml'), 'utf8'));
  if ([promptFile, cases, judge].some(file => file?.format_version !== 1)) throw new Error('All input files must have format_version: 1');
  for (const version of versions) {
    const prompts = version;
    if (prompts.prompts?.length !== 3 || new Set(prompts.prompts.map(p => p.id)).size !== 3) throw new Error('Exactly three distinct prompts are required');
    for (const prompt of prompts.prompts) {
      if (!BOX_IDS.includes(prompt.id) || !prompt.label || typeof prompt.system !== 'string' || !prompt.system.trim() || typeof prompt.user_template !== 'string' || !prompt.user_template.includes('{{input}}')) throw new Error(`Invalid prompt: ${prompt.id}`);
      if ((prompt.user_template.match(/{{input}}/g) ?? []).length !== 1 || /{{(?!input}})/.test(prompt.user_template)) throw new Error('Each template must have exactly one {{input}} and no other placeholders');
    }
  }
  if (!cases.scenarios?.length || new Set(cases.scenarios.map(c => c.id)).size !== cases.scenarios.length) throw new Error('Cases need distinct scenario IDs');
  for (const scenario of cases.scenarios) {
    if (!scenario.id || !scenario.description) throw new Error('Each scenario needs an id and description');
    for (const boxId of BOX_IDS) {
      const testCase = scenario.boxes?.[boxId];
      if (!testCase?.input || !Array.isArray(testCase.expected_status) || !testCase.expected_status.length || !Array.isArray(testCase.expectations) || !testCase.expectations.length) throw new Error(`Incomplete case: ${scenario.id}/${boxId}`);
      if (boxId === 'nistgap' && (typeof testCase.input !== 'object' || Array.isArray(testCase.input))) throw new Error('NIST cases require a structured fixed RequirementsPackage input');
    }
  }
  if (typeof judge.instructions !== 'string' || judge.criteria?.length !== 6 || new Set(judge.criteria.map(c => c.id)).size !== 6) throw new Error('Judge needs instructions and six distinct criteria');
  for (const criterion of judge.criteria) for (const key of ['id', 'title', 'full', 'partial', 'fail']) if (!criterion[key]) throw new Error(`Judge criterion missing ${key}`);
  for (const id of BOX_IDS) if (!judge.roles?.[id]) throw new Error(`Judge missing role boundary: ${id}`);
  for (const id of BOX_IDS) if (!judge.contracts?.[id]) throw new Error(`Judge missing output contract: ${id}`);
  return {versions, scenarios: cases.scenarios, judge};
}

async function evaluate(prompt, scenario, judge, settings, apiKey) {
  const testCase = scenario.boxes[prompt.id];
  const input = typeof testCase.input === 'string' ? testCase.input : stringify(testCase.input);
  // Use a callback so literal $ characters in input are never replacement syntax.
  let user = prompt.user_template.replace('{{input}}', () => input);
  if (prompt.id === 'nistgap') user += '\n\nTrusted evaluation metadata:\nassessment_date: 2026-09-26\nCopy this date exactly.';
  const result = {boxId: prompt.id, scenarioId: scenario.id, user, output: '', checks: [], score: null, state: 'running', judgeAttempts: []};
  const start = Date.now();
  try {
    const response = await callVal({apiKey, model: settings.model, system: prompt.system, user});
    result.output = response.text;
    result.generation = {model: response.model, usage: response.usage};
  } catch (error) {
    result.state = 'generation_error';
    result.error = error.message;
    result.score = null;
    result.durationMs = Date.now() - start;
    return result;
  }
  result.checks = automaticChecks(prompt.id, result.output, testCase);
  const judgeUser = JSON.stringify({
    role: prompt.label,
    responsibilities: judge.roles[prompt.id],
    input: testCase.input,
    outputContract: judge.contracts[prompt.id],
    trustedMetadata: prompt.id === 'nistgap' ? {assessment_date: settings.assessmentDate} : {},
    expectedStatus: testCase.expected_status,
    expectations: testCase.expectations,
    criteria: judge.criteria,
    output: result.output,
  });
  // A judge failure gets one retry. Failed judgments never become numeric scores.
  for (let attempt = 0; attempt < 2; attempt++) {
    const savedAttempt = {};
    result.judgeAttempts.push(savedAttempt);
    try {
      const response = await callVal({apiKey, model: settings.judgeModel, system: judge.instructions, user: judgeUser});
      Object.assign(savedAttempt, response);
      const checks = readJudgeChecks(response.text, judge.criteria);
      result.checks.push(...checks);
      result.score = totalPoints(result.checks);
      result.state = 'scored';
      break;
    } catch (error) { savedAttempt.error = error.message; }
  }
  if (result.score === null) result.state = 'judge_error';
  result.durationMs = Date.now() - start;
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  let selection, repeats;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') continue;
    if (args[i] === '--all' && !selection) selection = 'all';
    else if (args[i] === '--version' && !selection && args[i + 1]) selection = args[++i];
    else if (args[i] === '--repeats' && args[i + 1]) repeats = Number(args[++i]);
    else throw new Error('Usage: node evals/run.mjs [--all | --version ID] [--repeats N] [--check]');
  }
  repeats ??= selection ? 3 : 1;
  if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('--repeats must be between 1 and 20');
  const inputs = await loadInputs(selection);
  const count = inputs.versions.length * repeats;
  console.log(`${inputs.versions.length} version(s) × ${repeats} repeat(s) = ${count} runs, normally ${count * inputs.scenarios.length * 6} VAL calls.`);
  if (process.argv.includes('--check')) {
    console.log(`Valid: 3 prompts, ${inputs.scenarios.length} scenarios, 10 checks per output. No VAL calls made.`);
    return;
  }
  // Read only evals/.env; never load the application's environment files.
  let localEnv = {};
  try { localEnv = parseEnv(await readFile(join(directory, '.env'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const apiKey = process.env.VAL_API_KEY || localEnv.VAL_API_KEY;
  if (!apiKey) throw new Error('Set VAL_API_KEY in evals/.env or your shell. See evals/.env.example.');
  const settings = {
    endpoint: ENDPOINT,
    model: process.env.EVAL_MODEL || localEnv.EVAL_MODEL || 'openai-gpt-4.1',
    judgeModel: process.env.EVAL_JUDGE_MODEL || localEnv.EVAL_JUDGE_MODEL || 'openai-gpt-4.1',
    temperature: 0,
    timeoutMs: 120000,
    assessmentDate: '2026-09-26',
  };
  const code = await Promise.all(['run.mjs', 'score.mjs', 'val.mjs'].map(name => readFile(join(directory, name), 'utf8')));
  const evaluatorHash = hash(code);
  const batchId = randomUUID();
  // Repeat the full version sequence three times, rather than finishing one version first.
  // Each version/repeat is its own saved run and the report refreshes after each one.
  for (let repeat = 1; repeat <= repeats; repeat++) {
    for (const version of inputs.versions) {
      const snapshot = {prompts: version.prompts, scenarios: inputs.scenarios, judge: inputs.judge};
      console.log(`Version ${version.id}, repeat ${repeat}/${repeats}`);
      const run = {
        formatVersion: 1,
        evaluatorVersion: 2,
        batchId, versionId: version.id, versionDescription: version.description ?? version.id, repeat, repeats,
        id: `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`,
        startedAt: new Date().toISOString(),
        state: 'running',
        settings, snapshot, evaluatorHash,
        comparisonGroup: hash({scenarios: snapshot.scenarios, judge: snapshot.judge, settings, evaluatorHash}),
        promptVersions: Object.fromEntries(snapshot.prompts.map(p => [p.id, hash({system: p.system, user_template: p.user_template})])),
        results: [],
        scores: {},
      };
      const history = join(directory, '.runs');
      await mkdir(history, {recursive: true});
      const path = join(history, `${run.id}.json`);
      async function save() {
        await writeFile(`${path}.tmp`, JSON.stringify(run, null, 2), {mode: 0o600});
        await rename(`${path}.tmp`, path);
      }
      await save();
      for (const scenario of snapshot.scenarios) {
        for (const prompt of snapshot.prompts) {
          console.log(`Evaluating ${scenario.id} / ${prompt.label} ...`);
          const result = await evaluate(prompt, scenario, snapshot.judge, settings, apiKey);
          run.results.push(result);
          await save();
          console.log(`  ${result.score === null ? 'Incomplete' : `${result.score}/100`} (${result.state})`);
        }
      }
      run.scores = Object.fromEntries(BOX_IDS.map(id => [id, boxAverage(run.results, id, snapshot.scenarios.length)]));
      run.state = run.results.some(result => result.score === null) ? 'incomplete' : 'complete';
      run.completedAt = new Date().toISOString();
      await save();
      await buildReport(directory);
      console.log('Saved history. Open evals/report.html in your browser.');
      if (run.results.some(result => result.state !== 'scored')) process.exitCode = 1;
    }
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
