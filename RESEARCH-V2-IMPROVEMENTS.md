# RESEARCH: Drawbridge V2 Improvements for Vibe Coders

This document outlines research and strategic recommendations for Drawbridge V2, focusing on the "full-stack creative" and "vibe coder" demographic—designers who ship code with AI assistance.

---

## 1. Competitive Landscape

### Browser-based Annotation/Feedback Tools
| Competitor | What They Do Well | What They Miss (for Vibe Coders) | Pricing | Drawbridge Differentiation |
| :--- | :--- | :--- | :--- | :--- |
| **Marker.io / BugHerd** | Polished guest portals; deep Jira/Linear/Trello integrations; session replays. | Heavy manual triage; focused on QA teams/developers, not designers-who-code. | ~$40-100/mo | **Direct AI Integration:** Drawbridge connects intent directly to the *code-generating agent* (Cursor/Claude), skipping the ticket backlog. |
| **Userback** | Feedback collection & feature request management for SaaS product teams. | No direct path to code implementation; focused on UAT/QA. | ~$79-289/mo | **Workflow Focus:** Drawbridge is a tool for *creation*, not just bug tracking. It's a "visual terminal." |

### AI-Native Design-to-Code Tools
| Competitor | What They Do Well | What They Miss | Drawbridge Differentiation |
| :--- | :--- | :--- | :--- |
| **v0.dev (Vercel)** | Screenshot-to-code; component-level generation; Next.js/Tailwind focus. | Operates in a "sandbox" separate from your local project; context loss on complex apps. | **Local Project Context:** Drawbridge lives on *your* site, talking to *your* local files via Cursor/Claude Code. |
| **Builder.io (Visual Copilot)** | Figma-to-code with design system intelligence and token mapping. | High friction for quick visual tweaks; requires rigorous Figma setup. | **Low Friction:** Drawbridge allows "vibe-based" fixes via browser comments without returning to Figma. |

### Desktop Design IDEs
| Competitor | What They Do Well | What They Miss | Drawbridge Differentiation |
| :--- | :--- | :--- | :--- |
| **Aule (aule.codes)** | macOS desktop app — opens repo, runs app locally, click elements + describe changes in natural language. Connects to Claude Code/OpenAI Codex/OpenCode. Visual Design Mode with live property editing. Git-based versioning under the hood. | macOS-only desktop app (high friction install); localhost-only (can't annotate staging/prod); replaces your dev environment instead of augmenting it; no browser integration. | **Zero-friction browser-native:** Drawbridge lives in Chrome where you already work. Works on any URL (local, staging, prod). Augments existing AI tools (Claude, Cursor) rather than wrapping them. Lower barrier = broader reach. |

*Note: Aule founder was a former manager of Terrence's and an early Drawbridge user. Validates the problem space. (Discovered 2026-02-14)*

### Annotation-to-Agent Tools
| Competitor | What They Do Well | What They Miss | Drawbridge Differentiation |
| :--- | :--- | :--- | :--- |
| **Agentation (agentation.dev)** | Desktop app — click UI elements, annotate, get structured markdown (CSS selectors, React component names, computed styles). MCP integration lets agents read annotations directly (no copy-paste). Two-way: agents respond to annotations, ask clarifications, mark resolved. Free for individuals. | Desktop-only (not browser-native); requires separate install; no Chrome Web Store presence or community; MCP requires setup; localhost-focused. | **Chrome-native, zero install:** Already in Web Store with 596+ stars. Side Panel integration (V2) keeps everything in-browser. Community momentum + brand recognition in vibe coder space. Claude Skills integration (roadmap) will match MCP capabilities natively. |

*Note: Most direct competitor to Drawbridge — same target user, same workflow, same AI tools. MCP two-way conversation feature is worth watching. (Discovered 2026-02-14)*

---

## 2. Vibe Coder Needs & Pain Points

Based on research from Twitter/X, Reddit (r/webdev, r/Figma), and GitHub issues for AI tools:

### Top Struggles:
1.  **"Context Amnesia":** AI often forgets project history or ignores local CSS variables/Tailwind configs when suggesting visual fixes.
2.  **Visual Translation Gap:** Designers struggle to describe *spatial* relationships (e.g., "move this a bit to the left but keep it centered relative to X") in text that AI understands.
3.  **The "Hallucination Loop":** AI suggests a fix (e.g., a specific Tailwind class), the designer applies it, but it fails because of a conflicting global style or z-index issue.
4.  **Responsive Frustration:** "It looks great on desktop, but the AI broke the mobile nav when it fixed the footer."
5.  **Manual "Token Extraction":** Copying hex codes, spacing values, and font sizes from DevTools into the prompt is slow and error-prone.

---

## 3. Feature Ideas for Drawbridge V2+

Ranked by **Impact on Vibe Coder Workflow**, **Feasibility**, and **Differentiation**.

### High Impact / High Feasibility
1.  **Computed Style "Snap-to-Prompt":** Automatically attach the computed CSS (color, spacing, font) of the selected element to the task.
2.  **Tailwind Class Awareness:** If the site uses Tailwind, extract the exact classes from the selected element and include them in the prompt for "Style Continuity."
3.  **Side Panel Multi-Step Queue:** Leverage the Side Panel API to keep a "Running Task List." Batch 5 UI fixes and send them to the AI in one go to save context/token cost.
4.  **Design Token "Dictation":** If a `.moat` file or CSS variables are detected, provide a dropdown to select local tokens (e.g., `primary-600`) instead of typing raw hex codes.

### High Impact / Medium Feasibility
5.  **Visual "Before/After" Diffing:** Use the browser to take a "Baseline" screenshot, then a "Current" screenshot after an AI change, showing the designer exactly what moved.
6.  **Accessibility "Vibe Check":** Automatically append ARIA roles and contrast ratios to the prompt to ensure AI-generated UI is accessible by default.
7.  **Figma URL Linkage:** Allow designers to paste a Figma frame URL on an annotation; Drawbridge fetches the image/metadata and sends it to the vision model for "Pixel Perfect" matching.
8.  **Responsive "Breakpoint Batching":** Capture screenshots at 375px, 768px, and 1440px simultaneously to show the AI how the UI breaks across devices.

### Strategic Differentiators
9.  **AI Vision-Assisted Prompting:** Use a vision model (GPT-4o/Claude 3.5 Sonnet) *within the extension* to help the designer "describe" the visual bug better before it hits the code.
10. **Component Library Detection:** Auto-detect if a site uses Shadcn/ui, MUI, or Radix and inform the AI: "This is a Shadcn Button; keep its structure."

---

## 4. Community & Growth Signals

### Current Sentiment (GitHub/YouTube)
- **High Praise:** Users love the "Figma Comments for Browser" metaphor. It's intuitive for designers.
- **Pain Points:** Frequent "reconnect folder" issues; difficulty selecting nested elements; side panel opening unexpectedly in V1.
- **V2 Hope:** Transition to the Side Panel API is seen as a way to make the tool more "persistent" and less intrusive to the main browsing experience.

### Adjacent Communities to Target
- **The "Cursor Tribe":** Designers using Cursor (high overlap with Drawbridge's core value).
- **Framer/Webflow Power Users:** High-intent designers who are "graduating" to custom code but still want a visual interface.
- **"Build in Public" Twitter:** The full-stack creative brand resonates with the indie hacker/Solopreneur community.

### Most Requested Features
- **Better Element Selection:** High-precision element picking (similar to Chrome DevTools).
- **History/Archives:** "Show me the last 5 tasks I sent to Claude."
- **Persistent Connection:** Fix the "re-select folder" friction.

---
*Research compiled for Drawbridge V2 development.*
