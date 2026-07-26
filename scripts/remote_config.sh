#!/usr/bin/env bash
# Shared loader for IDEOCODE remote build defaults.
#
# The config file is intentionally a shell fragment so users can write either:
#   IDEOCODE_REMOTE_HOST=builder
# or:
#   export IDEOCODE_REMOTE_HOST=builder
#
# Explicit environment variables take precedence over values loaded from the
# config file. This lets callers temporarily disable remote builds with, for
# example, `IDEOCODE_REMOTE_CARGO=0 scripts/dev_cargo.sh check`.

IDEOCODE_remote_config_path() {
  if [[ -n "${IDEOCODE_REMOTE_CONFIG:-}" ]]; then
    printf '%s\n' "$IDEOCODE_REMOTE_CONFIG"
  elif [[ -n "${XDG_CONFIG_HOME:-}" ]]; then
    printf '%s\n' "$XDG_CONFIG_HOME/IDEOCODE/remote-build.env"
  elif [[ -n "${HOME:-}" ]]; then
    printf '%s\n' "$HOME/.config/IDEOCODE/remote-build.env"
  fi
}

IDEOCODE_load_remote_config() {
  local config_file
  config_file="$(IDEOCODE_remote_config_path)"
  [[ -n "$config_file" && -f "$config_file" ]] || return 0

  local had_remote_cargo=0 remote_cargo=""
  local had_remote_host=0 remote_host=""
  local had_remote_dir=0 remote_dir=""
  local had_remote_ssh_bin=0 remote_ssh_bin=""
  local had_remote_rsync_bin=0 remote_rsync_bin=""

  if [[ ${IDEOCODE_REMOTE_CARGO+x} ]]; then
    had_remote_cargo=1
    remote_cargo="$IDEOCODE_REMOTE_CARGO"
  fi
  if [[ ${IDEOCODE_REMOTE_HOST+x} ]]; then
    had_remote_host=1
    remote_host="$IDEOCODE_REMOTE_HOST"
  fi
  if [[ ${IDEOCODE_REMOTE_DIR+x} ]]; then
    had_remote_dir=1
    remote_dir="$IDEOCODE_REMOTE_DIR"
  fi
  if [[ ${IDEOCODE_REMOTE_SSH_BIN+x} ]]; then
    had_remote_ssh_bin=1
    remote_ssh_bin="$IDEOCODE_REMOTE_SSH_BIN"
  fi
  if [[ ${IDEOCODE_REMOTE_RSYNC_BIN+x} ]]; then
    had_remote_rsync_bin=1
    remote_rsync_bin="$IDEOCODE_REMOTE_RSYNC_BIN"
  fi

  # shellcheck source=/dev/null
  source "$config_file"

  if [[ "$had_remote_cargo" -eq 1 ]]; then
    IDEOCODE_REMOTE_CARGO="$remote_cargo"
  fi
  if [[ "$had_remote_host" -eq 1 ]]; then
    IDEOCODE_REMOTE_HOST="$remote_host"
  fi
  if [[ "$had_remote_dir" -eq 1 ]]; then
    IDEOCODE_REMOTE_DIR="$remote_dir"
  fi
  if [[ "$had_remote_ssh_bin" -eq 1 ]]; then
    IDEOCODE_REMOTE_SSH_BIN="$remote_ssh_bin"
  fi
  if [[ "$had_remote_rsync_bin" -eq 1 ]]; then
    IDEOCODE_REMOTE_RSYNC_BIN="$remote_rsync_bin"
  fi
}
