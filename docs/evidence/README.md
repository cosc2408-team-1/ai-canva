# Evidence capture checklist

Add genuine screenshots only after running the demo/checks; this folder contains no
fabricated output. Record date, branch/SHA, environment and tester with each capture.

| Suggested filename | Show |
| --- | --- |
| `01-security-view.png` | Security palette and Guide; discovery role only. |
| `02-security-template.png` | New board with five boxes and four directed edges. |
| `03-asset-valid.png` | AssetPackage, AST/EVID references and validation badge. |
| `04-requirements-valid.png` | RequirementsPackage, REQ plus preserved AST/EVID IDs. |
| `05-nist-valid.png` | NISTAssessmentPackage, trusted date and GAP IDs. |
| `06-advisor-clarification.png` | Structured focused question and Needs clarification state. |
| `07-validation-guardrail.png` | Visible invalid raw output and downstream block, if safely reproducible. |
| `08-github-actions.png` | Green non-deploying CI run for the relevant SHA. |
| `09-pr-history.png` | Actual team PR/merge history. |
| `10-test-results.png` | Final `npm run verify` result with branch/SHA and counts. |

Before capturing, hide API keys, `.env` files, service-account JSON, private tokens,
unnecessary personal email addresses and sensitive uploaded documents. Do not expose
temporary tunnel URLs unless needed to prove a specific setup step. A screenshot of
Valid does not prove the underlying security finding is correct.
