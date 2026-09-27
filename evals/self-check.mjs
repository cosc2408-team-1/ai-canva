// Manual tests only: node --test evals/self-check.mjs
// No real VAL calls, no production imports, no changes to real eval history.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, copyFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse, stringify } from 'yaml';
import { automaticChecks, readJudgeChecks, totalPoints, boxAverage } from './score.mjs';
import { callVal } from './val.mjs';
import { embedHistory } from './report.mjs';

const directory = fileURLToPath(new URL('.', import.meta.url));
const judge = parse(await readFile(join(directory, 'judge.yaml'), 'utf8'));
const goodJudgment = {checks: judge.criteria.map(criterion => ({id: criterion.id, points: 10, reason: 'Meets the requirement.', evidence: 'Relevant output evidence.'}))};
const requirement = {
  artifact_type: 'RequirementsPackage', schema_version: '1.0', case_id: 'test', status: 'complete',
  assessment_boundary: {included: ['Booking API'], excluded: ['Payroll']},
  assets: [{id: 'AST-001', name: 'Booking records'}],
  requirements: [{id: 'REQ-001', shall_statement: 'The API SHALL restrict cancellation to the creator.', cia_objectives: ['integrity'], elicitation_basis: 'Owner requirement', priority: 'high', confidence: 'medium', acceptance_criteria: ['Deny another user.'], source_refs: ['EVID-001']}],
  evidence_register: [{id: 'EVID-001', statement: 'The owner requires creator-only cancellation.'}],
  assumptions: [], open_questions: [], limitations: ['Unverified user report.'],
};
const fixtures = {
  reqelicitor: requirement,
  nistgap: {
    artifact_type: 'NISTAssessmentPackage', schema_version: '1.0', report_id: 'RPT-001', assessment_date: '2026-09-26', status: 'complete', framework_version: 'NIST CSF 2.0', scope_boundary: ['Booking API'], exclusions: ['Payroll'], requirements_package: requirement, function_coverage: [], findings: [], unmapped_requirements: [], unassessed_areas: [], limitations: ['Unverified.'],
  },
  securityadvisor: {artifact_type: 'NextStepGuidance', schema_version: '1.0', status: 'interview_required', focused_questions: [{question: 'What is the goal?', why_it_matters: 'Determines routing.', evidence_needed: 'Goal statement.'}]},
};

test('ten checks produce an understandable total; failed cases stay in the average', () => {
  const checks = automaticChecks('reqelicitor', stringify(requirement), {input: 'Owner requirement', expected_status: ['complete']});
  assert.equal(checks.reduce((sum, check) => sum + check.points, 0), 40);
  const graded = readJudgeChecks(JSON.stringify(goodJudgment), judge.criteria);
  graded[0].points = 5;
  assert.equal(totalPoints([...checks, ...graded]), 95);
  assert.equal(boxAverage([{boxId: 'a', score: 100}, {boxId: 'a', score: 0}], 'a', 2), 50);
  assert.equal(boxAverage([{boxId: 'a', score: null}], 'a', 1), null);
  assert.equal(boxAverage([{boxId: 'a', score: 100}], 'a', 2), null);
});

test('malformed YAML, wrong status, broken references and changed upstream values lose points', () => {
  const testCase = {input: 'Owner requirement', expected_status: ['complete']};
  assert.ok(automaticChecks('reqelicitor', 'x: [', testCase).every(check => check.points === 0));
  assert.ok(automaticChecks('reqelicitor', 'x: 1\nx: 2', testCase).every(check => check.points === 0));
  const wrong = structuredClone(requirement);
  wrong.status = 'approved';
  wrong.requirements[0].source_refs = ['EVID-999'];
  const checks = automaticChecks('reqelicitor', stringify(wrong), testCase);
  assert.equal(checks[2].points, 0);
  assert.equal(checks[3].points, 0);
  const changed = structuredClone(fixtures.nistgap);
  changed.requirements_package.case_id = 'rewritten';
  assert.equal(automaticChecks('nistgap', stringify(changed), {input: requirement, expected_status: ['complete']})[3].points, 0);
});

test('a malformed judge response cannot become a score', () => {
  for (const text of ['not JSON', '{"checks":[]}', JSON.stringify({checks: Array(6).fill(goodJudgment.checks[0])})]) {
    assert.throws(() => readJudgeChecks(text, judge.criteria));
  }
  const bad = structuredClone(goodJudgment);
  bad.checks[0].points = 11;
  assert.throws(() => readJudgeChecks(JSON.stringify(bad), judge.criteria));
  assert.throws(() => totalPoints([]));
});

test('traceability finds IDs after real newlines, including nested text, but rejects unknown IDs', () => {
  const input = 'Context\nREQ-001 and EVID-001\nGAP-001';
  const output = {...fixtures.securityadvisor, references: ['REQ-001', 'EVID-001', 'GAP-001']};
  for (const value of [input, {nested: [{text: input}]}]) {
    assert.equal(automaticChecks('securityadvisor', stringify(output), {input: value, expected_status: ['interview_required']})[3].points, 10);
  }
  output.references.push('REQ-999');
  assert.equal(automaticChecks('securityadvisor', stringify(output), {input, expected_status: ['interview_required']})[3].points, 0);
});

test('VAL errors do not disclose response bodies or credentials; truncation fails', async () => {
  const args = {apiKey: 'secret-test-key', model: 'test', system: 's', user: 'u'};
  await assert.rejects(callVal({...args, fetchImpl: async () => new Response('secret-test-key', {status: 401})}), /^Error: VAL request failed \(HTTP 401\)\.$/);
  await assert.rejects(callVal({...args, fetchImpl: async () => Response.json({choices: [{finish_reason: 'length', message: {content: 'partial'}}]})}), /truncated/);
});

test('embedded report data cannot escape its script element', () => {
  const hostile = '</script><script>alert(1)</script>';
  const html = embedHistory('<!-- RUN_DATA -->', [{output: hostile}]);
  assert.ok(!html.includes(hostile));
  const json = html.match(/<script[^>]*>(.*)<\/script>/s)[1];
  assert.equal(JSON.parse(json)[0].output, hostile);
});

test('end-to-end runner saves history and a standalone report, and retains judge failures', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'ai-canva-eval-test-'));
  try {
    for (const name of ['run.mjs', 'score.mjs', 'val.mjs', 'report.mjs', 'dashboard.html', 'judge.yaml']) await copyFile(join(directory, name), join(temp, name));
    await symlink(join(directory, 'node_modules'), join(temp, 'node_modules'), 'dir');
    const prompts = Object.keys(fixtures).map(id => ({id, label: id, system: id, user_template: 'Input: {{input}}'}));
    const scenarios = [{id: 'fixed-case', description: 'Fixture', boxes: Object.fromEntries(Object.keys(fixtures).map(id => [id, {input: id === 'nistgap' ? requirement : 'Fixed input', expected_status: [fixtures[id].status], expectations: ['Expected outcome']}]))}];
    await writeFile(join(temp, 'prompts.yaml'), stringify({format_version: 1, prompts}));
    await writeFile(join(temp, 'cases.yaml'), stringify({format_version: 1, scenarios}));
    await writeFile(join(temp, 'mock.mjs'), `
      const outputs = ${JSON.stringify(Object.fromEntries(Object.entries(fixtures).map(([id, artifact]) => [id, stringify(artifact)])))};
      globalThis.fetch = async (url, options) => {
        if (url !== 'https://val.rmit.edu.au/api/chat/completions') throw new Error('Unexpected endpoint');
        const request = JSON.parse(options.body);
        const system = request.messages[0].content;
        const judging = !outputs[system];
        if (judging) {
          const context = JSON.parse(request.messages[1].content);
          if (!context.outputContract) throw new Error('Missing judge contract');
          if (context.role === 'nistgap' && context.trustedMetadata.assessment_date !== '2026-09-26') throw new Error('Missing trusted assessment date');
        }
        const content = judging ? (process.env.MOCK_BAD_JUDGE ? '{}' : ${JSON.stringify(JSON.stringify(goodJudgment))}) : (process.env.MOCK_EMPTY_GENERATION ? '' : outputs[system]);
        return Response.json({model: 'mock-model', choices: [{message: {content}}]});
      };
    `);
    const execute = promisify(execFile);
    const args = ['--import', join(temp, 'mock.mjs'), join(temp, 'run.mjs')];
    const options = {env: {...process.env, VAL_API_KEY: 'secret-test-key'}, timeout: 10000};
    await execute(process.execPath, args, options);
    let html = await readFile(join(temp, 'report.html'), 'utf8');
    let runs = JSON.parse(html.match(/id="run-data">(.*?)<\/script>/s)[1]);
    assert.equal(runs.length, 1);
    assert.deepEqual(Object.values(runs[0].scores), [100, 100, 100]);
    assert.equal(runs[0].results.length, 3);
    assert.ok(!html.includes('secret-test-key'));
    await assert.rejects(execute(process.execPath, args, {...options, env: {...options.env, MOCK_BAD_JUDGE: '1'}}));
    html = await readFile(join(temp, 'report.html'), 'utf8');
    runs = JSON.parse(html.match(/id="run-data">(.*?)<\/script>/s)[1]);
    assert.equal(runs.length, 2);
    assert.equal(runs[1].state, 'incomplete');
    assert.ok(runs[1].results.every(result => result.score === null && result.judgeAttempts.length === 2));
    assert.notEqual(runs[0].id, runs[1].id);
    await assert.rejects(execute(process.execPath, args, {...options, env: {...options.env, MOCK_EMPTY_GENERATION: '1'}}));
    html = await readFile(join(temp, 'report.html'), 'utf8');
    runs = JSON.parse(html.match(/id="run-data">(.*?)<\/script>/s)[1]);
    assert.ok(runs[2].results.every(result => result.state === 'generation_error' && result.score === null));
    assert.ok(Object.values(runs[2].scores).every(score => score === null));

    const editedPrompts = prompts.map(prompt => ({...prompt, user_template: 'Revised input: {{input}}'}));
    await writeFile(join(temp, 'prompt-versions.yaml'), stringify({format_version: 1, versions: [
      {id: 'v01', prompts}, {id: 'v02', prompts: editedPrompts},
    ]}));
    await execute(process.execPath, [...args, '--all'], options);
    html = await readFile(join(temp, 'report.html'), 'utf8');
    runs = JSON.parse(html.match(/id="run-data">(.*?)<\/script>/s)[1]);
    const batch = runs.slice(3);
    assert.equal(batch.length, 6);
    assert.equal(new Set(batch.map(run => run.batchId)).size, 1);
    assert.equal(new Set(batch.map(run => run.comparisonGroup)).size, 1);
    assert.equal(new Set(batch.map(run => run.promptVersions.reqelicitor)).size, 2);
    assert.deepEqual(batch.map(run => [run.versionId, run.repeat]), [['v01', 1], ['v02', 1], ['v01', 2], ['v02', 2], ['v01', 3], ['v02', 3]]);
    assert.ok(batch.every(run => Object.values(run.scores).every(score => score === 100)));
    assert.equal(await readFile(join(temp, 'prompts.yaml'), 'utf8'), stringify({format_version: 1, prompts}));
    await assert.rejects(execute(process.execPath, [...args, '--version', 'does-not-exist', '--check'], options));
  } finally { await rm(temp, {recursive: true, force: true}); }
});
