# Second Brain — Quick Guide

## The One Rule

Prefix with `sb` and dump. Don't think about format, type, or structure. Claude handles all of that.

```
sb went with PostgreSQL over DynamoDB for the new service — cost and team familiarity
sb need to follow up with Carlos about the API contract before Friday
sb met with the team about search. decided elasticsearch over solr. need staging cluster by EOW.
```

That's it. You type, the vault organizes.

---

## What To Capture

### High-value (capture these always)

**Decisions** — any time you choose X over Y. These are impossible to reconstruct later.
```
sb went with server components for the dashboard. SSR gives us better SEO and the data is mostly static.
```

**Post-meeting context** — one dump after a meeting extracts decisions + tasks automatically.
```
sb met with carlos and priya about the video pipeline. decided to use seedance 2.0 for reference mode. carlos will handle the API integration. need to update the proto definitions by next wednesday.
```

**Learnings** — new tech, patterns, concepts, or insights from reading, watching, or exploring. This is the Karpathy use case: the vault as a personal knowledge base, not just a work tracker.
```
sb learned about React compiler today. it auto-memoizes components and hooks — no more manual useMemo/useCallback. only works with React 19+. could eliminate half our memo wrappers in studio.
```
```
sb read the Vercel blog post on partial prerendering. key insight: static shell renders instantly, dynamic parts stream in. combines ISR + streaming. relevant for our web app landing pages.
```
```
sb watched Karpathy's talk on LLM tokenization. BPE merges the most frequent byte pairs iteratively. explains why GPT struggles with character counting — tokens != characters. also why code completion works better with consistent formatting.
```

The pattern: **what you learned + where from + key takeaway + how it connects to your work**. That last part is what turns raw notes into a knowledge graph — it links the learning to your projects.

**Non-obvious discoveries** — gotchas, surprises, things that took you 2 hours to figure out.
```
sb the subscription model is intentionally split into two products — marketplace and studio AI. the switch process uses a different flow than a new subscription.
```

### Medium-value (capture when relevant)

**Tasks not in Jira** — tech debt, ideas, follow-ups that don't warrant a ticket yet.
```
sb should revisit the caching strategy once we hit 10k concurrent users
sb need to clean up the legacy auth middleware before Q3
```

**Blocked items** — things waiting on someone else.
```
sb waiting on platform team for the shared schema review before we can proceed with the migration
```

### Low-value (skip these)

- Things already in Jira tickets
- Things already in git commit messages
- Routine standup notes with no decisions
- Temporary debugging notes

---

## Querying

```
sb what did we decide about caching?        # search decisions
sb what's pending?                           # all open tasks
sb what's blocked?                           # blocked tasks only
sb what do I know about cf-web?              # everything about a topic
sb stats                                     # vault health report + dashboard update
```

---

## The Habit

The vault is only as good as what goes in. Four moments to build the habit:

1. **After a meeting** — dump everything while it's fresh. One `sb met with...` creates the meeting note, extracts decisions, creates tasks, links people. Highest ROI capture.

2. **After a decision** — when you choose X over Y, take 10 seconds: `sb went with X because...`. Your future self will thank you when someone asks "why did we do it this way?"

3. **After learning something** — read an article, watched a talk, explored a new tool, figured out a hard concept? Dump it: `sb learned about X. key insight: Y. relevant to Z.` This is what turns the vault from a work tracker into a personal knowledge base. The connection to your current work ("relevant to Z") is what makes it searchable and useful later.

4. **Weekly review** — type `sb stats` once a week. Check the dashboard. Are tasks going stale? Are you capturing decisions or just tasks? Are learnings making it in? The dashboard answers these questions visually.

---

## Measuring Success

Run `sb stats` weekly. Open the dashboard (`vault/stats/dashboard.html`) to see trends.

**Healthy vault signals:**
- Decisions growing steadily (not just tasks)
- Meetings being captured (highest-leverage content type)
- Stale count staying low (you review and resolve)
- Type ratio diversified (not 80% tasks)

**Unhealthy vault signals:**
- Only tasks, no decisions or meetings — you built another inbox
- Stale count growing — you capture but never review
- Growth rate dropping to 0 — the habit isn't sticking
- All entries are the same type — the classification isn't being used

---

## Anti-Patterns

| Don't | Do instead |
|-------|-----------|
| Save everything from a meeting as separate `sb` calls | One `sb met with...` dump — server splits it |
| Write formal structured notes | Dump raw thoughts — Claude structures them |
| Duplicate what's in Jira | Only capture what Jira doesn't: reasoning, context, gotchas |
| Forget to query | If you never `sb what did we decide...`, the vault is write-only |
| Ignore `sb stats` | It's your feedback loop — without it you're guessing |

---

## Serving the Dashboard

```bash
cd ~/work-second-brain/vault/stats && python3 -m http.server 8080
```

Then open `http://localhost:8080/dashboard.html`.
