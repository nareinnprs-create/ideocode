# IDEOCODE GUI — Master Feature Reference

> Source of truth for building ZCode-parity features into IDEOCODE's Tauri desktop app.
> Each batch references this file for design tokens, component patterns, and API shapes.

---

## 1. Design System (`globals.css`)

**CSS custom properties** — all prefixed `--idc-`:
- Colors: `--idc-bg`, `--idc-surface`, `--idc-surface-hover`, `--idc-border`, `--idc-text`, `--idc-text-muted`, `--idc-accent`, `--idc-success`, `--idc-warning`, `--idc-danger`
- Spacing: `--idc-radius-sm/md/lg/xl`, `--idc-shadow-sm/md/lg`
- Typography: `font-family: var(--font-sans)` mapped via `@theme` to `--font-sans`

**Glass tokens** — `.idc-glass` class: `backdrop-filter: blur(20px) saturate(180%); background: rgba(17,24,39,0.7)`

**Tailwind v4 CSS-first**: `@theme { --color-*: ... }` maps to `tailwind.config.*` equivalents

**Theme system** (16 themes, 4 tiers):
- Standard: default, dark, light, midnight
- Enhanced: aurora, candy, ocean, sunset, forest, lavender
- Premium: neon, retro, cyberpunk, vaporwave
- Elite: champagne, royalty

---

## 2. UI Primitives (`src/components/ui/`)

**Existing (24):** Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, IconButton, Input, Kbd, Menu, Modal, Progress, Radio, Select, Skeleton, Slider, Spinner, Textarea, Toast, Toggle, Tooltip, Typography

**Missing (need building):**
- `ContextMenu` — right-click menus (ZCode uses heavily in file tree, editor tabs)
- `HoverCard` — rich hover previews (file previews, user cards)
- `DropdownMenu` — button-triggered dropdowns (model selector, action menus)
- `Collapsible` — expandable sections (task details, sidebar groups)
- `Tabs` — tabbed interfaces (settings, terminal sessions)
- `SearchInput` — search with debounce + clear button
- `Tag` / `CountBadge` — tag chips, notification counts
- `ResizablePanel` — draggable panel splitters
- `Breadcrumb` — path navigation
- `CommandPalette` — global command palette (Cmd+K)

---

## 3. Layout Architecture

```
┌─────────────────────────────────────────────────────┐
│ TopBar (24px) — logo, project name, mode tabs, actions │
├──────┬──────────────────────────┬───────────────────┤
│      │                          │                   │
│ Side │     EditorPane           │    RightPanel      │
│ bar  │   ┌─────────────────┐   │  (context panel)  │
│(240) │   │ Monaco / Diff    │   │                   │
│      │   │ Editor           │   │                   │
│      │   └─────────────────┘   │                   │
│      ├──────────────────────────┤                   │
│      │   BottomPanelDock       │                   │
│      │   (Terminal|Output|...)  │                   │
├──────┴──────────────────────────┴───────────────────┤
│ StatusBar — agent status, model, branch, errors, time│
└─────────────────────────────────────────────────────┘
```

**AppShell** orchestrates: TopBar → Sidebar + EditorPane + RightPanel → BottomPanelDock → StatusBar

**RightPanel** (13 panel types):
code-preview, file-tree, wiki, memory, automations, plugins, skills, commands, mcp, hooks, usage-stats, subagents, settings

**BottomPanelDock** (5 tabs):
terminal, output, problems, diff, timeline

---

## 4. Goal Mode (ZCode: `/goal`)

ZCode uses goal as a top-level persistent objective. IDEOCODE has:
- `goalMode` store with `GoalState` (goal, tasks, status)
- `GoalModePanel.tsx` — panel with start/stop/clear actions
- `GoalTaskList.tsx` — checkbox list with toggle/delete
- Tasks stored in localStorage, auto-restored on startup

**What to add:**
- Goal input panel in RightPanel (ZCode shows as main sidebar section)
- Auto-generate tasks from goal via LLM
- Task dependency graph visualization
- Goal progress bar in StatusBar
- Goal persistence across sessions (already partial)
- "Goal locked" vs "Goal in progress" states

---

## 5. Task Management (ZCode: `/tasks`)

ZCode tasks: ID, title, description, status (pending/in_progress/blocked/done), priority, dependencies, creation time, completion time, subtasks.

**What to add:**
- Task detail view (click to expand, show deps, subtasks)
- Drag-to-reorder priority
- Task filtering (by status, priority)
- Bulk actions (complete all, clear done)
- Task persistence in goalStore
- Task auto-creation from chat (when user says "add task for X")

---

## 6. Chat / Message System

**Existing:** MessageItem (text + tool calls + file changes), ToolCallCard, FileChangeCard, ToolCallStatus enum, ChatMessage type (with role, content, toolCalls, thinking, metadata, images, etc.)

**What to add:**
- **ComposerPane**: ZCode has rich composer with model selector dropdown, mode tabs (chat/agent/goal), effort slider, image paste, file references
- Model selector: dropdown showing available models (already in `modelRegistry.ts` with 60+ models)
- Mode tabs: chat / agent / goal (already in `chatStore.mode`)
- Effort slider: low/medium/high (already in `chatStore.effort`)
- Image paste in composer (ChatMessage already supports `images: string[]`)
- File reference chips in composer (type `@filename` to reference)
- Message branching / version tree
- Message retry with different model
- Inline code actions (copy, apply, diff)

---

## 7. Editor System

**Existing:** Monaco editor wrapper (`MonacoEditor.tsx`), diff viewer (`DiffViewer.tsx`), editor store with openFiles/activeFile/unsavedFiles, file tabs, breadcrumbs, minimap, word wrap, font size, tab size

**What to add:**
- Multi-cursor support (already in Monaco config)
- Split editor (horizontal/vertical)
- Editor breadcrumbs from file path
- Tab context menu (close others, close all, copy path)
- Unsafed file indicator in tab
- Recent files quick-open (Cmd+P)
- Symbol outline panel

---

## 8. Terminal System

**Existing:** `Terminal.tsx` using xterm.js + FitAddon, `TerminalManager` store, `BottomPanelDock` with terminal tabs, shell integration via Tauri IPC

**What to add:**
- Terminal themes matching app theme
- Terminal search (Ctrl+Shift+F in terminal)
- Terminal split (horizontal/vertical)
- Terminal rename
- Terminal export/copy output
- Multiple terminal profiles (bash, zsh, powershell, node)

---

## 9. Browser Panel (ZCode: `use-browser`)

**What to build:**
- `BrowserPanel.tsx` — embedded browser view via Tauri webview
- `browserStore.ts` — URL, page title, screenshots, action history
- Browser actions: navigate, click, type, screenshot, scroll
- Screenshot diff viewer (before/after)
- Action history timeline
- Browser mode toggle in chat (agent can use browser)
- Integration with browser-use MCP server

---

## 10. Wiki System (ZCode: `/wiki`)

**What to build:**
- `WikiPanel.tsx` — markdown wiki viewer/editor
- `wikiStore.ts` — pages, categories, search
- Wiki page CRUD (create, read, update, delete)
- Wiki sidebar with page tree / categories
- Wiki search across all pages
- Wiki page linking (internal links between pages)
- Wiki as context for chat (reference wiki pages in messages)
- Export wiki as markdown files
- Auto-generate wiki from codebase analysis

---

## 11. Memory System (ZCode: `/memory`)

**What to build:**
- `MemoryPanel.tsx` — memory entries viewer/editor
- `memoryStore.ts` — entries, categories, CRUD
- Memory entry types: fact, preference, rule, context, snippet
- Memory categories and tags
- Memory search
- Auto-suggest memory entries in chat context
- Memory persistence (localStorage + file)
- Import/export memory

---

## 12. Automations (ZCode: `/automations`)

**What to build:**
- `AutomationsPanel.tsx` — automation list + builder
- `automationsStore.ts` — automations CRUD
- Automation triggers: file change, git event, schedule, manual
- Automation actions: run command, send message, create task
- Automation templates (common patterns)
- Automation execution history/logs
- Enable/disable automations
- Automation variables/parameters

---

## 13. Subagents (ZCode: subagent system)

**What to build:**
- `SubagentsPanel.tsx` — active subagents list
- `subagentsStore.ts` — subagent instances, status, logs
- Subagent creation (spawn from chat)
- Subagent status monitoring (running, completed, failed)
- Subagent log streaming
- Subagent result integration into main chat
- Subagent timeout/cancellation
- Subagent templates (researcher, coder, reviewer)

---

## 14. Commands System (ZCode: `/commands`)

**What to build:**
- `CommandsPanel.tsx` — command list + execution
- `commandsStore.ts` — custom commands CRUD
- Command types: slash commands, keyboard shortcuts, context menu
- Command parameters (with type validation)
- Command history
- Built-in commands (clear, export, theme, etc.)
- Custom user commands (user-defined slash commands)
- Command search/autocomplete

---

## 15. Edit History / Timeline (ZCode: edit history)

**What to build:**
- `TimelinePanel.tsx` — in BottomPanelDock
- Timeline entries: file edits, git commits, agent actions
- Timeline filtering (by type, time range)
- Timeline item details (diff view for file edits)
- Undo/redo from timeline
- Timeline export
- Visual timeline (vertical timeline with icons)

---

## 16. MCP Services (ZCode: `/mcp`)

**What to build:**
- `McpPanel.tsx` — MCP server list + config
- `mcpStore.ts` — servers, tools, status
- MCP server discovery and connection
- MCP tool listing and invocation
- MCP server health monitoring
- MCP config editor (JSON)
- MCP tool search
- Pre-configured servers: browser-use, filesystem, git, memory, sequential-thinking

---

## 17. Hooks System (ZCode: hooks)

**What to build:**
- `HooksPanel.tsx` — hook list + config
- `hooksStore.ts` — hooks CRUD
- Hook types: pre-prompt, post-response, file-change, git-commit
- Hook actions: run script, send webhook, trigger automation
- Hook conditions (file pattern, time range, etc.)
- Hook execution logs
- Enable/disable hooks
- Hook templates

---

## 18. Plugins (ZCode: `/plugins`)

**What to build:**
- `PluginsPanel.tsx` — installed plugins + marketplace
- `pluginsStore.ts` — plugins CRUD, status
- Plugin installation (from URL/path)
- Plugin enable/disable
- Plugin configuration
- Plugin marketplace (list of available plugins)
- Plugin dependency management
- Plugin sandboxing

---

## 19. Skills (ZCode: skills)

**What to build:**
- `SkillsPanel.tsx` — skill list + builder
- `skillsStore.ts` — skills CRUD
- Skill definition (name, description, triggers, actions)
- Skill templates
- Skill enable/disable
- Skill search
- Skill from codebase analysis

---

## 20. Settings (ZCode: `/settings`)

**What to build:**
- `SettingsPanel.tsx` — full settings page with tabs
- Settings sections:
  - General (theme, accent color, font size, language)
  - Provider (API keys, model defaults)
  - Editor (tab size, word wrap, minimap, font)
  - Terminal (shell, font, cursor)
  - Keybindings (custom shortcuts)
  - Privacy (data collection, analytics)
  - About (version, licenses)

---

## 21. Keyboard Shortcuts (ZCode: shortcuts)

**What to build:**
- `ShortcutsPanel.tsx` — shortcut list + editor
- `shortcutsStore.ts` — custom keybindings
- Default keybindings (Cmd+K palette, Cmd+N new chat, etc.)
- Keybinding conflict detection
- Keybinding presets (vim, emacs, default)
- Shortcut display in menus/tooltips
- Keybinding export/import

---

## 22. Safety Confirmations (ZCode: safety)

**What to build:**
- `SafetySettings` — configurable danger levels
- Confirmation dialogs for:
  - Destructive file operations (delete, overwrite)
  - Git operations (force push, reset)
  - Shell command execution (dangerous commands)
  - MCP tool invocation
  - Plugin installation
- "Always allow" per-category
- Safety level indicator in StatusBar

---

## 23. Idle Time Tasks (ZCode: idle tasks)

**What to build:**
- Idle detection (configurable timeout)
- Background tasks during idle:
  - Code analysis
  - Dependency updates check
  - Documentation generation
  - Test coverage analysis
- Idle task queue
- Idle task results notification
- Enable/disable idle tasks
- Idle task priority

---

## 24. Bot Channel (ZCode: bot-channel)

**What to build:**
- `BotChannelPanel.tsx` — bot integration panel
- Bot configuration (token, channel)
- Bot message forwarding (IDE ↔ chat app)
- Bot commands
- Bot status monitoring
- Multi-platform support (Discord, Slack, etc.)

---

## 25. Remote Development (ZCode: remote-dev)

**What to build:**
- `RemoteDevPanel.tsx` — remote connection manager
- Remote server connection (SSH, VS Code Remote)
- Remote file browsing
- Remote terminal
- Remote git operations
- Connection profiles
- Connection history

---

## 26. Remote Control (ZCode: remote-control)

**What to build:**
- `RemoteControlPanel.tsx` — remote control session
- Screen sharing / view-only mode
- Remote input forwarding
- Session recording
- Multi-viewer support
- Session permissions

---

## 27. Usage Stats (ZCode: usage stats)

**What to build:**
- `UsageStatsPanel.tsx` — usage dashboard
- Stats tracking:
  - Tokens used per model
  - Time spent in chat/editor/terminal
  - Files edited
  - Commands run
  - API costs
- Charts (daily/weekly/monthly)
- Cost breakdown by model
- Usage export
- Usage limits/budgets

---

## 28. Agent Status (StatusBar)

**Existing:** StatusBar shows agent status indicator

**What to add:**
- Agent thinking animation (ZCode shows "Thinking..." with dots)
- Current task display in StatusBar
- Agent cost/tokens used this session
- Quick-actions dropdown from StatusBar
- Connection status indicator
- Git branch + dirty indicator
- Error count badge

---

## File Structure Reference

```
src/
├── App.tsx                          # Entry point
├── main.tsx                         # Tauri entry
├── components/
│   ├── ui/                          # 24 UI primitives + 8 new ones needed
│   ├── layout/                      # AppShell, Sidebar, TopBar, RightPanel, etc.
│   ├── chat/                        # MessageItem, ToolCallCard, FileChangeCard
│   ├── editor/                      # MonacoEditor, DiffViewer
│   ├── terminal/                    # Terminal
│   ├── goal/                        # GoalModePanel, GoalTaskList
│   └── panels/                      # Panel components (per feature)
├── stores/                          # 8 Zustand stores
├── lib/                             # tauri-commands, theme-registry, model-registry
├── types/                           # TypeScript types
└── styles/                          # globals.css, themes
```

---

*Last updated: Session 2026-08-18*
