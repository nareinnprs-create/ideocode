import re

with open('src/daemon.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports and lazy_static callbacks
imports = '''use std::sync::atomic::{AtomicU16, Ordering};
use std::time::{Duration, Instant};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::config::BaanzonConfig;

lazy_static::lazy_static! {
    pub static ref STATUS_CALLBACK: Mutex<Option<Box<dyn Fn(crate::GatewayStatus) + Send + Sync + 'static>>> = Mutex::new(None);
    pub static ref LOG_CALLBACK: Mutex<Option<Box<dyn Fn(String) + Send + Sync + 'static>>> = Mutex::new(None);
}

pub fn set_status_callback(cb: impl Fn(crate::GatewayStatus) + Send + Sync + 'static) {
    if let Ok(mut lock) = STATUS_CALLBACK.lock() {
        *lock = Some(Box::new(cb));
    }
}

pub fn set_log_callback(cb: impl Fn(String) + Send + Sync + 'static) {
    if let Ok(mut lock) = LOG_CALLBACK.lock() {
        *lock = Some(Box::new(cb));
    }
}'''

content = content.replace(
    'use std::sync::atomic::{AtomicU16, Ordering};\nuse std::time::{Duration, Instant};\n\nuse serde::{Deserialize, Serialize};\n\nuse crate::config::BaanzonConfig;',
    imports
)

# 2. Add hook to log
log_original = '''fn log(message: &str) {
    let path = gateway_log_path();'''

log_new = '''fn log(message: &str) {
    if let Ok(lock) = LOG_CALLBACK.lock() {
        if let Some(cb) = lock.as_ref() {
            cb(message.to_string());
        }
    }
    
    let path = gateway_log_path();'''

content = content.replace(log_original, log_new)

# 3. Add status callback to supervisor loop
supervisor_original = '''pub fn spawn_supervisor() {
    if std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some() {
        return;
    }
    std::thread::Builder::new()
        .name("IDEOCODE-baanzon-verso".to_string())
        .spawn(|| {
            let _ = ensure_with_budget(COLD_START_BUDGET);
            let mut recovery_started: Option<Instant> = None;
            loop {
                std::thread::sleep(Duration::from_secs(10));
                if gateway_healthy() {'''

supervisor_new = '''pub fn spawn_supervisor() {
    if std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some() {
        return;
    }
    std::thread::Builder::new()
        .name("IDEOCODE-baanzon-verso".to_string())
        .spawn(|| {
            let _ = ensure_with_budget(COLD_START_BUDGET);
            let mut recovery_started: Option<Instant> = None;
            let mut previous_status = crate::gateway_status_blocking();
            loop {
                let current_status = crate::gateway_status_blocking();
                if current_status != previous_status {
                    if let Ok(lock) = STATUS_CALLBACK.lock() {
                        if let Some(cb) = lock.as_ref() {
                            cb(current_status.clone());
                        }
                    }
                    previous_status = current_status;
                }
                
                std::thread::sleep(Duration::from_secs(10));
                if gateway_healthy() {'''

content = content.replace(supervisor_original, supervisor_new)

with open('src/daemon.rs', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched daemon.rs")
