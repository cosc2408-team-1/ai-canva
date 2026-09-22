# Testing

Run `npm run verify` from the repository root. It prints Node/npm and Git revision,
then runs server, client, and Functions tests, all three production builds, and
`git diff --check`. It needs installed dependencies (`npm ci` at root and in
`server/`, `client/`, `functions/`) but no provider key, Firebase login, or network
AI call. Run individual suites with `npm test --prefix server`, `client`, or
`functions`. Tests use Vitest and mock external providers/Firebase as appropriate.

Coverage includes provider and generate-route response handling, API route tests,
prompt/board-template behavior, security input guards, YAML artifact/reference
validation, trusted NIST metadata, Advisor clarification questions, and Functions
health/generate behavior. `npm test` includes all three packages. The CI workflow
at `.github/workflows/ci.yml` repeats this on PRs and `main` without deploying.

The team has reported a real RMIT VAL Firebase Preview smoke test of the manual
security chain: Asset Mapper **Valid**, Requirements Elicitor **Valid**, NIST Gap
Checker **Valid**, Security Advisor **Needs clarification**. The last status is a
valid structured request for human input, not a failed generation. This is manual
evidence, not an automated browser test. See [Demo Runbook](FINAL_DEMO_RUNBOOK.md).

Remaining gaps: there is no full browser E2E suite or Firebase emulator authorization
suite; provider output remains nondeterministic. CI cannot prove deployed Preview,
real provider availability, or semantic correctness of security conclusions. Record
manual screenshots/results separately in [evidence/README.md](evidence/README.md).
