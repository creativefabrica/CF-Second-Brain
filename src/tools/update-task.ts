import { findEntry, writeEntry } from "../utils/vault.js";
import { rebuildIndex } from "../utils/index-updater.js";
import { today } from "../utils/slug.js";

export interface UpdateTaskParams {
  name: string;
  status?: string;
  priority?: string;
  waiting_on?: string;
  due?: string;
  note?: string;
}

export function updateTask(params: UpdateTaskParams): string {
  const { name, status, priority, waiting_on, due, note } = params;

  const entry = findEntry("task", name);
  if (!entry) {
    return JSON.stringify({
      error: true,
      message: `Task not found: "${name}". Try a different name or slug.`,
    });
  }

  const fm = entry.parsed.frontmatter;
  const updated: string[] = [];

  if (status !== undefined) {
    fm.status = status;
    updated.push(`status → ${status}`);
  }
  if (priority !== undefined) {
    fm.priority = priority;
    updated.push(`priority → ${priority}`);
  }
  if (waiting_on !== undefined) {
    fm.waiting_on = waiting_on;
    updated.push(`waiting_on → ${waiting_on || "(cleared)"}`);
  }
  if (due !== undefined) {
    fm.due = due;
    updated.push(`due → ${due || "(cleared)"}`);
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
        ? `Task updated: ${entry.name} — ${updated.join(", ")}`
        : `Task found but no changes specified: ${entry.name}`,
  });
}
