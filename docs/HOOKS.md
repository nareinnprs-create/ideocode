# Lifecycle Hooks

IDEOCODE can run external commands at well-defined lifecycle points so other
programs can observe or gate agent behavior without forking IDEOCODE. Hooks
complement the [spawn hook](SPAWN_HOOK.md) (which controls *where headed
sessions appear*); lifecycle hooks tell you *what is happening inside them*.

## Configuration

```toml
# ~/.IDEOCODE/config.toml
[hooks]
turn_end      = "~/bin/IDEOCODE-turn-notify"     # observer
session_start = ""                            # observer
session_end   = ""                            # observer
pre_tool      = "~/bin/IDEOCODE-tool-policy"     # gate
post_tool     = ""                            # observer
pre_tool_timeout_ms = 5000
```

Env overrides (always win; empty value disables a config hook):
`IDEOCODE_HOOK_TURN_END`, `IDEOCODE_HOOK_SESSION_START`, `IDEOCODE_HOOK_SESSION_END`,
`IDEOCODE_HOOK_PRE_TOOL`, `IDEOCODE_HOOK_POST_TOOL`, `IDEOCODE_HOOK_PRE_TOOL_TIMEOUT_MS`.

## Common contract

- The hook command line is parsed shell-style (quotes and backslash escapes
  work) but executed **directly**, not through a shell. A leading `~/` in the
  program path is expanded.
- The hook runs in the session working directory when known.
- Every hook receives:

| Variable | Meaning |
| --- | --- |
| `IDEOCODE_HOOK_EVENT` | `turn_end`, `session_start`, `session_end`, `pre_tool`, `post_tool` |
| `IDEOCODE_HOOK_SESSION_ID` | Session the event belongs to |
| `IDEOCODE_HOOK_CWD` | Session working directory |
| `IDEOCODE_HOOK_PAYLOAD` | JSON object mirroring all fields (capped at 16 KB) |
| `IDEOCODE_HOOKS_DISABLED` | Always `1`; suppresses hooks in nested IDEOCODE calls (recursion guard) |

## Observer hooks

`turn_end`, `session_start`, `session_end`, and `post_tool` are
**observers**: spawned detached, fire-and-forget. They can never block or slow
the agent; failures are only logged.

### `turn_end`

Fires when an agent turn completes (streaming turn path, which covers TUI,
desktop, swarm workers, and headless sessions).

Extra fields: `IDEOCODE_HOOK_STATUS` (`ok`/`error`), `IDEOCODE_HOOK_DURATION_MS`,
`IDEOCODE_HOOK_MODEL`, `IDEOCODE_HOOK_LAST_ASSISTANT_TEXT` (first 4000 chars),
`IDEOCODE_HOOK_ERROR` (on failure).

### `session_start` / `session_end`

`session_start` fires when an agent session becomes active, with
`IDEOCODE_HOOK_SOURCE` = `create` (brand new), `attach` (existing session object
attached), or `resume` (restored by id). `session_end` fires on normal close
(`IDEOCODE_HOOK_SOURCE=close`).

### `post_tool`

Fires after every tool call. Extra fields: `IDEOCODE_HOOK_TOOL_NAME`,
`IDEOCODE_HOOK_STATUS`, `IDEOCODE_HOOK_DURATION_MS`, `IDEOCODE_HOOK_OUTPUT_BYTES` (on
success), `IDEOCODE_HOOK_ERROR` (on failure).

## Gate hook: `pre_tool`

`pre_tool` runs **synchronously before every tool call** and can block it:

- The hook receives `IDEOCODE_HOOK_TOOL_NAME` plus the full tool input JSON on
  **stdin** (and a 16 KB-truncated copy in `IDEOCODE_HOOK_TOOL_INPUT`).
- **Exit 0**: allow the call.
- **Exit 2**: block the call. The hook's stderr (trimmed, capped at 2000
  chars) is returned to the model as the tool error, so the model can adapt.
- **Anything else fails open** with a logged warning: other exit codes,
  timeout (`pre_tool_timeout_ms`, default 5s), missing binary, spawn errors.

Fail-open is deliberate: a broken policy script should degrade to "no policy"
rather than brick every session. If you need fail-closed semantics, make the
hook itself robust (it is your trust boundary, not IDEOCODE).

### Example policy script

```bash
#!/usr/bin/env bash
# ~/bin/IDEOCODE-tool-policy
# stdin: tool input JSON. Env: IDEOCODE_HOOK_TOOL_NAME, IDEOCODE_HOOK_SESSION_ID...
input=$(cat)

case "$IDEOCODE_HOOK_TOOL_NAME" in
  bash)
    if grep -qE 'rm -rf /([^a-zA-Z]|$)|mkfs|dd if=' <<<"$input"; then
      echo "blocked: destructive shell command" >&2
      exit 2
    fi
    ;;
  write|edit)
    if grep -q '"file_path":"/etc/' <<<"$input"; then
      echo "blocked: writes to /etc are not allowed" >&2
      exit 2
    fi
    ;;
esac
exit 0
```

## Example: tmux status + desktop notification on turn end

```bash
#!/usr/bin/env bash
# ~/bin/IDEOCODE-turn-notify
if [ "$IDEOCODE_HOOK_STATUS" = ok ]; then icon=✅; else icon=❌; fi
tmux display-message "IDEOCODE $icon ${IDEOCODE_HOOK_SESSION_ID:0:12}" 2>/dev/null
notify-send "IDEOCODE turn $IDEOCODE_HOOK_STATUS" \
  "${IDEOCODE_HOOK_LAST_ASSISTANT_TEXT:0:120}" 2>/dev/null
exit 0
```

## Example: JSON event log of all hook activity

Point several hooks at one script and fan out on `IDEOCODE_HOOK_EVENT`:

```bash
#!/usr/bin/env bash
# ~/bin/IDEOCODE-event-log
echo "$IDEOCODE_HOOK_PAYLOAD" >> ~/.local/state/IDEOCODE-events.jsonl
```

```toml
[hooks]
turn_end      = "~/bin/IDEOCODE-event-log"
session_start = "~/bin/IDEOCODE-event-log"
session_end   = "~/bin/IDEOCODE-event-log"
post_tool     = "~/bin/IDEOCODE-event-log"
```

## Design notes

- Hook lookups are config-driven and re-read on config reload; you can add or
  change hooks without restarting IDEOCODE.
- Hot paths (`pre_tool`/`post_tool`) check whether a hook is configured before
  building any payload, so unconfigured hooks cost ~nothing.
- The recursion guard (`IDEOCODE_HOOKS_DISABLED=1`) means a hook may safely call
  `IDEOCODE` CLI commands without re-triggering hooks in that nested process.
