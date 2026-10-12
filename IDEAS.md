# Drawbridge — Future Ideas & Experiments

**Last Updated:** Feb 26, 2026

Ideas captured from Daily Briefing insights, community research, and experimentation. Not commitments—just directions worth exploring.

---

## Automated Visual Testing (Inspired by vinext)

**Context:** Cloudflare rebuilt Next.js with AI (vinext) and used automated screenshot comparisons to catch visual regressions. Zero-friction performance/visual testing loop.

**Idea for Drawbridge:**
- Capture before/after screenshots when AI tools modify UI
- Diff comparison in side panel (visual regression detection)
- Lightweight Lighthouse integration: "Run audit → JSON → Cursor → deploy"
- Could surface performance impact of AI-generated changes in real-time

**Why it fits:**
- Drawbridge already has DOM access and visual context
- Designers care about visual fidelity—AI code changes can introduce subtle layout shifts
- Closes the feedback loop: generate → test → fix in one interface

**Exploration steps:**
1. Spike: Puppeteer screenshot capture on annotation save
2. Diff algorithm (pixel-diff or structural similarity)
3. UI: Show visual diff in side panel alongside annotations
4. Lighthouse JSON ingestion (how to surface perf insights?)

**Effort:** Medium (2-3 weeks)  
**Impact:** High (catches AI mistakes designers would otherwise miss)

---

## Multi-Agent Parallel Development (Emdash Pattern)

**Context:** Emdash (YC W26) lets you run multiple coding agents in parallel using Git worktrees. Each agent works in isolation, then results merge. Pattern: orchestrator delegates tasks to specialist agents.

**Idea for Drawbridge:**
- Architect Drawbridge V3+ as multi-agent system
- Example: One agent per component (sidebar, content script, background.js)
- Orchestrator (Claude Opus?) coordinates, resolves conflicts
- Faster iteration: 3 agents working in parallel vs. sequential

**Why it fits:**
- Chrome extension = naturally modular (content script, background, popup, options)
- Each component has clear boundaries
- Parallel development could 3x velocity for large features

**Exploration steps:**
1. Spike: Claude Opus as orchestrator + 3x Haiku agents for isolated tasks
2. Use Beacon (context sync) to keep agents aligned
3. Test on known refactor (e.g., V2 cleanup task)
4. Measure: time savings, merge conflicts, code quality

**Effort:** High (4-6 weeks to productionize)  
**Impact:** Uncertain (depends on merge complexity, could be 2-3x faster or messy)

---

## Agent Spawning from Drawbridge Prompt

**Context:** Daily Briefing methodology = sub-agent does research, main agent synthesizes. Could Drawbridge spawn agents on-demand?

**Idea:**
- User annotates UI issue: "Fix this button alignment"
- Drawbridge spawns Claude Code session with full context (screenshot, DOM, annotations)
- Agent implements fix, reports back to Drawbridge
- User reviews in side panel, approves/rejects

**Why it fits:**
- Drawbridge already captures visual context
- Natural handoff: annotation → agent session → implementation → review
- Keeps user in flow (no context-switch to separate Claude Code window)

**Exploration steps:**
1. Spike: Can Drawbridge invoke Claude Code CLI programmatically?
2. Pass context bundle: screenshot + DOM + annotation text
3. Async workflow: spawn agent, poll for completion, surface result
4. UI: "Fix with AI" button on annotations

**Effort:** Medium-High (3-4 weeks)  
**Impact:** High (removes context-switch, keeps designer in Drawbridge UI)

**Blocker:** Requires Claude Code CLI access or API (currently manual workflow)

---

## Implementation Priority (Rough Estimate)

| Idea | Effort | Impact | Priority |
|------|--------|--------|----------|
| **Automated Visual Testing** | Medium | High | **P1** (fits V2 naturally) |
| **Agent Spawning** | Medium-High | High | **P2** (after Claude Code API access) |
| **Multi-Agent Architecture** | High | Uncertain | **P3** (research phase, revisit post-V2) |

---

## Notes

- **Visual testing** aligns with Drawbridge's core value prop (visual context for AI tools)
- **Agent spawning** requires infrastructure (Claude Code CLI/API) but would be killer UX
- **Multi-agent** is speculative—needs validation before committing resources

All ideas sourced from Feb 25-26 Daily Briefing insights. Revisit quarterly or when new capabilities unlock.
