// Four automatic checks (10 points each), plus six judge checks (0/5/10 each).
// These rules belong to the eval only. Nothing is imported from the application.
import { parseDocument } from 'yaml';
import { isDeepStrictEqual } from 'node:util';

export const BOX_IDS = ['reqelicitor', 'nistgap', 'securityadvisor'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasValue = value => value !== undefined && value !== null && value !== '';

function requiredFields(boxId, artifact) {
  const fields = {
    reqelicitor: ['case_id', 'assessment_boundary', 'assets', 'requirements', 'evidence_register', 'assumptions', 'open_questions', 'limitations'],
    nistgap: ['report_id', 'assessment_date', 'framework_version', 'scope_boundary', 'exclusions', 'requirements_package', 'function_coverage', 'findings', 'unmapped_requirements', 'unassessed_areas', 'limitations'],
    securityadvisor: artifact.status === 'interview_required'
      ? ['focused_questions']
      : ['guidance_id', 'interview_summary', 'recommended_next_box', 'recommended_next_step', 'reason', 'inputs_to_prepare', 'relevant_upstream_references', 'human_review', 'assumptions', 'limitations', 'confidence'],
  }[boxId];
  const problems = fields.filter(key => !hasValue(artifact[key])).map(key => `Missing ${key}`);
  const type = {reqelicitor: 'RequirementsPackage', nistgap: 'NISTAssessmentPackage', securityadvisor: 'NextStepGuidance'}[boxId];
  if (artifact.artifact_type !== type) problems.push(`artifact_type must be ${type}`);
  if (artifact.schema_version !== '1.0') problems.push('schema_version must be the string "1.0"');
  const arrays = {
    reqelicitor: ['assets', 'requirements', 'evidence_register', 'assumptions', 'open_questions', 'limitations'],
    nistgap: ['exclusions', 'findings', 'unmapped_requirements', 'unassessed_areas', 'limitations'],
    securityadvisor: artifact.status === 'interview_required' ? ['focused_questions'] : ['inputs_to_prepare', 'relevant_upstream_references', 'human_review', 'assumptions', 'limitations'],
  }[boxId];
  for (const key of arrays) if (!Array.isArray(artifact[key])) problems.push(`${key} must be a list`);
  if (boxId === 'reqelicitor') {
    if (!isObject(artifact.assessment_boundary)) problems.push('assessment_boundary must be an object');
    for (const requirement of artifact.requirements ?? []) {
      for (const key of ['shall_statement', 'cia_objectives', 'elicitation_basis', 'priority', 'confidence', 'acceptance_criteria', 'source_refs']) {
        if (!hasValue(requirement?.[key])) problems.push(`Requirement missing ${key}`);
      }
      if (!/\bSHALL\b/.test(requirement?.shall_statement ?? '')) problems.push('Requirement must contain SHALL');
      for (const key of ['cia_objectives', 'acceptance_criteria', 'source_refs']) {
        if (!Array.isArray(requirement?.[key]) || !requirement[key].length) problems.push(`Requirement ${key} must be a nonempty list`);
      }
    }
  }
  if (boxId === 'nistgap') {
    if (!isObject(artifact.requirements_package)) problems.push('requirements_package must be an object');
    if (!isObject(artifact.function_coverage) && !Array.isArray(artifact.function_coverage)) problems.push('function_coverage must be structured');
    if (artifact.framework_version !== 'NIST CSF 2.0') problems.push('framework_version must be NIST CSF 2.0');
    if (artifact.assessment_date !== '2026-09-26') problems.push('assessment_date must match the fixed eval date 2026-09-26');
  }
  if (boxId === 'securityadvisor' && artifact.status === 'interview_required') {
    if (!artifact.focused_questions?.length) problems.push('At least one focused question is required');
    for (const question of Array.isArray(artifact.focused_questions) ? artifact.focused_questions : []) {
      for (const key of ['question', 'why_it_matters', 'evidence_needed']) if (!hasValue(question?.[key])) problems.push(`Question missing ${key}`);
    }
  }
  if (boxId === 'securityadvisor' && artifact.status === 'recommendation_ready') {
    if (!['security_requirements_elicitor', 'nist_csf_checker', 'security_advisor', 'none'].includes(artifact.recommended_next_box)) problems.push('Invalid recommended_next_box');
    if (!/^NEXT-0*[1-9]\d*$/.test(artifact.guidance_id ?? '')) problems.push('Invalid guidance_id');
  }
  return problems;
}

// Search actual strings, not JSON escapes (a newline becomes "\\n" in JSON).
function idsIn(value, found = new Set()) {
  if (typeof value === 'string') {
    for (const id of value.match(/\b(?:AST|EVID|REQ|GAP)-\d+\b/g) ?? []) found.add(id);
  } else if (Array.isArray(value)) {
    for (const item of value) idsIn(item, found);
  } else if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) { idsIn(key, found); idsIn(item, found); }
  }
  return found;
}

function traceProblems(boxId, artifact, input) {
  if (boxId === 'nistgap' && !isDeepStrictEqual(artifact.requirements_package, input)) {
    return ['requirements_package does not preserve the complete fixed input object'];
  }
  if (boxId !== 'reqelicitor') {
    const known = idsIn(input);
    const used = idsIn(artifact);
    const problems = [...used].filter(id => !(boxId === 'nistgap' && id.startsWith('GAP-')) && !known.has(id))
      .map(id => `Reference ${id} is not in the supplied input`);
    if (boxId === 'nistgap') {
      const seen = new Set();
      for (const finding of Array.isArray(artifact.findings) ? artifact.findings : []) {
        const id = finding?.id ?? finding?.gap_id;
        if (!/^GAP-0*[1-9]\d*$/.test(id ?? '') || seen.has(id)) problems.push('Missing, invalid or duplicate GAP identifier');
        seen.add(id);
      }
    }
    return problems;
  }
  const problems = [];
  const evidence = new Set();
  for (const [field, prefix] of [['assets', 'AST'], ['requirements', 'REQ'], ['evidence_register', 'EVID']]) {
    const seen = new Set();
    for (const entry of Array.isArray(artifact[field]) ? artifact[field] : []) {
      const id = entry?.id ?? entry?.[{assets: 'asset_id', requirements: 'requirement_id', evidence_register: 'evidence_id'}[field]];
      if (typeof id !== 'string' || !new RegExp(`^${prefix}-0*[1-9]\\d*$`).test(id)) problems.push(`Invalid ${field} id`);
      else if (seen.has(id)) problems.push(`Duplicate ${id}`);
      seen.add(id);
      if (prefix === 'EVID') evidence.add(id);
    }
  }
  for (const requirement of Array.isArray(artifact.requirements) ? artifact.requirements : []) {
    if (!Array.isArray(requirement?.source_refs) || !requirement.source_refs.length) problems.push('Requirement has no source_refs');
    else for (const ref of requirement.source_refs) if (!evidence.has(ref)) problems.push(`Broken source reference ${ref}`);
  }
  return problems;
}

export function automaticChecks(boxId, output, testCase) {
  const check = (id, title, problems) => ({id, title, points: problems.length ? 0 : 10, reason: problems.join('; ') || 'Passed.', evidence: problems.join('; ') || title});
  let artifact;
  let parseError;
  try {
    const doc = parseDocument(output, {uniqueKeys: true});
    if (doc.errors.length) throw new Error(doc.errors[0].message);
    artifact = doc.toJS({maxAliasCount: 50});
    if (!isObject(artifact)) throw new Error('Output must be one YAML object.');
  } catch (error) { parseError = error.message; }
  if (parseError) return ['yaml', 'fields', 'status', 'trace'].map((id, index) => check(id, ['Valid YAML object', 'Required fields and types', 'Expected status', 'Traceability'][index], [parseError]));
  const statusProblems = testCase.expected_status.includes(artifact.status) ? [] : [`Expected ${testCase.expected_status.join(' or ')}, got ${artifact.status}`];
  if (boxId === 'reqelicitor' && artifact.status === 'complete' && artifact.open_questions?.length) statusProblems.push('complete requires empty open_questions');
  let fieldProblems;
  try { fieldProblems = requiredFields(boxId, artifact); }
  catch { fieldProblems = ['Invalid nested field types']; }
  return [
    check('yaml', 'Valid YAML object', []),
    check('fields', 'Required fields and types', fieldProblems),
    check('status', 'Expected status', statusProblems),
    check('trace', 'Traceability and input preservation', traceProblems(boxId, artifact, testCase.input)),
  ];
}

export function readJudgeChecks(text, criteria) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.checks) || parsed.checks.length !== 6) throw new Error('Judge must return six checks');
  return criteria.map(criterion => {
    const matches = parsed.checks.filter(check => check.id === criterion.id);
    const check = matches[0];
    if (matches.length !== 1 || ![0, 5, 10].includes(check.points) || typeof check.reason !== 'string' || !check.reason.trim() || typeof check.evidence !== 'string' || !check.evidence.trim()) {
      throw new Error(`Invalid judge check: ${criterion.id}`);
    }
    return {...check, title: criterion.title};
  });
}

export function totalPoints(checks) {
  if (checks.length !== 10) throw new Error('A complete score requires ten checks');
  return checks.reduce((total, check) => total + check.points, 0);
}

export function boxAverage(results, boxId, expectedCount) {
  const rows = results.filter(result => result.boxId === boxId);
  if (rows.length !== expectedCount || rows.some(row => row.score === null)) return null;
  return rows.reduce((total, row) => total + row.score, 0) / rows.length;
}
