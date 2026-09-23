# Known limitations and ethics

These are release decisions for humans, not problems hidden by a green validation badge.

## Security analysis and model output

- Structural/reference validity is not professional security correctness. CIA
  impacts, severity, and NIST mappings may be wrong even when YAML is valid.
- Supplied evidence is unverified unless independently checked. Absence of evidence
  is not proof of absence; a requirement is not proof of an implemented control.
- Model responses are nondeterministic and can invent facts, use stale information,
  exceed output limits, or produce malformed YAML. Prompts and strict parsing reduce
  risk but do not eliminate it. Invalid raw output remains visible for review/rerun.
- A preliminary NIST assessment is not certification or compliance determination.
  Advisor guidance is not risk acceptance, a release approval, or legal advice.

## Access, privacy, and deployment

- `firestore.rules` currently permits any authenticated user to read/update any
  board. `storage.rules` permits any authenticated user to read/write any board's
  images/documents. Both need redesigned and emulator-tested owner/collaborator/
  guest/workshop policies before broader use. Avoid sensitive project content now.
- Local Express and Firebase Functions generation routes lack caller authentication
  and rate limiting. Public access can consume provider quota or cost. API keys must
  stay backend-only; do not put them in `VITE_*`, localStorage, screenshots, or docs.
- `client/src/lib/firebase.ts` includes public Firebase web configuration for the
  current project. It is not a secret, but forks need explicit project selection.
- Cloudflare Quick Tunnel is temporary demo infrastructure. The Mac backend and
  tunnel must remain online; the URL changes, and production Functions behavior can
  differ. Firebase Auth/Firestore/Storage still run on Firebase.
- Uploaded evidence may be sent to the selected AI provider. Obtain consent and
  apply data minimization; provider privacy/retention terms require separate review.

## Verification boundary

`npm run verify` covers server, client and Functions tests/builds. There is no full
browser E2E or Firebase emulator authorization suite. The RMIT VAL Preview chain was
manually smoke-tested by the team, but automated tests mock external provider calls;
CI cannot prove live-provider quality or deployment availability. Human review and
real environment tests remain necessary.
