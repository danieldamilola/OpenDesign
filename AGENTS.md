# AGENTS.md

## Writing

Writing follows the unslop skill in `~/.config/opencode/skills/unslop/`. Read it before writing any reply, commit message, PR description, or doc change. No em dashes, no parentheses, no filler, no AI vocabulary. Say what the code does, not how it feels.

## The project

Just Design is a local-first AI design platform (renamed from Open Design). It runs on Node 24 + pnpm 10.33.2. The stack:

- **Daemon**: Express + SQLite (`apps/daemon`) — spawns agents, serves APIs, manages data
- **Web**: Next.js 16 App Router + React 18 (`apps/web`) — chat, preview, workspace
- **Desktop (Electron)**: `apps/desktop` — shell, IPC, updater, installer via `tools/pack` (being replaced)
- **Packaged**: `apps/packaged` — thin Electron entry, delegates to desktop (being replaced)
- **Tauri prototype**: `tauri-app/` — Rust + WebView2 (active migration target, Phase 0 done)
- **Shared**: `packages/contracts` (API DTOs), `packages/sidecar-proto` (IPC), `packages/platform` (process primitives)

I'm Daniel. I work on this project.

## Project Context — Read This First

Before making changes to the Tauri prototype (`tauri-app/`), **read and understand the Electron codebase at `C:\Users\ifeol\Music\Daniel\Just-design\`**. The Tauri version is a migration of the Electron app. Key areas to understand:

| Electron Location | Purpose | Tauri Migration Target |
|---|---|---|
| `apps/daemon/` | Express + SQLite, agent spawning, APIs | Sidecar process via `tauri-plugin-shell` |
| `apps/web/` | Next.js 16 + React 18 frontend | Embedded asset or sidecar server |
| `apps/desktop/` | Electron shell, IPC, windows | `src-tauri/src/main.rs` + Tauri commands |
| `apps/packaged/` | Electron entry, sidecar orchestration | Tauri sidecar commands |
| `tools/pack/` | electron-builder, NSIS installer | `tauri-bundler` (MSI/NSIS/DMG) |
| `packages/sidecar-proto/` | Custom IPC protocol | Tauri commands + events |
| `packages/launcher-proto/` | Launcher payload system | Tauri updater feed |

**Read these files for architecture context:**
- `apps/daemon/src/server.ts` — API routes, daemon startup
- `apps/desktop/src/main/index.ts` — Electron main process, IPC wiring
- `apps/desktop/src/main/updater.ts` — Custom updater logic
- `tools/pack/src/win/builder.ts` — NSIS installer build
- `packages/contracts/` — Shared TypeScript DTOs (reused in Tauri)
- `TAURI_MIGRATION_PLAN.md` — 28-week migration plan
- `TAURI_HANDOFF.md` — This migration's context

## Build and test

- Install: `pnpm install` (run after any manifest/workspace change)
- Typecheck: `pnpm typecheck` (workspace + scripts)
- Guard: `pnpm guard` (repo-wide checks: boundaries, imports, style policy)
- Web: `pnpm --filter @open-design/web build` / `pnpm --filter @open-design/web test`
- Daemon: `pnpm --filter @open-design/daemon build` / `pnpm --filter @open-design/daemon test`
- Desktop: `pnpm --filter @open-design/desktop build`
- Tools: `pnpm tools-dev` (lifecycle), `pnpm tools-pack` (packaging)
- Tauri: `cd tauri-app && pnpm tauri dev` / `pnpm tauri build`
- Lint: `pnpm lint:craft`, `pnpm i18n:check`

Run `pnpm guard && pnpm typecheck` before finishing any change. A change that breaks either is not done.

## Conventions

- **TypeScript first** — new entrypoints, modules, tests, configs in TS. Residual JS only in generated output, vendored deps, or `scripts/guard.ts` allowlist.
- **Tests live in `tests/`** sibling to `src/` — never under `src/`. Playwright UI tests in `e2e/ui/`.
- **No cross-app private imports** — `apps/web` does not import `apps/daemon/src/**`. Integration via HTTP, `packages/contracts`, or app-local providers.
- **Contracts in `packages/contracts`** — pure TS, no Next.js, Express, Node FS, browser APIs, SQLite, daemon internals, sidecar protocol.
- **Sidecar awareness only in `apps/<app>/sidecar`** — business logic does not import sidecar packages.
- **CSS Modules for new components** — global styles only for deliberate shared contracts (tokens, primitives, theme hooks). `apps/web/src/index.css` is import-only.
- **i18n keys** — add to `apps/web/src/i18n/types.ts` first; all 19 locale files must have the key.
- **Daemon data paths** — derive from `RUNTIME_DATA_DIR` (resolved from `OD_DATA_DIR` at startup). Never hardcode or recompute from env.
- **Port flags** — `--daemon-port` and `--web-port` only. Internal env: `OD_PORT`, `OD_WEB_PORT`. No `NEXT_PORT`.
- **Process stamps** — exactly five fields: `app`, `mode`, `namespace`, `ipc`, `source`. Use `createProcessStampArgs` with `OPEN_DESIGN_SIDECAR_CONTRACT`.

## Verifying work

Prove a change works against the real artifact, not by reading the code.

- **TypeScript changes**: `pnpm typecheck` passes
- **Runtime behavior**: run the feature (`pnpm tools-dev run web`, open URL, exercise the flow)
- **Electron changes**: `pnpm tools-pack win build --to nsis --portable --json` produces installer; `pnpm tools-pack win install/start/logs/stop/uninstall/cleanup`
- **Tauri changes**: `cd tauri-app && pnpm tauri build` produces MSI/NSIS; run installer
- **Updater changes**: run high-confidence acceptance (tools/pack/AGENTS.md:100-154)
- **CSS changes**: verify in both light and dark mode (toggle `data-theme`)

A claim that "it compiles" is not proof.

## Committing and Pushing

Stop committing and pushing code autonomously. Wait for the user's explicit confirmation that a fix or feature works before you commit and push any changes.

## Release

- **Electron**: `tools/pack` owns build/install/start/stop/logs/uninstall/cleanup for mac/win/linux. Channel identity: stable=`Open Design`, beta=`Open Design Beta` (namespace `release-beta-win`), prerelease=`Open Design Prerelease`, preview=`Open Design Preview`. Use `--portable` for public artifacts.
- **Tauri**: GitHub Actions `tauri-release.yml` on tag `tauri-v*`. Produces MSI/NSIS/DMG/AppImage via `tauri-apps/tauri-action`. Updater feed at `releases.open-design.ai/tauri/{{target}}/{{current_version}}` signed with Ed25519 (minisign).
- **Version** in `package.json` (workspace root) and `tauri-app/src-tauri/Cargo.toml` / `tauri.conf.json` must match.
- **CHANGELOG** at `docs/CHANGELOG/v<version>/<locale>.md` — update immediately after every feature/fix.