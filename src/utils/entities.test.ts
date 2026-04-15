import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractAndEnsureEntities } from "./entities.js";
import { DIRS } from "./paths.js";

/**
 * These tests exercise entity extraction logic.
 * Tests that don't need filesystem (regex, @mention parsing) run fast.
 * Tests that need stubs use the real vault directory — they create and
 * clean up their own test files.
 */

describe("extractAndEnsureEntities", () => {
  const testFiles: string[] = [];

  afterEach(() => {
    // Clean up any test files we created
    for (const f of testFiles) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    testFiles.length = 0;
  });

  describe("@mention extraction", () => {
    it("extracts @mentions from content", () => {
      const result = extractAndEnsureEntities("Talk to @carlos about this");
      expect(result.people).toContain("carlos");
      // Clean up stub
      const stub = path.join(DIRS.people, "carlos.md");
      if (fs.existsSync(stub)) testFiles.push(stub);
    });

    it("extracts multiple @mentions", () => {
      const result = extractAndEnsureEntities(
        "@alice and @bob should review this"
      );
      expect(result.people).toContain("alice");
      expect(result.people).toContain("bob");
      // Clean up stubs
      for (const name of ["alice", "bob"]) {
        const stub = path.join(DIRS.people, `${name}.md`);
        if (fs.existsSync(stub)) testFiles.push(stub);
      }
    });

    it("handles hyphenated @mentions", () => {
      const result = extractAndEnsureEntities("Ask @maria-torres for review");
      expect(result.people).toContain("maria-torres");
      const stub = path.join(DIRS.people, "maria-torres.md");
      if (fs.existsSync(stub)) testFiles.push(stub);
    });
  });

  describe("explicit people list", () => {
    it("creates stubs for explicit participants", () => {
      const result = extractAndEnsureEntities(
        "Some content",
        ["Test Person"]
      );
      expect(result.people).toContain("test-person");
      const stub = path.join(DIRS.people, "test-person.md");
      expect(fs.existsSync(stub)).toBe(true);
      testFiles.push(stub);
    });

    it("skips empty names in participant list", () => {
      const result = extractAndEnsureEntities("Content", ["", "  ", "Valid"]);
      expect(result.people).toContain("valid");
      expect(result.people).not.toContain("");
      const stub = path.join(DIRS.people, "valid.md");
      if (fs.existsSync(stub)) testFiles.push(stub);
    });
  });

  describe("explicit projects list", () => {
    it("creates stubs for explicit projects", () => {
      const result = extractAndEnsureEntities(
        "Some content",
        [],
        ["Test Project"]
      );
      expect(result.projects).toContain("test-project");
      const stub = path.join(DIRS.projects, "test-project.md");
      expect(fs.existsSync(stub)).toBe(true);
      testFiles.push(stub);
    });
  });

  describe("deduplication", () => {
    it("does not duplicate when @mention matches explicit participant", () => {
      const result = extractAndEnsureEntities(
        "Talk to @dedup-person about this",
        ["dedup-person"]
      );
      const count = result.people.filter((p) => p === "dedup-person").length;
      expect(count).toBe(1);
      const stub = path.join(DIRS.people, "dedup-person.md");
      if (fs.existsSync(stub)) testFiles.push(stub);
    });
  });
});
