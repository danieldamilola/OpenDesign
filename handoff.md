# Handoff: Tauri Prototype + Electron Installer Build

## Summary
Created a **Tauri v2 prototype** at `C:\Users\ifeol\Music\Daniel\tauri-app` as an Electron alternative, and successfully built the **Open Design Windows NSIS installer** (`release-beta-win` channel).

---

## What Was Done

### 1. Fixed Dark Mode Message Bubbles (Open Design Web)
- **Files changed**: `apps/web/src/styles/chat.css:527`, `apps/web/src/styles/viewer/routines.css:1707`
- **Fix**: Hardcoded `#ededed` → `var(--bg-subtle)` so user message bubbles follow theme

### 2. Removed Hardcoded White/Light Backgrounds (Sweep)
- **Scope**: ~46 CSS locations across global styles + CSS Modules
- **Replacements**: `#fff`/`white`/`#ededed` → `var(--bg)`, `var(--bg-panel)`, `var(--bg-subtle)`, `var(--accent-contrast)`
- **Verification**: `pnpm guard` passes ("Style policy check passed: hardcoded UI colors stay token-first")

### 3. Built Windows NSIS Installer (Electron)
- **Output**: `.tmp/tools-pack/out/win/namespaces/release-beta-win/builder/Open Design-release-beta-win-setup.exe` (~325 MB)
- **Channel**: `release-beta-win` (app name: `Open Design Beta`, uninstall key: `Open Design-release-beta-win`)
- **Fixes required**:
  - Node 26 → Node 24 (repo enforces `~24`; still on 26.7.0 — warnings only)
  - NSIS not in PATH → copied to `%USERPROFILE%\NSIS`
  - EPERM on Persian language alias → patched `tools/pack/src/win/nsis.ts` to catch EPERM; pre-created `icon.ico` in user NSIS folder

### 4. Tauri v2 Prototype (`tauri-app/`)
```
tauri-app/
├── src/                    # React 19 + TypeScript + Vite
│   ├── App.tsx             # Updater demo UI
│   ├── main.tsx
│   └── index.css
├── src-tauri/
│   ├── Cargo.toml          # Rust deps: tauri, tauri-plugin-updater, sqlx, tokio
│   ├── build.rs            # tauri_build::build()
│   ├── tauri.conf.json     # Config: frontendDist="../dist", devUrl="http://localhost:1420"
│   ├── icons/icon.ico      # Copied from OneDrive.ico
│   └── src/main.rs         # Entry: updater check on startup
├── package.json
├── vite.config.ts
└── tsconfig.json
```
- **Status**: `pnpm tauri dev` compiles and runs (WebView2 window opens)
- **Binary size**: ~3-5 MB vs Electron's ~150 MB
- **Updater**: Configured with `@tauri-apps/plugin-updater` (feed: `releases.open-design.ai`)

---

## Current State

| Task | Status |
|---|---|
| Dark mode message bubbles | ✅ Fixed |
| Hardcoded color sweep | ✅ Done + guard passes |
| Electron NSIS installer (beta) | ✅ Built at `.tmp/tools-pack/out/win/namespaces/release-beta-win/builder/` |
| Tauri prototype dev | ✅ Running (`pnpm tauri dev`) |
| Tauri production build | ⏳ Not tested (`pnpm tauri build`) |

---

## Next Steps (Pick One)

### A. Test Tauri Production Build
```powershell
cd C:\Users\ifeol\Music\Daniel\tauri-app
pnpm tauri build   # Produces MSI/NSIS in src-tauri/target/release/bundle/
```
- Verify binary size, startup time, memory
- Test updater with real feed (needs valid public key)

### B. Migrate One Electron Flow to Tauri
Pick a self-contained feature (Settings window? Sidecar spawn?) and port:
- Rust command: `#[tauri::command] async fn my_command(...) -> Result<...>`
- Frontend: `invoke("my_command", args)`
- Sidecar: `std::process::Command` + `tauri-plugin-shell` or separate binary

### C. Run Electron Installer Acceptance (High-Confidence)
Per `tools/pack/AGENTS.md:100-154`:
```powershell
# Install beta.1
pnpm tools-pack win install --dir .tmp\tools-pack --namespace release-beta-win --json
# Launch, verify auto-update from real beta feed
pnpm tools-pack win start --namespace release-beta-win --json
# Registry check after update
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Open Design*' }
# Cleanup
pnpm tools-pack win uninstall --dir .tmp\tools-pack --namespace release-beta-win --remove-product-user-data --remove-data --remove-logs --remove-sidecars --json
```

### D. Fix Node Version (Prerequisite for Supported Builds)
```powershell
winget install OpenJS.NodeJS.LTS
# Reopen shell, verify: node --version  # v24.x
pnpm install
```

---

## Key Files to Know

| File | Purpose |
|---|---|
| `tools/pack/src/win/nsis.ts:159` | Patched `ensureNsisPersianLanguageAlias` to ignore EPERM |
| `apps/web/src/styles/tokens.css` | Theme token definitions (source of truth) |
| `tauri-app/src-tauri/tauri.conf.json` | Tauri config (devUrl, frontendDist) |
| `tauri-app/src-tauri/src/main.rs` | Rust entry + updater check |
| `tools/pack/AGENTS.md:73-75` | Channel identity rules (beta = release-beta-win) |

---

## Known Issues
- Node 26.7.0 (repo wants ~24) — `pnpm install` recompiles `better-sqlite3` on Node 24
- Tauri ICO handling is fragile; used system `OneDrive.ico` as workaround
- Tauri `generate_context!` requires `build.rs` + valid `frontendDist` at compile time
- Electron `node-pty` / `better-sqlite3` have no direct Rust equivalents (need `tokio-pty` / `sqlx`)

---

## Context for New Session
> "I have a Tauri v2 prototype running at `C:\Users\ifeol\Music\Daniel\tauri-app` and a working Electron NSIS installer for the `release-beta-win` channel. Want to continue with [A/B/C/D from above]."