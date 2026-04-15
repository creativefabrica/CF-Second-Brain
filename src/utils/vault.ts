/**
 * Vault filesystem helpers — reading, writing, listing, and scanning vault files.
 */

import fs from "node:fs";
import path from "node:path";
import { VAULT_ROOT, DIRS, type ContentType, dirForType } from "./paths.js";
import { parseFrontmatter, serializeFrontmatter, type ParsedFile } from "./frontmatter.js";
import { slugify, today } from "./slug.js";

export interface VaultEntry {
  /** Absolute file path. */
  path: string;
  /** Filename without extension. */
  name: string;
  /** Parsed frontmatter + body. */
  parsed: ParsedFile;
}

// ── Reading ────────────────────────────────────────────────────────

/** Read and parse a single vault file. Returns null if it doesn't exist. */
export function readEntry(filePath: string): VaultEntry | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = parseFrontmatter(raw);
  const name = path.basename(filePath, ".md");
  return { path: filePath, name, parsed };
}

/** List all .md files in a vault directory (non-recursive, excludes .gitkeep). */
export function listEntries(dir: string): VaultEntry[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
    .map((f) => readEntry(path.join(dir, f))!)
    .filter(Boolean);
}

/** List all entries of a given content type. */
export function listByType(type: ContentType): VaultEntry[] {
  return listEntries(dirForType(type));
}

// ── Writing ────────────────────────────────────────────────────────

/** Write a vault entry. Creates parent dirs if needed. */
export function writeEntry(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, serializeFrontmatter(frontmatter, body), "utf-8");
}

// ── Entity stubs ───────────────────────────────────────────────────

/** Ensure a person stub exists. Returns the wikilink name. */
export function ensurePersonStub(name: string): string {
  const slug = slugify(name);
  if (!slug) return name;

  const filePath = path.join(DIRS.people, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    writeEntry(filePath, {
      type: "person",
      role: "",
      team: "",
      last_mentioned: today(),
    }, `## ${name}\n`);
  } else {
    // Update last_mentioned
    const entry = readEntry(filePath);
    if (entry) {
      entry.parsed.frontmatter.last_mentioned = today();
      writeEntry(filePath, entry.parsed.frontmatter, entry.parsed.body);
    }
  }
  return slug;
}

/** Ensure a project stub exists. Returns the wikilink name. */
export function ensureProjectStub(name: string): string {
  const slug = slugify(name);
  if (!slug) return name;

  const filePath = path.join(DIRS.projects, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    writeEntry(filePath, {
      type: "project",
      status: "active",
      last_updated: today(),
    }, `## ${name}\n`);
  } else {
    // Update last_updated
    const entry = readEntry(filePath);
    if (entry) {
      entry.parsed.frontmatter.last_updated = today();
      writeEntry(filePath, entry.parsed.frontmatter, entry.parsed.body);
    }
  }
  return slug;
}

// ── Wikilinks ──────────────────────────────────────────────────────

/** Get all known entity names (people, projects) for wikilink scanning. */
export function getKnownEntities(): Map<string, string> {
  const entities = new Map<string, string>();

  // People
  for (const entry of listEntries(DIRS.people)) {
    // Map the slug and also any display name from the body
    entities.set(entry.name.toLowerCase(), entry.name);
  }

  // Projects
  for (const entry of listEntries(DIRS.projects)) {
    entities.set(entry.name.toLowerCase(), entry.name);
  }

  // Decisions — map by slug for cross-referencing
  for (const entry of listEntries(DIRS.decisions)) {
    entities.set(entry.name.toLowerCase(), entry.name);
  }

  // Tasks
  for (const entry of listEntries(DIRS.tasks)) {
    entities.set(entry.name.toLowerCase(), entry.name);
  }

  // Meetings
  for (const entry of listEntries(DIRS.meetings)) {
    entities.set(entry.name.toLowerCase(), entry.name);
  }

  return entities;
}

/**
 * Inject [[wikilinks]] into body text for known entities.
 * Only links the first occurrence of each entity to avoid spam.
 */
export function injectWikilinks(body: string, exclude?: string[]): string {
  const entities = getKnownEntities();
  const excludeSet = new Set((exclude ?? []).map((e) => e.toLowerCase()));
  let result = body;

  // Sort by length descending so longer names match first
  const sorted = [...entities.entries()].sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [lower, slug] of sorted) {
    if (excludeSet.has(lower)) continue;
    // Skip if already wikilinked
    if (result.includes(`[[${slug}]]`)) continue;

    // Match the entity name as a whole word (case insensitive), not already inside [[ ]]
    const escapedLower = lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<!\\[\\[)\\b(${escapedLower})\\b(?!\\]\\])`,
      "i"
    );
    const match = result.match(regex);
    if (match && match.index !== undefined) {
      const original = match[1];
      result =
        result.slice(0, match.index) +
        `[[${slug}|${original}]]` +
        result.slice(match.index + original.length);
    }
  }

  return result;
}

// ── Search helpers ─────────────────────────────────────────────────

/** Simple text search across vault entries. Returns matches with context. */
export function searchVault(
  query: string,
  type?: ContentType
): VaultEntry[] {
  const queryLower = query.toLowerCase();
  const types: ContentType[] = type
    ? [type]
    : ["decision", "task", "meeting", "person", "project"];

  const results: VaultEntry[] = [];

  for (const t of types) {
    for (const entry of listByType(t)) {
      const fullText =
        entry.name.toLowerCase() +
        " " +
        JSON.stringify(entry.parsed.frontmatter).toLowerCase() +
        " " +
        entry.parsed.body.toLowerCase();

      if (fullText.includes(queryLower)) {
        results.push(entry);
      }
    }
  }

  return results;
}

/** Build a file path for a new entry. */
export function buildEntryPath(
  type: "decision" | "task" | "meeting",
  title: string
): string {
  const date = today();
  const slug = slugify(title);
  const prefix = type === "meeting" ? `${date}-meeting-` : `${date}-`;
  return path.join(dirForType(type), `${prefix}${slug}.md`);
}

/**
 * Find an entry by name, slug, or partial match within a content type.
 * Tries exact slug match first, then substring match on filenames.
 */
export function findEntry(
  type: ContentType,
  nameOrSlug: string
): VaultEntry | null {
  const entries = listByType(type);
  const query = nameOrSlug.toLowerCase().trim();
  const querySlug = slugify(nameOrSlug);

  // 1. Exact slug match
  const exact = entries.find((e) => e.name === querySlug);
  if (exact) return exact;

  // 2. Filename contains the slug
  const slugMatch = entries.find((e) => e.name.includes(querySlug));
  if (slugMatch) return slugMatch;

  // 3. Filename contains the raw query (spaces replaced with hyphens)
  const normalized = query.replace(/\s+/g, "-");
  const normalizedMatch = entries.find((e) => e.name.includes(normalized));
  if (normalizedMatch) return normalizedMatch;

  // 4. Body or frontmatter contains the query
  const contentMatch = entries.find((e) => {
    const text =
      e.name.toLowerCase() +
      " " +
      JSON.stringify(e.parsed.frontmatter).toLowerCase() +
      " " +
      e.parsed.body.toLowerCase();
    return text.includes(query);
  });

  return contentMatch ?? null;
}
