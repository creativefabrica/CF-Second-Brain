import fs from "node:fs";
import path from "node:path";
import { DIRS, dirForType } from "../utils/paths.js";
import { listByType, writeEntry, type VaultEntry } from "../utils/vault.js";
import { today } from "../utils/slug.js";

export interface WeeklyReviewParams {
  week?: string;
}

/** Get ISO week number and year for a date. */
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/** Format an ISO week as YYYY-WXX. */
function formatWeek(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Get the Monday and Sunday dates for a given ISO week. */
function weekBounds(year: number, week: number): { start: string; end: string } {
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Monday=1, Sunday=7
  // Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  // Monday of target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  // Sunday of target week
  const targetSunday = new Date(targetMonday);
  targetSunday.setUTCDate(targetMonday.getUTCDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(targetMonday), end: fmt(targetSunday) };
}

/** Parse YYYY-WXX into { year, week }. */
function parseWeekString(w: string): { year: number; week: number } | null {
  const match = w.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), week: parseInt(match[2], 10) };
}

/** Check if a date string falls within a range (inclusive). */
function inRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

export function weeklyReview(params: WeeklyReviewParams): string {
  // Determine target week
  let year: number;
  let week: number;

  if (params.week) {
    const parsed = parseWeekString(params.week);
    if (!parsed) {
      return JSON.stringify({
        error: true,
        message: `Invalid week format: "${params.week}". Use YYYY-WXX (e.g. 2026-W16).`,
      });
    }
    year = parsed.year;
    week = parsed.week;
  } else {
    const now = isoWeek(new Date());
    year = now.year;
    week = now.week;
  }

  const weekStr = formatWeek(year, week);
  const { start, end } = weekBounds(year, week);

  // Collect entries dated within this week
  const decisions = listByType("decision").filter((e) => {
    const d = String(e.parsed.frontmatter.date ?? "");
    return inRange(d, start, end);
  });

  const allTasks = listByType("task");
  const tasksCreated = allTasks.filter((e) => {
    const d = String(e.parsed.frontmatter.date ?? "");
    return inRange(d, start, end);
  });
  const tasksCompleted = allTasks.filter(
    (e) => e.parsed.frontmatter.status === "done"
  );
  const tasksOpen = allTasks.filter((e) => {
    const s = e.parsed.frontmatter.status;
    return s === "open" || s === "in-progress";
  });
  const tasksBlocked = allTasks.filter(
    (e) => e.parsed.frontmatter.status === "blocked"
  );

  const meetings = listByType("meeting").filter((e) => {
    const d = String(e.parsed.frontmatter.date ?? "");
    return inRange(d, start, end);
  });

  // People activity — count mentions across this week's entries
  const peopleMentions = new Map<string, number>();
  const weekEntries = [...decisions, ...tasksCreated, ...meetings];
  for (const entry of weekEntries) {
    const fm = entry.parsed.frontmatter;
    const people: string[] = [];
    if (Array.isArray(fm.participants)) people.push(...fm.participants.map(String));
    if (Array.isArray(fm.attendees)) people.push(...fm.attendees.map(String));
    if (typeof fm.waiting_on === "string" && fm.waiting_on) people.push(fm.waiting_on);
    for (const p of people) {
      peopleMentions.set(p, (peopleMentions.get(p) ?? 0) + 1);
    }
  }

  const topPeople = [...peopleMentions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => `[[${name}]]`);

  // Stale items (>14 days, still open/in-progress)
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 14);
  const staleDate = staleThreshold.toISOString().slice(0, 10);

  const staleItems = allTasks.filter((e) => {
    const s = e.parsed.frontmatter.status;
    const d = String(e.parsed.frontmatter.date ?? "");
    return (s === "open" || s === "in-progress") && d && d < staleDate;
  });

  // Orphan notes — entries with no wikilinks in or out
  const allEntries = [
    ...listByType("decision"),
    ...allTasks,
    ...listByType("meeting"),
  ];
  const allNames = new Set(allEntries.map((e) => e.name));
  const orphans = allEntries.filter((e) => {
    const hasOutbound = /\[\[[\w-]+/.test(e.parsed.body);
    const hasInbound = allEntries.some(
      (other) => other.name !== e.name && other.parsed.body.includes(`[[${e.name}`)
    );
    return !hasOutbound && !hasInbound;
  });

  // Build markdown
  const lines: string[] = [];
  lines.push(`## Weekly Review: ${weekStr}`);
  lines.push("");
  lines.push(`*${start} to ${end}*`);
  lines.push("");

  // Decisions
  lines.push("### Decisions Made");
  lines.push("");
  if (decisions.length === 0) {
    lines.push("No decisions recorded this week.");
  } else {
    for (const d of decisions) {
      const summary = d.parsed.body
        .split("\n")
        .find((l) => l.trim() && !l.startsWith("#"))
        ?.trim()
        .slice(0, 80) ?? "";
      lines.push(`- [[${d.name}|${summary || d.name}]] — ${d.parsed.frontmatter.date}`);
    }
  }
  lines.push("");

  // Tasks
  lines.push("### Tasks");
  lines.push("");
  lines.push(`- **Created:** ${tasksCreated.length} new tasks`);
  lines.push(`- **Completed:** ${tasksCompleted.length} tasks done`);
  lines.push(`- **Still Open:** ${tasksOpen.length} tasks remaining`);
  lines.push(`- **Blocked:** ${tasksBlocked.length} tasks blocked`);
  lines.push("");

  // Meetings
  lines.push("### Meetings");
  lines.push("");
  if (meetings.length === 0) {
    lines.push("No meetings recorded this week.");
  } else {
    for (const m of meetings) {
      const attendees = Array.isArray(m.parsed.frontmatter.attendees)
        ? m.parsed.frontmatter.attendees.map((a: unknown) => `[[${a}]]`).join(", ")
        : "";
      lines.push(`- [[${m.name}|${m.parsed.frontmatter.date}]] — with ${attendees}`);
    }
  }
  lines.push("");

  // Active people
  lines.push("### Active People");
  lines.push("");
  if (topPeople.length === 0) {
    lines.push("No people activity tracked this week.");
  } else {
    lines.push(`Most mentioned this week: ${topPeople.join(", ")}`);
  }
  lines.push("");

  // Stale items
  if (staleItems.length > 0) {
    lines.push("### Stale Items (>14 days)");
    lines.push("");
    lines.push("> [!warning] Needs attention");
    for (const s of staleItems) {
      lines.push(`> - [[${s.name}]] — last touched ${s.parsed.frontmatter.date}`);
    }
    lines.push("");
  }

  // Orphan notes
  const weekOrphans = orphans.filter((o) => {
    const d = String(o.parsed.frontmatter.date ?? "");
    return inRange(d, start, end);
  });
  if (weekOrphans.length > 0) {
    lines.push("### Orphan Notes");
    lines.push("");
    lines.push("Notes with zero links in or out (consider linking or archiving):");
    for (const o of weekOrphans) {
      lines.push(`- [[${o.name}]]`);
    }
    lines.push("");
  }

  const body = lines.join("\n");
  const frontmatter = {
    type: "weekly",
    date: today(),
    week: weekStr,
  };

  // Write to vault/weekly/
  const weeklyDir = DIRS.weekly;
  if (!fs.existsSync(weeklyDir)) {
    fs.mkdirSync(weeklyDir, { recursive: true });
  }
  const filePath = path.join(weeklyDir, `${weekStr}.md`);
  writeEntry(filePath, frontmatter, body);

  return JSON.stringify({
    path: filePath,
    week: weekStr,
    range: { start, end },
    stats: {
      decisions: decisions.length,
      tasks_created: tasksCreated.length,
      tasks_completed: tasksCompleted.length,
      tasks_open: tasksOpen.length,
      tasks_blocked: tasksBlocked.length,
      meetings: meetings.length,
      stale_items: staleItems.length,
      orphan_notes: weekOrphans.length,
    },
    message: `Weekly review saved: ${weekStr}`,
  });
}
