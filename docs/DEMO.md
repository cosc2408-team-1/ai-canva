# Guided Security Assessment Demo

## Prepare the board

Use a Security Assessment board with existing project context and generated outputs for Asset Mapper, Security Requirements Elicitor, NIST CSF Gap Checker, and Security Advisor. Confirm the NIST artifact is usable (Valid, Warning, or Needs clarification). A NIST finding is not required. Use synthetic or approved demo data only.

The guide is presentation-only. It does not run boxes, call AI services, change board content, or save tour state. Prepare or repair outputs before the presentation, not during it.

While the Guided Demo is active, the Quick Guide is intentionally hidden because the Coachmark is the single guidance surface. Outside the demo, Quick Guide adapts to the open Add Box panel, selected box, connected Security Assessment workflow, or ordinary board.

## Presenter script (3-5 minutes)

1. Select **Start demo** on a connected Security Assessment workflow.
2. **Project context:** "We start with ordinary project context. The connected workflow turns it into a structured security assessment." Point out Project Description, Asset Mapper, Security Requirements Elicitor, NIST CSF Gap Checker, and Security Advisor.
3. **Structured artifacts:** "Each stage keeps the exact YAML for downstream use and a concise Summary for people to review." Point to Summary and Technical artifact on the boxes.
4. **Visual traceability:** "Stable IDs connect evidence, assets, requirements, findings, and guidance." The guide selects a real current ID and opens Traceability in the Inspector. Follow one direct relationship.
5. **Microsoft Security Lens:** "The Lens maps the immediate trace context to relevant Microsoft capabilities and shows why each one matched." Review the matched source signal, or explain that no mapping is shown when the evidence is not specific enough.
6. Finish or close the guide. "AI assists the analysis, but people remain responsible for security and compliance decisions."

Use **Previous** and **Next** to move through the guide. **Close**, **Finish**, or **Escape** exits it. No typing or fresh generation is needed.

## Manual trace selection

Selecting a stable ID while the demo is active gives that item manual ownership, even when it is the same ID the demo already selected. The Lens step can switch the Inspector to Microsoft Security Lens, but it keeps the manually selected ID and shows its legitimate no-match state when appropriate. Finish, guided-demo Close, and Escape leave a manual selection in the Inspector. Closing the Inspector itself explicitly clears that selection.

## Fallbacks

- **No generated output:** The guide says to run the assessment stages first and offers Skip. Finish the board setup before presenting; the guide will not generate content.
- **No traceable ID:** Skip the traceability step or explain that no stable ID is currently available. A GAP finding is optional; requirements, evidence, assets, or guidance may be used.
- **No Microsoft Lens match:** Show the neutral no-match state. Do not invent or imply a product recommendation; the Lens prefers no match over weak evidence.
- **VAL or network unavailable:** The guide itself makes no VAL or `/api/generate` request. Use already-generated board outputs. If preparation cannot produce them, present the workflow and explain that generation is unavailable rather than rerunning during the guided demo.
- **Board changes or a selection disappears:** The guide exits or shows a fallback without modifying the board. Refresh clears tour state; it is not persisted.

## Known-good board checklist

- Connected path: Project Description -> Asset Mapper -> Security Requirements Elicitor -> NIST CSF Gap Checker -> Security Advisor.
- Existing output is present for each stage and the NIST artifact is usable.
- At least one explicit trace relationship is visible.
- For a Lens example, immediate trace context includes a specific supported signal (for example MFA, conditional access, or API-key storage). A no-match result is also valid.
- The presenter can finish the full story in under five minutes.
