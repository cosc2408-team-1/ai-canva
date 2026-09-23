# Final demo runbook (about 7 minutes)

## Pre-flight (operator only)

1. Install dependencies and configure `server/.env` locally with `AI_PROVIDER=val`,
   Use a VAL model ID that has been verified with the API key.
The currently confirmed working configuration is:

AI_PROVIDER=val
VAL_MODEL=openai-gpt-5.6-terra
VAL_TIMEOUT_MS=120000

Keep VAL_API_KEY backend-only and never display or commit it.
2. Start `npm run dev:server`; check local `http://localhost:3001/api/health`
   (confirm the actual port if 3001 is occupied).
3. Start `cloudflared tunnel --url http://localhost:3001` in another terminal.
4. From the repo root deploy a Preview using the **current** temporary tunnel:
   `DEMO_AI_API_BASE_URL="https://CURRENT.trycloudflare.com" bash scripts/deploy-demo-preview.sh`.
   The script checks public `/api/health` before building. Share the Firebase Preview
   URL, never a provider key. Teammates/iPads need only that Preview URL.
5. Verify Firebase sign-in, Security view, template creation and a prepared backup
   board. Have the scenario text ready; set browser zoom and close the sidebar if
   more canvas room is needed. Check connectivity and hide secrets/personal data
   from terminals, tabs and screenshots.

Demo scenario: “We are building a web-based student project management system for
university teams. Users sign in with email accounts, create shared project boards,
upload documents, and use AI features to generate security requirements and
recommendations. The system stores user profiles, project content, uploaded files
and collaboration data.” Use synthetic data only.

## Live sequence

| Time | Show and say |
| --- | --- |
| 0:00–0:45 | Open AI Canva Security view and Guide. Teams need a path from project description to traceable security analysis; this is decision support, not compliance automation. |
| 0:45–1:30 | Create a new Security Assessment board. Point out five boxes/four edges and Discover → Specify → Assess → Advise. Every AI run is manual. |
| 1:30–2:30 | Paste the scenario into Project Description; run Asset Mapper. Show `AST-*`, `EVID-*`, unknowns, assumptions, Valid badge and human-review cue. IDs are references, not proof. |
| 2:30–3:30 | Run Requirements Elicitor. Show preserved AST/EVID links, `REQ-*`, SHALL statements and acceptance criteria. Requirements do not prove implementation. |
| 3:30–4:45 | Run NIST CSF Gap Checker. Show trusted `assessment_date`, `GAP-*`, relevant NIST CSF 2.0 mapping and unknown/evidence gaps. This is preliminary, not certification. |
| 4:45–5:45 | Run Advisor. `Needs clarification` with focused question/why/evidence-needed is a successful structured response when context is missing. It does not change prior findings. |
| 5:45–6:45 | Explain Valid, Warning, Invalid and Needs clarification. Valid means structural/reference integrity only. A malformed NIST artifact previously blocked Advisor; no silent repair/propagation. |
| 6:45–7:30 | Close on traceability, manual control and human review. Do not claim the system is secure, compliant or professionally audited. |

## Recovery

- If VAL returns malformed YAML, point out the visible raw output and Invalid badge;
  rerun only the failed stage. Do not describe invalid output as a success.
- If the tunnel/backend is down, show the previously completed board and clearly
  identify it as prior evidence, not fresh generation. Check backend and public
  `/api/health`, then redeploy Preview if the tunnel hostname changed.
- If login fails, use the prepared local/backup explanation and report the live
  failure honestly; do not bypass authentication or expose credentials.

Capture evidence using [evidence/README.md](evidence/README.md). After the demo,
stop the tunnel and server, and retire the temporary Preview channel as appropriate.
