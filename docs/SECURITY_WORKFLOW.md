# Security Engineering Workflow

AI Canva's Security Assessment template is a manual, evidence-first workflow:

`Project Description → Asset Mapper → Security Requirements Elicitor → NIST CSF Gap Checker → Security Advisor`

The Security profile in the box palette makes these four workers easier to discover and summarizes their stages. Selecting it only filters the palette; it grants no permissions and does not change board access.

## Run and review

Create a new Security Assessment board or add the workers to an existing board. Run each box deliberately, review its output, then choose whether to run the next box. Templates do not auto-run AI. Structured artifacts use `AST-*`, `EVID-*`, `REQ-*`, `GAP-*`, and `NEXT-*` identifiers to preserve traceability; IDs are references, not proof that a statement is true.

The Advisor offers next-step decision support and clarification questions. It does not rewrite upstream findings, infer implementation or control effectiveness, or route/run boxes automatically. A valid artifact status means only that application-level format and reference checks passed. Human review remains necessary before technical, risk, release, privacy, legal, or compliance decisions. The workflow does not provide a certification or compliance determination.

## Answering clarification questions

When a security box returns `clarification_required` (or the Advisor returns `interview_required`), it shows the questions it asked with a text field for each, plus an **I don't know** shortcut. **Save answers** stores them on that box. **Save & rerun** also runs the box again. Answers are sent on every later run of the box as a labelled `Clarification answers` input, and the model is told to treat them as user-reported evidence (`EVID-*`). Answers from earlier rounds are kept, and you can edit or remove them. Don't enter secrets or unnecessary personal data.

The NIST CSF Gap Checker will not run while a directly connected Requirements Elicitor or Asset Mapper still needs clarification. To continue anyway, choose **Proceed with unresolved questions** on that upstream box. This records who proceeded and when, and applies only to that exact output, so rerunning the box clears it. The NIST run is then told to treat the open questions as unknowns and to say so in its limitations. The Elicitor and the Advisor are never blocked by clarification.

In Jennie's Security Review, **Run Jennie's review** answers the Elicitor's questions with a fixed set of fictional **scripted demo answers** (shown under that heading), then reruns the Elicitor once. If the Elicitor still needs clarification, the run proceeds on its own and records the override as `Demo run`.

See [Structured Security Artifacts](SECURITY_ARTIFACTS.md) for artifact contracts and validation status meanings.
For final demonstration and submission, start at [Final Handoff](FINAL_HANDOFF.md).
