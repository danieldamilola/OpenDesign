# Just Design — Lightweight Strip Plan

> **Goal:** Turn Open Design (heavy, 115 design systems, 140 skills, 200+ templates, 27 runtimes, desktop/packaged/landing, plugins marketplace) into **Just Design**: a lightweight, fast, "just type and see a page" product. Inspired by T3 Chat lightness, Claude Code agency, and OpenCode client/server split.

## 1. Foundations (research synthesis)

**Current product (heavy):**
- Runtime shape: `tools-dev` → daemon (Express+SQLite) + web (Next.js 16) + desktop (Electron) + packaged. Port-based sidecar IPC, namespace-scoped `RUNTIME_DATA_DIR`.
- Topology: browser → web → daemon → runtime registry (27 defs) → spawned CLI → SSE stream → file workspace → srcDoc preview.
- Content: `skills/` (140), `design-templates/` (~200), `design-systems/` (115), `plugins/_official/` (277 + 183 examples), `craft/`, `prompt-templates/`, `mocks/`, `clipper/`, `figma-plugin/`.

**Harness references:**
- **Claude Code:** heavy terminal OS (~512k LOC), single-process, 7-layer permissions, compaction, Ink+Yoga. Lesson: *deep* `Task` seam (subagents get own context window) — keep for Just Design's `ask` but strip permissions/compaction.
- **T3 Chat:** lightweight chat proxy (Next.js + Prisma/Postgres + OpenRouter), Dexie local-first, no tool loop. Lesson: *local-first + serverless* makes it instant. Clone with `bun install`.
- **OpenCode (SST):** client/server (Bun/Hono + SQLite + Drizzle), typed event bus, TUI-first but remote-driveable via `opencode serve`. Lesson: server is first-class, TUI is one client. Good split for daemon/web but overkill for Just Design's single web surface.

**Lightweight principle:** *Subtract before you add* (Larsson). Deletion test: if removing the module makes complexity vanish from callers, it was pass-through.

## 2. What to cut (subtract)

| Tier | Keep | Cut | Why |
|---|---|---|---|
| Apps | `apps/web`, `apps/daemon` (minimal) | `apps/desktop`, `apps/packaged`, `apps/landing-page`, `clipper/`, `figma-plugin/` | Desktop/packaged add Electron + sidecar IPC + updater harness — not core to "just design". Landing-page is deploy surface, not product. |
| Daemon routes | `/api/projects`, `/api/chat` (SSE), `/api/files`, `/api/skills` (minimal), `/api/design-systems` (3), `/api/agents` | `/api/automation`, `/api/plugins/*`, `/api/import/claude-design`, `/api/artifacts/*` (lint/critique), `/api/proxy/*` heavy, `/api/live-artifact/*`, MCP stdio | Keep filesystem execution profile only; drop commerce/marketplace layer. |
| Runtimes | 1 native (`dsh` or `claude`) | 26 other defs → behind `OD_ENABLE_ALL_RUNTIMES=1` flag | 27 definitions is choice overload; one deep adapter proves seam. |
| Content | 3 skills (`web-prototype`, `deck`, `mobile-app`), 3 design systems (`default`, `linear-app`, `warm-editorial`), 1 craft rule | 137 skills, 112 design systems, 197 templates, 460 plugins/examples, `prompt-templates/` (93) | Deletion test: template count is pass-through; 3 deep templates cover 80% briefs. |
| Packages | `contracts`, `sidecar-proto` (minimal), `platform` | `agui-adapter`, `dsh-runtime` heavy, `download` heavy | Keep contract DTOs; strip adapter proliferation. |
| Tools | `tools/dev` only | `tools/pack`, `tools/serve`, `tools/release` (release harness) | Packaged builds are heavy; defer to later. |

**Estimated cut:** ~62% of repo surface (from 62 top-level entries to ~19).

## 3. Deep modules for Just Design (codebase-design vocabulary)

**Externally deep, internally composable:**

- **ProjectModule** — `interface: { create, open, listFiles, readFile }` hides SQLite + `PROJECTS_DIR` + `baseDir` validation. One seam at `apps/daemon/src/projects.ts`. Internal seams: `SqliteAdapter`, `FsAdapter` (not in interface).
- **PromptComposer** — `interface: compose(project, designSystem, skill, brief) → prompt` hides 115 DESIGN.md reads + skill merging. Replace 5 current composers with one.
- **RuntimeModule** — `interface: spawn(def, cwd, prompt) → AsyncIterable<Event>` hides 27 defs + stream parsers. Keep `RuntimeAgentDef.promptInputFormat` seam; one adapter per runtime.
- **PreviewModule** — `interface: render(file) → srcDoc|url` hides iframe bridge logic. Current `file-viewer-render-mode.ts` is shallow; deepen by hiding tweaks/palette bridges inside.

**Depth test:** Deleting `PromptComposer` would force every route to re-derive DESIGN.md + skill logic → earns its keep.

**Seam placement (Feathers):** Put seam where behavior varies — at `RuntimeAgentDef` (different CLIs), not at `spawn()` call site. One adapter (`dsh`) means hypothetical seam; second (`claude`) makes it real — add second only when needed.

## 4. UI Directions (exhausted)

Prototype at `prototype/just-design/prototype.html` (`?v=canvas|terminal|tray`) — throwaway, double-click to open, floating bar switches variants, `state` panel surfaces full prompt/template/preview.

- **A. Canvas (Linear ref):** Centered prompt card, no chip rail, whitespace, preview as centered artifact card. Feels instant, like Linear's command bar.
- **B. Terminal (Claude Code ref):** Dark split — left stream (prompt + log), right preview. Monospace, `od generate` verb. Feels hacker, like opencode TUI.
- **C. Tray (T3/Raycast ref):** Compact `⌘K` tray, top input, 4-up template grid, preview below. Feels lightweight, like T3 Chat.

**Comparison:** Canvas wins for "just design" (lowest chrome), Terminal wins for power users, Tray wins for template-first. Pick Canvas as default, keep Terminal behind `OD_TERMINAL_UI=1`.

## 5. Restructuring steps (subtract-before-add)

1. Branch `just-design-strip` off main (throwaway branch per prototype skill — capture answer there).
2. `git rm` desktop/packaged/landing/clipper/figma-plugin + 137 skills + 112 design-systems + plugins/community.
3. Shrink `apps/daemon/src/routes/` to 3 files; stub deleted routes with 410.
4. Trim `apps/web/src/components/HomeHero.tsx` — remove chip rail when `OD_JUST_DESIGN=1`.
5. Verify: `pnpm guard` + `pnpm typecheck` + `pnpm --filter @open-design/web build` must stay green after each step.

## 6. What stays on main

This plan is *not* merged; prototype stays on throwaway branch. Main keeps full product. Just Design is a product *mode*, not a fork — gate heavy features behind `OD_JUST_DESIGN` flag so one repo serves both.
