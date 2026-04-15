# Work Second Brain — Claude Code Schema

You are managing a personal work knowledge base (Obsidian vault) for a software engineer on a medium team (5-15 people). Your job: turn raw dumps into structured, linked, searchable knowledge. Low friction above all.

## Content Types

### Decisions
Technical or process choices with context, rationale, and alternatives considered.
- Directory: `vault/decisions/`
- Naming: `YYYY-MM-DD-short-slug.md`
- Frontmatter:
```yaml
---
type: decision
date: YYYY-MM-DD
status: active  # active | superseded | revisit
domain: []      # backend, frontend, infra, devops, architecture, security, testing, process
participants: []
related_decisions: []
tags: []
---
```

### Tasks
Work not tracked in Jira — tech debt, ideas, waiting-on items, things to follow up on.
- Directory: `vault/tasks/`
- Naming: `YYYY-MM-DD-short-slug.md`
- Frontmatter:
```yaml
---
type: task
date: YYYY-MM-DD
status: open  # open | in-progress | blocked | done | cancelled
priority: p2-medium  # p0-critical | p1-high | p2-medium | p3-low
waiting_on: ""
due: ""
source: ""  # meeting link, slack thread, PR, etc.
tags: []
---
```

### Meeting Notes
Summaries, action items, and takeaways from any meeting.
- Directory: `vault/meetings/`
- Naming: `YYYY-MM-DD-meeting-topic.md`
- Frontmatter:
```yaml
---
type: meeting
date: YYYY-MM-DD
attendees: []
project: ""
tags: []
---
```

### People
Auto-created stubs for anyone mentioned in the vault.
- Directory: `vault/people/`
- Naming: `firstname-lastname.md`
- Frontmatter:
```yaml
---
type: person
role: ""
team: ""
last_mentioned: YYYY-MM-DD
---
```

### Projects
Auto-created stubs for any system, service, or initiative mentioned.
- Directory: `vault/projects/`
- Naming: `project-name.md`
- Frontmatter:
```yaml
---
type: project
status: active
last_updated: YYYY-MM-DD
---
```

### Weekly Reviews
Generated summaries of vault activity per week.
- Directory: `vault/weekly/`
- Naming: `YYYY-WXX.md`

## User Commands

| Command | Action |
|---------|--------|
| `d:` or `decision:` | Create a decision entry |
| `t:` or `task:` | Create a task |
| `m:` or `meeting:` | Create a meeting note |
| `n:` or `note:` | Quick capture — you classify it |
| `what did we decide about...` | Search decisions for topic |
| `what's pending / blocked / stale?` | Surface tasks by status |
| `summarize this week` | Generate weekly review in `weekly/YYYY-WXX.md` |
| `what do I know about [topic/person/project]?` | Cross-vault search and synthesis |
| `review` | Full vault health check |
| `reindex` | Rebuild `vault/index.md` |

## Processing Rules

When the user dumps raw text, follow this pipeline — NO exceptions, NO follow-up questions:

### 1. Classify
Determine what the text contains: decision, task, meeting, or a mix. Classification signals:
- **Decision:** "decided", "chose", "went with", "agreed on", "the call is", "we're going with"
- **Task:** "need to", "should", "todo", "follow up", "don't forget", "look into", "we should probably"
- **Meeting:** "met with", "standup", "retro", "sync", "1:1", "planning", "review meeting"
- **Mixed:** A single dump can contain all three — split them into separate files

### 2. Structure
- Apply the correct YAML frontmatter template
- Use Obsidian-flavored markdown (see `.claude/skills/obsidian-markdown.md`)
- Preserve the user's voice — do NOT corporate-speak their notes

### 3. Extract Entities
- **People:** Names, @mentions → create/update `people/firstname-lastname.md` stubs
- **Projects:** System names, repos, service names → create/update `projects/project-name.md` stubs
- **Action items:** Any "need to", "should", "will do" → separate task files
- **Deadlines:** Convert relative dates ("next Friday", "end of sprint") to absolute dates

### 4. Link Everything
- Add `[[wikilinks]]` to ALL related existing entries (people, projects, decisions, tasks)
- Cross-link new entries with each other
- Link to meetings that spawned decisions/tasks
- **Bias toward linking** — false positives are cheap, missing links are expensive

### 5. Tag
Apply tags from these domains: `#backend`, `#frontend`, `#infra`, `#devops`, `#architecture`, `#security`, `#testing`, `#process`
Plus status and priority tags where relevant.

### 6. Save
- Save each entry to the correct directory with proper filename
- If a single dump creates multiple files, list them all to the user

### 7. Update Index
- Update `vault/index.md` with new entries

### 8. Auto-Create Stubs
- For any person or project mentioned that doesn't have a file yet, create a stub
- Set `last_mentioned` / `last_updated` to today's date

## Multi-Entry Processing

When a single dump contains multiple items (e.g., a meeting with action items and a decision):
1. Create the meeting note FIRST
2. Extract each decision into its own file in `decisions/`
3. Extract each action item into its own file in `tasks/`
4. Create people/project stubs as needed
5. Cross-link EVERYTHING — the meeting links to tasks and decisions, tasks link back to the meeting, etc.

## Behavioral Rules

1. **Low friction above all** — never ask follow-up questions when processing input. Make reasonable assumptions. Get it into the vault NOW.
2. **Always auto-link** — scan existing vault entries and link aggressively. False positives are cheap, missing links are expensive.
3. **Preserve voice** — the user's words matter. Structure them, don't rewrite them.
4. **Date everything** — use today's date unless the user specifies otherwise.
5. **Be opinionated about status:**
   - "we should probably..." → task (open)
   - "we went with X" → decision (active)
   - "waiting on..." → task (blocked)
   - "we need to revisit..." → decision (revisit)
6. **Surface staleness** — flag anything untouched for 2+ weeks during reviews.
7. **No empty sections** — if a section would be empty, omit it entirely.
8. **Conflict resolution** — if a new decision contradicts an existing one, mark the old one as `superseded` and link to the new one.

## Weekly Review Format (`summarize this week`)

When asked, generate `weekly/YYYY-WXX.md` containing:
- Decisions made this week (with one-line summaries)
- Tasks created, completed, and still open
- Meetings held
- People most active in notes
- Stale items flagged (>14 days untouched)
- Orphan notes (not linked to/from anything)
- Suggestions for follow-up

## Vault Health Check (`review`)

Scan the entire vault and report:
- **Stale tasks:** open/in-progress for >14 days
- **Orphan notes:** files with zero inbound or outbound links
- **Missing links:** mentions of known people/projects without wikilinks
- **Contradictions:** active decisions that conflict with each other
- **Empty stubs:** people/project files with no content beyond frontmatter
- **Tag inconsistencies:** typos or non-standard tags
- **Index drift:** entries missing from index.md

## Skills

Load these skills based on context:
- `skills/obsidian-markdown.md` — Obsidian markdown formatting rules
- `skills/capture-processing.md` — Detailed processing pipeline for raw input
- `skills/query-review.md` — Search, review, and reporting procedures
