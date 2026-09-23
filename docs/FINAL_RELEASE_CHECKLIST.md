# Final release and submission checklist

Tick only after observing the item. This is not a deployment authorization.

## Repository

- [ ] Final PR reviewed and merged; `main` clean
- [ ] `npm run verify` passes at final SHA
- [ ] Non-deploying CI green; Hosting workflow green where applicable
- [ ] Target Firebase project and rules reviewed before any deploy

## Application and validation

- [ ] Sign in, create board, select Security view and Security Assessment template
- [ ] Project Description grows/shrinks; manual NodeResizer still works
- [ ] Run Asset Mapper → Requirements → NIST → Advisor manually
- [ ] Trusted NIST date, reference preservation and human-review cues inspected
- [ ] Malformed YAML stays visible; invalid upstream blocks downstream

## Demo and submission

- [ ] Local backend, current tunnel and Firebase Preview checked
- [ ] Prepared backup board and sanitized screenshots available
- [ ] No secrets or sensitive user data visible
- [ ] Final report has verified references, limitations and ethics discussion
- [ ] Team role/review contributions confirmed by members; repository/PR links included
- [ ] Live demo, report and submission links checked by the team
