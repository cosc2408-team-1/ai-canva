import { AlignmentType, Document, Footer, HeadingLevel, Packer, PageNumber, Paragraph, TextRun, type FileChild } from "docx";
import { securityReviewFilename, type SecurityReview } from "./securityReview.js";
import { buildSecurityReportDocument, downloadReportBlob } from "./securityReportDocument.js";

/** Editable report with numbered headings and a running page count. */
export async function securityReviewDocxBlob(review: SecurityReview): Promise<Blob> {
  const report = buildSecurityReportDocument(review);
  const children: FileChild[] = [
    new Paragraph({ text: report.title, heading: HeadingLevel.TITLE, keepNext: true }),
    new Paragraph({ text: report.subtitle, spacing: { after: 100 }, keepNext: true }),
    new Paragraph({ children: [new TextRun({ text: report.date, color: "526074", size: 20 })], spacing: { after: 320 }, keepNext: true }),
  ];
  for (const section of report.sections) {
    children.push(new Paragraph({ text: section.heading,
      heading: section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      keepNext: true,
    }));
    for (const text of section.paragraphs) {
      children.push(new Paragraph({ text, widowControl: true, spacing: { after: 140, line: 280 } }));
    }
  }
  const doc = new Document({
    creator: "SecureFlow", title: report.title,
    description: "Security review report",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, color: "202733" }, paragraph: { spacing: { after: 140, line: 280 } } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Calibri", size: 48, bold: true, color: "000000" },
          paragraph: { spacing: { after: 180, line: 264 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Calibri", size: 28, bold: true, color: "000000" },
          paragraph: { spacing: { before: 320, after: 140 }, keepNext: true } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Calibri", size: 24, bold: true, color: "000000" },
          paragraph: { spacing: { before: 220, after: 110 }, keepNext: true } },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1260, right: 1260, footer: 500 } } },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 18, color: "526074" })],
      })] }) },
      children,
    }],
  });
  return Packer.toBlob(doc);
}

export async function downloadSecurityReviewDocx(review: SecurityReview): Promise<void> {
  downloadReportBlob(await securityReviewDocxBlob(review), securityReviewFilename(review.boardTitle));
}
