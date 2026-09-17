# AI API decision for Sprint 2

**Decision date:** 15 September 2026

**Owner:** Spencer, Project Manager for Sprint 2 Week 1

**Status:** Provisional until the Friday evidence review

## Decision

Use **RMIT VAL as the primary text provider** for Week 2, subject to the verification gates below. Use **Ollama as the fallback** if the team cannot complete a credential-backed VAL request or deploy the VAL configuration safely. Do not add a third provider during Sprint 2.

The client must continue to call the existing `POST /api/generate` contract through `client/src/lib/api.ts`. Provider selection stays in the Express server and Firebase Functions backends through `AI_PROVIDER`. No security box should call VAL or Ollama directly, and no provider key may be placed in client code, committed files, screenshots, test fixtures, or Planner evidence.

This route gives Week 2 one implementation path while keeping the provider replaceable. VAL is the preferred route because the adapter is now implemented in both backends and uses an RMIT-issued service. Ollama remains a working fallback behind the same API contract and can be run locally when remote access is unavailable or inappropriate.

## Evidence reviewed

| Question | Current evidence | Result |
| --- | --- | --- |
| Does the code support VAL? | `server/src/provider.ts`, `server/src/val.ts`, `functions/src/provider.ts`, and `functions/src/val.ts` implement provider routing and normalize VAL responses. | Yes |
| Do the three security boxes use the shared route? | `client/src/store/boardStore.ts` sends text generation through `client/src/lib/api.ts`, including the Security Requirements Elicitor, NIST CSF Gap Checker, and Security Advisor. | Yes |
| Are failure paths tested? | Mocked provider and route tests cover missing keys, authentication, model, method, timeout, network, and successful response cases. On 15 September 2026, `npm test` passed 22 server tests and 118 client tests. | Yes, without a live credential |
| Has VAL been proved with a real request? | The repository journal records that `server/.env` does not contain `VAL_API_KEY`. | No, blocked |
| Has the production route been proved? | The Firebase implementation exists, but this decision has no recorded deployment evidence for the VAL configuration. | Not yet |
| Has the three-box flow been proved? | The prompts and labelled text handoff exist. The MVP does not parse or validate the requested YAML, and it does not prevent the checker from running after `clarification_required`. | Partly |

## Required access and configuration

For local validation, an authorized team member needs an RMIT-issued VAL key. Store it only in the ignored `server/.env` file:

```dotenv
AI_PROVIDER=val
VAL_API_KEY=<RMIT-issued key>
VAL_MODEL=openai-gpt-4.1
```

For production, the Firebase deployment owner needs access to the correct Firebase project and a secure way to configure `AI_PROVIDER`, `VAL_API_KEY`, and optionally `VAL_MODEL` for Functions. The key must not be copied into the Vite client environment. VAL quotas, retention, approved data classifications, and any course usage limits still require confirmation. Until then, tests must use only fictional or sanitized content.

## Files in the agreed route

Provider infrastructure already implemented:

- `server/src/provider.ts`, `server/src/val.ts`, and `server/src/app.ts`
- `functions/src/provider.ts`, `functions/src/val.ts`, and `functions/src/index.ts`
- `server/.env.example` and `functions/.env.example`

Week 2 feature work should normally remain in:

- `client/src/types.ts` for the three box definitions and prompts
- `client/src/store/boardStore.ts` for handoff validation or run guards
- `client/src/lib/api.ts` only if the shared request or response contract must change
- matching unit tests for every changed behaviour

If Week 2 needs provider-specific code in a security box, stop and review the design before implementing it. That would bypass the agreed abstraction.

## Friday verification gates

1. **Provider test:** Set `AI_PROVIDER=val`, make a real sanitized request to the local `/api/generate` route, and retain redacted evidence of `content`, `model`, and `usage`.
2. **Firebase test:** Deploy or test the Functions backend with server-side configuration, then confirm `/api/health` and a sanitized `/api/generate` request. Do not expose the key in logs or screenshots.
3. **Three-box test:** Run the agreed Jordan scenario through the Elicitor, Checker, and Advisor. Record each prompt and output, check that identifiers are preserved, and test at least one missing-information case.
4. **Quality gate:** Run the automated test suite and record the exact command and result.

Gate 4 is complete: `npm test` passed all 140 tests on 15 September 2026. The other three gates still require the Friday team review.

VAL becomes the confirmed Week 2 provider only if all four gates pass. If the live VAL or Firebase gate fails, set `AI_PROVIDER=ollama`, keep the client and three-box implementation unchanged, and record the exact failure, owner, and next action. If the flow test reveals that invalid YAML or `clarification_required` can pass downstream, treat input validation or a run guard as the first meaningful Week 2 feature rather than hiding the limitation in the report.

## Open blockers and owners

| Blocker | Owner and next action |
| --- | --- |
| No credential-backed VAL smoke evidence | Provider-test owner obtains authorized access and runs the documented local check; Spencer reviews redacted evidence on Friday. |
| No recorded Firebase VAL deployment evidence | Firebase-test owner verifies the deployed health and generate routes; Spencer records the outcome. |
| VAL quotas, retention, and approved data classifications are unknown | Spencer asks course staff or the VAL service owner and records the answer before any sensitive data is considered. |
| The three-box handoff is labelled text, not validated structured data | Week 2 developer adds a tested validation or run-guard feature if Friday's scenario proves this is the highest-value gap. |

## Related documents

- [Problem and motivation draft](./report-problem-and-motivation.md)
- [Provider comparison and local VAL check](./AI_PROVIDERS.md)
- [Three-box validation notes](./sprint1-validation.md)
- [Research and customer scenario](./research.md)
