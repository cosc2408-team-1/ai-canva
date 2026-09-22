# System Improvement Plan

## Purpose and Principles

This roadmap incrementally strengthens AI Canva's security workflow without replacing its current architecture. It preserves evidence-first cybersecurity analysis, stable traceability IDs (`AST-*`, `EVID-*`, `REQ-*`, `GAP-*`, `NEXT-*`), structured YAML artifacts, human review, and the rule that generated content must never be presented as proof of security, implementation, compliance, certification, or legal sufficiency.

The existing `POST /api/generate` client contract remains unchanged. RMIT VAL and Ollama stay behind the provider router; Firebase Auth, Firestore collaboration, Firebase Hosting, Functions, and CI/CD remain in place. Each phase should reuse current box, prompt, validation, board-store, and API abstractions instead of creating a parallel workflow engine.

## Phase 0 — Zero-configuration Demo

### Goal

Let an iPad or teammate use only the Firebase Preview URL. Text-generation routing is, in order:
runtime localStorage override → build-time `VITE_AI_API_BASE_URL` → relative `/api/generate`.
localStorage remains a troubleshooting fallback only.

### Plan

1. Review `feature/demo-cloudflare-val`, especially `client/src/lib/apiTarget.ts` and `demoplan.md`.
2. Confirm the Preview build uses public `VITE_AI_API_BASE_URL` as its normal configurable base for `POST /api/generate`. It is public client configuration, never a secret store: `VAL_API_KEY` and every other secret must never be placed in any `VITE_*` variable.
3. Keep `ai-canva.demoAiApiBaseUrl` as a temporary browser-specific diagnostic override, not normal teammate setup.
4. Update `demoplan.md` so the normal teammate/iPad flow is zero-configuration and localStorage is documented only as a troubleshooting fallback.
5. Propose `scripts/deploy-demo-preview.sh` to build/deploy a Firebase Preview with the chosen public demo API base URL, while keeping secrets outside source control.
6. Describe Cloudflare Quick Tunnel as demo-only: it is not production ingress, a stable hostname, an authentication boundary, an availability solution, or a replacement for Firebase Functions.

### Acceptance Checks

- A teammate opens the supplied Firebase Preview URL on an iPad or desktop and runs a text box without entering a tunnel URL or opening DevTools.
- Firebase Auth and Firestore continue to use Firebase directly.
- Removing the localStorage override falls back to `VITE_AI_API_BASE_URL` when configured, otherwise to the relative Firebase `/api/generate` route.
- `VITE_AI_API_BASE_URL` is public configuration only. `VAL_API_KEY` stays backend-only and never appears in any `VITE_*` variable, localStorage, frontend code, screenshots, or example commands.

## Phase 1 — Security Assessment Board Template

### Goal

Provide a ready-made, editable workflow:

```text
Project Description
  → Security Requirements Elicitor
  → NIST CSF Gap Checker
  → Security Advisor
```

### Implementation Plan

1. Add `client/src/lib/boardTemplates.ts` to define template nodes, edges, labels, positions, and defaults using current `BoxType` and board-store types.
2. Add `client/src/lib/boardTemplates.test.ts` to verify stable node/edge construction, expected box types, wiring order, and no duplicate identifiers in the template definition.
3. Add a clear user action to create the template using current board UI patterns.
4. Create boxes and connections only. Do not auto-run AI boxes, prefill unverified evidence, or imply the generated board is an assessment.

### Acceptance Checks

- The first PR scopes template creation to a **new** Security Assessment board. It does not need to insert the template into an existing board yet.
- The template starts with a Project Description input and retains Firebase Auth/Firestore collaboration and save behaviour.
- Security boxes still use existing input validation before generation.

## Phase 2 — Evidence-linked Asset Mapper

### Goal

Extend the workflow:

```text
Project / Evidence
  → Asset Mapper
  → Security Requirements Elicitor
  → NIST CSF Gap Checker
  → Security Advisor
```

### Box Definition

- Register `assetmapper` as a `BoxType`, following existing registration and rendering patterns.
- The Asset Mapper produces a YAML `AssetPackage` containing:
  - `artifact_type: AssetPackage`
  - stable `AST-*` asset IDs
  - stable `EVID-*` evidence IDs
  - asset description/scope and CIA impact
  - `evidence_refs`, `assumptions`, `open_questions`, and `limitations`
- Treat supplied material as unverified evidence. Missing information is unknown or a question, never proof that a control exists or is absent.

### Responsibility Boundary

Asset Mapper must **not** perform risk scoring, threat modelling, NIST gap analysis, control recommendations, compliance determination, implementation approval, or security certification. Those concerns remain in later boxes and with human reviewers.

### Traceability and Validation

1. Extend `client/src/lib/securityInputValidation.ts` and its tests for Asset Mapper input rules.
2. Update the Requirements Elicitor prompt/contract to carry upstream `AST-*` and `EVID-*` references into `REQ-*` records rather than creating duplicate assets or evidence.
3. Preserve upstream references through the NIST CSF Gap Checker and Security Advisor.
4. Add focused tests for Asset Mapper with missing, whitespace-only, and valid Project/Evidence inputs, following the current validation style.

## Phase 3 — Structured Security Artifact Validation

### Goal

Validate YAML-like security outputs while keeping raw model output visible. Validation informs human review; it must never silently discard, rewrite, or hide output.

### Recommended Components

- `client/src/lib/securityArtifacts.ts`
- `client/src/lib/securityArtifacts.test.ts`
- `client/src/components/SecurityArtifactStatus.tsx`

### Artifact Contracts

Validate:

- `AssetPackage`
- `RequirementsPackage`
- `NISTAssessmentPackage`
- `NextStepGuidance`

Detect malformed YAML, wrong `artifact_type`, missing required fields, duplicate IDs, and broken `AST-*`, `EVID-*`, `REQ-*`, `GAP-*`, or `NEXT-*` references where practical. Distinguish syntax, schema, and reference warnings so reviewers understand the action needed.

### UI Behaviour

- Keep invalid model output visible exactly as generated.
- Show a validation warning/status beside the artifact; never replace it with an empty result or fabricated corrected artifact.
- Do not block an informed human from inspecting output. Any later workflow blocking rule must be explicit, testable, and explain required clarification or a documented bypass.

### Current Architecture Alignment

Security boxes currently pass labeled text through `{{inputs}}`; `docs/sprint1-validation.md` records that artifact parsing and runtime enforcement are not yet present. This phase adds parsing and warnings behind the existing output flow, without replacing the shared generation route or collaborative board model.

## Phase 4 — Improve Security Advisor

Keep `NextStepGuidance` as a structured, evidence-linked routing artifact.

1. Preserve upstream `GAP-*`, `REQ-*`, `AST-*`, and `EVID-*` IDs in relevant next steps.
2. Keep NIST gap findings intact. The Advisor must not rewrite, downgrade, remove, or invent gap findings.
3. Do not infer implementation status from a requirement, evidence reference, model output, or missing information. Use `unknown`, assumptions, and clarification requests where appropriate.
4. Require focused clarification where the route, priority, owner, or evidence need is unsupported by the inputs.
5. Make human review explicit for technical validation, risk acceptance, production decisions, privacy, legal, compliance, and specialist security review.
6. Keep the Advisor within its decision-support boundary: no compliance claims, certification, implementation approval, or transformation of likely gaps into verified facts.

## Phase 5 — Security Workflow Presentation

### Goal

Add or refine a Security Engineering view that makes the workflow understandable without changing responsibilities.

### Presentation Plan

1. Add a selectable `security` `BoxRole` in `client/src/types.ts` and update `client/src/components/Sidebar.tsx` so Security Engineering is a real role/view. Group Asset Mapper, Security Requirements Elicitor, NIST CSF Gap Checker, Security Advisor, Documents, and Idea in that role using existing palette/view patterns.
2. Communicate:

```text
Discover → Specify → Assess → Advise
```

3. Add concise cues for evidence, structured-artifact status, human-review requirements, and the distinction between AI-assisted preliminary analysis and an approved assessment.
4. Do not copy another team's SecureFlow branding, logo, colours, prompts, UI assets, or source code. Use the current AI Canva design system and source tree.

## Testing Requirements

- Add Phase 0 API-routing tests for: the default Firebase relative route; build-time `VITE_AI_API_BASE_URL`; runtime localStorage override precedence; fallback after removing the runtime override; and invalid override safety.
- Add `boardTemplates` unit tests.
- Add `securityArtifacts` tests for valid artifacts, malformed YAML, wrong types, missing fields, duplicate IDs, and broken references where practical.
- Extend `securityInputValidation` tests for Asset Mapper and changed security-box behaviour.
- Add focused component/store tests for artifact warning visibility where the current test setup supports them.
- Keep all existing tests green. New behaviour must not weaken provider, Firebase, collaboration, security-box, or CI coverage.

## CI Requirements

Keep:

- `.github/workflows/firebase-hosting.yml`
- `.github/workflows/firebase-functions.yml`

Before completing each PR, run:

```bash
npm test
npm run build --prefix client
npm run build --prefix server
npm run build --prefix functions
git diff --check
```

## Security Requirements

Never expose or commit:

- `VAL_API_KEY`
- `OLLAMA_API_KEY`
- `FAL_KEY`
- `STITCH_API_KEY`
- Firebase service-account JSON

Never put secrets into `VITE_*`, localStorage, frontend JavaScript, screenshots, documentation examples, test evidence, or committed environment files. Provider selection and provider keys stay in the Node/Functions backend environment. Firebase Preview configuration contains only public-client values.

## Recommended Pull Request Sequence

1. **PR1 — Zero-config VAL demo fallback:** review and complete the preview-base-URL approach; keep Cloudflare Quick Tunnel demo-only.
2. **PR2 — Security assessment board template:** add the non-running workflow template and tests.
3. **PR3 — Evidence-linked Asset Mapper:** register `assetmapper`, produce `AssetPackage`, preserve references, and extend input validation.
4. **PR4 — Structured artifact validation:** add YAML parsing, validation warnings, and reference-integrity tests without hiding model output.
5. **PR5 — Security workflow presentation:** refine the Security Engineering view and workflow guidance within AI Canva branding.

## Definition of Done

A new user opens one Firebase URL on an iPad, creates a Security Assessment workflow, supplies project evidence, runs Asset Mapper, Security Requirements Elicitor, NIST CSF Gap Checker, and Security Advisor, while stable evidence references are preserved and no unsupported compliance/security claims are made.

## Codex Execution Rules

- Implement phases incrementally with one focused PR per phase.
- Inspect current code before implementation and reuse current abstractions.
- Avoid unrelated refactors; add tests for behavioural changes and run all relevant tests/builds plus `git diff --check`.
- Do not merge to `main` or deploy production unless explicitly instructed.
- If this roadmap conflicts with current implementation, report the conflict before a large architectural rewrite.
