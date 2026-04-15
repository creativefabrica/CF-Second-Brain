# Skill: Query and Review

How to search, analyze, and report on vault contents.

## Decision Lookup

**Trigger:** "what did we decide about..."

### Procedure
1. Search `vault/decisions/` filenames and content for the topic
2. Search `vault/meetings/` for related discussion context
3. Check for superseded decisions — always surface the CURRENT active one
4. If multiple related decisions exist, present them chronologically
5. Include links to related tasks spawned by the decision

### Response format
- State the current active decision clearly
- Provide context: who, when, why, what alternatives were considered
- Link to the source files
- Flag if the decision is marked `revisit` or has been untouched for a long time

## Task Status Queries

**Trigger:** "what's pending", "what's blocked", "what's stale", "what do I need to do"

### Procedure
1. Scan all files in `vault/tasks/`
2. Read frontmatter for `status`, `priority`, `due`, `waiting_on`
3. Group by status: open, in-progress, blocked, done
4. Within each group, sort by priority (p0 first), then by date
5. Flag stale items: any open/in-progress task untouched for >14 days
6. Flag overdue items: any task with `due` date in the past

### Response format
```
## Open Tasks (X)
### P0 - Critical
- [ ] Task name — created YYYY-MM-DD [STALE if applicable]

### P1 - High
...

## Blocked Tasks (X)
- [ ] Task name — waiting on [[person]] since YYYY-MM-DD

## Recently Completed (X)
- [x] Task name — done YYYY-MM-DD
```

## Topic Search

**Trigger:** "what do I know about [topic/person/project]"

### Procedure
1. Search ALL vault directories for the topic
2. Check `vault/people/` and `vault/projects/` for dedicated files
3. Search file contents for mentions (even without wikilinks)
4. Group results by type: decisions, tasks, meetings, notes
5. Synthesize a narrative: what has been discussed, decided, and what's pending

### Response format
Present a brief narrative synthesis first, then list all related entries grouped by type with one-line summaries and links.

## Person Lookup

**Trigger:** "what do I know about [name]"

### Procedure
1. Check `vault/people/firstname-lastname.md` for their stub
2. Search all vault files for mentions of the person's name
3. Group by: decisions they participated in, meetings they attended, tasks assigned to/waiting on them
4. Note their role and team if known

### Response format
- Who they are (role, team)
- Recent activity in the vault
- Decisions they've been part of
- Tasks connected to them

## Weekly Review

**Trigger:** "summarize this week"

### Procedure
1. Determine the current week number (ISO week)
2. Scan all vault entries with dates in the current week
3. Group by type and compile:

```markdown
---
type: weekly
date: YYYY-MM-DD
week: YYYY-WXX
---

## Weekly Review: YYYY-WXX

### Decisions Made
- [[decision-link|Short summary]] — YYYY-MM-DD

### Tasks
- **Created:** X new tasks
- **Completed:** X tasks done
- **Still Open:** X tasks remaining
- **Blocked:** X tasks blocked

### Meetings
- [[meeting-link|Topic]] — with [[person]], [[person]]

### Active People
Most mentioned this week: [[person-1]], [[person-2]]

### Stale Items (>14 days)
> [!warning] Needs attention
> - [[stale-task]] — last touched YYYY-MM-DD

### Orphan Notes
Notes with zero links in or out (consider linking or archiving):
- [[orphan-note]]

### Suggestions
- Follow up on [specific blocked item]
- [Specific observation about patterns]
```

4. Save to `vault/weekly/YYYY-WXX.md`

## Vault Health Check

**Trigger:** "review"

### Full scan procedure

#### 1. Stale Tasks
- Find all tasks with status `open` or `in-progress`
- Check file modification date and `date` in frontmatter
- Flag anything >14 days old
- Severity: >14 days = warning, >30 days = danger

#### 2. Orphan Notes
- For every file in the vault, check:
  - Does any other file link TO this file? (inbound links)
  - Does this file link TO any other file? (outbound links)
- Flag files with zero inbound AND zero outbound links

#### 3. Missing Links
- Scan all file contents for mentions of known people and project names
- Check if those mentions are wikilinked
- Report unlinked mentions with suggested wikilinks

#### 4. Contradictions
- Find all active decisions in the same domain
- Check for conflicting choices (e.g., two active decisions about the same system choosing different approaches)
- Report with links to both decisions

#### 5. Empty Stubs
- Check `people/` and `projects/` for files that contain only frontmatter
- Suggest filling in known details or removing if no longer relevant

#### 6. Tag Inconsistencies
- Collect all tags used across the vault
- Flag potential typos: `#backendd`, `#frontent`, `#infrastucture`
- Flag non-standard tags not in the domain list

#### 7. Index Drift
- Compare entries in `vault/index.md` against actual files
- Report entries in index that no longer exist (dead links)
- Report files that exist but aren't in the index

### Response format
Present as a structured report with severity levels:
- `[DANGER]` — needs immediate attention
- `[WARNING]` — should be addressed soon
- `[INFO]` — nice to clean up when you have time

## Reindex

**Trigger:** "reindex"

### Procedure
1. Scan all directories: decisions/, tasks/, meetings/, people/, projects/
2. Read frontmatter from each file
3. Rebuild `vault/index.md` with:
   - Vault stats (total counts by type)
   - Recent entries (last 10 by date)
   - Active projects with their linked decisions and tasks
   - Open tasks grouped by priority
   - Quick start commands
4. Write the updated index
