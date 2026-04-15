import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("parses basic frontmatter with string values", () => {
    const input = `---
type: decision
date: 2026-04-15
status: active
---
## My Decision

Some content here.`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.type).toBe("decision");
    expect(result.frontmatter.date).toBe("2026-04-15");
    expect(result.frontmatter.status).toBe("active");
    expect(result.body).toContain("## My Decision");
    expect(result.body).toContain("Some content here.");
  });

  it("parses inline arrays", () => {
    const input = `---
tags: [backend, frontend, infra]
---
Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.tags).toEqual(["backend", "frontend", "infra"]);
  });

  it("parses empty inline arrays", () => {
    const input = `---
tags: []
---
Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.tags).toEqual([]);
  });

  it("parses quoted strings", () => {
    const input = `---
title: "My Decision: The Important One"
---
Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.title).toBe("My Decision: The Important One");
  });

  it("parses empty string values", () => {
    const input = `---
waiting_on: ""
---
Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.waiting_on).toBe("");
  });

  it("returns empty frontmatter when no delimiters", () => {
    const input = "Just plain text without frontmatter";
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(input);
  });

  it("returns empty frontmatter when only opening delimiter", () => {
    const input = "---\ntype: broken\nno closing delimiter";
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({});
  });

  it("handles leading whitespace before frontmatter", () => {
    const input = `  ---
type: task
---
Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter.type).toBe("task");
  });

  it("handles values with colons", () => {
    const input = `---
source: "https://github.com/org/repo#123"
---
Body`;

    // The parser splits on first colon only
    const result = parseFrontmatter(input);
    expect(result.frontmatter.source).toBe("https://github.com/org/repo#123");
  });
});

describe("serializeFrontmatter", () => {
  it("serializes basic key-value pairs", () => {
    const result = serializeFrontmatter(
      { type: "task", status: "open" },
      "## Title\n"
    );
    expect(result).toContain("type: task");
    expect(result).toContain("status: open");
    expect(result).toContain("## Title");
  });

  it("serializes arrays as inline YAML", () => {
    const result = serializeFrontmatter(
      { tags: ["backend", "frontend"] },
      "Body"
    );
    expect(result).toContain("tags: [backend, frontend]");
  });

  it("serializes empty arrays", () => {
    const result = serializeFrontmatter({ tags: [] }, "Body");
    expect(result).toContain("tags: []");
  });

  it("serializes empty strings as quoted empty", () => {
    const result = serializeFrontmatter({ waiting_on: "" }, "Body");
    expect(result).toContain('waiting_on: ""');
  });

  it("serializes null values as quoted empty", () => {
    const result = serializeFrontmatter({ field: null }, "Body");
    expect(result).toContain('field: ""');
  });

  it("wraps content in --- delimiters", () => {
    const result = serializeFrontmatter({ type: "task" }, "Body");
    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[2]).toBe("---");
  });
});

describe("roundtrip", () => {
  it("parse → serialize → parse produces same data", () => {
    const original = {
      type: "decision",
      date: "2026-04-15",
      status: "active",
      domain: ["backend", "infra"],
      tags: [],
      waiting_on: "",
    };
    const body = "## Decision\n\nContent here.\n";

    const serialized = serializeFrontmatter(original, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed.frontmatter.type).toBe(original.type);
    expect(parsed.frontmatter.date).toBe(original.date);
    expect(parsed.frontmatter.status).toBe(original.status);
    expect(parsed.frontmatter.domain).toEqual(original.domain);
    expect(parsed.frontmatter.tags).toEqual(original.tags);
    expect(parsed.frontmatter.waiting_on).toBe(original.waiting_on);
    expect(parsed.body).toContain("## Decision");
    expect(parsed.body).toContain("Content here.");
  });
});
