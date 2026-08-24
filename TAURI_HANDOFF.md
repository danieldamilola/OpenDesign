# Just Design — Tauri Migration Handoff

**For:** New AI agent session  
**From:** Previous session (Electron → Tauri migration, rename to "Just Design")  
**Date:** 2026-08-23  
**Status:** Phase 0 complete, ready for Phase 1

---

## Project Identity

| Attribute | Value |
|---|---|
| **Product name** | Open Design |
| **Package name** | `opendesign-tauri` |
| **Tauri identifier** | `ai.opendesign.tauri` |
| **Updater feed** | `https://releases.open-design.ai/tauri/{{target}}/{{current_version}}` |
| **Ed25519 public key** | `RWQV5NiOkBzh9AKnyd8gzs41p0gRYmBLNT5UYnWFO9FR/vorO/Wr6ih4` |
| **Private key** | `src-tauri/minisign.key` (keep secret!) |

---

## Repository Structure

```
Just-design/                          # Root (Electron monorepo)
├── apps/
│   ├── daemon/                       # Express + SQLite + agent spawning
│   ├── web/                          # Next.js 16 + React 18
│   ├── desktop/                      # Electron shell (to be replaced)
│   ├── packaged/                     # Thin Electron entry (to be replaced)
│   └── landing-page/
├── packages/
│   ├── contracts/                    # Shared TS DTOs
│   ├── sidecar-proto/                # IPC protocol
│   └── platform/                     # Process primitives
├── tools/pack/                       # Electron installer (NSIS, to be replaced)
├── tauri-app/                        # ← TAURI PROTOTYPE (WORK HERE)
│   ├── src/                          # React + TypeScript + Vite
│   └── src-tauri/                    # Rust backend
└── TAURI_MIGRATION_PLAN.md           # 28-week phased plan
```

---

## Current Tauri Prototype State (`tauri-app/`)

### Working ✅
- `pnpm tauri dev` — dev mode with hot reload
- `pnpm tauri build` — production MSI (4.3 MB) + NSIS (2.9 MB)
- Binary: `src-tauri/target/release/opendesign-tauri.exe` (12 MB)
- Updater plugin configured with real Ed25519 keypair
- GitHub Actions CI + Release workflows

### Config Files
| File | Purpose |
|---|---|
| `src-tauri/tauri.conf.json` | Main Tauri config (identifier, updater, bundle) |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src-tauri/build.rs` | `tauri_build::build()` |
| `vite.config.ts` | Frontend build (outDir: `dist`) |
| `package.json` | Scripts: `tauri dev`, `tauri build` |

### Key Dependencies
```toml
# Cargo.toml
tauri = { version = "2", features = [] }
tauri-plugin-updater = "2"
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "sqlite", "chrono"] }
```

```json
// package.json
"@tauri-apps/api": "^2.11.1"
"@tauri-apps/plugin-updater": "^2.10.1"
```

---

## Migration Context: Electron → Tauri

### What We're Replacing

| Electron Layer | Tauri Replacement |
|---|---|
| `Opendesign/apps/desktop` (main, preload, IPC) | `src-tauri/src/main.rs` + commands |
| `Opendesign/apps/packaged` (sidecar spawning) | `tauri-plugin-shell` sidecars |
| `tools/pack` (electron-builder, NSIS) | `tauri-bundler` (MSI/NSIS/DMG/AppImage) |
| Custom updater + launcher payload | `@tauri-apps/plugin-updater` |
| `better-sqlite3`, `node-pty` | `sqlx`/`rusqlite`, `portable-pty` |
| `packages/sidecar-proto` | Tauri commands + events |
| Deep link `od://` | `tauri-plugin-deep-link` |

### Architecture Decision: Hybrid First
- **Daemon + Web stay as-is** (Express + Next.js) — run as sidecar processes via `tauri-plugin-shell`
- **Tauri shell** manages window, native menus, file dialogs, updater, sidecar lifecycle
- **IPC → Commands**: Electron `ipcMain/ipcRenderer` → `#[tauri::command]` + `invoke()`
- **Sidecar protocol → Shell commands**: Spawn `od` daemon + Next.js standalone server

---

## Phase 0 Complete (Foundation)

| Task | Status |
|---|---|
| Tauri v2 + React + TypeScript prototype | ✅ |
| Ed25519 keypair generated | ✅ (`src-tauri/minisign.pub/key`) |
| Updater configured | ✅ (feed: `releases.open-design.ai/tauri/...`) |
| Production build (MSI + NSIS) | ✅ |
| GitHub Actions CI (`tauri-ci.yml`) | ✅ |
| GitHub Actions Release (`tauri-release.yml`) | ✅ (tags `tauri-v*`) |
| Product renamed to "Open Design" | ✅ |

---

## Next: Phase 1 — IPC & Command Layer (Weeks 3-5)

### Goal
Replace Electron IPC with Tauri commands/events. Establish shared command definitions.

### Immediate Tasks

1. **Add core plugins to prototype**
   ```bash
   cd tauri-app
   pnpm add @tauri-apps/plugin-shell @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-opener
   cargo add tauri-plugin-shell tauri-plugin-dialog tauri-plugin-fs tauri-plugin-opener
   ```

2. **Create shared command package** (`packages/tauri-commands/`)
   - Rust command definitions with `ts-rs` or `specta` for TS type generation
   - Commands: `dialog.openFile`, `dialog.saveFile`, `shell.open`, `fs.readDir`, `daemon.start`, `daemon.stop`, `web.start`, `web.stop`

3. **Port first Electron IPC → Tauri command**
   - Example: `dialog.showOpenDialog` → `#[tauri::command] async fn open_file_dialog(...)`
   - Frontend: `invoke('open_file_dialog', { filters: [...] })`

4. **Define permission/capability system**
   - `tauri::capability` per-command allowlists
   - Separate capabilities for: file access, shell spawn, daemon management

### File Layout to Create
```
packages/tauri-commands/
├── Cargo.toml
├── src/
│   ├── commands.rs          # Command definitions + ts-rs derives
│   ├── events.rs            # Event types
│   └── lib.rs
└── tauri-commands.ts        # Generated TS types (or use specta-ts)
```

---

## Phase 2 Preview — Daemon Integration (Weeks 6-9)

### Goal
Spawn/manage daemon + web sidecars from Tauri.

### Key Components
- `src-tauri/src/sidecar/daemon.rs` — `Command::new("od").args(["daemon", "start"]).spawn()`
- `src-tauri/src/sidecar/web.rs` — `Command::new("node").args([".next/standalone/server.js"]).spawn()`
- Health checks, restart logic, log forwarding via Tauri events
- Port allocation (fixed 7456 or dynamic)

---

## Key Files to Know

| File | Purpose |
|---|---|
| `tauri-app/src-tauri/tauri.conf.json` | Tauri config (updater, bundle, identifier) |
| `tauri-app/src-tauri/Cargo.toml` | Rust deps |
| `tauri-app/src-tauri/src/main.rs` | Entry point + updater check |
| `tauri-app/src/App.tsx` | Demo UI with updater check |
| `TAURI_MIGRATION_PLAN.md` | Full 28-week plan |
| `.github/workflows/tauri-release.yml` | Release on `tauri-v*` tag |
| `.github/workflows/tauri-ci.yml` | PR validation |

---

## Verification Commands

```bash
# Dev mode
cd tauri-app && pnpm tauri dev

# Production build
cd tauri-app && pnpm tauri build

# Frontend only
cd tauri-app && pnpm build

# Typecheck
cd tauri-app && pnpm tsc --noEmit

# Rust check
cd tauri-app/src-tauri && cargo check

# Run installer
./src-tauri/target/release/bundle/nsis/Just Design_0.1.0_x64-setup.exe
```

---

## Known Issues / Decisions

| Issue | Decision |
|---|---|
| WebView2 requirement | Windows 10+ only (matches Electron 22+) |
| Updater feed format | Tauri standard (`latest.json` + signed artifacts) — run parallel feeds during transition |
| `node-pty` PTY behavior | Test all 26 agents early; fallback to Node sidecar if needed |
| Next.js SSR | Start with static shell + API sidecar; full SSR later |
| Code signing | Need Windows EV cert + Apple Developer ID; start procurement |
| Daemon SQLite | Keep same file format; port to `sqlx` migrations later |

---

## How to Resume

1. **Read this file** + `TAURI_MIGRATION_PLAN.md`
2. **Verify build**: `cd tauri-app && pnpm tauri build`
3. **Start Phase 1**: Add `tauri-plugin-shell` + `tauri-plugin-dialog`, port `dialog.openFile`
4. **Create `packages/tauri-commands`** for shared Rust↔TS types

---

## Contact / Context

- **Original project**: Open Design (Electron, `nexu-io/open-design`)
- **Renamed to**: Just Design (Tauri-first)
- **Main repo**: `C:\Users\ifeol\Music\Daniel\Just-design\`
- **Tauri prototype**: `C:\Users\ifeol\Music\Daniel\tauri-app\`
- **Migration plan**: `TAURI_MIGRATION_PLAN.md` (28 weeks, 7 phases)

**Goal**: Ship Tauri as default; delete `apps/desktop`, `apps/packaged`, `tools/pack` by Phase 7.