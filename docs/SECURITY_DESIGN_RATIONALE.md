# Security design rationale

Use this as report source material, not as a claim that the tool performs a professional audit.

| Choice | Rationale and implementation evidence | Boundary |
| --- | --- | --- |
| Evidence before assessment | Asset Mapper inventories supplied assets, owners, CIA concerns and uncertainty before requirements; `client/src/types.ts` and `client/src/lib/boardTemplates.ts`. | Supplied evidence is not independently verified. |
| Requirements before NIST | The elicitor writes testable SHALL statements and acceptance criteria; NIST checks a preserved RequirementsPackage rather than free-form chat. | Requirements do not imply implemented controls. |
| Stable traceability IDs | `AST-*` assets, `EVID-*` evidence, `REQ-*` requirements, `GAP-*` findings, `NEXT-*` guidance allow human cross-checks and detectable broken references. `securityArtifacts.ts` checks structure/references. | IDs are not cryptographic integrity or proof. |
| Structured YAML | Nested evidence and references remain human-readable and machine-parseable. Strict parsing exposes malformed output; raw `boxData.output` remains visible and is not silently rewritten. | Model YAML can still fail or be substantively wrong. |
| Trusted date | A Preview model once emitted a stale historical NIST date. `applicationAssessmentDate()` now supplies runtime metadata; validator compares it. | Only date provenance is controlled, not finding correctness. |
| Equivalent structured coverage | A model emitted `function_coverage` as a mapping when validation accepted arrays only. Validator now accepts array or plain mapping, rejects scalar data. | Contract still requires meaningful, reviewable content. |
| Strict serialization | A Preview NIST response with an unquoted colon in `csf_outcome` failed YAML parsing. Prompt now requests block style, quoted YAML-significant strings and structured outcome fields; parser was not weakened. | Rerun/human repair may still be needed. |
| Local validator and gates | `securityArtifacts.ts` validates format and references deterministically; `boardStore.ts` blocks invalid upstream but displays warnings. A second LLM validator would add cost and another untrusted judgment. | Valid means structural integrity only; Warning is not automatically blocked. |
| Clarification instead of guesswork | Advisor uses `interview_required` with focused question/why/evidence-needed when routing context is insufficient. Needs clarification is distinct from Invalid. | Advisor cannot approve risk, release or compliance. |
| Manual execution | The template connects stages but never auto-runs them. A human reviews each output and chooses the next action. Security role only filters Sidebar discovery. | Human operators remain accountable. |

The architecture keeps provider credentials backend-only and normalizes VAL/Ollama
responses behind `/api/generate`. Model input may still include private uploaded
material; data minimization and provider-policy review are required. See
[Known Limitations](FINAL_KNOWN_LIMITATIONS.md).
