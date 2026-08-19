// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::Serialize;
use std::process::Command;
use std::time::Duration;

#[derive(Debug, Serialize)]
pub struct BuildOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[tauri::command]
pub fn run_build(path: String) -> BuildOutput {
    run_cargo("build", &path)
}

#[tauri::command]
pub fn run_cargo_check(path: String) -> BuildOutput {
    run_cargo("check", &path)
}

/// Run an arbitrary shell command in a directory with a timeout.
#[tauri::command]
pub fn run_command(command: String, cwd: String) -> BuildOutput {
    let timeout_secs = 120;

    let mut child = {
        #[cfg(target_os = "windows")]
        let spawn_result = {
            let shell_args = ["C", &command];
            Command::new("cmd")
                .args(&shell_args)
                .current_dir(&cwd)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        };
        #[cfg(not(target_os = "windows"))]
        let spawn_result = Command::new("sh")
            .arg("-c")
            .arg(&command)
            .current_dir(&cwd)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn();

        match spawn_result {
            Ok(c) => c,
            Err(e) => {
                return BuildOutput {
                    success: false,
                    stdout: String::new(),
                    stderr: format!("Failed to spawn command: {}", e),
                    exit_code: -1,
                }
            }
        }
    };

    let timeout = Duration::from_secs(timeout_secs);
    let start = std::time::Instant::now();
    let status = loop {
        if start.elapsed() >= timeout {
            let _ = child.kill();
            return BuildOutput {
                success: false,
                stdout: String::new(),
                stderr: format!("Command timed out after {}s", timeout_secs),
                exit_code: -1,
            };
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(e) => {
                return BuildOutput {
                    success: false,
                    stdout: String::new(),
                    stderr: format!("Process error: {}", e),
                    exit_code: -1,
                }
            }
        }
    };

    let output = child.wait_with_output().ok();
    BuildOutput {
        success: status.success(),
        stdout: output
            .as_ref()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default(),
        stderr: output
            .as_ref()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_default(),
        exit_code: status.code().unwrap_or(-1),
    }
}

/// Run npm/yarn/pnpm command. Auto-detects the package manager.
#[tauri::command]
pub fn run_npm(command: String, cwd: String) -> BuildOutput {
    let pm = detect_package_manager(&cwd);
    let full_cmd = format!("{} {}", pm, command);
    run_command(full_cmd, cwd)
}

fn detect_package_manager(cwd: &str) -> String {
    let pnpm_lock = std::path::Path::new(cwd).join("pnpm-lock.yaml");
    let yarn_lock = std::path::Path::new(cwd).join("yarn.lock");
    let bun_lock = std::path::Path::new(cwd).join("bun.lockb");

    if pnpm_lock.exists() {
        "pnpm".to_string()
    } else if yarn_lock.exists() {
        "yarn".to_string()
    } else if bun_lock.exists() {
        "bun".to_string()
    } else {
        "npm".to_string()
    }
}

fn run_cargo(subcommand: &str, cwd: &str) -> BuildOutput {
    let mut child = match Command::new("cargo")
        .args([subcommand])
        .current_dir(cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return BuildOutput {
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to spawn cargo: {}", e),
                exit_code: -1,
            }
        }
    };

    let timeout = Duration::from_secs(300);
    let start = std::time::Instant::now();
    let status = loop {
        if start.elapsed() >= timeout {
            let _ = child.kill();
            return BuildOutput {
                success: false,
                stdout: String::new(),
                stderr: "Cargo build timed out after 300s".into(),
                exit_code: -1,
            };
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(e) => {
                return BuildOutput {
                    success: false,
                    stdout: String::new(),
                    stderr: format!("Cargo process error: {}", e),
                    exit_code: -1,
                }
            }
        }
    };

    let output = child.wait_with_output().ok();
    BuildOutput {
        success: status.success(),
        stdout: output
            .as_ref()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default(),
        stderr: output
            .as_ref()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_default(),
        exit_code: status.code().unwrap_or(-1),
    }
}
