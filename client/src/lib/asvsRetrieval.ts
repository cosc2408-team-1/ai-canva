import { ASVS_REQUIREMENTS, ASVS_VERSION, type AsvsRequirement } from "./asvsData.js";

/**
 * Retrieval for the Security Requirements Elicitor (a small, local RAG step).
 *
 * The model is asked to cite OWASP ASVS only as v5.0.0-chapter.section.requirement.
 * Instead of relying on the model's memory, we look up the most relevant real
 * ASVS 5.0.0 requirements for the connected project text and append them to the
 * prompt as reference material. Retrieval is keyword-based (no embeddings, no
 * network call) so it is deterministic, fast and easy to review.
 */

/**
 * Words that carry no retrieval signal: common English words plus the field names
 * and fixed values of the structured YAML artifacts that flow into the box.
 */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "will", "can", "their",
  "they", "them", "its", "has", "have", "not", "but", "all", "any", "each", "into", "only", "such",
  "than", "then", "there", "these", "those", "when", "where", "which", "who", "whom", "why", "how",
  "what", "also", "more", "most", "other", "some", "use", "used", "using", "via", "per", "may",
  "must", "should", "would", "could", "been", "being", "does", "did", "our", "your", "you", "she",
  "her", "his", "him", "one", "two", "new", "before", "after", "about", "within", "without",
  "verify", "application", "system", "ensure", "able", "yet", "had",
  // Structured-artifact field names and fixed values.
  "artifact", "type", "schema", "version", "case", "status", "complete", "clarification", "required",
  "assessment", "boundary", "included", "excluded", "asset", "assets", "evidence", "register", "ref",
  "refs", "source", "statement", "verification", "state", "unverified", "verified", "assumption",
  "assumptions", "open", "question", "questions", "limitation", "limitations", "description",
  "owner", "unknown", "high", "medium", "low", "confidentiality", "integrity", "availability",
  "cia", "impact", "name", "ast", "evid", "req", "package", "assetpackage", "requirementspackage",
  "supplied", "project", "fictional", "scenario", "demo",
  // Generic words that match too many ASVS requirements to be useful on their own.
  "security", "secure", "check", "clear", "need", "limited", "based", "shared", "create", "generate",
  "user", "data", "control", "configuration", "management", "store", "process", "support",
  "building", "build", "feature", "features",
]);

/** "files" -> "file", but leaves words like "status", "access" and "analysis" alone. */
function foldPlural(word: string): string {
  if (word.length <= 4 || !word.endsWith("s") || /(ss|us|is)$/.test(word)) return word;
  return word.slice(0, -1);
}

/** Lowercases, splits into words, removes stopwords and folds simple plurals. */
export function tokenize(text: string): string[] {
  const normalised = text.toLowerCase().replace(/sign[\s-]+in/g, "signin").replace(/log[\s-]+in/g, "login");
  const words = normalised.match(/[a-z0-9]+/g) ?? [];
  return words
    .filter((word) => !STOPWORDS.has(word))
    .map(foldPlural)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word));
}

/**
 * Project descriptions and ASVS use different words for the same idea
 * ("sign in" vs "authentication"). A short, explicit expansion list bridges the
 * most common gaps without any model call.
 */
const EXPANSIONS: Record<string, string[]> = {
  signin: ["authentication", "login", "credential"],
  login: ["authentication", "credential"],
  logon: ["authentication", "credential"],
  password: ["authentication", "credential"],
  sso: ["authentication", "oauth", "oidc", "federation"],
  microsoft: ["oauth", "oidc", "identity", "provider"],
  entra: ["oauth", "oidc", "identity", "provider"],
  google: ["oauth", "oidc", "identity", "provider"],
  upload: ["file", "content"],
  download: ["file", "content"],
  pdf: ["file", "document"],
  docx: ["file", "document"],
  attachment: ["file"],
  role: ["authorization", "access", "permission"],
  admin: ["administrative", "authorization", "access", "privileged"],
  administrator: ["administrative", "authorization", "access", "privileged"],
  membership: ["authorization", "access"],
  permission: ["authorization", "access"],
  group: ["authorization", "access"],
  api: ["web", "service", "endpoint"],
  log: ["logging", "event"],
  audit: ["logging", "event"],
  personal: ["sensitive", "data", "privacy"],
  profile: ["sensitive", "data"],
  encrypt: ["cryptography", "encryption"],
  encryption: ["cryptography"],
};

/** The words to search for: the text's own words plus their related words. */
export function queryTerms(text: string): Set<string> {
  const terms = new Set<string>();
  for (const word of tokenize(text)) {
    terms.add(word);
    for (const extra of EXPANSIONS[word] ?? []) terms.add(extra);
  }
  return terms;
}

export const DEFAULT_ASVS_REFERENCE_LIMIT = 8;

interface IndexedRequirement {
  requirement: AsvsRequirement;
  terms: Set<string>;
}

/** Each ASVS requirement with its words, prepared once when the file loads. */
const INDEX: readonly IndexedRequirement[] = ASVS_REQUIREMENTS.map((requirement) => ({
  requirement,
  terms: new Set(tokenize(`${requirement.chapter} ${requirement.section} ${requirement.text}`)),
}));

/** Inverse document frequency: words that appear in fewer requirements count for more. */
const IDF: ReadonlyMap<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const { terms } of INDEX) for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [term, count] of counts) idf.set(term, Math.log(1 + INDEX.length / count));
  return idf;
})();

export interface AsvsMatch {
  requirement: AsvsRequirement;
  score: number;
  matchedTerms: string[];
}

/**
 * Returns up to `limit` ASVS requirements that best match the text, highest score first.
 * A requirement needs at least two matching terms, so a single shared word is not enough.
 */
export function retrieveAsvsRequirements(text: string, limit = DEFAULT_ASVS_REFERENCE_LIMIT): AsvsMatch[] {
  const terms = queryTerms(text);
  if (terms.size === 0 || limit <= 0) return [];
  const matches: AsvsMatch[] = [];
  INDEX.forEach(({ requirement, terms: requirementTerms }) => {
    const matchedTerms = [...terms].filter((term) => requirementTerms.has(term));
    if (matchedTerms.length < 2) return;
    const score = matchedTerms.reduce((total, term) => total + (IDF.get(term) ?? 0), 0);
    matches.push({ requirement, score, matchedTerms: matchedTerms.sort() });
  });
  // Stable order: highest score first, then ASVS order (the data file is in standard order).
  return matches
    .map((match, order) => ({ match, order }))
    .sort((a, b) => b.match.score - a.match.score || a.order - b.order)
    .slice(0, limit)
    .map(({ match }) => match);
}
