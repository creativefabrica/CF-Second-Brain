import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  readEntry,
  writeEntry,
  listEntries,
  injectWikilinks,
  findEntry,
  buildEntryPath,
} from "./vault.js";
import { DIRS } from "./paths.js";

describe("writeEntry and readEntry", () => {
  const testFile = path.join(DIRS.tasks, "__test-write-read.md");

  afterEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it("writes and reads back a vault entry", () => {
    writeEntry(testFile, { type: "task", status: "open" }, "## Test\n\nBody\n");

    const entry = readEntry(testFile);
    expect(entry).not.toBeNull();
    expect(entry!.parsed.frontmatter.type).toBe("task");
    expect(entry!.parsed.frontmatter.status).toBe("open");
    expect(entry!.parsed.body).toContain("## Test");
    expect(entry!.name).toBe("__test-write-read");
  });

  it("returns null for non-existent file", () => {
    expect(readEntry("/nonexistent/path.md")).toBeNull();
  });
});

describe("listEntries", () => {
  const testFile = path.join(DIRS.tasks, "__test-list-entry.md");

  afterEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it("lists .md files in a directory", () => {
    writeEntry(testFile, { type: "task" }, "## Test\n");
    const entries = listEntries(DIRS.tasks);
    const found = entries.find((e) => e.name === "__test-list-entry");
    expect(found).toBeDefined();
  });

  it("returns empty array for non-existent directory", () => {
    expect(listEntries("/nonexistent/dir")).toEqual([]);
  });

  it("excludes .gitkeep files", () => {
    const entries = listEntries(DIRS.tasks);
    const gitkeep = entries.find((e) => e.name === ".gitkeep");
    expect(gitkeep).toBeUndefined();
  });
});

describe("findEntry", () => {
  const testFile = path.join(DIRS.tasks, "2026-01-01-find-test-unique-slug.md");

  beforeEach(() => {
    writeEntry(
      testFile,
      { type: "task", status: "open", priority: "p1-high" },
      "## Find Test Unique Slug\n\nThis is a test task for findEntry.\n"
    );
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it("finds by exact filename", () => {
    const entry = findEntry("task", "2026-01-01-find-test-unique-slug");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("2026-01-01-find-test-unique-slug");
  });

  it("finds by partial slug", () => {
    const entry = findEntry("task", "find-test-unique-slug");
    expect(entry).not.toBeNull();
    expect(entry!.name).toContain("find-test-unique-slug");
  });

  it("finds by natural name with spaces", () => {
    const entry = findEntry("task", "find test unique slug");
    expect(entry).not.toBeNull();
    expect(entry!.name).toContain("find-test-unique-slug");
  });

  it("finds by content search", () => {
    const entry = findEntry("task", "test task for findEntry");
    expect(entry).not.toBeNull();
    expect(entry!.name).toContain("find-test-unique-slug");
  });

  it("returns null when nothing matches", () => {
    const entry = findEntry("task", "zzz-nonexistent-xyzzy-999");
    expect(entry).toBeNull();
  });

  it("does not match across types", () => {
    // The test file is a task — searching in decisions should not find it
    const entry = findEntry("decision", "find-test-unique-slug");
    expect(entry).toBeNull();
  });
});

describe("injectWikilinks", () => {
  // These tests use the vault's actual known entities, so we create
  // a temporary person stub to have a known entity to link against.
  const stubFile = path.join(DIRS.people, "__test-wikilink-person.md");

  beforeEach(() => {
    writeEntry(
      stubFile,
      { type: "person", role: "test" },
      "## Test Wikilink Person\n"
    );
  });

  afterEach(() => {
    if (fs.existsSync(stubFile)) fs.unlinkSync(stubFile);
  });

  it("links first occurrence of a known entity", () => {
    const result = injectWikilinks(
      "Talked to __test-wikilink-person about the plan"
    );
    expect(result).toContain("[[__test-wikilink-person");
  });

  it("only links the first occurrence", () => {
    const result = injectWikilinks(
      "__test-wikilink-person said hi. Later __test-wikilink-person agreed."
    );
    const matches = result.match(/\[\[__test-wikilink-person/g);
    expect(matches?.length).toBe(1);
  });

  it("respects exclude list", () => {
    const result = injectWikilinks(
      "Talked to __test-wikilink-person about stuff",
      ["__test-wikilink-person"]
    );
    expect(result).not.toContain("[[__test-wikilink-person");
  });

  it("does not double-link already wikilinked text", () => {
    const input = "Talked to [[__test-wikilink-person]] about stuff";
    const result = injectWikilinks(input);
    // Should not produce [[[[...]]]]
    expect(result).not.toContain("[[[[");
    expect(result).toContain("[[__test-wikilink-person]]");
  });
});

describe("buildEntryPath", () => {
  it("builds a path with date prefix for tasks", () => {
    const p = buildEntryPath("task", "My New Task");
    expect(p).toMatch(/tasks\/\d{4}-\d{2}-\d{2}-my-new-task\.md$/);
  });

  it("builds a path with meeting prefix for meetings", () => {
    const p = buildEntryPath("meeting", "Sprint Retro");
    expect(p).toMatch(/meetings\/\d{4}-\d{2}-\d{2}-meeting-sprint-retro\.md$/);
  });

  it("builds a path with date prefix for decisions", () => {
    const p = buildEntryPath("decision", "Use Postgres");
    expect(p).toMatch(/decisions\/\d{4}-\d{2}-\d{2}-use-postgres\.md$/);
  });
});
