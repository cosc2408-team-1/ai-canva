# Security Engineering Workflow

AI Canva's Security Assessment template is a manual, evidence-first workflow:

`Project Description → Asset Mapper → Security Requirements Elicitor → NIST CSF Gap Checker → Security Advisor`

The Security profile in the box palette makes these four workers easier to discover and summarizes their stages. Selecting it only filters the palette; it grants no permissions and does not change board access.

## Run and review

Create a new Security Assessment board or add the workers to an existing board. Run each box deliberately, review its output, then choose whether to run the next box. Templates do not auto-run AI. Structured artifacts use `AST-*`, `EVID-*`, `REQ-*`, `GAP-*`, and `NEXT-*` identifiers to preserve traceability; IDs are references, not proof that a statement is true.

The Advisor offers next-step decision support and clarification questions. It does not rewrite upstream findings, infer implementation or control effectiveness, or route/run boxes automatically. A valid artifact status means only that application-level format and reference checks passed. Human review remains necessary before technical, risk, release, privacy, legal, or compliance decisions. The workflow does not provide a certification or compliance determination.

See [Structured Security Artifacts](SECURITY_ARTIFACTS.md) for artifact contracts and validation status meanings.
