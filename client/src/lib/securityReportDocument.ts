import type { SecurityReview } from "./securityReview.js";
import { buildSecurityReportNarrative, type ReportSection } from "./securityReportNarrative.js";

export interface DocumentSection extends ReportSection { level: 1 | 2 }

/** Report content, separate from the Word document layout. */
export function buildSecurityReportDocument(review: SecurityReview) {
  const narrative = buildSecurityReportNarrative(review);
  const sections: DocumentSection[] = [
    { heading: "Executive summary", level: 1, paragraphs: [narrative.executiveSummary] },
    { heading: "Project and scope", level: 1, paragraphs: review.contexts.length
      ? review.contexts.flatMap((context) => context.text.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean))
      : ["No project description was provided. The scope is limited to the available security findings."] },
  ];
  const actionSections = new Set(["Recommended action", "Incident response readiness"]);
  const findings = narrative.sections.filter((section) => !actionSections.has(section.heading));
  if (findings.length) {
    sections.push({ heading: "Security findings", level: 1, paragraphs: [] });
    for (const section of findings) sections.push({ ...section, level: 2 });
  }
  for (const section of narrative.sections.filter((section) => actionSections.has(section.heading))) {
    sections.push({ ...section, level: 1 });
  }
  const limitations = ["This is a preliminary review. Proposed controls require confirmation through configuration review and testing before security or release decisions are made."];
  const invalid = review.stages.filter((stage) => stage.validationStatus === "invalid" || !stage.summary).map((stage) => stage.title);
  const unchecked = review.stages.filter((stage) => stage.validationStatus === "not_checked" && stage.summary).map((stage) => stage.title);
  const needsInput = review.stages.filter((stage) => stage.validationStatus === "clarification_required").map((stage) => stage.title);
  const previous = review.stages.filter((stage) => stage.boxStatus === "error" || stage.boxStatus === "running").map((stage) => stage.title);
  if (invalid.length) limitations.push(`The following outputs could not be included because their structure could not be validated: ${invalid.join(", ")}.`);
  if (unchecked.length) limitations.push(`Structural validation is still pending for ${unchecked.join(", ")}.`);
  if (needsInput.length) limitations.push(`Further input is needed to complete ${needsInput.join(", ")}.`);
  if (previous.length) limitations.push(`Earlier saved results were used for ${previous.join(", ")}; the latest run has not completed successfully.`);
  if (review.missingStages.length) limitations.push(`No results were available for ${review.missingStages.join(", ")}.`);
  sections.push({ heading: "Limitations and further work", level: 1, paragraphs: limitations });
  let major = 0;
  let minor = 0;
  return {
    title: review.title,
    subtitle: review.stages.some((stage) => stage.sampleOutput) ? "Fictional sample security report" : "Preliminary security report",
    date: review.generatedAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
    sections: sections.map((section) => {
      if (section.level === 1) { major++; minor = 0; } else minor++;
      return { ...section, heading: `${major}${minor ? `.${minor}` : ""}  ${section.heading}` };
    }),
  };
}

export function downloadReportBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
