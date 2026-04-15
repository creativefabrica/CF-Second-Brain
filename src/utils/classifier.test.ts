import { describe, it, expect } from "vitest";
import { classify, extractTitle } from "./classifier.js";

describe("classify", () => {
  describe("decisions", () => {
    it("detects 'decided' signal", () => {
      const result = classify("We decided to use PostgreSQL for the new service");
      expect(result.type).toBe("decision");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("detects 'went with' signal", () => {
      const result = classify("We went with Redis for caching");
      expect(result.type).toBe("decision");
    });

    it("detects 'agreed on' signal", () => {
      const result = classify("The team agreed on a 2-week sprint cycle");
      expect(result.type).toBe("decision");
    });

    it("detects 'settled on' signal", () => {
      const result = classify("After long debate, settled on Vite over Webpack");
      expect(result.type).toBe("decision");
    });

    it("detects 'X over Y because' pattern", () => {
      const result = classify("Chose Elasticsearch over Solr because of the plugin ecosystem");
      expect(result.type).toBe("decision");
    });
  });

  describe("tasks", () => {
    it("detects 'need to' signal", () => {
      const result = classify("We need to update the CI pipeline before next release");
      expect(result.type).toBe("task");
    });

    it("detects 'follow up' signal", () => {
      const result = classify("Follow up with the design team about the new mockups");
      expect(result.type).toBe("task");
    });

    it("detects 'look into' signal", () => {
      const result = classify("Look into why the staging deploy is flaky");
      expect(result.type).toBe("task");
    });

    it("detects 'blocked by' signal", () => {
      const result = classify("This is blocked by the infra team provisioning the new cluster");
      expect(result.type).toBe("task");
    });

    it("detects 'tech debt' signal", () => {
      const result = classify("Tech debt: the auth module has no tests");
      expect(result.type).toBe("task");
    });
  });

  describe("meetings", () => {
    it("detects 'met with' signal", () => {
      const result = classify("Met with Carlos and Priya to discuss the migration plan");
      expect(result.type).toBe("meeting");
    });

    it("detects 'standup' signal", () => {
      const result = classify("Daily standup — discussed blockers on the search feature");
      expect(result.type).toBe("meeting");
    });

    it("detects 'retro' signal", () => {
      const result = classify("Sprint retro went well, main issue was deploy frequency");
      expect(result.type).toBe("meeting");
    });

    it("detects 'attendees' signal", () => {
      const result = classify("Attendees: Maria, Juan, Ana. Topic: Q3 planning");
      expect(result.type).toBe("meeting");
    });
  });

  describe("ambiguous and edge cases", () => {
    it("defaults to task when no signals match", () => {
      const result = classify("Something about the codebase");
      expect(result.type).toBe("task");
      expect(result.confidence).toBe(0);
    });

    it("picks highest score when multiple types match", () => {
      // "met with" (meeting) + "decided" (decision) + "need to" (task)
      // meeting=1, decision=1, task=1 — first in sort wins on tie
      const result = classify("Met with the team. We decided on X. Need to follow up.");
      expect(result.confidence).toBeGreaterThan(0);
      // All three match once — the result depends on sort stability,
      // but what matters is it doesn't crash and picks one
      expect(["decision", "task", "meeting"]).toContain(result.type);
    });

    it("handles empty string", () => {
      const result = classify("");
      expect(result.type).toBe("task");
      expect(result.confidence).toBe(0);
    });

    it("is case insensitive", () => {
      const result = classify("WE DECIDED to use TypeScript");
      expect(result.type).toBe("decision");
    });
  });
});

describe("extractTitle", () => {
  it("extracts first sentence when short", () => {
    expect(extractTitle("Fix the login bug.")).toBe("Fix the login bug");
  });

  it("truncates to maxWords when sentence is long", () => {
    const long = "This is a very long sentence that goes on and on and on about many things";
    const title = extractTitle(long, 8);
    expect(title.split(/\s+/).length).toBe(8);
  });

  it("stops at newline", () => {
    expect(extractTitle("First line\nSecond line")).toBe("First line");
  });

  it("handles single word", () => {
    expect(extractTitle("Refactor")).toBe("Refactor");
  });

  it("respects custom maxWords", () => {
    const title = extractTitle("One two three four five six", 3);
    expect(title).toBe("One two three");
  });

  it("handles empty string", () => {
    expect(extractTitle("")).toBe("");
  });
});
