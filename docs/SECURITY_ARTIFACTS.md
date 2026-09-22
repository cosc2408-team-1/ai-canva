# Structured Security Artifacts

The manual Security Assessment workflow is:

`Project Description -> AssetPackage -> RequirementsPackage -> NISTAssessmentPackage -> NextStepGuidance`

Each AI result remains the raw YAML returned by the model. AI Canva validates it locally after generation and displays a format/integrity status; it never silently repairs or replaces the output.

## Contracts

All structured artifacts require `schema_version: "1.0"` and an `artifact_type`:

| Box | Artifact type | Stable IDs |
| --- | --- | --- |
| Asset Mapper | `AssetPackage` | `AST-*`, `EVID-*` |
| Security Requirements Elicitor | `RequirementsPackage` | `AST-*`, `EVID-*`, `REQ-*` |
| NIST CSF Gap Checker | `NISTAssessmentPackage` | `GAP-*` plus preserved upstream IDs |
| Security Advisor | `NextStepGuidance` | `NEXT-*` |

The validator checks YAML syntax, expected artifact type/version, required structure, duplicate definition IDs, structured references, and upstream traceability preservation. It does not determine whether a CIA value, requirement, CSF mapping, severity, or recommendation is professionally correct.

## Validation Status

- **Valid**: the artifact passed application-level format and integrity checks.
- **Warning**: it is readable but has a non-blocking integrity limitation, such as legacy metadata not being available.
- **Invalid**: a syntax, contract, identifier, or structured-reference check failed.
- **Needs clarification**: the artifact is structurally valid but has status `clarification_required` or `interview_required` and needs human input.

These statuses are not a security approval, compliance determination, certification, or guarantee.

Only an invalid direct upstream structured artifact blocks the next security box. Warnings and clarification-required artifacts remain available for human review and may be used manually. Older boards remain compatible: output without validation metadata is checked on demand when it is used downstream.

## Traceability and Date Metadata

Requirements Packages must retain direct upstream AssetPackage `AST-*` and `EVID-*` definitions. NIST Assessment Packages must retain the direct upstream RequirementsPackage unchanged. Structured references are checked only in reference fields, not arbitrary prose.

The NIST `assessment_date` is application-supplied runtime metadata in UTC `YYYY-MM-DD` format. The model is instructed to copy it exactly; a different generated date is marked invalid rather than rewritten. This is an application-controlled field, not an external authoritative time source.
