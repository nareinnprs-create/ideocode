//! Background shell command cache — prevents render-thread freezes.
//!
//! Commands are executed in background threads and results are cached
//! with configurable TTL. The render thread never blocks on shell commands.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

struct CachedResult {
    lines: Vec<String>,
    cached_at: Instant,
}

struct ShellCacheInner {
    cache: HashMap<String, CachedResult>,
    pending: HashMap<String, Arc<Mutex<Option<Vec<String>>>>>,
}

static SHELL_CACHE: OnceLock<Arc<Mutex<ShellCacheInner>>> = OnceLock::new();

fn cache() -> Arc<Mutex<ShellCacheInner>> {
    SHELL_CACHE
        .get_or_init(|| {
            Arc::new(Mutex::new(ShellCacheInner {
                cache: HashMap::new(),
                pending: HashMap::new(),
            }))
        })
        .clone()
}

/// Default TTL for cached shell results.
const DEFAULT_TTL: Duration = Duration::from_secs(5);

/// Get cached shell command result, or start a background fetch.
/// Returns immediately with whatever is cached (possibly empty on first call).
pub fn get_cached_command(cmd: &str, ttl: Duration) -> Vec<String> {
    let key = cmd.to_string();
    let c = cache();
    let mut inner = c.lock().unwrap_or_else(|p| p.into_inner());

    // Check cache freshness
    if let Some(entry) = inner.cache.get(&key)
        && entry.cached_at.elapsed() < ttl {
            return entry.lines.clone();
        }

    // Already have a background fetch in progress?
    if inner.pending.contains_key(&key) {
        // Return stale data while we wait
        return inner
            .cache
            .get(&key)
            .map(|e| e.lines.clone())
            .unwrap_or_default();
    }

    // Launch background fetch
    let shared = Arc::new(Mutex::new(None::<Vec<String>>));
    inner.pending.insert(key.clone(), shared.clone());

    // Spawn background thread (non-blocking)
    let cmd_owned = cmd.to_string();
    std::thread::Builder::new()
        .name(format!("shell-cache-{}", &cmd_owned[..cmd_owned.len().min(20)]))
        .spawn(move || {
            let result = run_shell_command(&cmd_owned);
            if let Ok(mut guard) = shared.lock() {
                *guard = Some(result);
            }
        })
        .ok();

    // Return stale data
    inner
        .cache
        .get(&key)
        .map(|e| e.lines.clone())
        .unwrap_or_default()
}

/// Get with default 5s TTL.
pub fn get_cached_command_default(cmd: &str) -> Vec<String> {
    get_cached_command(cmd, DEFAULT_TTL)
}

/// Poll for completed background fetches and update cache.
/// Call this once per frame (cheap — just drains completed results).
pub fn poll_pending() {
    let c = cache();
    let mut inner = c.lock().unwrap_or_else(|p| p.into_inner());
    let keys: Vec<String> = inner.pending.keys().cloned().collect();

    let mut completed = Vec::new();
    for key in &keys {
        if let Some(shared) = inner.pending.get(key)
            && let Ok(guard) = shared.lock()
                && let Some(lines) = guard.as_ref() {
                    completed.push((key.clone(), lines.clone()));
                }
    }

    for (key, lines) in completed {
        inner.cache.insert(
            key.clone(),
            CachedResult {
                lines,
                cached_at: Instant::now(),
            },
        );
        inner.pending.remove(&key);
    }
}

/// Convenience: cached `git status --short`.
pub fn cached_git_status() -> Vec<String> {
    get_cached_command_default("git status --short")
}

/// Convenience: cached `git branch --show-current`.
pub fn cached_git_branch() -> Vec<String> {
    get_cached_command("git branch --show-current", Duration::from_secs(10))
}

/// Convenience: cached `docker ps`.
pub fn cached_docker_ps() -> Vec<String> {
    get_cached_command_default("docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'")
}

/// Convenience: cached `docker compose ps`.
pub fn cached_docker_compose_ps() -> Vec<String> {
    get_cached_command_default("docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null")
}

#[cfg(windows)]
fn run_shell_command(cmd: &str) -> Vec<String> {
    std::process::Command::new("cmd")
        .arg("/C")
        .arg(cmd)
        .output()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .map(String::from)
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(not(windows))]
fn run_shell_command(cmd: &str) -> Vec<String> {
    std::process::Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .output()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .map(String::from)
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cached_command_returns_empty_first_time() {
        let result = get_cached_command_default("echo hello");
        assert!(result.is_empty());
    }

    #[test]
    fn poll_completes_background() {
        let _ = get_cached_command_default("echo test123");
        std::thread::sleep(Duration::from_millis(200));
        poll_pending();
        let result = get_cached_command_default("echo test123");
        assert_eq!(result, vec!["test123".to_string()]);
    }

    #[test]
    fn shell_command_works() {
        let result = run_shell_command("echo hello");
        assert_eq!(result, vec!["hello".to_string()]);
    }
}
