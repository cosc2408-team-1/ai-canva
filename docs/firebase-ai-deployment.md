# Firebase AI backend deployment

**Task:** Sprint 2 W1 — Prepare and test the Firebase AI backend deployment
**Owner:** Manthan Punjabi (Dev)
**Date:** 18 September 2026
**Depends on:** the provider comparison recorded in [`ai-api-decision.md`](./ai-api-decision.md)

This records how the deployed backend is built, tested and released, and what is
still outstanding before a real deploy can be verified.

---

## What the deployed backend is

`firebase.json` rewrites `/api/**` to a single Cloud Function named `api`, which
serves the same Express routes as the local dev server in `server/`. The canvas
never calls a provider directly: every box goes through `client/src/lib/api.ts`
to `POST /api/generate`, and provider selection happens inside the backend via
`AI_PROVIDER`. That contract is unchanged by this task.

The two routes that matter for the AI backend:

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Reports the selected provider and whether each key is configured. Safe to call publicly — it reports presence, never values. |
| `POST /api/generate` | The shared text-generation route used by all three security boxes. |

---

## State before this task

Three gaps, all found by inspection rather than by a failing build:

1. **The functions backend had no tests.** The VAL provider was added to both
   `server/` and `functions/` in PR #14, but only `server/` had route tests. The
   deployed copy of the provider code was never exercised, so a regression in it
   would not have been caught before release.

2. **CI never deployed the function.** `firebase-hosting.yml` triggers only on
   `client/**`, `firebase.json` and `.firebaserc`, and its deploy step is
   `action-hosting-deploy`, which releases Hosting only. A change to
   `functions/**` triggered nothing at all. The function only ever changed when
   somebody ran `scripts/deploy.sh` by hand.

3. **`scripts/deploy.sh` was stale against the VAL decision.** It hard-required
   `OLLAMA_API_KEY` and copied only that key into `functions/.env`. With
   `AI_PROVIDER=val` it would abort on a missing Ollama key, and if it did run it
   would deploy a backend with no VAL settings. It also defaulted to deploying to
   `carbondocs` — the upstream author's project, not ours.

---

## What changed

| Change | File |
| --- | --- |
| Export the Express app so routes can be tested | `functions/src/index.ts` |
| Health and generate route tests (7) | `functions/src/app.test.ts` |
| Test runner + `test` script | `functions/package.json` |
| Keep test files out of the deployed bundle | `functions/tsconfig.json` |
| Build, test, and manual-deploy pipeline | `.github/workflows/firebase-functions.yml` |
| Provider-aware env sync; correct default project | `scripts/deploy.sh` |
| Run functions install and tests from the repo root | `package.json` |

The route tests mock every provider call, so they need no key and never reach
`val.rmit.edu.au`. They cover: health reporting the selected provider, health
reporting a missing key without failing, the default-to-ollama fallback,
rejecting a request with no `userPrompt` before calling the provider, the
success response contract, an upstream 401 passing through, and an unconfigured
deployment returning 503 rather than a generic error.

Verified locally on 18 September 2026: `npm run build --prefix functions`
succeeds, `dist/` contains no test files, and `npm test` passes 69 server, 282
client and 7 functions tests.

---

## How to deploy

### Manual (works today)

```bash
# server/.env must hold AI_PROVIDER and the matching key
bash scripts/deploy.sh
```

The script now reads `AI_PROVIDER` from `server/.env`, requires the key that
provider actually needs, copies only the relevant settings into
`functions/.env`, and deploys to the `default` project in `.firebaserc`
(`ai-canva-e9dff`). Key values are never printed. Override the target
deliberately with `FIREBASE_PROJECT=<project-id>`.

### CI (prepared, not yet exercised)

`.github/workflows/firebase-functions.yml`:

- **Build and test** run automatically on pushes to `main` and on pull requests
  that touch `functions/**` or `firebase.json`.
- **Deploy** runs only from a manual *Run workflow* with the confirmation input
  typed as `deploy`, and only after build and test pass.

Deploy is intentionally manual. A broken function takes `/api/**` down for the
whole team, and nobody can yet verify a deploy against a real provider. Switch
the `deploy` job to run automatically once a key is in CI and one manual deploy
has succeeded.

The deploy job fails early with a clear message if the selected provider's
secret is missing, rather than shipping a backend that answers every box with a
503.

---

## Required repository secrets

Set under **Settings → Secrets and variables → Actions**.

| Secret | Status | Notes |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_AI_CANVA_E9DFF` | Exists | Already used by the Hosting workflow. Functions deploy needs broader permissions — see below. |
| `AI_PROVIDER` | **Not set** | `val` or `ollama`. Defaults to `ollama` if absent. |
| `VAL_API_KEY` | **Not set** | Required when `AI_PROVIDER=val`. No team member holds one yet. |
| `VAL_MODEL` | Optional | Defaults to `openai-gpt-4.1`. |
| `OLLAMA_API_KEY` | **Not set** | Required when `AI_PROVIDER=ollama`. Must be an Ollama Cloud key — Cloud Functions cannot reach a local daemon. |
| `FAL_KEY`, `STITCH_API_KEY` | Optional | Only for the Cartoon and Stitch boxes, not the security pipeline. |

---

## Still needs approval, access or funding

1. **An RMIT VAL key.** `ai-api-decision.md` records that no team member has one
   and that VAL has never been proved with a real request. Until then the deploy
   path is prepared but unverified end to end.

2. **Service account permissions for functions.** The existing service account
   was created for Hosting. Deploying functions additionally needs Cloud
   Functions Admin, Service Account User, and Artifact Registry write on
   `ai-canva-e9dff`. Whether the current account has them is **unconfirmed** —
   the first manual run of the deploy job will show it.

3. **Firebase billing plan.** Cloud Functions v2 requires the Blaze (pay as you
   go) plan. Whether `ai-canva-e9dff` is on Blaze is **unconfirmed**. If it is
   not, functions deploys will fail regardless of secrets, and moving to Blaze
   needs a billing account and somebody's approval.

4. **VAL usage limits.** Quotas, data retention and approved data
   classifications are still unconfirmed per `ai-api-decision.md`. Until they
   are, only fictional or sanitised content goes through the deployed backend.

None of these block this task's deliverable, which is a tested and prepared
deployment path. They block the first real deploy.

---

## Verifying a deploy

After any deploy, manual or CI:

```bash
curl -s https://ai-canva-e9dff.web.app/api/health
```

Expect `status: "ok"`, `aiProvider` matching what was configured, and the
matching key reported as `configured`. Then:

```bash
curl -s -X POST https://ai-canva-e9dff.web.app/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"userPrompt":"Say hi"}'
```

Expect a `content` string and a `usage` object. A 503 mentioning `VAL_API_KEY`
means the function deployed but its environment did not — check the secrets
above. The CI deploy job runs the health check automatically as its last step.

---

## Note for the next role

Week 2 developers can run the backend locally with `npm run dev` and deploy with
`bash scripts/deploy.sh`. Both now follow `AI_PROVIDER`, so local and deployed
runs cannot silently disagree about which provider is in use.

The one coordination point is the key. Whoever obtains the VAL key should add it
to CI as `VAL_API_KEY`, set `AI_PROVIDER=val`, run the deploy workflow manually
once, and record the result here.
