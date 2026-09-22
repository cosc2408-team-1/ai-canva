# Report evidence map

This is a source map for the team, not the final 3,000–4,000-word report. Suggested
word budgets are guidance only. Verify all external citations before submission.

## Problem and motivation (about 450–550 words)

- **Point:** project teams may know their app idea but lack a traceable path from
  incomplete evidence to security requirements and next actions.
- **Evidence:** `client/src/lib/boardTemplates.ts`, [Security Workflow](SECURITY_WORKFLOW.md).
- **Figure:** template chain. **Avoid:** invented prevalence/market statistics.
- **Source needed:** [TEAM TO INSERT VERIFIED USER/DOMAIN RESEARCH].

## Domain research (about 650–800 words)

- **Point:** evidence-first elicitation, CIA, scoped ASVS references and NIST CSF 2.0
  inform separate stages; human review stays explicit.
- **Evidence:** prompt contracts in `client/src/types.ts`, research in
  `docs/research/`, [Assignment Brief](course/03_cyber_group_brief.md).
- **Figure:** AST/EVID/REQ/GAP/NEXT reference chain. **Avoid:** equating mapping with compliance.
- **Sources needed:** [VERIFIED EXTERNAL SOURCE REQUIRED: SQUARE],
  [VERIFIED EXTERNAL SOURCE REQUIRED: OWASP ASVS],
  [VERIFIED EXTERNAL SOURCE REQUIRED: NIST CSF 2.0].

## Design rationale (about 700–850 words)

- **Point:** ordered boxes, stable IDs, strict YAML, unchanged raw output,
  trusted date, deterministic validation and manual execution balance usability
  with uncertainty. Explain invalid versus clarification.
- **Evidence:** [Design Rationale](SECURITY_DESIGN_RATIONALE.md),
  `client/src/lib/securityArtifacts.ts`, `client/src/store/boardStore.ts`,
  `client/src/lib/securityInputValidation.ts` and related tests.
- **Figure:** validation branch or a sanitized Valid/Needs clarification screen.
- **Avoid:** saying structural validation establishes semantic security quality.

## Alternatives (about 400–500 words)

- **Point:** compare manual checklist/spreadsheet, generic chat interaction,
  traditional GRC platforms, expert review and this visual evidence-linked flow
  on traceability, cost of setup, reviewability and human effort.
- **Evidence:** `client/src/lib/boardTemplates.ts`, YAML/reference validation.
- **Figure:** qualitative decision table. **Avoid:** saying all other products lack
  these features. **Sources needed:** [TEAM TO INSERT VERIFIED PRODUCT/PROCESS SOURCES].

## Ethics and limits (about 600–750 words)

- **Point:** hallucination, false assurance, wrong mappings, malformed YAML, privacy,
  provider exposure, missing evidence, and authorization risks; human decisions
  remain with practitioners. Real Preview lessons: stale date, mapping/array
  mismatch, unquoted-colon YAML and invalid-upstream block.
- **Evidence:** [Known Limitations](FINAL_KNOWN_LIMITATIONS.md),
  [Design Rationale](SECURITY_DESIGN_RATIONALE.md), `firestore.rules`, `storage.rules`.
- **Figure:** sanitized validation warning. **Avoid:** secure/compliant/certified claims.
- **Sources needed:** [TEAM TO INSERT VERIFIED PRIVACY/ETHICS REFERENCES].

## Team reflection (about 350–450 words)

- **Point:** explain actual role handoffs, review changes, limitations learned and
  demo responsibilities using team-confirmed evidence only.
- **Evidence:** [Teamwork Evidence](TEAMWORK_EVIDENCE.md), merged PRs, Planner
  records and genuine screenshots. **Avoid:** assigning work solely from commit
  usernames or claiming an unperformed browser test.
