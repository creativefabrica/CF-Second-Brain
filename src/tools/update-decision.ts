import { findEntry, writeEntry } from "../utils/vault.js";
import { rebuildIndex } from "../utils/index-updater.js";
import { today } from "../utils/slug.js";

export interface UpdateDecisionParams {
  name: string;
  status?: string;
  superseded_by?: string;
  note?: string;
}

export function updateDecision(params: UpdateDecisionParams): string {
  const { name, status, superseded_by, note } = params;

  const entry = findEntry("decision", name);
  if (!entry) {
    return JSON.stringify({
      error: true,
      message: `Decision not found: "${name}". Try a different name or slug.`,
    });
  }

  const fm = entry.parsed.frontmatter;
  const updated: string[] = [];

  if (status !== undefined) {
    fm.status = status;
    updated.push(`status → ${status}`);
  }

  if (superseded_by !== undefined) {
    fm.superseded_by = superseded_by;
    fm.status = "superseded";
    updated.push(`superseded by → ${superseded_by}`);
  }

  // Append dated note if provided
  let body = entry.parsed.body;
  if (note) {
    body += `\n### Update ${today()}\n\n${note}\n`;
    updated.push("note appended");
  }

  writeEntry(entry.path, fm, body);
  rebuildIndex();

  return JSON.stringify({
    path: entry.path,
    updated,
    message:
      updated.length > 0
        ? `Decision updated: ${entry.name} — ${updated.join(", ")}`
        : `Decision found but no changes specified: ${entry.name}`,
  });
}
