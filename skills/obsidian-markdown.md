# Skill: Obsidian-Flavored Markdown

Rules for writing Obsidian-compatible markdown in this vault. Apply these to ALL files you create or edit.

## Wikilinks

Use Obsidian `[[wikilinks]]` — never standard markdown links for internal vault references.

```markdown
<!-- Correct -->
[[decisions/2024-03-15-api-versioning]]
[[people/carlos-mendez]]
[[projects/search-service]]

<!-- With display text -->
[[decisions/2024-03-15-api-versioning|API versioning decision]]
[[people/carlos-mendez|Carlos]]

<!-- WRONG — do not use for internal links -->
[API versioning](decisions/2024-03-15-api-versioning.md)
```

## Frontmatter

Every file MUST start with YAML frontmatter enclosed in `---` delimiters. No exceptions.

```yaml
---
type: decision
date: 2024-03-15
status: active
tags: [backend, architecture]
---
```

Rules:
- First line of the file must be `---`
- Use standard YAML syntax
- Dates in `YYYY-MM-DD` format
- Arrays use `[]` inline syntax for short lists, block syntax for 4+ items
- No trailing spaces after values

## Tags

Use `#tag` syntax in the body text. Tags are lowercase, hyphenated.

```markdown
#backend #api-design #breaking-change
```

Standard domain tags: `#backend`, `#frontend`, `#infra`, `#devops`, `#architecture`, `#security`, `#testing`, `#process`

Status tags: `#active`, `#superseded`, `#revisit`, `#blocked`, `#stale`

Priority tags: `#p0-critical`, `#p1-high`, `#p2-medium`, `#p3-low`

## Callouts

Use Obsidian callout syntax for highlighted blocks:

```markdown
> [!decision] We chose PostgreSQL over DynamoDB
> Cost, team familiarity, and JOIN support were the deciding factors.

> [!todo] Follow up with platform team
> Need their input on the shared schema before proceeding.

> [!warning] This contradicts the caching decision from March
> See [[decisions/2024-03-01-caching-strategy]] — may need to revisit.

> [!question] Open question
> How does this affect the mobile clients?

> [!info] Context
> This came up during the Q2 planning session.
```

Available callout types: `note`, `tip`, `warning`, `danger`, `todo`, `question`, `decision`, `info`

## Embeds

Embed another file's content inline:

```markdown
![[meetings/2024-03-15-search-sync]]
```

Use sparingly — prefer wikilinks over embeds for most references.

## Checkboxes

For action items and task lists:

```markdown
- [ ] Review PR for search indexing changes
- [ ] Schedule follow-up with [[people/priya-sharma|Priya]]
- [x] Update deployment runbook
```

## Headings

Use `##` as the top-level heading within files (since `#` is the file title in Obsidian).

```markdown
---
type: meeting
---

## Standup 2024-03-15

### Attendees
...

### Discussion
...

### Action Items
...
```

## Formatting Conventions

- **Bold** for key terms, names on first mention, and important points
- *Italic* for emphasis and asides
- `code` for technical terms: service names, API endpoints, config keys, CLI commands
- Code blocks with language hints for multi-line code or config

## Link Density

Aim for high link density. Every mention of a known person, project, decision, or task should be a wikilink. When in doubt, link it. The Obsidian graph view becomes more useful the more connections exist.

First mention of an entity in a file gets the wikilink. Subsequent mentions in the same file can be plain text (but linking them too is fine).
