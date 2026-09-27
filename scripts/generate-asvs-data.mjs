#!/usr/bin/env node
/**
 * Regenerates client/src/lib/asvsData.ts from the official OWASP ASVS 5.0.0 CSV.
 *
 * Source: https://github.com/OWASP/ASVS/blob/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv
 * Licence: OWASP ASVS is published under CC BY-SA 4.0.
 *
 * Usage:
 *   node scripts/generate-asvs-data.mjs path/to/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv
 */
import fs from "fs";
import path from "path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/generate-asvs-data.mjs <ASVS 5.0.0 CSV file>");
  process.exit(1);
}

/** Minimal CSV parser: handles quoted fields, commas and doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [header, ...records] = parseCsv(fs.readFileSync(input, "utf8"));
const column = (name) => {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`Column ${name} not found`);
  return index;
};
const [chapter, section, reqId, text, level] = [
  column("chapter_name"), column("section_name"), column("req_id"), column("req_description"), column("L"),
];

const requirements = records.map((record) => {
  const match = /^V(\d+\.\d+\.\d+)$/.exec(record[reqId].trim());
  if (!match) throw new Error(`Unexpected requirement id: ${record[reqId]}`);
  return {
    id: `v5.0.0-${match[1]}`,
    chapter: record[chapter].trim(),
    section: record[section].trim(),
    level: Number(record[level]),
    text: record[text].replace(/\s+/g, " ").trim(),
  };
});

const output = `// GENERATED FILE: do not edit by hand. Regenerate with scripts/generate-asvs-data.mjs.
//
// OWASP Application Security Verification Standard (ASVS) 5.0.0, English requirement list.
// Source: https://github.com/OWASP/ASVS (5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv)
// Copyright OWASP Foundation. Licensed under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
// Changes: requirement IDs are rewritten in the version-prefixed form (v5.0.0-chapter.section.requirement)
// and whitespace is normalised. Requirement text is otherwise unchanged.

export interface AsvsRequirement {
  /** Version-prefixed ASVS identifier, e.g. "v5.0.0-6.2.1". */
  id: string;
  chapter: string;
  section: string;
  /** ASVS verification level (1, 2 or 3). */
  level: number;
  text: string;
}

export const ASVS_VERSION = "5.0.0";

export const ASVS_REQUIREMENTS: readonly AsvsRequirement[] = ${JSON.stringify(requirements, null, 2)};
`;

const target = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "client", "src", "lib", "asvsData.ts");
fs.writeFileSync(target, output);
console.log(`Wrote ${requirements.length} ASVS ${"5.0.0"} requirements to ${path.relative(process.cwd(), target)}`);