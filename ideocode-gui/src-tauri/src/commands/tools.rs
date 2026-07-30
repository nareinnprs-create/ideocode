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

fn run_cargo(subcommand: &str, cwd: &str) -> BuildOutput {
    let mut child = match Command::new("cargo")
        .args([subcommand])
        .current_dir(cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => return BuildOutput {
            success: false,
            stdout: String::new(),
            stderr: format!("Failed to spawn cargo: {}", e),
            exit_code: -1,
        },
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
            Err(e) => return BuildOutput {
                success: false,
                stdout: String::new(),
                stderr: format!("Cargo process error: {}", e),
                exit_code: -1,
            },
        }
    };

    let output = child.wait_with_output().ok();
    BuildOutput {
        success: status.success(),
        stdout: output.as_ref().map(|o| String::from_utf8_lossy(&o.stdout).to_string()).unwrap_or_default(),
        stderr: output.as_ref().map(|o| String::from_utf8_lossy(&o.stderr).to_string()).unwrap_or_default(),
        exit_code: status.code().unwrap_or(-1),
    }
}
