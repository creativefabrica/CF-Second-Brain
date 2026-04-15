---
name: second-brain
description: >
  Interact with the Obsidian vault second brain via MCP tools.
  Trigger: When user prefixes input with "sb" or "sb:" or explicitly mentions their vault/second brain.
license: Apache-2.0
metadata:
  author: creative-mati
  version: "1.0"
allowed-tools: mcp__second-brain__*
---

## Activation

This skill activates when:
- User prefixes input with `sb` or `sb:` (e.g., `sb went with PostgreSQL over DynamoDB`)
- User explicitly says "save to vault", "save to second brain", "log to vault"
- User queries the vault: "what's in my vault about...", "vault: what's pending?"

**Does NOT activate on:** general conversation, code discussion, engram triggers. This is for the user's Obsidian knowledge base, not Claude's session memory.

---

## Boundary with Engram

| Engram | Second Brain Vault |
|--------|-------------------|
| Claude's memory for future sessions | User's Obsidian knowledge base |
| Claude saves proactively | User triggers explicitly with `sb` |
| Survives compaction | Survives as .md files in vault/ |
| Read by Claude | Read by user in Obsidian (graph, search, backlinks) |

When `sb` is used, save to vault via MCP. Do NOT also save to engram — they serve different audiences.

---

## Auto-Classification

When the user writes `sb <content>`, classify the content and route to the correct tool. The user should NEVER need to specify the type — you figure it out.

### Decision signals
Words: "decided", "chose", "went with", "agreed on", "we're going with", "settled on", "picked", "committed to", "the call is", "over" + "because"

-> Call `save_decision`

### Task signals
Words: "need to", "should", "todo", "follow up", "don't forget", "look into", "investigate", "waiting on", "blocked by", "tech debt", "hack", "temporary", "revisit"

-> Call `save_task`

### Meeting signals
Words: "met with", "standup", "retro", "sync", "1:1", "planning", "review meeting", "kickoff", "demo", "post-mortem", multiple attendees + discussion topics

-> Call `save_meeting`

### Mixed content
A single dump can contain decisions + tasks + meeting notes. When this happens:
1. If it reads like meeting notes -> call `save_meeting` (auto-extracts decisions and tasks)
2. If it's a decision that also implies a task -> call `save_decision` AND `save_task`
3. When in doubt -> call `save_note` (auto-classifies server-side)

### No clear signal
If the content has no strong signals, default to `save_note` — the server classifies it.

---

## Tool Parameters

### save_decision
```json
{
  "title": "Short descriptive title (you generate this)",
  "content": "User's words, structured with markdown headings if needed",
  "domain": ["backend", "architecture"],
  "participants": ["Carlos", "Priya"]
}
```
- **domain** values: `backend`, `frontend`, `infra`, `devops`, `architecture`, `security`, `testing`, `process`
- **participants**: extract names from content. Include @mentions and explicit names.
- Generate the **title** — the user won't provide one. Make it short and searchable.

### save_task
```json
{
  "title": "Short descriptive title (you generate this)",
  "content": "What needs to be done",
  "priority": "p2-medium",
  "status": "open",
  "waiting_on": "Carlos",
  "due": "2026-04-20",
  "source": "https://github.com/org/repo/pull/123",
  "tags": ["frontend"]
}
```
Infer from content:
- "waiting on..." -> status `blocked`, set `waiting_on`
- "we should probably..." -> priority `p3-low`
- "urgent / critical / ASAP" -> priority `p0-critical` or `p1-high`
- "by Friday" -> convert to absolute date in `due`
- Any URL in the text -> set as `source`

### save_meeting
```json
{
  "title": "Meeting topic (you generate this)",
  "content": "Full meeting notes — user's words",
  "attendees": ["Carlos", "Priya"],
  "project": "cf-web"
}
```
- Extract attendee names from content
- Set `project` if a project/system is mentioned
- This tool auto-extracts decisions and tasks — do NOT call those tools separately for items in the meeting content

### save_note
```json
{
  "content": "Raw text — server classifies it"
}
```
Fallback when classification is ambiguous.

### search_vault
```json
{
  "query": "search terms",
  "type": "decision"
}
```
- `type` is optional: `decision`, `task`, `meeting`, `person`, `project`
- Omit `type` to search everything

### get_pending_tasks
```json
{
  "status": "blocked",
  "priority": "p1-high"
}
```
Both params optional. Defaults to all open/in-progress/blocked tasks.

### get_vault_context
```json
{
  "topic": "cf-web"
}
```
Cross-vault synthesis across all content types.

### update_index
```json
{}
```
Rebuilds vault/index.md. Call after 3+ vault writes in one session.

---

## Query Patterns

These also activate with `sb` prefix:

| User writes | Action |
|------------|--------|
| `sb what did we decide about caching?` | `search_vault` with query "caching", type "decision" |
| `sb what's pending?` | `get_pending_tasks` (no filters) |
| `sb what's blocked?` | `get_pending_tasks` with status "blocked" |
| `sb what do I know about cf-web?` | `get_vault_context` with topic "cf-web" |
| `sb reindex` | `update_index` |

---

## Rules

1. **Generate titles** — the user dumps raw text, you create a short searchable title
2. **Preserve voice** — pass the user's actual words in `content`. Structure with headings, don't rewrite into corporate-speak
3. **Convert relative dates** — "next Friday", "end of sprint" -> absolute YYYY-MM-DD
4. **Extract entities** — names become `participants`/`attendees`, system names become `project`
5. **Infer metadata** — priority, status, domain, tags from context. Don't ask the user.
6. **Report back concisely** — after saving, list what was created (type, title, any stubs) in 1-2 lines per file

---

## Examples

**User:** `sb met with carlos and priya about search. decided on elasticsearch over solr. need to set up staging cluster by friday.`

**Action:** Call `save_meeting` with:
- title: "Search service sync"
- content: the full text
- attendees: ["Carlos", "Priya"]

The server extracts "decided on elasticsearch" as a decision file and "need to set up staging cluster" as a task file automatically.

---

**User:** `sb went with tailwind over styled-components for the new dashboard. team agreed — better DX and smaller bundle.`

**Action:** Call `save_decision` with:
- title: "Tailwind over styled-components for dashboard"
- content: the full text
- domain: ["frontend"]
- participants: []

---

**User:** `sb need to migrate the old auth middleware before the compliance deadline march 30`

**Action:** Call `save_task` with:
- title: "Migrate old auth middleware"
- content: the full text
- priority: "p1-high" (deadline implies importance)
- due: "2026-03-30"
- tags: ["security"]

---

**User:** `sb the deploy pipeline takes 45 minutes, that's way too long`

**Action:** Call `save_note` — ambiguous between task and observation, let server classify.
