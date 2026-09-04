# Sprint 1 research notes

Use this file to keep the early research for our three boxes in one place.
For now, each owner just needs to add their sources and a short note about why each one is useful.

## Planned flow

Security Requirements Elicitor -> NIST CSF 2.0 Gap Checker -> Security Advisor

## Security Requirements Elicitor - Manthan

**What the box should help with:** converting an unstructured project or architecture
description into a structured, traceable `RequirementsPackage` of testable `SHALL`
requirements, with CIA objectives attached and missing facts raised as questions rather than
invented. It is the entry point of the pipeline and the sole producer of `REQ-*` and
`EVID-*` identifiers that every downstream box depends on.

### Sources

1. **Mead, N. R., Hough, E. D., & Stehney, T. R. (2005). _Security Quality Requirements Engineering (SQUARE) Methodology_ (CMU/SEI-2005-TR-009). Software Engineering Institute, Carnegie Mellon University.** https://www.sei.cmu.edu/documents/751/2005_005_001_14594.pdf

   - **Finding:** Security requirements are routinely under-prioritised during requirements engineering, and retrofitting them later in the lifecycle costs more than planning for them upfront. SQUARE responds with a nine-step process that elicits, categorises, prioritises and validates security requirements early, before design work begins.
   - **Design-use note:** SQUARE determines the box's position and its internal structure. Elicitation sits upstream of assessment, which is why this box produces the `RequirementsPackage` that the NIST CSF Checker consumes unchanged. SQUARE's separation of elicitation from categorisation and prioritisation maps onto the package fields: each `REQ-*` carries `cia_objectives`, `priority` and `acceptance_criteria` rather than arriving as an undifferentiated list. Consistent with the team's framework table, the MVP implements a SQUARE-*informed* subset: steps requiring live stakeholder negotiation are surfaced as `open_questions` and a `clarification_required` status instead of being automated away.

2. **OWASP Foundation. (2025). _Application Security Verification Standard (ASVS) v5.0.0_.** https://owasp.org/www-project-application-security-verification-standard/

   - **Finding:** ASVS v5.0.0, released May 2025, defines approximately 350 requirements across 17 chapters. It fills a gap left by organisation-level standards such as ISO/IEC 27001 by providing requirement-level guidance usable directly in code review, testing and procurement. Requirements are identified as `<chapter>.<section>.<requirement>`, and OWASP recommends citing them with a version prefix (for example `v5.0.0-1.2.5`) because identifiers change between releases. Three cumulative verification levels calibrate depth to risk.
   - **Design-use note:** ASVS supplies phrasing discipline and a *conditional* reference set, not the primary framework — per the team's framework table it applies only to in-scope web applications and APIs, and citing it does not establish ASVS compliance. Two concrete effects on the box: each `shall_statement` is written as a single testable assertion in ASVS style so acceptance criteria are checkable; and every ASVS reference must carry the version prefix, which makes a fabricated identifier cheaply falsifiable against the published standard. Where a requirement is not web-app scoped, the box records `asvs_applicability: not_applicable` with a rationale rather than forcing a mapping.

3. **_Collaborative and AI-Supported Requirements Elicitation: An Empirical Study_ (2026). arXiv:2606.24060.** https://arxiv.org/pdf/2606.24060

   - **Finding:** A mixed-method controlled experiment compared four elicitation approaches — collaborative elicitation without AI, collaborative elicitation with AI support, direct LLM generation, and LLM generation from collaborative discussion transcripts. Artifacts were scored against quality criteria drawn from ISO/IEC/IEEE 29148. Approaches combining stakeholder collaboration with AI-supported synthesis scored highest and were perceived as clearer and easier to execute than traditional collaborative elicitation alone.
   - **Design-use note:** This is the evidence base for the box's interaction model and the argument against the obvious alternative design, a one-shot "generate my requirements" button. Three effects: the box is positioned as a synthesis aid over human-authored material rather than an autonomous requirement author; every `REQ-*` carries `source_refs` into the `EVID-*` register so an ungrounded requirement is visible rather than hidden in fluent prose; and `clarification_required` is a first-class outcome, since the study's AI-alone conditions underperformed precisely where human input was needed and absent.

### Security Requirements Elicitor Brief

**Intended user**

A senior technology or cybersecurity practitioner — security engineer, architect, analyst, consultant or senior IT professional — who has an unstructured project or architecture description and needs traceable, testable requirements before a production decision. Per the team's assumptions, the user has enough domain knowledge to challenge incorrect output, but is not required to pre-classify CIA objectives, write `SHALL` statements, choose framework mappings, or supply a completed schema. Those are the box's work.

**Input**

- An unstructured or lightly structured natural-language project or architecture description.
- Optional: business objectives, launch constraints, and the decision being made.
- Optional: named services, data flows, identities, trust boundaries, current practices, and user-described weaknesses.
- Optional sanitized diagrams, configuration snippets, policy statements, scan summaries, or answers to previous clarification questions.

Supplied via `{{inputs}}`. Sanitized or fictional data only.

**Output**

A `RequirementsPackage` artifact per the team schema (v0.3), in one of two states.

When essential information is missing, `status: clarification_required` — a partial profile, targeted questions each with a reason it matters, missing evidence and suggested sources or owners, and explicit unconfirmed assumptions. The NIST CSF Checker must not run against a package in this state.

When essential information is resolved, `status: complete` — the confirmed assessment boundary; an `AST-*` asset inventory with relationships, trust boundaries and CIA impact classifications; `REQ-*` requirements each carrying a testable `SHALL` statement, source type (`stated` / `derived` / `obligation_based`), `cia_objectives`, `elicitation_basis`, priority, confidence, `acceptance_criteria` and `source_refs`; an `EVID-*` register recording provenance, artifact location, date or version, verification state and confidence; conditional ASVS references with version and applicability rationale; confirmed, rejected and unresolved assumptions; remaining non-essential unknowns; and a limitations statement.

**Guardrails**

- Do not invent framework identifiers. ASVS references use the version-prefixed form; where applicability is uncertain, record `not_applicable` with a rationale rather than guessing.
- Do not silently infer. Anything assumed rather than read becomes an explicit assumption or an `open_question`, never an unmarked fact.
- Every requirement traces to evidence. A `REQ-*` without `source_refs` into the `EVID-*` register is a defect, not an output.
- Missing values are recorded as `unknown`. They are never omitted and never converted into negative findings.
- Evidence provenance is honest. The box may assign `user_reported` or `documented`; it cannot assign `human_verified` without a named qualified reviewer.
- Stay inside the responsibility boundary. The box asks clarification questions and derives requirements and acceptance criteria. It does not calculate NIST coverage, assign `GAP-*` findings, recommend a next box, or produce remediation advice.
- Do not claim compliance, certification, security or legal sufficiency. Output is a draft for expert review.
- Do not request secrets, credentials, production logs or unnecessary personal data.

**Limits**

- The box cannot verify anything about the real system. It reads a description and produces requirements consistent with that description; if the description is wrong or incomplete, so is the output, and the box cannot tell the difference.
- Framework references are the weakest part of the output. LLMs produce plausible control identifiers, and plausible is not correct. The version-prefixed format makes checking cheap, but the checking still has to happen — this is a human review task, not an automated one.
- Completeness is unverifiable. The box cannot report what it failed to consider, and the absence of a requirement is not evidence that none is needed.
- SQUARE steps requiring stakeholder negotiation are not automated and are not claimed to be.

**Draft system prompt**

```text
You are a security requirements engineer running a SQUARE-informed elicitation. You convert an unstructured project description into a structured RequirementsPackage. Treat all supplied information as unverified user-reported evidence. Write each requirement as a single testable SHALL statement with acceptance criteria that could be checked against a real system. Attach CIA objectives to every requirement. Reference OWASP ASVS 5.0.0 only for in-scope web applications and APIs, only in the version-prefixed form v5.0.0-chapter.section.requirement, and record not_applicable with a rationale when the requirement is out of ASVS scope. Never invent control identifiers, facts, or evidence. Every requirement must carry source_refs into the evidence register. Record missing values as unknown; never omit them and never treat missing information as proof that a control is absent. If essential information is missing, return status clarification_required with targeted questions instead of guessing. Do not calculate NIST coverage, assign gap findings, recommend a next box, or give remediation advice — those belong to downstream boxes. Do not claim compliance, certification, security, or legal sufficiency. Output valid YAML matching the RequirementsPackage schema.
```

**Draft user prompt**

```text
Elicit structured security requirements from the project description below.

Project description and any supplied evidence:
{{inputs}}

Produce a RequirementsPackage in YAML with:
1. status: complete or clarification_required, and the confirmed assessment boundary (included and excluded).
2. An AST-* asset inventory with trust boundaries and CIA impact classifications.
3. REQ-* requirements, each with: shall_statement, cia_objectives, elicitation_basis, asvs_applicability or asvs_references, priority, confidence, acceptance_criteria, source_refs.
4. An EVID-* evidence register with provenance and verification_state for every source.
5. Assumptions (confirmed, rejected, unresolved) and remaining unknowns.
6. open_questions: essential clarifications, each with why the answer matters.
7. limitations.

If essential information is missing, return status clarification_required with a partial profile and the questions needed. Do not guess.
```

## NIST CSF 2.0 Gap Checker - Jiong

### Sources

1. **National Institute of Standards and Technology. (2024). _The NIST Cybersecurity Framework (CSF) 2.0_.** https://www.nist.gov/cyberframework

   - **Finding:** CSF 2.0 is an outcomes-based framework for managing cybersecurity risk. It organises work across the Govern, Identify, Protect, Detect, Respond, and Recover Functions, and provides related resources and informative references.
   - **Design-use note:** The box will map evidence from the Security Requirements Elicitor to relevant CSF 2.0 Functions and outcomes. It will label an item as a *likely gap*, *partially addressed*, or *appears addressed* rather than claiming formal compliance.

2. **National Institute of Standards and Technology. (2024). _NIST SP 1301: NIST Cybersecurity Framework 2.0: Quick-Start Guide for Creating and Using Organizational Profiles_.** https://doi.org/10.6028/NIST.SP.1301

   - **Finding:** NIST describes Organizational Profiles as a way to record an organisation's current and target cybersecurity outcomes, then assess, prioritise, and communicate the differences between them.
   - **Design-use note:** The box will treat the elicited requirements as an incomplete current-state profile. Its output will compare that input with a small, context-aware target set of CSF outcomes and make assumptions visible when the input lacks evidence.

3. **Quinn, S., Barrett, M., Witte, G., Gardner, R., & Ivy, N. (2022). _NISTIR 8286B: Prioritizing Cybersecurity Risk for Enterprise Risk Management_. National Institute of Standards and Technology.** https://doi.org/10.6028/NIST.IR.8286B

   - **Finding:** Cybersecurity risks should be prioritised according to their likely impact on enterprise objectives and accompanied by an appropriate response, rather than handled as an undifferentiated list.
   - **Design-use note:** The box will group likely gaps into high, medium, or low priority using the app context, affected assets or data, and plausible impact. It will recommend a next action but will not invent likelihood, business impact, or risk acceptance values when the user has not supplied enough information.

### NIST CSF 2.0 Gap Checker Brief

**Intended user**

A product owner, business analyst, developer, or small project team that has a first draft of security requirements and needs an understandable initial review before involving a cybersecurity professional.

**Input**

- Security requirements generated by the Security Requirements Elicitor.
- Optional context: application purpose, users, data handled, deployment environment, integrations, and regulatory or contractual constraints.

**Output**

- A short scope and assumptions statement.
- A table of relevant CSF 2.0 Functions and outcomes with the input evidence observed for each.
- A list of likely gaps or partially addressed areas, each with a plain-language explanation and priority.
- Practical next actions, including when to involve a qualified cybersecurity, privacy, legal, or compliance reviewer.
- A limitations statement explaining that this is an AI-assisted preliminary review, not a NIST assessment, certification, security test, or legal advice.

**Guardrails**

- Do not state or imply that the application is compliant, certified, secure, or approved.
- Call missing information an assumption or an evidence gap; never treat it as proof that a control is absent.
- Do not fabricate CSF outcome identifiers, legal obligations, control implementation evidence, likelihood, or impact values.
- Keep recommendations proportionate to the supplied context and ask follow-up questions when critical facts are missing.
- Escalate high-risk contexts, such as sensitive personal data, payment data, health data, critical infrastructure, or a suspected incident, to an appropriate human reviewer.
- Avoid requesting secrets, credentials, production logs, or personal data. Redact any sensitive material before using the box.

**Draft system prompt**

```text
You are a cybersecurity analyst helping a project team perform an initial NIST CSF 2.0-informed gap review. Treat the supplied requirements as unverified evidence, not proof of implementation. Map only to CSF 2.0 Functions and outcomes that are relevant and that you can support from the input. Identify likely gaps, partial coverage, and assumptions in plain language. Prioritise items only when the supplied context supports it. Do not claim compliance, certification, security, legal sufficiency, or that a requirement has been implemented. Do not invent CSF identifiers, facts, risks, or controls. State when expert cybersecurity, privacy, legal, or compliance review is needed. Output concise Markdown using the required structure.
```

**Draft user prompt**

```text
Review the following draft application security requirements against relevant NIST CSF 2.0 outcomes.

Application context:
{{input_1}}

Security requirements:
{{inputs}}

Produce:
1. Scope and assumptions.
2. A Markdown table: relevant CSF 2.0 Function | outcome area | evidence in the requirements | assessment (appears addressed / partially addressed / likely gap) | priority.
3. The three to five most important likely gaps, with a practical next action for each.
4. Follow-up questions needed before a human review.
5. A short limitations statement: this is an AI-assisted preliminary review, not a compliance determination, certification, security test, or legal advice.

If the input is too vague, do not guess. Mark the affected area as insufficient evidence and ask a focused question instead.
```

## Security Advisor - Haley

- What the box should help with:
- Source 1:
- Source 2:
- Source 3:
- Notes / ideas:

## User flow / BA notes - Rayan

### Research Question

How effectively can an AI-assisted workflow help an IT specialist turn a project proposal into testable security requirements, identify evidence-based gaps against NIST Cybersecurity Framework (CSF) 2.0, and choose practical next actions without creating false assurance?

The research will consider five qualities:

1. **Completeness** — does the workflow identify the main security needs and missing information?
2. **Traceability** — can each requirement and gap be traced to user input, evidence, or an explicit assumption?
3. **Accuracy** — are NIST mappings and security recommendations technically reasonable?
4. **Actionability** — can the practitioner determine what to investigate or remediate next, who should own it, and what evidence is needed?
5. **Safety** — can the practitioner trace, challenge, and correct the output, and does the workflow avoid presenting an AI-generated review as verified fact, an audit, certification, or legal opinion?

### Assumptions

1. The primary user is an experienced technology or cybersecurity practitioner, such as a security engineer, security architect, analyst, consultant, or senior IT professional.
2. The user understands common architectures, threats, vulnerabilities, controls, and evidence well enough to challenge incorrect or unsupported AI output. Familiarity with NIST CSF is useful but not essential.
3. The user can provide technical project information such as architecture and data-flow descriptions, technologies, trust boundaries, identities, suppliers, current controls, known findings, constraints, and evidence summaries.
4. User input may be incomplete or ambiguous. Each box must label inferred details as assumptions and ask focused follow-up questions instead of silently inventing facts.
5. The MVP uses **NIST CSF 2.0**, including its six functions: Govern, Identify, Protect, Detect, Respond, and Recover.
6. Only NIST outcomes relevant to the stated project are assessed. A coverage figure will not treat every CSF outcome as automatically applicable.
7. The workflow can surface **potential** vulnerabilities and control weaknesses from supplied technical information, scan summaries, and evidence. It does not scan a live system, test exploitability, or independently prove that a vulnerability or control is present.
8. A missing control and missing evidence are different findings. The checker will use separate statuses such as `implemented`, `partial`, `not_implemented`, `not_applicable`, and `unknown`.
9. The Security Requirements Elicitor produces draft requirements for expert review. Requirements must be specific and testable, but the box does not replace architecture, engineering, legal, or risk-review decisions.
10. The Security Advisor recommends and prioritizes next steps but cannot approve risk, certify compliance, or guarantee security.
11. Sensitive production data, credentials, secrets, and unnecessary personal data will not be entered into prompts. The demo will use fictional or sanitized information.
12. High-impact findings and framework mappings will be validated against primary evidence and peer-reviewed before they influence a real decision.
13. The three boxes exchange structured data so that important fields are not lost when content moves through the canvas pipeline.


### User Scenario

**User:** Jordan, a senior cloud security engineer at a 250-person online retailer. Jordan is comfortable with Azure architecture, Microsoft Entra ID, network controls, vulnerability reports, security requirements, and NIST CSF assessments, but does not have a dedicated governance, risk, and compliance platform.

**Goal:** Reduce the manual effort needed to convert an unstructured Azure description into traceable security requirements, assess NIST CSF coverage and gaps, and determine the appropriate next box or next step before production.

**Context:** The retailer is preparing an Azure-hosted customer portal for production. The fictional retail-prod subscription contains an Azure App Service, Azure SQL Database, Storage account, Key Vault, Log Analytics workspace, virtual network, and a Windows administration VM. A sanitized configuration export describes several intentional weaknesses: the administration VM has a public IP and an NSG rule allowing inbound RDP on TCP/3389 from Internet; the Storage account permits public network traffic from all networks; the App Service uses a long-lived service-principal secret rather than a managed identity to reach Key Vault; and some diagnostic logs are missing or retained for only 30 days despite a 90-day internal requirement. Jordan has an architecture diagram, Azure Resource Graph inventory, selected resource configuration exports, NSG rule JSON, and internal security standards. The case is fictional and deliberately vulnerable so that every run can be repeated safely.

**Scenario:** Jordan supplies the Azure description and evidence to the Security Requirements Elicitor. Using a SQUARE-informed process, the box extracts testable requirements for administrative access, network exposure, privileged authentication, workload identity, Storage access, secrets handling, logging, retention, backup, and recovery. CIA classifications are attached to each requirement, and ASVS is used only for requirements that apply to the customer-facing web application. The box marks missing facts—such as the approved administration path—as questions rather than inventing them.

Jordan reviews the requirements and passes the completed package to the NIST CSF Checker. The Checker reports coverage across all six CSF 2.0 Functions and creates evidence-linked gaps. For example, it links the public RDP rule to REQ-AZ-001 and identifies a high-severity gap against Protect, primarily PR.IR-01, because the administration VM is reachable through an untrusted public network.

The Security Advisor then interviews Jordan: Is public RDP an approved exception? Is a protected administration path already available? Who owns the NSG? Based on the answers, the Advisor recommends the next step: assign the Azure platform owner to close or formally restrict the exposure, collect the updated NSG and access-test evidence, and rerun the NIST CSF Checker. If the organization has not defined an acceptable administration requirement, the Advisor instead routes Jordan back to the Requirements Elicitor. Jordan validates the recommendation and remains responsible for the decision.

### Scope

#### In Scope

- Accept a sanitized, plain-language project or use-case description.
- Elicit structured, testable security requirements using `SHALL` statements.
- Cover confidentiality, integrity, availability, identity and access, data protection, logging, incident response, resilience, and supplier risk when applicable.
- Record priorities, acceptance criteria, sources, assumptions, and open questions.
- Assess only applicable NIST CSF 2.0 functions and categories.
- Compare required outcomes with declared current controls and supplied evidence.
- Distinguish implemented, partial, not implemented, not applicable, and unknown states.
- Produce NIST CSF coverage, gap findings, and evidence requests through the Checker.
- Interview the practitioner and recommend the next box or next step through the Advisor.
- Provide confidence and limitation statements for AI-generated mappings and advice.
- Support one end-to-end canvas flow using the shared `{{inputs}}` mechanism.

#### Out of Scope

- Penetration testing, vulnerability scanning, code review, or configuration inspection.
- Independent validation that a control is present or effective.
- NIST certification, formal audit, legal advice, or regulatory approval.
- Full enterprise-wide NIST maturity assessment or implementation-tier determination.
- Detailed GDPR, ISO 27001, SOC 2, CIS Controls, or OWASP audits in this three-box MVP.
- Automatic risk acceptance or final go-live approval.
- Sending sensitive data, credentials, secrets, or unsanitized production records to the model.
- Automatically changing systems, policies, accounts, or supplier contracts.

### Framework Roles

| Framework | Role in the Workflow | Boundary |
| -------- | -------- | -------- |
| SQUARE | Informs how the Requirements Elicitor gathers, clarifies and prioritises security requirements. | The MVP uses a simplified SQUARE-informed process, not the full nine-step method. |
| CIA | Classifies the confidentiality, integrity and availability objectives and potential impact associated with assets and requirements. | It is an impact lens, not a complete risk assessment or a claim of FIPS 199 conformance. |
| NIST CSF 2.0 | Provides the primary Functions, Categories and Subcategories for the gap analysis. | A mapping is an assessment aid, not proof of implementation or compliance. |
| OWASP ASVS 5.0.0 | Provides supporting application-security requirements for in-scope web applications and APIs. | It is conditional and does not establish ASVS compliance. |

### Handoff and Evidence Conventions

- Assets use stable AST-* identifiers.
- Evidence items use stable EVID-* identifiers.
- Security requirements use stable REQ-* identifiers.
- Security gaps use stable GAP-* identifiers.
- Advisor guidance uses stable NEXT-* identifiers.
- Downstream boxes retain, rather than replace, upstream identifiers.
- Every important current-state claim identifies its evidence, provenance, capture date when known, and confidence.
- Recommended evidence labels are user_reported, documented, tool_reported and human_verified. The AI cannot assign human_verified unless a named qualified reviewer or recorded external verification is supplied.
- Code and configuration evidence should identify the artifact, version or commit, and relevant file or location when available.
- Evidence taken from code, configuration or infrastructure-as-code does not automatically describe the deployed runtime state.
- Missing values are recorded as unknown; they are not silently omitted or converted into negative findings.
- A box may use not_applicable only when it records why an area does not apply to the declared scope.

### Box Flow

The three boxes form the following pipeline:

Unstructured Azure description
→ Security Requirements Elicitor
→ RequirementsPackage
→ NIST CSF Checker
→ NISTAssessmentPackage
→ Security Advisor
→ NextStepGuidance

The Security Requirements Elicitor receives unstructured or lightly structured user information and converts it into a structured RequirementsPackage.

The NIST CSF Checker receives that exact RequirementsPackage unchanged. It returns a NISTAssessmentPackage containing the original RequirementsPackage plus NIST CSF coverage and gap findings.

The Security Advisor receives the exact NISTAssessmentPackage unchanged. Because the RequirementsPackage is already contained inside it, the Advisor does not require a separate copy. It interviews the user and returns NextStepGuidance identifying the appropriate next box or next step.

#### 1. Requirements Elicitor

**Receives:**

The initial input is deliberately unstructured. It may include:

- A natural-language project or architecture description.
- Business objectives, launch constraints, risk concerns, and the requested decision.
- Named Azure services, data flows, identities, trust boundaries, and current practices.
- Known or suspected weaknesses described by the user.
- Optional sanitized diagrams, configuration snippets, policy statements, scan summaries, or previous answers.

The Elicitor must not require the user to pre-classify CIA objectives, write SHALL statements, choose framework mappings, create IDs, or provide a completed schema. Those are part of the box's work.

**Returns:**

If essential information is missing or ambiguous, the box returns:

- `status: clarification_required`
- A partial profile based only on available information
- Targeted questions, including why each answer matters
- Missing evidence and suggested evidence sources or owners
- Explicit assumptions awaiting confirmation

Non-essential unknowns may remain visible in a completed package. If essential information is unavailable, the package remains `clarification_required`, and the NIST CSF Checker must not run.

After essential information is resolved, the box returns:

- `status: complete`, and the confirmed assessment boundary
- An `AST-*` inventory of in-scope assets, environments, applications, repositories, data, owners, and third parties
- Important relationships, trust boundaries, data flows, and CIA impact classifications
- A structured description of current security and software-development practices
- `REQ-*` requirements, each containing:
  - A testable `SHALL` statement
  - Source type: `stated`, `derived`, or `obligation_based`
  - Source and evidence references
  - CIA objective or security domain
  - Rationale, priority, confidence, and acceptance criteria
- An `EVID-*` register recording provenance, artifact location, date or version, verification state, scope, and confidence
- Conditional OWASP ASVS references, with the version and applicability rationale
- Confirmed, rejected, and unresolved assumptions
- Remaining non-essential unknowns and the evidence needed to resolve them
- An empty list of essential clarification questions

**Responsibility boundary:** The Elicitor asks clarification questions and derives requirements and acceptance criteria. It does not calculate NIST coverage, assign `GAP-*` findings, recommend the next box, or produce remediation advice.

**Example**

Input:

> Our company operates a customer-facing web application in Microsoft Azure. It runs on Azure App Service, stores customer account and order information in Azure SQL Database, and uses Azure Storage for uploaded documents. A management VM has a public IP, and its NSG allows inbound RDP on port 3389 from any Internet address. Administrators use a shared local account, and we are not sure whether MFA is enforced for all privileged Azure accounts. Some application credentials and connection strings are stored in App Service settings. Public blob access may be enabled. Logs are not collected centrally, and database restores have not recently been tested. We need testable security requirements before production approval.


Output:

```yaml
artifact_type: RequirementsPackage
schema_version: "0.3"
case_id: azure-retail-prod-01
status: complete
assessment_boundary:
  included: [customer portal, administration path, supporting Azure resources]
  excluded: [Microsoft-managed platform internals, employee endpoints]

requirements:
  - id: REQ-AZ-001
    shall_statement: >
      Administrative access to production Azure virtual machines SHALL use an
      approved protected management path and SHALL NOT permit persistent direct
      RDP access from untrusted public networks.
    cia_objectives: [confidentiality, integrity, availability]
    elicitation_basis: [SQUARE-informed, CIA]
    asvs_applicability: not_applicable
    priority: high
    acceptance_criteria:
      - No effective NSG rule permits persistent inbound TCP/3389 from Internet or Any.
      - The approved administration path is documented and successfully access-tested.
    source_refs: [EVID-AZ-001]

  - id: REQ-AZ-002
    shall_statement: >
      Privileged Azure access SHALL use individually attributable identities and
      SHALL enforce approved multi-factor authentication.
    cia_objectives: [confidentiality, integrity]
    elicitation_basis: [SQUARE-informed, CIA]
    priority: high
    acceptance_criteria:
      - Shared privileged accounts are disabled or have an approved emergency-use exception.
      - Evidence shows MFA is enforced for every in-scope privileged identity.
    source_refs: [EVID-AZ-001]
    evidence_status: unknown

  - id: REQ-AZ-003
    shall_statement: >
      The customer portal SHALL retrieve production secrets through an approved
      secrets-management mechanism and SHALL NOT rely on ungoverned long-lived
      credentials in application configuration.
    cia_objectives: [confidentiality, integrity]
    elicitation_basis: [SQUARE-informed, CIA]
    asvs_references: [OWASP ASVS 5.0.0 V13.3.1]
    priority: high
    acceptance_criteria:
      - Production secret sources and authorized workload identities are documented.
      - No unapproved long-lived production credential is present in application settings.
    source_refs: [EVID-AZ-001]

evidence_register:
  - id: EVID-AZ-001
    provenance: user_reported
    description: Unstructured Azure environment description supplied by Jordan.
    verification_state: unverified

open_questions:
  - Is MFA currently enforced for every privileged Azure identity?
  - Is anonymous public access actually enabled on the Storage account?
  - What recovery time and recovery point objectives apply?

limitations:
  - The package derives requirements from supplied information and does not inspect Azure.
```

The complete output of the Security Requirements Elicitor (including boundary, evidence, assumptions and unknowns) is passed to the NIST CSF checker.

#### 2. NIST CSF Checker

**Receives:**

The exact completed `RequirementsPackage` returned by the Security Requirements Elicitor. It includes the assessment boundary, requirements, evidence, assumptions, unknowns, and limitations. The package is not manually summarized or reshaped.

**Returns:**

A gap-analysis report mapped to NIST CSF 2.0 containing:

- A unique `report_id`, assessment date, and NIST CSF version
- The assessment boundary, exclusions, and overall limitations
- Applicable NIST CSF 2.0 Functions, Categories, and Subcategories, including why each outcome applies
- Coverage for each of the six CSF 2.0 Functions, using `not_applicable` with a rationale where appropriate, plus an overall summary calculated only across applicable and assessable outcomes
- The supported current state and context-derived target state for each applicable outcome
- `GAP-*` findings containing:
  - Finding type: `requirements_gap`, `implementation_gap`, or `evidence_gap`
  - Related `REQ-*`, `AST-*`, and `EVID-*` identifiers
  - NIST Function, Category, and supported Subcategory mapping
  - Status: `implemented`, `partial`, `not_implemented`, `not_applicable`, or `unknown`
  - Current state, target state, gap statement, likely impact, and severity rationale
  - Verification state, evidence conflicts, confidence, and evidence age where relevant
  - The target outcome that would close the gap, without prescribing a detailed implementation plan
- Unmapped requirements and the reason each was not mapped
- Unassessed areas, missing evidence, and validation activities needed to complete them
- A warning that AI-generated framework mappings do not establish compliance

The NIST CSF Checker identifies and explains gaps. It must not produce the final remediation plan, treat a vendor, scanner or tool recommendation as automatic proof of a NIST outcome or treat missing information as evidence of implementation or non-implementation.

**Example**

Input excerpt:

The complete `RequirementsPackage` shown in the preceding Elicitor output is passed unchanged. There is intentionally no separately reshaped YAML input.

Output excerpt:

```yaml
artifact_type: NISTAssessmentPackage
schema_version: "0.3"
case_id: azure-retail-prod-01

requirements_package: <the complete Box 1 package, unchanged>

coverage_and_gaps:
  report_id: RPT-AZ-001
  nist_csf_version: "2.0"
  function_summary:
    Govern: unknown
    Identify: partial
    Protect: partial
    Detect: partial
    Respond: gap
    Recover: partial
  coverage_basis: >
    Illustrative summary from the complete package; only one finding is shown below.

  findings:
    - id: GAP-AZ-001
      gap_type: implementation_gap
      related_requirements: [REQ-AZ-001]
      evidence_refs: [EVID-AZ-001]
      nist:
        function: Protect
        category: Technology Infrastructure Resilience
        category_id: PR.IR
        subcategory_id: PR.IR-01
      requirement_coverage: covered
      implementation_status: not_implemented
      current_state: >
        The supplied description reports persistent inbound RDP from the Internet
        to a public management VM.
      target_state: >
        Production administration uses an approved protected path with no
        persistent direct RDP exposure from untrusted networks.
      gap_statement: >
        The reported current state contradicts REQ-AZ-001 and does not support
        the applicable PR.IR-01 outcome.
      confidence: medium
      validation_needed:
        - Review effective NSG rules and the VM public-IP configuration.

limitations:
  - The finding is based on user-reported evidence and is not an independent Azure audit.
  - Framework mapping does not establish compliance or certification.
```

#### 3. Security Advisor

**Purpose:** Interview the practitioner to understand their goal, current workflow stage, available information, and blockers, then recommend the most appropriate next box or next step.

The Advisor is not limited to the end of the pipeline. It can be used:

- **At the start** to decide whether the user should begin with the Requirements Elicitor or can proceed to the NIST CSF Checker.
- **After elicitation** to decide whether missing information requires another Elicitor run or the profile is ready for checking.
- **After checking** to decide whether to gather evidence, revise requirements, rerun the Checker, seek specialist review, or stop because the user's goal has been met.

**Receives**

- The user's goal, decision to be made, deadline, role, and preferred level of detail
- Current workflow stage and boxes already run
- A list or summary of available artifacts and evidence
- Any `RequirementsPackage`, `NISTAssessmentPackage`, or earlier Advisor guidance that exists
- Open questions, unknowns, assumptions, constraints, and user corrections
- The user's answers to previous interview questions

The Advisor can run without completed upstream artifacts.

**Returns:**
If more context is needed:

- `status: interview_required`
- One or more focused questions, each with a reason for asking
- The answer or evidence needed to make a routing decision
- A partial summary of the user's goal and current state

When it has enough information:

- `status: recommendation_ready`
- A `NEXT-*` identifier
- A concise interview summary
- `recommended_next_box`, chosen from:
  - `security_requirements_elicitor`
  - `nist_csf_checker`
  - `security_advisor` for a follow-up interview
  - `none` when the next action is outside the three-box workflow
- A concrete `recommended_next_step`
- The reason the box or step is appropriate
- Inputs or evidence to prepare before continuing
- Upstream `REQ-*`, `GAP-*`, `AST-*`, or `EVID-*` references relevant to the decision
- Alternative route if an important assumption proves false
- Confidence, limitations, and conditions that require human or specialist review

**Responsibility boundary:** The Advisor interviews and routes. It does not extract the final `SHALL` requirements, calculate NIST coverage, create or change `GAP-*` findings, perform a separate framework audit, or provide a detailed remediation design that should be owned by a qualified practitioner.

**Example**

**Input:** The complete `NISTAssessmentPackage` returned by the NIST CSF Checker. The original `RequirementsPackage` is already contained inside it.
The Advisor then creates the following interview state; this is not a replacement for the input artifact:

```yaml
questions_and_answers:
  - question: Does the public RDP rule have a current approved exception?
    answer: No approved exception was found.
  - question: Is an approved protected administration path already available?
    answer: No.
  - question: What decision are you trying to make?
    answer: Whether the environment is ready for production approval.
```

Output excerpt:

```yaml
artifact_type: NextStepGuidance
schema_version: "0.3"
case_id: azure-retail-prod-01
status: recommendation_ready
guidance_id: NEXT-AZ-001
references: [REQ-AZ-001, GAP-AZ-001, EVID-AZ-001]

recommended_next_box: none
recommended_next_step: >
  Have the responsible Azure platform team select and implement an approved
  protected management path, remove or formally restrict persistent
  Internet-facing RDP, and collect updated configuration and access-test evidence.
reason: >
  GAP-AZ-001 affects production administrative access, no approved exception
  exists, and the current three boxes do not perform technical remediation.

after_evidence_is_collected:
  recommended_next_box: nist_csf_checker
  purpose: Reassess GAP-AZ-001 using the updated evidence.

alternative_route: >
  If the organization has not approved the target administration requirement,
  return to the Security Requirements Elicitor before remediation.
confidence: high
limitation: >
  A qualified Azure security practitioner must select and validate the technical design.
```

## Team decisions / questions

- 
