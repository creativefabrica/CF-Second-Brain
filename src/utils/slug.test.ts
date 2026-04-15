import { describe, it, expect } from "vitest";
import { slugify, today } from "./slug.js";

describe("slugify", () => {
  it("converts spaces to hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  it("lowercases everything", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("what's the plan?")).toBe("whats-the-plan");
  });

  it("collapses multiple spaces", () => {
    expect(slugify("too   many    spaces")).toBe("too-many-spaces");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("already--hyphenated---text")).toBe("already-hyphenated-text");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-leading and trailing-")).toBe("leading-and-trailing");
  });

  it("trims whitespace", () => {
    expect(slugify("  padded  ")).toBe("padded");
  });

  it("handles exclamation marks and punctuation", () => {
    expect(slugify("Setup staging cluster!!!")).toBe("setup-staging-cluster");
  });

  it("preserves existing hyphens", () => {
    expect(slugify("pre-existing-slug")).toBe("pre-existing-slug");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles only special characters", () => {
    expect(slugify("!@#$%^&*()")).toBe("");
  });

  it("handles unicode by stripping non-word chars", () => {
    // \w matches [a-zA-Z0-9_], so accented chars get stripped
    expect(slugify("café latte")).toBe("caf-latte");
  });

  it("handles mixed hyphens and spaces", () => {
    expect(slugify("use  Elasticsearch over  Solr")).toBe("use-elasticsearch-over-solr");
  });
});

describe("today", () => {
  it("returns a YYYY-MM-DD format string", () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    const result = today();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});
