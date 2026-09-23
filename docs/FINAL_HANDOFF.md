# Final handoff

## Current state

- Security Engineering view and manual Discover → Specify → Assess → Advise workflow: implemented.
- Four structured YAML artifacts and local validation: implemented.
- Real RMIT VAL Firebase Preview chain: team-reported manual smoke test; see [Testing](TESTING.md).
- Reproducible automated check: `npm run verify` (no deployment or provider key).
- Hosting: existing workflow deploys on relevant `main` changes; Functions deploy remains manual.
- Public-deployment security limitations remain: see [Known Limitations](FINAL_KNOWN_LIMITATIONS.md).

## Start here

| Need | Document |
| --- | --- |
| Operate the security chain | [Security Workflow](SECURITY_WORKFLOW.md), [Artifact Contracts](SECURITY_ARTIFACTS.md) |
| Explain system design | [Architecture](ARCHITECTURE.md), [Security Design Rationale](SECURITY_DESIGN_RATIONALE.md) |
| Verify and demonstrate | [Testing](TESTING.md), [Demo Runbook](FINAL_DEMO_RUNBOOK.md) |
| Prepare assignment | [Assignment Evidence](FINAL_ASSIGNMENT_EVIDENCE.md), [Report Evidence Map](REPORT_EVIDENCE_MAP.md) |
| Show collaboration and screenshots | [Teamwork Evidence](TEAMWORK_EVIDENCE.md), [Evidence Capture](evidence/README.md) |
| Review deployment and risks | [Deployment](DEPLOYMENT.md), [Known Limitations](FINAL_KNOWN_LIMITATIONS.md), [OSS Readiness](OSS_READINESS.md) |
| Complete submission | [Release Checklist](FINAL_RELEASE_CHECKLIST.md) |

The team still needs to capture real screenshots, verify citations and individual
contributions, run the live demo, and confirm the final report/submission. This index
does not substitute for those human actions.
