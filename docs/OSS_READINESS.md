# Open-source and public-deployment readiness

This is an audit of the current repository, not an assertion that the deployed
instance is production-safe. Check again after each rules/API change.

| Status | Current state and evidence | Risk | Post-assignment action |
| --- | --- | --- | --- |
| **OPEN** | `firestore.rules` permits any authenticated user to read/update any `boards/{boardId}`. | Cross-board disclosure and edits. | Design and Firebase-emulator-test owner/collaborator/guest/team access, then deploy reviewed rules. |
| **OPEN** | `storage.rules` permits any authenticated user to read/write board images and documents. | Cross-board file access and modification. | Align Storage checks with tested board membership. |
| **OPEN** | `server/src/app.ts` and `functions/src/index.ts` generation routes do not require a caller token or rate limit. | Public callers may consume provider quota/cost. | Add verified authentication, authorization and quotas before public use; test direct API calls. |
| **PARTIALLY ADDRESSED** | `client/src/lib/firebase.ts` embeds the current `ai-canva-e9dff` Firebase web config. This is public configuration, not a secret. | Forks may unintentionally target the team project. | Make project selection explicit at build time and document it; never put server secrets in `VITE_*`. |
| **PARTIALLY ADDRESSED** | `scripts/deploy-demo-preview.sh` uses a temporary Cloudflare Quick Tunnel to a local Mac backend. | Depends on local host/network; unsuitable as production API. | Use only for assessed demos; use an authenticated, managed backend for wider release. |
| **RESOLVED for verification** | `npm test` covers server/client/Functions; `.github/workflows/ci.yml` runs tests and three builds without secrets. | CI does not cover browser E2E, Firebase rules, real provider calls. | Add emulator and browser tests before production claim. |
| **PARTIALLY ADDRESSED** | `.firebaserc` defaults to `ai-canva-e9dff`; existing Hosting workflow deploys on relevant `main` changes, Functions deployment is manual. | Wrong-target deploy remains possible without operator review. | Confirm project, channel, and rules before every deploy. |

No generic rule snippet is provided here: the current app has owners, collaborators,
workshop guests, teams, and facilitators. A simplistic replacement could break those
flows while appearing more secure. See [Known Limitations](FINAL_KNOWN_LIMITATIONS.md).
