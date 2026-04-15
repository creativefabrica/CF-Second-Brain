# Skill: Capture Processing

How to process raw user input into structured vault entries. This is the core pipeline — apply it every time the user dumps text.

## Classification Signals

Scan the input for these patterns to determine entry type:

### Decision signals
- "decided", "chose", "went with", "agreed on", "the call is"
- "we're going with", "settled on", "picked", "committed to"
- "after discussing... we", "the tradeoff is... so we"
- Presence of alternatives considered + a choice made

### Task signals
- "need to", "should", "todo", "follow up", "don't forget"
- "look into", "investigate", "we should probably", "someone needs to"
- "waiting on", "blocked by", "once X happens, then Y"
- "tech debt", "hack", "temporary", "revisit later"
- Anything phrased as future work without a resolution

### Meeting signals
- "met with", "standup", "retro", "sync", "1:1", "planning"
- "review meeting", "kickoff", "demo", "post-mortem"
- Multiple attendees mentioned + discussion topics
- Chronological flow of topics discussed

### Mixed input
A single dump often contains multiple types. Example: a meeting summary that includes decisions made and action items assigned. Always split these into separate files.

## Entity Extraction

### People
- Explicit names: "Carlos mentioned...", "Priya will..."
- @mentions: "@carlos", "@priya-sharma"
- Role references: "the tech lead said...", "frontend team agreed..."
- For each new person found, create `people/firstname-lastname.md` stub

### Projects
- System/service names: "search service", "auth module", "payment gateway"
- Repo names: "mono-repo", "api-gateway"
- Initiative names: "Q2 migration", "performance sprint"
- For each new project found, create `projects/project-name.md` stub

### Dates and Deadlines
- Absolute: "March 15", "2024-03-15", "next Tuesday"
- Relative: "end of sprint", "before release", "next week"
- Convert ALL relative dates to absolute dates using today's date as reference
- Add deadlines to task frontmatter `due:` field

### Action Items
- Any "need to", "should", "will", "todo" → extract as separate task
- Assign owner if mentioned: "Carlos will..." → `waiting_on: "[[people/carlos-mendez|Carlos]]"`
- Link back to source meeting/decision

## Processing Pipeline

### Step 1: Read and classify
Read the full input. Identify all content types present.

### Step 2: Split if mixed
If the input contains multiple types, plan separate files for each:
- One meeting note
- One file per decision
- One file per action item/task
- Stubs for new people and projects

### Step 3: Structure each entry
Apply the correct frontmatter template. Organize content under clear headings.

### Step 4: Extract and link
Pull out all entities. Create wikilinks. Cross-link all new files with each other.

### Step 5: Write files
Save everything to the correct directories. Report what was created.

### Step 6: Update vault
Update index.md. Create any needed stubs.

## Example: Multi-Entry Processing

**Raw input from user:**
```
met with carlos and priya about the search service. we decided to go with elasticsearch over solr — better ecosystem, priya has experience. need to set up a staging cluster by friday. carlos will handle the index mapping. also need to update the API docs once the endpoints change. oh and we should think about monitoring — maybe datadog integration?
```

**This creates 8 files:**

1. `meetings/2024-03-15-search-service-sync.md` — the meeting note
2. `decisions/2024-03-15-elasticsearch-over-solr.md` — the technology choice
3. `tasks/2024-03-15-setup-staging-cluster.md` — staging cluster (due: Friday, priority: p1-high)
4. `tasks/2024-03-15-index-mapping.md` — Carlos's task (waiting_on: Carlos)
5. `tasks/2024-03-15-update-api-docs.md` — API docs update (blocked on endpoint changes)
6. `tasks/2024-03-15-datadog-monitoring.md` — monitoring idea (priority: p3-low)
7. `people/carlos-mendez.md` — person stub (if new)
8. `people/priya-sharma.md` — person stub (if new)
9. `projects/search-service.md` — project stub (if new)

All files cross-linked:
- Meeting links to the decision and all 4 tasks
- Decision links back to meeting, links to project, mentions both people
- Each task links to source meeting
- People stubs get `last_mentioned` updated
- Project stub gets `last_updated` updated

## Edge Cases

### Ambiguous classification
When the text is ambiguous, bias toward the more structured type:
- Could be task or decision? → If a choice was made, it's a decision. If work remains, also create a task.
- Could be note or meeting? → If people were present and topics discussed, it's a meeting.

### Updates to existing entries
If the user mentions something that clearly relates to an existing entry:
- Search for the existing file first
- Update it rather than creating a duplicate
- Add a dated section: `### Update YYYY-MM-DD` with the new information
- Update frontmatter (status, last_mentioned, etc.)

### Minimal input
Even a one-liner gets full treatment:
- "need to fix the flaky test in CI" → task file with frontmatter, tagged #testing #infra
- "went with REST over GraphQL" → decision file with frontmatter, tagged #architecture #api-design
