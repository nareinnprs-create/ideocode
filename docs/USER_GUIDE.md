# IDEOCODE User Guide

> Version 0.62.0 · July 2026

IDEOCODE is a next-generation AI coding agent harness built for multi-session workflows, infinite customizability, and performance. This guide covers everything from installation to advanced features.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Provider Setup](#provider-setup)
5. [The TUI Interface](#the-tui-interface)
6. [Slash Commands](#slash-commands)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Memory System](#memory-system)
9. [Swarm Orchestration](#swarm-orchestration)
10. [Ambient Mode](#ambient-mode)
11. [Self-Development](#self-development)
12. [Personality & Emotion](#personality--emotion)
13. [Platform Notes](#platform-notes)
14. [Troubleshooting](#troubleshooting)
15. [Further Reading](#further-reading)

---

## Installation

### macOS & Linux

```bash
curl -fsSL https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/scripts/install.sh | bash
```

### Windows 11 (PowerShell 5.1+)

```powershell
irm https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/scripts/install.ps1 | iex
```

### macOS via Homebrew

```bash
brew tap nareinnprs-create/ideocode
brew install IDEOCODE
```

### From Source

```bash
git clone https://github.com/nareinnprs-create/ideocode.git
cd IDEOCODE
cargo build --release
scripts/install_release.sh
```

### Platform Support

| Platform | TUI | GUI | Status |
|----------|-----|-----|--------|
| Linux x86_64 | ✓ | ✓ | Fully supported |
| Linux aarch64 | ✓ | ✓ | Fully supported |
| macOS Apple Silicon | ✓ | ✓ | Supported |
| macOS Intel | ✓ | ✓ | Supported |
| Windows 11 x64 | ✓ | ✓ | Supported |
| Windows 11 ARM64 | ✓ | ✓ | Supported |
| Termux (Android) | ✓ | — | Supported (glibc + patchelf) |

**Prerequisites by platform:**

**Linux:** `libxcb`, `libxkbcommon`, `pkg-config`, `openssl` (or use vendored feature). On Debian/Ubuntu: `sudo apt install libxcb1-dev libxkbcommon-dev pkg-config libssl-dev`. On Fedora: `sudo dnf install libxcb-devel libxkbcommon-devel pkg-config openssl-devel`.

**macOS:** Xcode Command Line Tools (`xcode-select --install`). No additional package manager needed.

**Windows:** Windows 11. For source builds: Visual Studio 2022 Build Tools with "Desktop development with C++" workload. Alacritty terminal is optional but recommended for the best experience.

---

## Quick Start

### Launch the TUI

```bash
IDEOCODE
```

### First-run Setup

1. On first launch, IDEOCODE will present a provider login screen.
2. Choose your preferred AI provider (Claude, OpenAI, Gemini, Copilot, etc.).
3. Complete the OAuth flow or enter your API key.
4. Start typing your first message.

### Essential Commands

```bash
# Interactive TUI session
IDEOCODE

# Non-interactive run
IDEOCODE run "explain this project"

# Resume a previous session
IDEOCODE --resume my-session-name

# Persistent server mode
IDEOCODE serve
IDEOCODE connect

# Voice dictation
IDEOCODE dictate
```

### First Conversation

Type a message in the composer at the bottom of the screen and press `Enter` to send. The agent will process your request using tools, filesystem access, and the configured AI model.

---

## Configuration

The main configuration file is `~/.IDEOCODE/config.toml`. View it with:

```bash
/config
/config edit   # Opens in $EDITOR
/config init   # Create default config
```

### Key Configuration Sections

```toml
# Default provider and model
[provider]
default_provider = "claude"
default_model = "claude-sonnet-4-20260514"

# Display settings
[display]
centered = false
emoji = false          # Disable emoji globally
keybinding_hints = true

# Keybindings (see KEYBOARD_SHORTCUTS.md)
[keybindings]
workspace_left = "alt+h"

# Dictation
[dictation]
command = "~/.local/bin/my-whisper-script"
mode = "insert"
timeout_secs = 30

# MCP servers (separate file: ~/.IDEOCODE/mcp.json)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `IDEOCODE_NO_EMOJI=1` | Disable emoji in TUI/CLI output |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `IDEOCODE_STREAM_IDLE_TIMEOUT_SECS` | Stream timeout (default 180s) |
| `IDEOCODE_OPENAI_EXTRA_BODY` | Extra JSON fields for API requests |

---

## Provider Setup

IDEOCODE supports multiple AI providers with built-in OAuth flows.

### Login Options

```bash
# Interactive login
IDEOCODE login

# Specific provider
IDEOCODE login --provider claude
IDEOCODE login --provider openai
IDEOCODE login --provider gemini
IDEOCODE login --provider copilot
IDEOCODE login --provider azure

# OpenAI-compatible endpoints
IDEOCODE login --provider openrouter
IDEOCODE login --provider deepseek
IDEOCODE login --provider ollama
IDEOCODE login --provider lmstudio

# Custom endpoint
IDEOCODE provider add my-api \
  --base-url https://llm.example.com/v1 \
  --model my-model-id \
  --api-key-stdin \
  --set-default
```

### Supported Providers

| Provider | Type | Authentication |
|----------|------|----------------|
| Claude | Native | OAuth / API key |
| OpenAI / ChatGPT | Native | OAuth / API key |
| Google Gemini | Native | OAuth |
| GitHub Copilot | Native | Device flow |
| Azure OpenAI | Native | OAuth / API key |
| OpenRouter | OpenAI-compat | API key |
| DeepSeek | OpenAI-compat | API key |
| Ollama | Local | None |
| LM Studio | Local | None |

Use `/account` inside the TUI to manage multiple accounts per provider and switch between them on the fly.

---

## The TUI Interface

### Layout

```
┌──────────────────────────────────────┐
│  Transcript (chat history)           │
│  ┌────────────────────────────────┐  │
│  │ User: hello                     │  │
│  │ Agent: Hi! How can I help?     │  │
│  │   ┌─ tool ──────────────────┐  │  │
│  │   │ $ ls -la                 │  │  │
│  │   │ total 42                 │  │  │
│  │   └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ > /help                       │  │
│  └────────────────────────────────┘  │
│  Ctrl+P poke · Alt+Space palette     │
└──────────────────────────────────────┘
```

### Key Areas

- **Transcript area** — The main chat history showing your conversation with the agent.
- **Side panel** — Auxiliary information (files, diagrams, diff viewer, goals). Toggle with workspace navigation keys.
- **Composer** — Bottom input bar where you type messages and slash commands.
- **Status bar** — Shows model name, effort level, connection status, and hotkey hints.

### Info Widgets

IDEOCODE shows floating information widgets in the negative space of the terminal. They automatically move out of the way when you need the space. Widgets include token usage, connection status, and context statistics.

### Alignment

- **Left-aligned** (default): Chat aligned to the left edge.
- **Centered**: Chat centered on screen. Toggle with `Alt+C` or `/alignment centered`.

---

## Slash Commands

All commands are typed in the composer starting with `/`. Use `/help <command>` for detailed docs.

### Session Management

| Command | Description |
|---------|-------------|
| `/clear` | Clear conversation and start fresh |
| `/rewind N` | Rewind to message N |
| `/fork` | Fork session to new terminal |
| `/resume` | Open session picker |
| `/save` | Bookmark current session |
| `/rename` | Set custom session title |
| `/tag` | Tag session for filtering |
| `/transfer` | Compact and handoff to new session |

### Agent Control

| Command | Description |
|---------|-------------|
| `/model` | Switch model |
| `/effort` | Set reasoning effort |
| `/fast` | Toggle priority service tier |
| `/fix` | Run recovery actions |
| `/poke` | Poke agent to resume work |
| `/compact` | Force context compaction |
| `/cache` | Manage KV cache TTL |

### Code & Git

| Command | Description |
|---------|-------------|
| `/git` | Show git status |
| `/commit` | Create commits |
| `/commit-push` | Commit and push |
| `/triage` | Triage GitHub issues |
| `/review` | Launch review session |
| `/judge` | Launch judge session |
| `/improve` | Autonomous repo improvement |
| `/refactor` | Autonomous refactoring |
| `/plan` | Draft a plan without implementing |

### Swarm & Multi-Agent

| Command | Description |
|---------|-------------|
| `/swarm` | Toggle swarm features |
| `/subagent` | Launch a subagent |
| `/observe` | Toggle observe mode |
| `/overnight` | Start overnight coordinator |
| `/catchup` | Catch up on finished sessions |

### Memory & Tools

| Command | Description |
|---------|-------------|
| `/memory` | Toggle memory features |
| `/goals` | Open goals overview |
| `/dictate` | Run speech-to-text |
| `/log` | Write a log mark |
| `/btw` | Ask side question (forks session) |

### Development

| Command | Description |
|---------|-------------|
| `/selfdev` | Enter self-development mode |
| `/rebuild` | Rebuild from source |
| `/reload` | Reload into newer binary |
| `/restart` | Restart IDEOCODE |

### Information

| Command | Description |
|---------|-------------|
| `/info` | Session metadata |
| `/context` | Full context snapshot |
| `/usage` | Usage limits |
| `/version` | Version details |
| `/changelog` | Recent changes |
| `/config` | Configuration |
| `/help` | Help and keyboard shortcuts |

---

## Keyboard Shortcuts

See [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) for the complete reference.

### Quick Reference

| Action | Key |
|--------|-----|
| Send message | `Enter` |
| Newline | `Shift+Enter` |
| Interrupt agent | `Ctrl+C` |
| Command palette | `Alt+Space` |
| Next model | `Ctrl+Tab` |
| Toggle centered | `Alt+C` |
| Workspace nav | `Alt+{h,j,k,l}` |
| Increase effort | `Alt+Right` |
| Decrease effort | `Alt+Left` |

---

## Memory System

IDEOCODE features a persistent, infinite memory system that automatically recalls relevant information across sessions.

### How It Works

1. **Extraction**: After each turn, the MemoryAgent extracts facts, preferences, and corrections from the conversation.
2. **Embedding**: Each memory is embedded as a semantic vector using local MiniLM or API-based embedding.
3. **Recall**: Relevant memories are injected as context when the agent processes new messages.
4. **Consolidation**: The ambient mode periodically reorganizes memories, checking for staleness and conflicts.

### Memory Commands

```
/memory on      — Enable memory for this session
/memory off     — Disable memory for this session
/memory status  — Show memory status
/memory stats   — Show memory statistics
/memory clear   — Clear memory for this session
```

### Memory Tools (for the agent)

The agent has access to explicit memory tools:
- `memory_search` — Search by semantic similarity
- `memory_store` — Store a new memory
- `memory_delete` — Remove memories

### Session Search

IDEOCODE also supports traditional RAG-based session search for finding information in past conversations. The agent can use the `session_search` tool to query across all previous sessions.

---

## Swarm Orchestration

IDEOCODE supports running multiple agents simultaneously in the same repository with automatic conflict resolution.

### How Swarm Works

1. **Spawn**: Agents are spawned via the `communicate` tool or `/subagent` command.
2. **Coordinate**: The server tracks all agents, their file reads, and their edits.
3. **Notify**: When agent A edits a file agent B has read, the server notifies agent B.
4. **Resolve**: Agent B can check the diff and adjust its work to avoid conflicts.

### Swarm Modes

| Mode | Description | Max Workers |
|------|-------------|-------------|
| **Light** | Cheap fan-out for simple parallel tasks | 4 (fixed) |
| **Deep** | Full task-graph coordination with dependencies | Configurable (default 32, max 1000) |

### Commands

```
/swarm on           — Enable swarm mode
/swarm off          — Disable swarm mode
/swarm status       — Show swarm status
/subagent <prompt>  — Launch a subagent
/overnight <hours>  — Start overnight coordinator
```

### Communication

Agents can communicate with each other:
- **DM**: Direct message a specific agent
- **Broadcast**: Message all agents on the server
- **Channel**: Message agents working in the same repository

---

## Ambient Mode

Ambient mode (also called OpenClaw) allows IDEOCODE to work autonomously in the background. It performs:

- Memory consolidation and reorganization
- Session maintenance
- Background task execution

```
/observe on    — Enable observe mode (watch agent work)
/observe off   — Disable observe mode
```

---

## Self-Development

IDEOCODE can modify its own source code — edit, build, test, and reload itself automatically.

### Getting Started

```
/selfdev                 — Enter self-development mode
/selfdev <prompt>        — Start self-dev with a specific task
/selfdev status          — Show self-dev build status
```

### How It Works

1. The agent inspects its own source code.
2. It makes targeted edits using the same tools it uses for any project.
3. It runs `cargo build --release` to compile the changes.
4. It runs tests to verify correctness.
5. It reloads the new binary into all active sessions.

> **Recommended**: Use a frontier model (GPT-5.5 or latest Claude) for self-development work, as the IDEOCODE codebase is complex.

---

## Personality & Emotion

IDEOCODE supports configurable personality modes and emotion-aware responses.

### Personality Modes

```
/personality professional   — Professional, concise
/personality friendly       — Warm, approachable
/personality creative       — Imaginative, expressive
/personality technical      — Precise, detail-oriented
/personality mentor         — Teaching, guiding
/personality custom <text>  — Custom personality directive
```

### Emotion Detection

IDEOCODE automatically detects the emotional tone of your messages and adapts its responses accordingly. Detected tones include: neutral, happy, frustrated, urgent, curious, sarcastic, appreciative, confused, and determined.

---

## Platform Notes

### Windows

- **Terminal**: Alacritty recommended. Install with installer `-ConfigureAlacritty` flag.
- **Hotkeys**: Global launch hotkey configurable via installer `-ConfigureHotkey` flag.
- **IPC**: Native named pipes for client-server communication.
- **WebView2**: Built-in on Windows 11 (required for GUI).
- **PATH**: Launcher installed at `%LOCALAPPDATA%\IDEOCODE\bin\IDEOCODE.exe`.
- **Logs**: `%LOCALAPPDATA%\IDEOCODE\log\`.

### macOS

- **Terminal**: Works with Terminal.app, iTerm2, Alacritty, and Warp.
- **Hotkeys**: Uses `objc2` for native global hotkey support. System hotkey preferences read from `com.apple.symbolichotkeys`.
- **Launcher**: Installed via Homebrew or install script.
- **PATH**: `~/.local/bin/IDEOCODE` (symlink).

### Linux

- **Wayland**: Clipboard support via `arboard` with `wayland-data-control` feature. Set `WAYLAND_DISPLAY` if running under Wayland.
- **X11**: Works natively under X11.
- **Termux**: Install `glibc` and `patchelf` packages first.
- **Linker**: `lld` or `mold` recommended for faster builds.

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Agent stops responding | Press `Ctrl+C` to interrupt, then `/fix` |
| Cache misses on Claude | `/cache 1h` to extend cache TTL |
| Session too long | `/rewind N` or `/compact` |
| Agent confused | `/clear` to start fresh, or `/fix` |
| Provider errors | `/account <provider> login` to re-authenticate |
| GUI won't start | Ensure WebView2 is installed (Windows) or WebKit (Linux) |

### Logs

Logs are written to `~/.IDEOCODE/logs/` with daily files:

```bash
# View today's log
cat ~/.IDEOCODE/logs/IDEOCODE-$(date +%Y-%m-%d).log

# Write a manual mark
/log mark "testing feature X"
```

### Debug Socket

For runtime-level debugging, IDEOCODE exposes a debug socket. Connect to it for real-time diagnostic information.

### Uninstall

```bash
# Standard uninstall (keeps config, auth, sessions)
curl -fsSL https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/scripts/uninstall.sh | bash -s -- --yes

# Full wipe (removes everything)
curl -fsSL https://raw.githubusercontent.com/nareinnprs-create/ideocode/master/scripts/uninstall.sh | bash -s -- --purge --yes
```

### Getting Help

- Run `/help` inside IDEOCODE for command documentation
- Run `/help <command>` for detailed help on a specific command
- Join the [Discord community](https://discord.gg/nBe9vGyK9a)
- Report issues at the [GitHub repository](https://github.com/nareinnprs-create/ideocode/issues)

---

## Further Reading

- [Keyboard Shortcuts Reference](./KEYBOARD_SHORTCUTS.md)
- [Memory Architecture](./MEMORY_ARCHITECTURE.md)
- [Swarm Architecture](./SWARM_ARCHITECTURE.md)
- [Server Architecture](./SERVER_ARCHITECTURE.md)
- [Safety System](./SAFETY_SYSTEM.md)
- [Ambient Mode](./AMBIENT_MODE.md)
- [Windows Support](./WINDOWS.md)
- [Wrappers and Shell Integration](./WRAPPERS.md)
- [Browser Provider Protocol](./BROWSER_PROVIDER_PROTOCOL.md)
- [Refactoring Notes](./REFACTORING.md)
