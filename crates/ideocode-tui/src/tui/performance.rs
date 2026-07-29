//! Performance optimization layer — streaming buffers, provider health cache,
//! and latency-aware failover.
//!
//! This module provides:
//! 1. Streaming token buffer for smoother rendering
//! 2. Provider health check cache (avoid re-probing healthy providers)
//! 3. Latency-aware failover (prefer low-latency providers)
//! 4. Memory-efficient image data management

use std::collections::HashMap;
use std::sync::{OnceLock, RwLock};
use std::time::{Duration, Instant};

// ── Streaming Token Buffer ──────────────────────────────────────────

/// Buffers streaming tokens for batched rendering to reduce TUI redraw frequency.
pub struct StreamingBuffer {
    buffer: Vec<String>,
    last_flush: Instant,
    flush_interval: Duration,
    max_buffer_size: usize,
}

impl Default for StreamingBuffer {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamingBuffer {
    pub fn new() -> Self {
        Self {
            buffer: Vec::new(),
            last_flush: Instant::now(),
            flush_interval: Duration::from_millis(16), // ~60fps
            max_buffer_size: 50,
        }
    }

    pub fn with_flush_interval(mut self, interval: Duration) -> Self {
        self.flush_interval = interval;
        self
    }

    /// Push a token into the buffer. Returns the accumulated tokens if ready to flush.
    pub fn push(&mut self, token: String) -> Option<String> {
        self.buffer.push(token);

        let now = Instant::now();
        let should_flush = self.buffer.len() >= self.max_buffer_size
            || now.duration_since(self.last_flush) >= self.flush_interval;

        if should_flush {
            self.flush()
        } else {
            None
        }
    }

    /// Force-flush all buffered tokens.
    pub fn flush(&mut self) -> Option<String> {
        if self.buffer.is_empty() {
            return None;
        }
        self.last_flush = Instant::now();
        let combined: String = self.buffer.drain(..).collect();
        Some(combined)
    }

    pub fn pending_count(&self) -> usize {
        self.buffer.len()
    }

    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }
}

// ── Provider Health Cache ───────────────────────────────────────────

#[derive(Debug, Clone)]
struct ProviderHealthEntry {
    healthy: bool,
    last_check: Instant,
    latency_ms: Option<f64>,
    error_count: u32,
    success_count: u32,
}

pub struct ProviderHealthCache {
    entries: RwLock<HashMap<String, ProviderHealthEntry>>,
    ttl: Duration,
}

impl ProviderHealthCache {
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
            ttl: Duration::from_secs(300), // 5 minutes
        }
    }

    pub fn instance() -> &'static Self {
        static INSTANCE: OnceLock<ProviderHealthCache> = OnceLock::new();
        INSTANCE.get_or_init(Self::new)
    }

    /// Record a successful request to a provider.
    pub fn record_success(&self, provider: &str, latency_ms: f64) {
        let mut entries = self.entries.write().unwrap_or_else(|e| e.into_inner());
        let entry = entries.entry(provider.to_string()).or_insert_with(|| ProviderHealthEntry {
            healthy: true,
            last_check: Instant::now(),
            latency_ms: None,
            error_count: 0,
            success_count: 0,
        });
        entry.healthy = true;
        entry.last_check = Instant::now();
        entry.latency_ms = Some(latency_ms);
        entry.success_count += 1;
        entry.error_count = entry.error_count.saturating_sub(1); // decay errors
    }

    /// Record a failed request to a provider.
    pub fn record_failure(&self, provider: &str) {
        let mut entries = self.entries.write().unwrap_or_else(|e| e.into_inner());
        let entry = entries.entry(provider.to_string()).or_insert_with(|| ProviderHealthEntry {
            healthy: true,
            last_check: Instant::now(),
            latency_ms: None,
            error_count: 0,
            success_count: 0,
        });
        entry.error_count += 1;
        entry.last_check = Instant::now();
        // Mark unhealthy after 3 consecutive failures
        if entry.error_count >= 3 {
            entry.healthy = false;
        }
    }

    /// Check if a provider is considered healthy (cached).
    pub fn is_healthy(&self, provider: &str) -> bool {
        let entries = self.entries.read().unwrap_or_else(|e| e.into_inner());
        match entries.get(provider) {
            Some(entry) => {
                // Re-check after TTL
                if entry.last_check.elapsed() > self.ttl {
                    true // Assume healthy after TTL
                } else {
                    entry.healthy
                }
            }
            None => true, // Unknown providers are assumed healthy
        }
    }

    /// Get the cached latency for a provider.
    pub fn latency_ms(&self, provider: &str) -> Option<f64> {
        let entries = self.entries.read().unwrap_or_else(|e| e.into_inner());
        entries.get(provider).and_then(|e| e.latency_ms)
    }

    /// Get all providers sorted by latency (fastest first).
    pub fn sorted_by_latency(&self) -> Vec<(String, f64)> {
        let entries = self.entries.read().unwrap_or_else(|e| e.into_inner());
        let mut sorted: Vec<(String, f64)> = entries
            .iter()
            .filter(|(_, e)| e.healthy && e.latency_ms.is_some())
            .map(|(name, e)| (name.clone(), e.latency_ms.unwrap()))
            .collect();
        sorted.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        sorted
    }

    /// Get the best (lowest latency, healthy) provider from a list.
    pub fn best_provider<'a>(&self, candidates: &[&'a str]) -> Option<&'a str> {
        candidates
            .iter()
            .filter(|p| self.is_healthy(p))
            .min_by_key(|p| {
                self.latency_ms(p)
                    .map(|l| l as u64)
                    .unwrap_or(u64::MAX)
            })
            .copied()
    }
}

impl Default for ProviderHealthCache {
    fn default() -> Self {
        Self::new()
    }
}

// ── Latency-Aware Failover ──────────────────────────────────────────

/// Select the best provider for failover based on cached health data.
pub fn select_failover_provider<'a>(
    current_provider: &str,
    available_providers: &[&'a str],
) -> Option<&'a str> {
    let cache = ProviderHealthCache::instance();

    // Filter out the current provider and unhealthy ones
    let candidates: Vec<&str> = available_providers
        .iter()
        .filter(|p| **p != current_provider)
        .copied()
        .collect();

    // Try to find the best healthy provider by latency
    if let Some(best) = cache.best_provider(&candidates) {
        return Some(best);
    }

    // Fall back to first available
    candidates.into_iter().next()
}

// ── Image Data Manager ──────────────────────────────────────────────

/// Manages memory-efficient storage of image data for multimodal messages.
pub struct ImageDataManager {
    /// In-memory cache of recently used image data (media_type, base64).
    cache: RwLock<HashMap<String, ImageEntry>>,
    max_cache_size: usize,
    max_entry_size: usize,
}

struct ImageEntry {
    media_type: String,
    data_b64: String,
    accessed_at: Instant,
    access_count: u32,
}

impl ImageDataManager {
    pub fn new() -> Self {
        Self {
            cache: RwLock::new(HashMap::new()),
            max_cache_size: 50, // max 50 images cached
            max_entry_size: 5 * 1024 * 1024, // 5MB per image
        }
    }

    pub fn instance() -> &'static Self {
        static INSTANCE: OnceLock<ImageDataManager> = OnceLock::new();
        INSTANCE.get_or_init(Self::new)
    }

    /// Store an image in the cache.
    pub fn store(&self, key: String, media_type: String, data_b64: String) -> bool {
        if data_b64.len() > self.max_entry_size {
            return false; // Too large
        }

        let mut cache = self.cache.write().unwrap_or_else(|e| e.into_inner());

        // Evict oldest if at capacity
        if cache.len() >= self.max_cache_size
            && let Some(oldest_key) = cache
                .iter()
                .min_by_key(|(_, e)| e.accessed_at)
                .map(|(k, _)| k.clone())
            {
                cache.remove(&oldest_key);
            }

        cache.insert(
            key,
            ImageEntry {
                media_type,
                data_b64,
                accessed_at: Instant::now(),
                access_count: 0,
            },
        );
        true
    }

    /// Retrieve an image from the cache.
    pub fn get(&self, key: &str) -> Option<(String, String)> {
        let mut cache = self.cache.write().unwrap_or_else(|e| e.into_inner());
        cache.get_mut(key).map(|entry| {
            entry.accessed_at = Instant::now();
            entry.access_count += 1;
            (entry.media_type.clone(), entry.data_b64.clone())
        })
    }

    /// Get total cache size in bytes.
    pub fn cache_size_bytes(&self) -> usize {
        let cache = self.cache.read().unwrap_or_else(|e| e.into_inner());
        cache.values().map(|e| e.data_b64.len()).sum()
    }

    /// Get cache statistics.
    pub fn stats(&self) -> ImageCacheStats {
        let cache = self.cache.read().unwrap_or_else(|e| e.into_inner());
        let total_size: usize = cache.values().map(|e| e.data_b64.len()).sum();
        let total_accesses: u32 = cache.values().map(|e| e.access_count).sum();
        ImageCacheStats {
            entries: cache.len(),
            total_size_bytes: total_size,
            total_accesses,
        }
    }

    /// Clear the entire cache.
    pub fn clear(&self) {
        let mut cache = self.cache.write().unwrap_or_else(|e| e.into_inner());
        cache.clear();
    }
}

impl Default for ImageDataManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct ImageCacheStats {
    pub entries: usize,
    pub total_size_bytes: usize,
    pub total_accesses: u32,
}

// ── Request Timing Tracker ──────────────────────────────────────────

/// Tracks request timing for performance monitoring.
pub struct RequestTimingTracker {
    timings: RwLock<Vec<RequestTiming>>,
    max_entries: usize,
}

struct RequestTiming {
    provider: String,
    #[allow(dead_code)]
    model: String,
    start: Instant,
    end: Option<Instant>,
    success: bool,
    token_count: Option<u32>,
}

impl RequestTimingTracker {
    pub fn new() -> Self {
        Self {
            timings: RwLock::new(Vec::new()),
            max_entries: 100,
        }
    }

    pub fn instance() -> &'static Self {
        static INSTANCE: OnceLock<RequestTimingTracker> = OnceLock::new();
        INSTANCE.get_or_init(Self::new)
    }

    /// Start timing a request.
    pub fn start_request(&self, provider: &str, model: &str) -> usize {
        let mut timings = self.timings.write().unwrap_or_else(|e| e.into_inner());
        if timings.len() >= self.max_entries {
            timings.remove(0);
        }
        timings.push(RequestTiming {
            provider: provider.to_string(),
            model: model.to_string(),
            start: Instant::now(),
            end: None,
            success: false,
            token_count: None,
        });
        timings.len() - 1
    }

    /// End timing a request.
    pub fn end_request(&self, index: usize, success: bool, token_count: Option<u32>) {
        let mut timings = self.timings.write().unwrap_or_else(|e| e.into_inner());
        if let Some(timing) = timings.get_mut(index) {
            timing.end = Some(Instant::now());
            timing.success = success;
            timing.token_count = token_count;
        }
    }

    /// Get average latency for a provider.
    pub fn avg_latency_ms(&self, provider: &str) -> Option<f64> {
        let timings = self.timings.read().unwrap_or_else(|e| e.into_inner());
        let relevant: Vec<f64> = timings
            .iter()
            .filter(|t| t.provider == provider && t.end.is_some())
            .filter_map(|t| {
                let end = t.end?;
                Some(end.duration_since(t.start).as_secs_f64() * 1000.0)
            })
            .collect();

        if relevant.is_empty() {
            None
        } else {
            Some(relevant.iter().sum::<f64>() / relevant.len() as f64)
        }
    }

    /// Get throughput (tokens/second) for a provider.
    pub fn throughput_tps(&self, provider: &str) -> Option<f64> {
        let timings = self.timings.read().unwrap_or_else(|e| e.into_inner());
        let relevant: Vec<(f64, u32)> = timings
            .iter()
            .filter(|t| t.provider == provider && t.end.is_some() && t.success)
            .filter_map(|t| {
                let end = t.end?;
                let duration = end.duration_since(t.start).as_secs_f64();
                let tokens = t.token_count?;
                if duration > 0.0 {
                    Some((duration, tokens))
                } else {
                    None
                }
            })
            .collect();

        if relevant.is_empty() {
            None
        } else {
            let total_tokens: u32 = relevant.iter().map(|(_, t)| t).sum();
            let total_duration: f64 = relevant.iter().map(|(d, _)| d).sum();
            if total_duration > 0.0 {
                Some(total_tokens as f64 / total_duration)
            } else {
                None
            }
        }
    }
}

impl Default for RequestTimingTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn streaming_buffer_flushes_on_size() {
        let mut buf = StreamingBuffer::new();
        assert!(buf.push("a".to_string()).is_none());
        assert!(buf.push("b".to_string()).is_none());
        // Fill to max
        for _ in 0..48 {
            buf.push("x".to_string());
        }
        let result = buf.push("last".to_string());
        assert!(result.is_some());
    }

    #[test]
    fn provider_health_cache_records() {
        let cache = ProviderHealthCache::new();
        cache.record_success("test", 100.0);
        assert!(cache.is_healthy("test"));
        assert_eq!(cache.latency_ms("test"), Some(100.0));

        for _ in 0..3 {
            cache.record_failure("test");
        }
        assert!(!cache.is_healthy("test"));
    }

    #[test]
    fn image_data_manager_eviction() {
        let mgr = ImageDataManager::new();
        for i in 0..51 {
            mgr.store(
                format!("img{}", i),
                "image/png".to_string(),
                format!("data{}", i),
            );
        }
        assert!(mgr.stats().entries <= 50);
    }
}
