# IDEOCODE Keyboard Shortcuts

## Platform Notes

| Modifier | macOS | Windows/Linux |
|----------|-------|---------------|
| Primary modifier | `Cmd` (⌘) | `Ctrl` |
| Secondary modifier | `Option` (⌥) | `Alt` |
| Terminal prefix | `Ctrl` | `Ctrl` |

> **macOS terminals** encode modifier combinations differently. The defaults below are platform-optimized. Some `Ctrl+key` chords used for navigation are reserved by the terminal emulator on macOS — if a binding does not work, use the alternative or configure a custom binding.

---

## Core Navigation

| Action | macOS | Windows/Linux | Description |
|--------|-------|---------------|-------------|
| Move up | `k` / `Up` | `k` / `Up` | Move cursor/selection up |
| Move down | `j` / `Down` | `j` / `Down` | Move cursor/selection down |
| Move left | `h` / `Left` | `h` / `Left` | Move cursor/selection left |
| Move right | `l` / `Right` | `l` / `Right` | Move cursor/selection right |
| Page up | `Ctrl+u` / `PageUp` | `Ctrl+u` / `PageUp` | Scroll up one page |
| Page down | `Ctrl+d` / `PageDown` | `Ctrl+d` / `PageDown` | Scroll down one page |
| Go to top | `g` / `Home` | `g` / `Home` | Jump to the beginning |
| Go to bottom | `G` / `End` | `G` / `End` | Jump to the end |
| Scroll up one step | `Ctrl+Shift+k` | `Ctrl+Shift+k` | Incremental transcript scroll up |
| Scroll down one step | `Ctrl+Shift+j` | `Ctrl+Shift+j` | Incremental transcript scroll down |
| Scroll up one page | `Alt+u` | `Alt+u` | Page-sized scroll up |
| Scroll down one page | `Alt+d` | `Alt+d` | Page-sized scroll down |
| Jump to prev prompt | `Ctrl+k` | `Ctrl+k` | Jump to previous user prompt |
| Jump to next prompt | `Ctrl+j` | `Ctrl+j` | Jump to next user prompt |
| Toggle scroll bookmark | `Ctrl+g` | `Ctrl+g` | Mark/return to a scroll position |

---

## Composer / Input

| Action | macOS | Windows/Linux | Description |
|--------|-------|---------------|-------------|
| Submit message | `Enter` | `Enter` | Send the current message |
| Newline in input | `Shift+Enter` | `Shift+Enter` | Insert a newline without sending |
| Submit and stay | `Alt+Enter` | `Alt+Enter` | Send message but keep composer focused |
| Queue send | `Shift+Enter` | `Shift+Enter` | Queue message — waits for agent to finish current turn |
| History up | `Ctrl+Up` | `Ctrl+Up` | Previous input in history |
| History down | `Ctrl+Down` | `Ctrl+Down` | Next input in history |
| Delete word back | `Alt+Backspace` | `Alt+Backspace` | Delete word to the left of cursor |
| Clear input | — | `Ctrl+k` | Clear the current composer input (when empty: clear screen) |
| Select all | — | `Ctrl+a` | Select all text (when empty: enters selection mode) |

---

## Model & Effort

| Action | macOS | Windows/Linux | Description |
|--------|-------|---------------|-------------|
| Next model | `Ctrl+Tab` | `Ctrl+Tab` | Cycle to the next available model |
| Previous model | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab` | Cycle to the previous model |
| Fallback switch | `Ctrl+y` | `Ctrl+y` | Accept post-error fallback offer |
| Increase effort | `Cmd+Right` | `Alt+Right` | Increase reasoning effort level |
| Decrease effort | `Cmd+Left` | `Alt+Left` | Decrease reasoning effort level |
| Toggle centered | `Alt+c` | `Alt+c` | Toggle centered/left alignment |
| Toggle fast mode | `Ctrl+p` | `Ctrl+p` | Toggle priority service tier |

---

## Copy Selection Mode

Entered via a keybinding or automatically when selecting text.

| Action | Key | Description |
|--------|-----|-------------|
| Enter copy mode | `Ctrl+c` (when idle) | Enter copy selection mode |
| Move cursor | `h` `j` `k` `l` | Vim-style cursor movement |
| Move to word | `w` `b` | Move forward/back by word |
| Select all | `Ctrl+a` | Select entire content |
| Toggle selection | `Space` | Start/stop text selection |
| Copy selected | `y` | Yank/copy selected text |
| Copy + exit | `c` | Copy and exit copy mode |
| Exit copy mode | `Esc` | Exit without copying |
| Go to top | `g` | Move cursor to start |
| Go to bottom | `G` | Move cursor to end |

---

## Workspace Navigation

| Action | macOS | Windows/Linux | Description |
|--------|-------|---------------|-------------|
| Workspace left | `Alt+h` | `Alt+h` | Move focus to workspace on the left |
| Workspace right | `Alt+l` | `Alt+l` | Move focus to workspace on the right |
| Workspace up | `Alt+k` | `Alt+k` | Move focus to workspace above |
| Workspace down | `Alt+j` | `Alt+j` | Move focus to workspace below |
| Move item left | `Alt+Shift+h` | `Alt+Shift+h` | Move current item to left workspace |
| Move item right | `Alt+Shift+l` | `Alt+Shift+l` | Move current item to right workspace |
| Resize left | `Ctrl+Shift+h` | `Ctrl+Shift+h` | Shrink current panel |
| Resize right | `Ctrl+Shift+l` | `Ctrl+Shift+l` | Grow current panel |

---

## Special Hotkeys (Unconditional)

These chords work regardless of input focus.

| Action | macOS | Windows/Linux | Description |
|--------|-------|---------------|-------------|
| Command palette | `Cmd+Space` | `Alt+Space` | Open the command palette |
| Toggle auto-poke | `Ctrl+p` | `Ctrl+p` | Toggle automatic poke when agent stops |
| Open resume picker | `Cmd+b` | `Alt+r` | Open the /resume session picker |
| New terminal session | `Cmd+Shift+;` | `Alt+Shift+;` | Spawn fresh IDEOCODE session in new terminal |
| Interrupt | `Ctrl+c` | `Ctrl+c` | Interrupt running agent (busy); quit when idle+empty |
| Clear screen | `Ctrl+k` | `Ctrl+k` | Clear screen (when composer is empty) |
| Toggle alignment | `Alt+c` | `Alt+c` | Switch between centered and left-aligned |
| Dictation | configurable | configurable | Run configured STT command (e.g. `Alt+;`) |

---

## Side Panel

| Action | Key | Description |
|--------|-----|-------------|
| Focus side panel | `Tab` | Move focus between chat and side panel |
| Close side panel | `Esc` | Close side panel when focused |
| Page up/down | `Ctrl+u` / `Ctrl+d` | Scroll side panel content |
| Toggle observe mode | `/observe` | Toggle transient observe mode |

---

## Slash Commands (inline)

All slash commands are accessed by typing `/` in the composer, then the command name.

| Command | Short Description |
|---------|------------------|
| `/help` | Show command list and shortcuts |
| `/compact` | Force context compaction |
| `/cache` | Toggle KV cache TTL / show stats |
| `/fix` | Run recovery actions |
| `/rewind` | Rewind conversation history |
| `/clear` | Clear conversation and start fresh |
| `/model` | Open model picker / switch model |
| `/agents` | Open agent-model config picker |
| `/swarm` | Toggle swarm features |
| `/subagent` | Launch a subagent |
| `/observe` | Toggle observe mode |
| `/todos` | Show/manage todo list |
| `/splitview` | Toggle split view |
| `/btw` | Ask a side question in a forked session |
| `/git` | Show git status |
| `/commit` | Commit changes |
| `/commit-push` | Commit and push |
| `/fast-release` | Commit, push, and publish release |
| `/remote-release` | Push release tag for CI build |
| `/triage` | Triage GitHub issues |
| `/catchup` | Catch up on finished sessions |
| `/back` | Return to previous session |
| `/review` | Launch review session |
| `/judge` | Launch judge session |
| `/effort` | Set reasoning effort |
| `/fast` | Toggle fast mode |
| `/memory` | Toggle memory features |
| `/log` | Write a log mark |
| `/goals` | Open goals overview |
| `/overnight` | Start overnight coordinator |
| `/dictate` | Run STT command |
| `/poke` | Poke the model to resume |
| `/transfer` | Compact and handoff to new session |
| `/plan` | Draft a plan |
| `/improve` | Autonomous repo improvement |
| `/refactor` | Autonomous refactoring |
| `/reload` | Reload into newer binary |
| `/restart` | Restart IDEOCODE |
| `/rebuild` | Rebuild from source |
| `/selfdev` | Self-development mode |
| `/fork` | Fork session to new terminal |
| `/resume` | Open session picker |
| `/info` | Show session metadata |
| `/context` | Show session context snapshot |
| `/usage` | Show usage limits |
| `/version` | Show version |
| `/changelog` | Show recent changes |
| `/quit` | Exit IDEOCODE |
| `/config` | Show/edit configuration |
| `/alignment` | Change alignment mode |
| `/auth` / `/login` | Authentication |
| `/account` | Manage accounts |
| `/save` | Bookmark session |
| `/rename` | Rename session |
| `/unsave` | Remove bookmark |
| `/tag` | Tag session |
| `/untag` | Remove tag |

> Run `/help <command>` inside IDEOCODE for detailed documentation on any command.

---

## Configuring Keybindings

Keybindings are configured in `~/.IDEOCODE/config.toml` under the `[keybindings]` section:

```toml
[keybindings]
model_switch_next = "ctrl+tab"
workspace_left = "alt+h"
```

Available binding identifiers:

| ID | Default (Win/Lin) | Default (macOS) | Description |
|----|-------------------|-----------------|-------------|
| `scroll_up` | `ctrl+shift+k` | `ctrl+shift+k` | Scroll transcript up |
| `scroll_down` | `ctrl+shift+j` | `ctrl+shift+j` | Scroll transcript down |
| `scroll_page_up` | `alt+u` | `alt+u` | Scroll page up |
| `scroll_page_down` | `alt+d` | `alt+d` | Scroll page down |
| `model_switch_next` | `ctrl+tab` | `ctrl+tab` | Next model |
| `model_switch_prev` | `ctrl+shift+tab` | `ctrl+shift+tab` | Previous model |
| `fallback_switch` | `ctrl+y` | `ctrl+y` | Accept fallback offer |
| `effort_increase` | `alt+right` | `cmd+right` | Increase effort |
| `effort_decrease` | `alt+left` | `cmd+left` | Decrease effort |
| `centered_toggle` | `alt+c` | `alt+c` | Toggle centered mode |
| `scroll_prompt_up` | `ctrl+k` | `ctrl+k` | Jump to prev prompt |
| `scroll_prompt_down` | `ctrl+j` | `ctrl+j` | Jump to next prompt |
| `scroll_bookmark` | `ctrl+g` | `ctrl+g` | Toggle scroll bookmark |
| `workspace_left` | `alt+h` | `alt+h` | Left workspace |
| `workspace_down` | `alt+j` | `alt+j` | Down workspace |
| `workspace_up` | `alt+k` | `alt+k` | Up workspace |
| `workspace_right` | `alt+l` | `alt+l` | Right workspace |
| `new_terminal` | `alt+shift+;` | `cmd+shift+;` | New terminal session |
| `open_resume` | `alt+r` | `cmd+b` | Open resume picker |

Set any binding to `"none"` to disable it.
