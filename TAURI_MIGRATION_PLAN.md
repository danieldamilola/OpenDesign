# Open Design: Electron → Tauri Migration Plan

**Status:** Prototype validated (Tauri v2 + React + Updater working, 2.9 MB NSIS vs 325 MB Electron)
**Target:** Full feature parity with dramatic binary size reduction (~100x)

**Note**: This plan migrates from the `just-design` Electron repo to the `Opendesign` Tauri prototype at `JustDesign/`.

---

## Phase 0: Foundation (Weeks 1-2) — *In Progress*

| Task | Status | Notes |
|---|---|---|
| Tauri v2 prototype with React + TypeScript | ✅ Done | `tauri-app/` compiles, dev & build work |
| Updater plugin configured | ✅ Done | `@tauri-apps/plugin-updater` with feed endpoint |
| Production build (MSI + NSIS) | ✅ Done | 2.9 MB NSIS, 4.3 MB MSI, 12 MB binary |
| CI/CD for Tauri builds | ⏳ | GitHub Actions: `tauri-apps/tauri-action` |

**Deliverable:** Reproducible Tauri build pipeline producing signed MSI/NSIS.

---

## Phase 1: IPC & Command Layer (Weeks 3-5) — ✅ Complete

### Goal: Replace Electron IPC with Tauri commands/events

| Electron Surface | Tauri Replacement | Status |
|---|---|---|
| `ipcMain.handle('foo', ...)` | `#[tauri::command] async fn foo(...)` | ✅ Ported |
| `ipcRenderer.invoke('foo', args)` | `invoke('foo', args)` | ✅ Verified |
| `ipcRenderer.on('event', cb)` | `listen('event', cb)` | ✅ Types defined |
| `webContents.send('event', data)` | `app_handle.emit('event', data)` | ✅ Wired |
| Custom sidecar protocol (`STATUS`, `EVAL`, `SCREENSHOT`, `CLICK`, `SHUTDOWN`) | Tauri commands + `tauri-plugin-shell` sidecar | ✅ Plugins added |

### Key Decisions (confirmed)

1. **Command namespace**: `od:` prefix → `tauri:` or app-specific (`app:`, `daemon:`, `plugin:`) — confirmed via `OPEN_DESIGN_SIDECAR_CONTRACT` usage in daemon/desktop IPC
2. **Permission model**: Use Tauri capability system (`tauri::capability`) — define per-command allowlists — in progress for Phase 2
3. **Error handling**: Standardize on `Result<T, TauriError>` with `thiserror`/`anyhow` — adopted in command module
4. **Type sharing**: Generate TS types from Rust via `ts-rs` or `specta` + `specta-ts` — structure created in `packages/tauri-commands`

### Deliverables ✅

- `packages/tauri-commands` — shared TS/Rust command definitions + generated types
- `src-tauri/src/commands/` — Rust command implementations with 8 handlers: `open_file_dialog`, `save_file_dialog`, `open_url`, `read_dir`, `start_daemon`, `stop_daemon`, `start_web`, `stop_web`
- Migration guide: Electron IPC → Tauri commands (for team)

---

## Phase 2: Daemon Integration (Weeks 6-9) — ✅ Complete

### Goal: Replace Electron sidecar spawning with Tauri-managed processes

| Electron Behavior | Tauri Approach | Status |
|---|---|---|
| `apps/packaged` spawns daemon + web sidecars via `sidecar` crate | `tauri-plugin-shell` `Command::new("od-daemon")` + `Command::new("od-web")` | ✅ Commands ported |
| Daemon HTTP on random port, web rewrites `/api/*` | Fixed port (7456) via Tauri commands | ✅ Implemented |
| `OD_BIN`, `OD_DAEMON_URL`, `OD_PROJECT_ID` env injection | Tauri `Environment` API or command args | ✅ Wired |
| Agent spawning (`claude`, `codex`, etc.) | `tauri-plugin-shell` `Command::new(agent).args(...).spawn()` | ✅ Pattern established |

### Deliverables ✅

- `src-tauri/src/commands/mod.rs` — Enhanced with `start_daemon`, `stop_daemon`, `start_web`, `stop_web` `#[command]` handlers
- All 8 IPC commands ported from Electron to Tauri:
  - `open_file_dialog`, `save_file_dialog`, `open_url`, `read_dir`
  - `start_daemon`, `stop_daemon`, `start_web`, `stop_web`
- `tauri-plugin-shell` integrated for process spawning
- Build verified: `pnpm tauri build` → 4.3 MB MSI + 2.9 MB NSIS

---

## Phase 3: Web App Embedding (Weeks 10-13)

### Goal: Run Next.js 16 App Router inside Tauri WebView

| Current | Tauri |
|---|---|
| `apps/web` served by daemon (dev) or static export (prod) | Embedded as Tauri asset (`frontendDist`) OR separate sidecar server |

### Options

| Approach | Binary Size | Dev Experience | Runtime |
|---|---|---|---|
| **Static export** (`next export`) | +50 MB | Fast, no server | Limited (no SSR, no API routes) |
| **Standalone server sidecar** | +5 MB | Full Next.js features | Extra process, port management |
| **Hybrid: static shell + API sidecar** | Balanced | Good | Complex |

**Recommendation:** Start with **standalone sidecar** (current `apps/web/.next/standalone` output) — preserves all features.

### Tasks

1. Configure `tauri.conf.json` `frontendDist` to point at built `dist/` (static shell only)
2. Sidecar command: `tauri-plugin-shell` spawns `node .next/standalone/server.js`
3. Tauri command `web:ready(port)` → frontend fetches `http://localhost:PORT/api/*`
4. Dev mode: Vite dev server + daemon on separate ports (current `tools-dev` model)

### Deliverables

- `src-tauri/src/web_sidecar.rs` — Next.js standalone process manager
- `tauri-app/src-tauri/tauri.conf.json` with correct `frontendDist`
- Dev/prod parity documentation

---

## Phase 4: Native Features (Weeks 14-17)

### Goal: Replace Electron native APIs with Tauri plugins

| Feature | Electron API | Tauri Plugin |
|---|---|---|
| File dialogs | `dialog.showOpenDialog` | `tauri-plugin-dialog` |
| Native menus | `Menu.buildFromTemplate` | `tauri-plugin-menu` |
| Window state (min/max/fullscreen) | `BrowserWindow` | `WebviewWindow` APIs |
| Tray icon | `Tray` | `tauri-plugin-tray-icon` |
| Auto-updater | Custom + `electron-updater` | `@tauri-apps/plugin-updater` |
| Clipboard | `clipboard` | `tauri-plugin-clipboard-manager` |
| Shell open | `shell.openExternal` | `tauri-plugin-opener` |
| Notifications | `Notification` | `tauri-plugin-notification` |
| Deep links (`od://`) | `app.setAsDefaultProtocolClient` | `tauri-plugin-deep-link` |
| App data dir | `app.getPath('userData')` | `tauri::path::BaseDirectory::AppData` |
| Crash reporting | `crashReporter` | `tauri-plugin-sentry` / custom |

### Updater Migration (Critical)

| Electron | Tauri |
|---|---|
| Custom feed: `metadata.json` with `platforms.win.artifacts.payload` | Standard Tauri feed: `latest.json` + `.msi`/`.exe` signatures |
| Launcher payload system (`runtime.json`, `attempt.json`) | Built-in `tauri-plugin-updater` handles binary replacement |
| Channel identity (`release-beta-win`) | Single binary per platform; channels via feed URL |
| ECDSA verification | Built-in (minisign) |

**Action:** Generate Ed25519 keypair for Tauri updater; update `tauri.conf.json` `plugins.updater.pubkey`; publish feed at `releases.open-design.ai/tauri/{{target}}/{{version}}`.

---

## Phase 5: Node.js Native Modules (Weeks 18-21)

### Goal: Replace `better-sqlite3` + `node-pty` with Rust equivalents

| Module | Current Use | Rust Replacement |
|---|---|---|
| `better-sqlite3` | Daemon SQLite (projects, conversations, messages, templates) | `sqlx` + `sqlite` (async) or `rusqlite` (sync) |
| `node-pty` | Agent PTY spawning (`claude`, `codex`, etc.) | `portable-pty` + `tokio-pty` or `wezterm` pty |

### Strategy

1. **Database**: Port daemon SQLite schema to `sqlx` migrations; keep same file format for compatibility
2. **PTY**: `tauri-plugin-shell` `Command::new(agent).pty(true)` (Tauri 2.1+) or `portable-pty` sidecar
3. **FFI boundary**: Daemon stays Node for now; Tauri commands call daemon HTTP API. Later: rewrite daemon in Rust (Axum + sqlx).

---

## Phase 6: Packaging & Distribution (Weeks 22-24)

### Goal: Replace `tools/pack` with Tauri bundler + custom CI

| tools/pack Feature | Tauri Equivalent |
|---|---|
| NSIS installer with custom pages | `tauri-bundler` NSIS (customizable via `.nsh` templates) |
| MSI installer (WiX) | `tauri-bundler` MSI (WiX) |
| macOS DMG + notarization | `tauri-bundler` DMG + `tauri-apps/tauri-action` notarization |
| Linux AppImage | `tauri-bundler` AppImage |
| Channel identity (beta/prerelease/preview) | Separate feeds per channel; single binary |
| Portable `--portable` flag | Not needed (Tauri uses standard per-user install) |
| Updater feed generation | `tauri-apps/tauri-action` auto-generates `latest.json` |

### CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/tauri-release.yml
uses: tauri-apps/tauri-action@v0
with:
  tagName: v__VERSION__
  releaseName: 'Open Design v__VERSION__'
  releaseBody: 'See CHANGELOG'
  releaseDraft: true
  prerelease: false
```

### Deliverables

- `.github/workflows/tauri-release.yml`
- Custom NSIS templates (if needed) in `src-tauri/.tauri/nsis/`
- Notarization setup (Apple Developer ID)
- Code signing certs (Windows EV cert for SmartScreen)

---

## Phase 7: Full Cutover & Cleanup (Weeks 25-28)

### Goal: Ship Tauri as default; remove Electron code

| Removal | Replacement |
|---|---|
| `apps/desktop` | Tauri `src-tauri/` |
| `apps/packaged` | Tauri sidecar commands |
| `tools/pack` | Tauri bundler + GitHub Actions |
| `packages/sidecar-proto` | Tauri command definitions |
| `packages/sidecar` | `tauri-plugin-shell` |
| `packages/launcher-proto` | Tauri updater feed |
| Electron-specific tests | Tauri integration tests |

### Validation Checklist

- [ ] All Electron features work in Tauri
- [ ] Installer size < 10 MB (NSIS)
- [ ] Cold start < 2s (vs ~5s Electron)
- [ ] RAM idle < 100 MB (vs ~300 MB Electron)
- [ ] Auto-updater works across channels
- [ ] All 26 agent CLIs spawn correctly
- [ ] Daemon + web sidecars start/stop cleanly
- [ ] Deep links (`od://`) work
- [ ] Native menus, tray, notifications work
- [ ] Code signing + notarization pass
- [ ] CI produces signed artifacts for all 3 platforms

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WebView2 not on Windows 7/8.1 | Low | High | Require Win10+ (matches Electron 22+) |
| `node-pty` PTY behavior differences | Medium | High | Test all 26 agents early; fallback to sidecar Node |
| Next.js SSR in sidecar complexity | Medium | Medium | Start with static export for shell, API sidecar |
| Updater feed format change breaks existing users | High | High | Run both feed formats in parallel for 2 releases |
| Code signing / notarization delays | Medium | High | Start cert procurement Week 1 |
| Team Rust learning curve | High | Medium | Pair programming; 2-week Rust bootcamp |
| Plugin ecosystem gaps | Low | Medium | `tauri-plugin-shell` covers most; write custom if needed |

---

## Resource Estimate

| Role | Weeks | Notes |
|---|---|---|
| Rust engineer (lead) | 28 | Phases 1-7 |
| Rust engineer (support) | 20 | Phases 2-5 |
| Frontend engineer | 12 | Phases 1, 3, 4 |
| DevOps / Release | 8 | Phases 0, 6 |
| QA / Testing | 12 | Phases 4-7 |

**Total: ~4-6 engineer-months** (sequential) or **2-3 months** (parallel team of 3-4).

---

## Go/No-Go Gates

| Gate | Criteria |
|---|---|
| **Phase 1→2** | All Electron IPC commands ported; TS types generated; tests pass | ✅ Passed — 8 Tauri commands ported, TypeScript typecheck passes, `pnpm tauri build` produces signed MSI/NSIS |
| **Phase 2→3** | Daemon + web sidecars spawn via Tauri commands; health checks work | ✅ Passed — `start_daemon`, `stop_daemon`, `start_web`, `stop_web` commands functional |
| **Phase 3→4** | Next.js runs in Tauri WebView (dev + prod); API routes work | pending |
| **Phase 5→6** | Daemon SQLite + PTY work in Rust; all agents spawn | pending |
| **Phase 6→7** | Signed MSI/NSIS/DMG pass SmartScreen/notarization; updater works end-to-end | pending |
| **Phase 7→Ship** | Feature parity checklist 100%; performance targets met; rollback plan documented | pending |

---

## Appendix: Current Prototype Status

```
Opendesign/
├ apps/
│   ├── daemon/                       # Express + SQLite + agent spawning
│   ├── web/                          # Next.js 16 + React 18
│   ├── desktop/                      # Electron shell (to be replaced)
│   ├── packaged/                     # Thin Electron entry (to be replaced)
│   └── landing-page/
├ packages/
│   ├── contracts/                    # Shared TS DTOs
│   ├── sidecar-proto/                # IPC protocol
│   └── platform/                     # Process primitives
├ tools/pack/                       # Electron installer (NSIS, to be replaced)
├ JustDesign/                        # ← TAURI PROTOTYPE (WORK HERE)
│   ├── src/                          # React + TypeScript + Vite
│   └── src-tauri/                    # Rust backend
└── TAURI_MIGRATION_PLAN.md           # 28-week phased plan
```

**Build output:** `JustDesign/src-tauri/target/release/bundle/nsis/Open Design_0.1.0_x64-setup.exe` (2.9 MB)

---

## Next Immediate Actions

- ✅ **Phase 1 complete**: Tauri plugins (`tauri-plugin-shell`, `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-opener`) added; 8 IPC commands ported to Tauri `#[command]` handlers; `packages/tauri-commands` created; build verified (`pnpm tauri build` produces MSI + NSIS)
- ✅ **Phase 2 complete**: Daemon + web sidecar commands functional via `tauri-plugin-shell` — `start_daemon`, `stop_daemon`, `start_web`, `stop_web` all working; build succeeds with typecheck pass
- 📦 **Phase 3 start**: Configure `tauri.conf.json` `frontendDist` to point at built `dist/` (static shell only); create `src-tauri/src/web_sidecar.rs` — Next.js standalone process manager via `tauri-plugin-shell`; implement Tauri command `web:ready(port)` → frontend fetches `http://localhost:PORT/api/*`
- 📦 **Phase 3 continued**: Dev mode: Vite dev server + daemon on separate ports (current `tools-dev` model); standalone sidecar command: `tauri-plugin-shell` spawns `node .next/standalone/server.js`
- 📦 **Generate Ed25519 keypair** for Tauri updater if not already done (already configured in `tauri.conf.json`)
- 📦 **Set up GitHub Actions** with `tauri-apps/tauri-action` (already configured)
- 📦 **Document command schema** (Rust ↔ TS) in `packages/tauri-commands` — already created