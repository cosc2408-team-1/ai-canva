# Assignment evidence map

Source of requirements: [COSC2408 cybersecurity group brief](course/03_cyber_group_brief.md).
This maps evidence to rubric areas; it does not predict marks or replace the report/demo.

## Build — 40%

| Brief requirement | Repository evidence | Demonstration |
| --- | --- | --- |
| Design/authoring capability | Asset Mapper and Security Requirements Elicitor prompts in `client/src/types.ts`; input checks in `client/src/lib/securityInputValidation.ts` | Show `AssetPackage` AST/EVID references, then `RequirementsPackage` REQ references and acceptance criteria. |
| Checking/vetting capability | NIST CSF Gap Checker in `client/src/types.ts`; validator in `client/src/lib/securityArtifacts.ts` | Show preliminary NIST CSF 2.0 `GAP-*` findings and unknown/evidence-gap handling. |
| Assistant capability | Security Advisor prompt in `client/src/types.ts`; structured question validation in `client/src/lib/securityArtifacts.ts` | Show `NextStepGuidance` or focused clarification questions; no automatic routing. |
| Integrated working chain | `client/src/lib/boardTemplates.ts` (five boxes, four edges); `client/src/store/boardStore.ts` (`{{inputs}}`, manual run, validation gate); `client/src/components/Canvas.tsx`, `BoxNode.tsx`, `Sidebar.tsx` | Create a new Security Assessment board, run stages manually, inspect badges and raw output. |
| Persistence/collaboration | `client/src/lib/firestore.ts`, `client/src/store/boardStore.ts` | Show signed-in board save and collaboration only with authorized demo data. |
| Tests/build | `scripts/final-check.sh`, `.github/workflows/ci.yml`, [Testing](TESTING.md) | Show `npm run verify` and CI run. |

The Security palette is a discovery filter, not an access-control role. The template
does not auto-run. The team-reported Preview smoke test reached Asset Mapper **Valid**,
Requirements **Valid**, NIST **Valid**, Advisor **Needs clarification**. This is
manual evidence, not a browser automation result. Invalid upstream YAML blocks a
downstream security run; a clarification request is structurally valid.

## Research & Design — 40%

- **Problem/motivation:** translate incomplete project evidence into traceable
  assets, testable requirements, preliminary framework review, and next-step advice
  without presenting unsupported certainty. See [Report Evidence Map](REPORT_EVIDENCE_MAP.md).
- **Research grounding:** SQUARE-informed elicitation, CIA objectives, applicable
  OWASP ASVS, NIST CSF 2.0, evidence traceability and human review are reflected in
  `client/src/types.ts`. Insert verified framework/academic citations in the report;
  none are fabricated here.
- **Design rationale and alternatives:** [Security Design Rationale](SECURITY_DESIGN_RATIONALE.md)
  explains ordering, IDs, strict YAML, manual control and local validation. Compare
  qualitatively with manual checklists, generic chat, GRC tools and expert review;
  do not claim those alternatives lack features without sources.
- **Ethics and limitations:** [Known Limitations](FINAL_KNOWN_LIMITATIONS.md) covers
  hallucination, false assurance, privacy, authorization and provider exposure.

## Teamwork & Demo — 20%

- [Teamwork Evidence](TEAMWORK_EVIDENCE.md) records verifiable Git/PR history and
  leaves role ownership for the team to confirm.
- [Demo Runbook](FINAL_DEMO_RUNBOOK.md) and [Evidence Capture](evidence/README.md)
  specify the live chain, failure recovery and screenshots.

The brief gives examples of other possible boxes; Threat Modeler, GDPR checker and
Risk Scorer are not mandatory missing features. The project deliberately focuses on
one evidence-linked Design → Check → Assistant chain.
