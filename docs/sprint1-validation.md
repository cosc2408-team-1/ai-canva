# Task 240 - Three-Box Input/Output Validation

## Purpose

This note explains how the three security boxes currently pass information to each
other in the code.

The three boxes are:

- Security Requirements Elicitor
- NIST CSF Gap Checker
- Security Advisor

This is not a live AI test. The boxes have not yet been tested with a connected AI
tool. This document only compares the current code with the intended design in
`docs/research.md`.

## Short Answer

The current code passes information between boxes as plain text.

It does not pass a real structured `RequirementsPackage`, `NISTAssessmentPackage`, or
`NextStepGuidance` object between boxes.

That means the current flow is:

```text
Box 1 output text
-> inserted into Box 2 prompt through {{inputs}}
-> Box 2 output text
-> inserted into Box 3 prompt through {{inputs}}
-> Box 3 output text
```

This is enough for an early MVP if we describe it honestly as a text-based handoff.
It is not yet enough to claim that the application preserves or validates structured
security artifacts.

## What The Code Actually Does

When a box runs, the app looks for boxes connected into it.

For each connected upstream box, the app collects:

- the upstream box name
- the upstream box output text

Then the app replaces `{{inputs}}` in the prompt with a labeled text block.

Example:

```text
Security Requirements Elicitor Box:
artifact_type: RequirementsPackage
status: complete
...

---

Another Input Box:
Extra context here
```

So `{{inputs}}` is not a data object. It is a string.

Relevant code:

- Connections are stored as React Flow edges in `client/src/store/boardStore.ts`.
- Incoming boxes are found by checking edges where `edge.target` is the current box.
- The app uses `sourceData.output || sourceData.content` as the upstream text.
- `client/src/lib/prompts.ts` turns `{{inputs}}` into labeled text.
- The generated response is stored in `BoxData.output`.

## Important Detail: Own Box Content

AI boxes can also use their own typed content.

So a box does not strictly need an upstream connection to run. If the user types text
directly into the box, that text is also included as input.

If there is no upstream box and no typed content, `{{inputs}}` becomes:

```text
[no inputs]
```

## Box 1 - Security Requirements Elicitor

### What It Receives

The Elicitor receives plain text from connected upstream boxes, plus its own typed
content if present.

It also receives the names of the boxes that produced the text, because the prompt
input is labeled.

### What It Is Asked To Produce

The prompt asks the AI model to produce YAML for a `RequirementsPackage`.

The prompt asks for:

- `AST-*` asset identifiers
- `REQ-*` requirement identifiers
- `EVID-*` evidence identifiers
- assumptions
- unknowns
- limitations
- `status: complete` or `status: clarification_required`

### What The App Actually Stores

The app stores whatever text comes back from the model in:

```ts
BoxData.output
```

The app does not check whether the text is valid YAML.

The app does not check whether it is a real `RequirementsPackage`.

The app does not generate the `AST-*`, `REQ-*`, or `EVID-*` identifiers. The prompt
asks the model to generate them.

### Hand-Off To The NIST Checker

The NIST Checker receives the Elicitor output as text.

Example:

```text
Security Requirements Elicitor Box:
<the full Elicitor output text>
```

The application does not parse the Elicitor output before passing it on.

## Box 2 - NIST CSF Gap Checker

### What It Receives

The NIST Checker receives plain text from connected upstream boxes.

In the intended flow, this will usually be the Elicitor output text.

It can also receive other connected boxes if the user connects them.

### What It Is Asked To Produce

The prompt asks the AI model to produce YAML for a `NISTAssessmentPackage`.

The prompt asks for:

- NIST CSF 2.0 assessment content
- `GAP-*` findings
- links back to `REQ-*`, `AST-*`, and `EVID-*` identifiers where available
- the original RequirementsPackage preserved inside the NISTAssessmentPackage

### What The App Actually Stores

The app stores whatever text comes back from the model in:

```ts
BoxData.output
```

The app does not check whether the text is valid YAML.

The app does not check whether it is a real `NISTAssessmentPackage`.

The app does not generate `GAP-*` identifiers. The prompt asks the model to generate
them.

The app does not itself preserve the original RequirementsPackage inside the NIST
output. It only asks the model to do that.

### Important Gap

The brief says the NIST Checker must not run if the Elicitor returned:

```yaml
status: clarification_required
```

The current code does not enforce that.

At the moment, the NIST Checker can still run. The prompt tells the model not to make
unsupported findings, but the application does not block the run.

### Hand-Off To The Advisor

The Advisor receives the NIST Checker output as text.

Example:

```text
NIST CSF Gap Checker Box:
<the full NIST Checker output text>
```

If the NIST output includes the original RequirementsPackage, the Advisor can see it.
If the NIST output leaves something out, the app does not recover it.

## Box 3 - Security Advisor

### What It Receives

The Advisor receives plain text from connected upstream boxes.

It can receive:

- the Elicitor output
- the NIST Checker output
- both
- earlier Advisor output
- no upstream output
- its own typed content

This matches the design goal that the Advisor can run independently.

### What It Is Asked To Produce

The prompt asks the AI model to produce YAML for `NextStepGuidance`.

The prompt asks for:

- `status: interview_required`, or
- `status: recommendation_ready`
- a `NEXT-*` guidance identifier
- references to upstream `REQ-*`, `GAP-*`, `AST-*`, and `EVID-*` identifiers
- a recommended next box or next step

The allowed recommended boxes are:

- `security_requirements_elicitor`
- `nist_csf_checker`
- `security_advisor`
- `none`

### What The App Actually Stores

The app stores whatever text comes back from the model in:

```ts
BoxData.output
```

The app does not check whether the text is valid YAML.

The app does not check whether it is real `NextStepGuidance`.

The app does not generate `NEXT-*` identifiers.

The app does not validate the recommended next box.

### Routing

The Advisor can recommend a next box in text, but the app does not act on that
recommendation.

For example, if the Advisor says:

```yaml
recommended_next_box: nist_csf_checker
```

the app does not automatically create, connect, or run a NIST Checker box.

## What Is Preserved Between Boxes

| Information | Current behavior |
| --- | --- |
| User description | Preserved as text |
| RequirementsPackage | Preserved as text if the Elicitor outputs it |
| AST-* identifiers | Preserved as text if the model creates and later models copy them |
| REQ-* identifiers | Preserved as text if the model creates and later models copy them |
| EVID-* identifiers | Preserved as text if the model creates and later models copy them |
| NISTAssessmentPackage | Preserved as text if the NIST Checker outputs it |
| GAP-* identifiers | Preserved as text if the model creates and later models copy them |
| NextStepGuidance | Stored as text |
| NEXT-* identifiers | Created by the model if it follows the prompt |

The main point: information is preserved as text, not as validated structured data.

## Where The Brief And Code Do Not Yet Match

| Brief claim | Current code behavior | Status |
| --- | --- | --- |
| Elicitor returns a RequirementsPackage | App stores raw text | Not enforced |
| NIST Checker must not run on `clarification_required`, unless the user has explicitly bypassed | App does not block it and there is no bypass mechanism either | Missing runtime check |
| NIST receives the exact RequirementsPackage | NIST receives Elicitor output text | Text-based only |
| NIST returns a NISTAssessmentPackage | App stores raw text | Not enforced |
| Advisor returns NextStepGuidance | App stores raw text | Not enforced |
| Boxes exchange structured data | Boxes exchange text through `{{inputs}}` | Not true yet |

Rows about identifier creation/preservation and YAML validity are omitted from this table. Nothing in the application currently reads these fields programmatically, so there's no functional gap to flag — they're prompt-level instructions to the model, not application requirements. Auto-routing off the Advisor's recommendation is also omitted: the brief keeps the human in the loop by design ('Jordan validates the recommendation and remains responsible for the decision'), so text-only recommendations match intent rather than falling short of it.

## What We Should Say In research.md Later

When this is folded into `docs/research.md`, the wording should be adjusted to avoid
overclaiming.

Recommended plain-language wording:

```text
In the current MVP, boxes pass outputs to downstream boxes as labeled text through
{{inputs}}. The security prompts ask the model to format that text as YAML artifacts
such as RequirementsPackage, NISTAssessmentPackage, and NextStepGuidance. The
application does not yet parse, validate, or preserve those artifacts as structured
objects.
```

For the NIST Checker:

```text
The NIST Checker receives the Elicitor output as text. The prompt instructs the model
to treat that text as the RequirementsPackage and preserve it inside the assessment
output. The application does not yet verify that preservation.
```

For `clarification_required`:

```text
The intended design is that the NIST Checker should not assess a package with
status: clarification_required, unless the user has explicitly bypassed the 
check. The current app does not enforce this yet, and has no bypass mechanism either.
```

For the Advisor:

```text
The Advisor can recommend a next box or next step in text. The current app does not
automatically route the workflow based on that recommendation.
```

## Required Implementation Changes If We Want Structured Guarantees

The current text-based handoff may be acceptable for the MVP. If we want the app to
guarantee the brief's structured behavior, we need to add more code.

Required changes would include:

1. Parse YAML outputs from the three security boxes.
2. Validate each artifact type:
   - RequirementsPackage
   - NISTAssessmentPackage
   - NextStepGuidance
3. Store parsed artifacts separately from raw text.
4. Stop the NIST Checker from running when the Elicitor output is
   `clarification_required`, unless the user has explicitly chosen to bypass the check.
5. Check that the NIST output really includes the original RequirementsPackage.
6. Check that GAP-* references point to real REQ-*, AST-*, and EVID-* identifiers.
7. Check that Advisor recommendations use one of the allowed values.
8. Decide whether Advisor recommendations should stay as text or trigger app actions.

## Final Assessment

The current code supports a basic text-based three-box flow.

That is probably good enough for the first MVP.

One specific behavioral rule from the brief — blocking the NIST Checker from running against a clarification_required package, absent an explicit user bypass — is not yet enforced by the application. Other structural elements (YAML validity, identifier correctness, artifact preservation) are defined at the prompt level by design and don't require separate application-level enforcement unless a future feature needs to read those fields programmatically.
