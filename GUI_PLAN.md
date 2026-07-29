# IDEOCODE Desktop GUI Plan — Market Leader 2027

## Executive Summary

Build a cross-platform native desktop app (Windows, macOS, Linux) using **Tauri 2.x + React/TypeScript frontend** that leverages our existing Rust backend. Goal: best UI/UX in the AI coding tool space by 2027.

---

## 1. Technology Stack

### Core
- **Backend**: Tauri 2.x (Rust) — reuse existing IDEOCODE crates directly
- **Frontend**: React 19 + TypeScript 5.x
- **Styling**: Tailwind CSS 4.x + CSS custom properties for theming
- **State**: Zustand (lightweight, TS-first)
- **Animations**: Framer Motion 6.x + CSS transitions
- **IPC**: Tauri's native Rust↔JS bridge (no HTTP overhead)

### Why Tauri over Electron
| Metric | Tauri 2.x | Electron |
|--------|-----------|----------|
| Installer size | ~3-8 MB | ~150-200 MB |
| RAM at idle | ~40-85 MB | ~150-300 MB |
| Startup time | <1s | 2-4s |
| Security | Rust sandbox | Node.js full access |
| Native menus | Yes | Yes |
| Auto-update | Built-in | electron-updater |

### Supporting
- **Charts**: Recharts or Visx
- **Icons**: Lucide React (tree-shakeable, 1000+ icons)
- **Markdown**: react-markdown + remark/rehype plugins
- **Code highlighting**: Shiki (fast, accurate)
- **Diffs**: react-diff-viewer-continued
- **Terminal**: xterm.js (same as VS Code)
- **File tree**: react-arborist

---

## 2. Architecture

### Frontend Structure
```
gui/src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Main layout container
│   │   ├── Sidebar.tsx           # Left sidebar (file explorer, sessions, settings)
│   │   ├── EditorPane.tsx        # Main content area
│   │   ├── StatusBar.tsx         # Bottom status bar
│   │   └── CommandPalette.tsx    # Cmd+K palette
│   ├── chat/
│   │   ├── MessageList.tsx       # Scrollable message history
│   │   ├── MessageBubble.tsx     # Single message (user/assistant/system)
│   │   ├── ToolCallCard.tsx      # Collapsible tool call indicator
│   │   ├── CodeBlock.tsx         # Syntax-highlighted code with copy/fork
│   │   ├── ImagePreview.tsx      # Multimodal image display
│   │   └── InputBar.tsx          # Text input with attachments
│   ├── editor/
│   │   ├── CodeEditor.tsx        # Monaco/CodeMirror integration
│   │   ├── DiffView.tsx          # Side-by-side diff
│   │   └── FileTabs.tsx          # Open file tabs
│   ├── terminal/
│   │   ├── TerminalPane.tsx      # xterm.js wrapper
│   │   └── TerminalSplit.tsx     # Split terminal support
│   ├── panels/
│   │   ├── GitPanel.tsx          # Git status, branches, commits
│   │   ├── SearchPanel.tsx       # Project-wide search
│   │   ├── BuildPanel.tsx        # Build output, CI/CD
│   │   ├── DebugPanel.tsx        # Debugger controls
│   │   ├── ProviderPanel.tsx     # AI provider/model selection
│   │   ├── ThemePanel.tsx        # Theme gallery with live preview
│   │   └── SessionHistory.tsx    # Session list with filtering
│   ├── settings/
│   │   ├── SettingsModal.tsx     # General settings
│   │   ├── KeybindingsPanel.tsx  # Keyboard shortcut editor
│   │   ├── ProvidersPanel.tsx    # API key management
│   │   └── AppearancePanel.tsx   # Theme, font, layout settings
│   └── shared/
│       ├── Button.tsx            # Reusable button variants
│       ├── Modal.tsx             # Accessible modal dialog
│       ├── Toast.tsx             # Notification toasts
│       ├── Tooltip.tsx           # Contextual tooltips
│       ├── Badge.tsx             # Status badges
│       ├── Spinner.tsx           # Loading indicators
│       ├── Skeleton.tsx          # Placeholder loading
│       └── Dropdown.tsx          # Select menus
├── hooks/
│   ├── useTheme.ts              # Theme management
│   ├── useTauri.ts              # Tauri IPC wrapper
│   ├── useKeyboard.ts           # Global keyboard shortcuts
│   └── useSession.ts            # Session state management
├── stores/
│   ├── appStore.ts              # Global app state
│   ├── sessionStore.ts          # Session data
│   ├── themeStore.ts            # Theme preferences
│   └── settingsStore.ts         # User settings
├── lib/
│   ├── tauri-commands.ts        # Typed Tauri command bindings
│   ├── markdown.ts              # Markdown processing
│   └── utils.ts                 # Utility functions
├── styles/
│   ├── globals.css              # Global styles, CSS variables
│   └── themes/                  # Theme CSS files
├── App.tsx                      # Root component
└── main.tsx                     # Entry point
```

### Backend Integration
```rust
// Tauri commands that wrap existing IDEOCODE functionality
#[tauri::command]
async fn send_message(session_id: String, content: String, attachments: Vec<Attachment>) -> Result<MessageResponse, String>

#[tauri::command]
async fn list_sessions(filter: Option<String>) -> Result<Vec<SessionInfo>, String>

#[tauri::command]
async fn execute_tool_call(tool_id: String, params: Value) -> Result<ToolResult, String>

#[tauri::command]
async fn list_providers() -> Result<Vec<Provider>, String>

#[tauri::command]
async fn set_provider_model(provider: String, model: String) -> Result<(), String>

#[tauri::command]
async fn run_command(command: String, args: Vec<String>) -> Result<CommandOutput, String>

#[tauri::command]
async fn get_file_tree(path: String, depth: usize) -> Result<Vec<FileNode>, String>

#[tauri::command]
async fn read_file(path: String) -> Result<String, String>

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String>

#[tauri::command]
async fn git_status() -> Result<GitStatus, String>

#[tauri::command]
async fn git_diff(file: Option<String>) -> Result<String, String>

#[tauri::command]
async fn git_commit(message: String) -> Result<(), String>

#[tauri::command]
async fn search_files(pattern: String, path: Option<String>) -> Result<Vec<SearchResult>, String>
```

---

## 3. Core Screens & UX

### 3.1 First Launch (Onboarding)
- Welcome screen with animated IDEOCODE logo
- Provider setup wizard (select primary provider, enter API key)
- Theme selection (light/dark/auto with live preview)
- Keyboard shortcut preset (Vim/Emacs/Default)
- Import settings from other tools (Cursor, VS Code, etc.)

### 3.2 Main Workspace
```
┌─────────────────────────────────────────────────────────┐
│ ☰ IDEOCODE v0.70.0          ┌─ File ─ Git ─ Search ─┐  │
├───────┬──────────────────────┤  Panel tabs            │  │
│       │                      ├────────────────────────┤  │
│ 📁    │  Chat / Editor       │                        │  │
│ 🔍    │                      │  Active panel content   │  │
│ ⚙️    │  Main content area   │                        │  │
│       │                      │                        │  │
│       │                      │                        │  │
│       │  ┌──────────────────┐│                        │  │
│       │  │ Tool call card   ││                        │  │
│       │  │ ▾ Running...     ││                        │  │
│       │  └──────────────────┘│                        │  │
│       │                      │                        │  │
│       │  ┌──────────────────┐│                        │  │
│       │  │ Code block       ││                        │  │
│       │  │ fn main() {      ││                        │  │
│       │  │   println!("Hi") ││                        │  │
│       │  │ }                ││                        │  │
│       │  │ [Copy] [Fork]    ││                        │  │
│       │  └──────────────────┘│                        │  │
│       │                      │                        │  │
│       ├──────────────────────┴────────────────────────┤  │
│       │  📎 [Type message...                    ] [⏎] │  │
├───────┴───────────────────────────────────────────────┤  │
│ main ● ↑3 ↓1 │ OpenAI gpt-4o │ ⚡ 42.3 tok/s │ 🔌  │  │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Key UX Features

#### A. Split View
- Drag-and-drop panel rearrangement
- Resizable panels with snap-to-grid
- Quick split: vertical (Cmd+\) or horizontal (Cmd+Shift+\)
- Panel locking (prevent accidental changes)

#### B. Inline Editing
- Click any code block → opens inline editor
- Real-time diff preview as you edit
- Undo/redo per-code-block
- Apply changes with one click

#### C. Command Palette (Cmd+K)
- Fuzzy search across all commands
- Recent commands shown first
- Keyboard shortcut hints inline
- Category tabs: All, Recent, Files, Tools, Settings

#### D. File Explorer
- Tree view with expand/collapse
- File icons by type (LSP-based)
- Right-click context menu (open, copy path, reveal in explorer)
- Drag-and-drop to attach files to chat
- Git status indicators (modified, staged, untracked)

#### E. Session Management
- Session list with thumbnails/previews
- Search/filter sessions
- Pin favorite sessions
- Export sessions (markdown, HTML, JSON)
- Session diff comparison

#### F. Real-time Collaboration (Future)
- Share session via link
- Real-time cursor presence
- Comment threads on code changes

---

## 4. Design System

### 4.1 Color Palette
```css
:root {
  /* Base colors */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a2e;
  --bg-elevated: #22223a;
  
  /* Text */
  --text-primary: #e8e8f0;
  --text-secondary: #a0a0b8;
  --text-muted: #6a6a82;
  
  /* Accent */
  --accent-primary: #6366f1;    /* Indigo */
  --accent-secondary: #8b5cf6;  /* Violet */
  --accent-tertiary: #a78bfa;
  
  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Glow effects */
  --glow-primary: 0 0 20px rgba(99, 102, 241, 0.3);
  --glow-accent: 0 0 30px rgba(139, 92, 246, 0.2);
}
```

### 4.2 Typography
```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Space Grotesk', sans-serif;
  
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
}
```

### 4.3 Spacing & Layout
- 4px base unit (all spacing is multiples of 4)
- Border radius: sm(4px), md(8px), lg(12px), xl(16px), full(9999px)
- Sidebar: 280px default, resizable 200-400px
- Status bar: 28px height
- Input bar: 48px height

### 4.4 Glassmorphism Components
```css
.glass {
  background: rgba(18, 18, 26, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
```

### 4.5 Animations
- Page transitions: 200ms ease-out
- Panel resize: 150ms ease
- Hover effects: 150ms ease
- Loading skeletons: pulse animation
- Tool call indicators: spin animation
- Success states: scale + fade (200ms)
- Error states: shake (300ms)

---

## 5. Competitive Advantages

### vs Cursor
- **Faster startup** (<1s vs 3-5s)
- **Smaller footprint** (8MB vs 200MB+)
- **Better terminal integration** (native Tauri, not Electron)
- **More themes** (100+ vs ~20)
- **Vim/Emacs built-in** (no extensions needed)

### vs Windsurf
- **Offline-first** (local models supported)
- **Multi-provider** (not locked to one AI)
- **Session management** (persistent, searchable)
- **Extensible** (plugin system)

### vs VS Code
- **AI-native** (not a bolt-on)
- **Lightweight** (10x smaller)
- **Purpose-built** for AI coding workflows
- **Better UX** (no file menus, no extensions UI complexity)

### Unique Features
1. **Multi-model chat** — Compare responses from GPT-4o, Claude, Gemini side-by-side
2. **Session branching** — Fork a session at any point to try different approaches
3. **Smart context** — Automatically includes relevant files, not just open ones
4. **Offline mode** — Use local models (Ollama, LM Studio) when disconnected
5. **Keyboard-first** — Every action has a shortcut, discoverable via palette
6. **Theme ecosystem** — Community themes, one-click install
7. **Voice input** — Dictate code and prompts (future)

---

## 6. Pricing Model

### Free Tier (IDEOCODE Free)
- 1 AI provider (user's API key)
- 5 sessions
- Basic themes (10)
- Community support

### Pro ($20/month)
- Unlimited providers
- Unlimited sessions
- All themes (100+)
- Priority support
- Early access to features
- Team collaboration (future)

### Team ($50/user/month)
- Everything in Pro
- Shared sessions
- Admin controls
- SSO/SAML
- Audit logs
- SLA

---

## 7. Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Tauri 2.x project setup
- [ ] React/TypeScript scaffold
- [ ] Design system tokens (colors, typography, spacing)
- [ ] Basic AppShell layout (sidebar, editor, status bar)
- [ ] Tauri IPC bridge for core commands
- [ ] Theme system (3 built-in themes)
- [ ] Keyboard shortcut system

### Phase 2: Core Chat (Weeks 5-8)
- [ ] Message list with virtual scrolling
- [ ] User/assistant message bubbles
- [ ] Markdown rendering with syntax highlighting
- [ ] Code blocks with copy/fork
- [ ] Tool call cards (collapsible, real-time status)
- [ ] Input bar with file attachments
- [ ] Streaming responses

### Phase 3: Editor Integration (Weeks 9-12)
- [ ] Monaco Editor integration
- [ ] File tabs
- [ ] Inline code editing from chat
- [ ] Diff view for changes
- [ ] File explorer with tree view
- [ ] Search panel (ripgrep backend)

### Phase 4: Panels & Tools (Weeks 13-16)
- [ ] Git panel (status, diff, commit, branch)
- [ ] Terminal panel (xterm.js)
- [ ] Provider panel (model selection, API keys)
- [ ] Build panel (CI/CD output)
- [ ] Debug panel (breakpoints, variables)
- [ ] Split view support

### Phase 5: Polish & Launch (Weeks 17-20)
- [ ] Onboarding wizard
- [ ] Settings modal
- [ ] Command palette
- [ ] Session management UI
- [ ] Export functionality
- [ ] Auto-update system
- [ ] Platform installers (MSI, DMG, AppImage)
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Documentation site

### Phase 6: Ecosystem (Weeks 21+)
- [ ] Theme marketplace
- [ ] Plugin API
- [ ] Real-time collaboration
- [ ] Mobile companion app (Tauri Mobile)
- [ ] Cloud sync

---

## 8. File Creation Plan

### New Tauri Project Structure
```
ideocode-gui/
├── src-tauri/
│   ├── Cargo.toml              # Tauri dependencies
│   ├── tauri.conf.json         # Tauri config
│   ├── capabilities/           # Security permissions
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── commands/           # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── chat.rs         # send_message, list_sessions
│   │   │   ├── files.rs        # read_file, write_file, get_file_tree
│   │   │   ├── git.rs          # git_status, git_diff, git_commit
│   │   │   ├── tools.rs        # execute_tool_call, run_command
│   │   │   └── providers.rs    # list_providers, set_provider_model
│   │   └── lib.rs
│   └── icons/                  # App icons
├── src/
│   ├── components/             # React components (as above)
│   ├── hooks/
│   ├── stores/
│   ├── lib/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start | <1s | Time from click to interactive |
| RAM usage | <100MB | Idle state |
| Installer size | <10MB | Platform installer |
| Time to first message | <3s | Onboarding to chat |
| User satisfaction | >4.5/5 | In-app survey |
| Crash rate | <0.1% | Crash reporting |
| Accessibility | WCAG 2.1 AA | Audit |

---

## 10. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tauri 2.x immature | High | Evaluate Tauri 1.x as fallback |
| React bundle size | Medium | Lazy loading, code splitting |
| Platform-specific bugs | Medium | CI/CD on all 3 platforms |
| Theme system complexity | Low | Start simple, iterate |
| Tauri IPC overhead | Low | Benchmark, optimize serialization |

---

## 11. Next Steps

**Immediate (This Week)**
1. Get user approval on this plan
2. Initialize Tauri 2.x project
3. Set up React + TypeScript + Tailwind scaffold
4. Create design token system
5. Build AppShell layout component

**Week 1 Deliverables**
- [ ] Tauri project compiles and runs
- [ ] React app renders in Tauri webview
- [ ] Design tokens defined (CSS variables)
- [ ] Basic layout with placeholder panels
- [ ] Keyboard shortcut infrastructure
- [ ] Theme switcher (3 themes)

---

*Plan v1.0 — Last updated: 2026-07-28*
*Author: IDEOCODE Team*
