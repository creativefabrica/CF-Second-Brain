---
name: second-brain
description: >
  Interact with the Obsidian vault second brain via MCP tools.
  Trigger: When user prefixes input with "sb" or "sb:" or explicitly mentions their vault/second brain.
license: Apache-2.0
metadata:
  author: creative-mati
  version: "2.0"
allowed-tools: mcp__second-brain__*
---

## Activation

Prefix `sb` or `sb:` — e.g., `sb went with PostgreSQL over DynamoDB`
Also: "save to vault", "save to second brain", "what's in my vault about..."

Does NOT activate on general conversation, code discussion, or engram triggers.

---

## Boundary with Engram

| Engram | Vault |
|--------|-------|
| Claude's cross-session memory | User's Obsidian knowledge base |
| Claude saves proactively | User triggers with `sb` |
| Read by Claude | Read by user in Obsidian |

`sb` → vault only. Never also save to engram.

---

## Auto-Classification

Route to the correct tool based on content. The user never specifies the type.

- **Decision**: a choice was made between alternatives → `save_decision`
- **Task**: work remains to be done → `save_task`
- **Meeting**: people met and discussed topics → `save_meeting`
- **Learning**: new concept, technique, tool, or insight absorbed from reading/watching/exploring → `save_note` with content structured as: what was learned, source, key takeaway, and how it connects to current work
- **Mixed**: meeting notes containing decisions/tasks → `save_meeting` (server auto-extracts)
- **Ambiguous**: → `save_note` (server classifies)

---

## Tool Parameters

### save_decision

```json
{
  "title": "Short searchable title (you generate)",
  "content": "User's words, structured with markdown",
  "domain": ["backend", "architecture"],
  "participants": ["Carlos", "Priya"]
}
```

Domains: `backend`, `frontend`, `infra`, `devops`, `architecture`, `security`, `testing`, `process`

### save_task

```json
{
  "title": "Short searchable title (you generate)",
  "content": "What needs to be done",
  "priority": "p2-medium",
  "status": "open",
  "waiting_on": "Carlos",
  "due": "2026-04-20",
  "source": "https://github.com/org/repo/pull/123",
  "tags": ["frontend"]
}
```

Infer from content: "waiting on..." → blocked, "probably should..." → p3-low, "urgent" → p0/p1,
relative dates → absolute YYYY-MM-DD, URLs → source.

### save_meeting

```json
{
  "title": "Meeting topic (you generate)",
  "content": "Full meeting notes",
  "attendees": ["Carlos", "Priya"],
  "project": "cf-web"
}
```

Server auto-extracts decisions and tasks — do NOT call those tools separately for meeting content.

### save_note

```json
{ "content": "Raw text" }
```

### search_vault

```json
{ "query": "search terms", "type": "decision" }
```

Type optional: `decision`, `task`, `meeting`, `person`, `project`. Omit to search all.

### get_pending_tasks

```json
{ "status": "blocked", "priority": "p1-high" }
```

Both optional. Defaults to all open/in-progress/blocked.

### get_vault_context

```json
{ "topic": "cf-web" }
```

### update_index

No params. Rebuilds vault/index.md.

---

## Query Patterns

| User writes | Action |
|---|---|
| `sb what did we decide about caching?` | `search_vault` query "caching", type "decision" |
| `sb what's pending?` | `get_pending_tasks` |
| `sb what's blocked?` | `get_pending_tasks` status "blocked" |
| `sb what do I know about cf-web?` | `get_vault_context` topic "cf-web" |
| `sb stats` | Run vault health check (see Eval section) |
| `sb reindex` | `update_index` |

---

## Vault Schema

| Type | Directory | Naming | Key frontmatter |
|---|---|---|---|
| Decision | `vault/decisions/` | `YYYY-MM-DD-slug.md` | status (active/superseded/revisit), domain[], participants[] |
| Task | `vault/tasks/` | `YYYY-MM-DD-slug.md` | status (open/in-progress/blocked/done), priority (p0-p3), due, waiting_on |
| Meeting | `vault/meetings/` | `YYYY-MM-DD-topic.md` | attendees[], project |
| Person | `vault/people/` | `name.md` | role, team, last_mentioned |
| Project | `vault/projects/` | `name.md` | status, last_updated |
| Weekly | `vault/weekly/` | `YYYY-WXX.md` | — |

Use Obsidian wikilinks (`[[path/file|display]]`) for all internal references. High link density.

---

## Rules

1. **Generate titles** — user dumps raw text, you create a short searchable title
2. **Preserve voice** — structure the user's words, don't rewrite into corporate-speak
3. **Convert relative dates** → absolute YYYY-MM-DD
4. **Extract entities** — names → participants/attendees, systems → project
5. **Infer metadata** — priority, status, domain, tags from context. Don't ask.
6. **Show inferred metadata** — after saving, one line per file created showing what you inferred (type, priority, domain, due date) so the user can catch misclassifications early

---

## Eval: `sb stats`

When user types `sb stats`, build a vault health report AND persist it for tracking.

### Step 1: Query

1. `get_pending_tasks()` — count by status and priority
2. `search_vault(query: "*", type: "decision")` — count decisions
3. `search_vault(query: "*", type: "meeting")` — count meetings
4. `search_vault(query: "*", type: "person")` — count people
5. `search_vault(query: "*", type: "project")` — count projects

### Step 2: Persist snapshot

Read `vault/stats/history.json`, append a new snapshot, write it back:

```json
{
  "date": "YYYY-MM-DD",
  "week": "WXX",
  "distribution": {
    "decisions": N, "tasks": N, "meetings": N,
    "people": N, "projects": N, "total": N
  },
  "task_health": {
    "open": N, "in_progress": N, "blocked": N,
    "overdue": N, "stale": N
  },
  "entries": [
    { "date": "YYYY-MM-DD", "type": "task", "name": "short name" }
  ]
}
```

Stale = open/in-progress task older than 14 days from today.
Overdue = task with `due` date in the past.

### Step 3: Report

Show the text report in conversation + deltas vs previous snapshot if one exists.
End with: "Dashboard updated — open `vault/stats/dashboard.html` in a browser to compare visually."

---

## Session Hooks

**First `sb` of a session**: after processing the user's request, also check for stale/overdue items.
Call `get_pending_tasks` silently. If any are overdue or stale (>14 days), append a brief notice:

```
You have X overdue/stale tasks. Type `sb what's pending?` to review.
```

**After 3+ vault writes in a session**: call `update_index` automatically.

---

## Work Integration

When the user starts work on a Jira ticket and you notice vault context might help:
- `search_vault` for the ticket's domain or feature area
- Surface relevant decisions or open tasks if found

Passive — don't force it. Only surface when clearly relevant.

---

## Examples

**User:** `sb went with tailwind over styled-components for the dashboard. better DX and smaller bundle.`
→ `save_decision`: title "Tailwind over styled-components for dashboard", domain ["frontend"]
→ Report: `Saved decision: "Tailwind over styled-components for dashboard" [frontend]`

**User:** `sb need to migrate the old auth middleware before the compliance deadline march 30`
→ `save_task`: title "Migrate old auth middleware", priority p1-high, due 2026-03-30, tags ["security"]
→ Report: `Saved task: "Migrate old auth middleware" [p1-high, due 2026-03-30, security]`

**User:** `sb met with carlos and priya about search. decided on elasticsearch over solr. need staging cluster by friday.`
→ `save_meeting`: title "Search service sync", attendees ["Carlos", "Priya"]
→ Report: `Saved meeting: "Search service sync" [Carlos, Priya] — server will extract 1 decision + 1 task`
