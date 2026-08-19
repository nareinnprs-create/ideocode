// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub staged: Vec<GitFile>,
    pub modified: Vec<GitFile>,
    pub untracked: Vec<GitFile>,
    pub conflicted: Vec<GitFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiff {
    pub file: String,
    pub hunks: Vec<GitHunk>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub content: String,
}

fn run_git(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            return Err(stderr.to_string());
        }
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let cwd = root.to_string_lossy().to_string();

    // Get branch name
    let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &cwd)
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "detached".into());

    // Get ahead/behind
    let (ahead, behind) = run_git(
        &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
        &cwd,
    )
    .ok()
    .and_then(|s| {
        let parts: Vec<&str> = s.split_whitespace().collect();
        if parts.len() == 2 {
            Some((parts[0].parse().unwrap_or(0), parts[1].parse().unwrap_or(0)))
        } else {
            None
        }
    })
    .unwrap_or((0, 0));

    // Get status --porcelain
    let status_output = run_git(&["status", "--porcelain"], &cwd).unwrap_or_default();

    let mut staged = Vec::new();
    let mut modified = Vec::new();
    let mut untracked = Vec::new();
    let mut conflicted = Vec::new();

    for line in status_output.lines() {
        if line.len() < 3 {
            continue;
        }
        let index_status = line.chars().next().unwrap_or(' ');
        let worktree_status = line.chars().nth(1).unwrap_or(' ');
        let file_path = line[3..].trim().to_string();

        let git_file = GitFile {
            path: file_path,
            status: format!("{}{}", index_status, worktree_status),
        };

        match index_status {
            '?' => untracked.push(git_file),
            '!' => untracked.push(git_file),
            'U' => conflicted.push(git_file),
            _ => {
                if index_status != ' ' && index_status != '?' {
                    staged.push(git_file);
                } else if worktree_status != ' ' {
                    modified.push(git_file);
                }
            }
        }
    }

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        modified,
        untracked,
        conflicted,
    })
}

#[tauri::command]
pub fn git_diff(path: String, file: Option<String>) -> Result<String, String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();

    let mut args = vec!["diff"];
    if let Some(ref f) = file {
        args.push("--");
        args.push(f);
    }

    run_git(args.as_slice(), &cwd)
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<(), String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    run_git(&["commit", "-am", &message], &cwd)?;
    Ok(())
}

#[tauri::command]
pub fn git_add(path: String, file: String) -> Result<(), String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    run_git(&["add", &file], &cwd).map(|_| ())
}

#[tauri::command]
pub fn git_unstage(path: String, file: String) -> Result<(), String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    run_git(&["restore", "--staged", &file], &cwd).map(|_| ())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub current: bool,
    pub remote: bool,
}

/// Lists local branches (plus remote-tracking branches without a local copy)
/// and marks which one is checked out.
#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<GitBranch>, String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();

    let mut branches: Vec<GitBranch> = Vec::new();
    let current = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &cwd)
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    for line in run_git(&["branch", "--list"], &cwd)
        .unwrap_or_default()
        .lines()
    {
        let line = line.trim_start();
        if line.is_empty() {
            continue;
        }
        let (checked, name) = match line.strip_prefix('*') {
            Some(rest) => (true, rest.trim().to_string()),
            None => (false, line.trim().to_string()),
        };
        if !branches.iter().any(|b: &GitBranch| b.name == name) {
            branches.push(GitBranch {
                current: checked || name == current,
                name: name.clone(),
                remote: false,
            });
        }
    }

    for line in run_git(&["branch", "--list", "-r"], &cwd)
        .unwrap_or_default()
        .lines()
    {
        let name = line.trim().to_string();
        if name.is_empty() {
            continue;
        }
        let name = name
            .strip_prefix("origin/")
            .map(|n| n.to_string())
            .unwrap_or(name);
        if !branches.iter().any(|b: &GitBranch| b.name == name) {
            branches.push(GitBranch {
                current: name == current,
                name: name.clone(),
                remote: true,
            });
        }
    }

    Ok(branches)
}

/// Switches to the given branch, creating a local tracking branch first when
/// the name only exists on the remote.
#[tauri::command]
pub fn git_checkout(path: String, branch: String) -> Result<(), String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    let branch = branch.trim().to_string();
    if branch.is_empty() {
        return Err("Branch name cannot be empty".to_string());
    }
    match run_git(&["checkout", &branch], &cwd) {
        Ok(_) => Ok(()),
        Err(_) => {
            let remote_ref = format!("origin/{}", branch);
            run_git(&["checkout", "-b", &branch, &remote_ref], &cwd).map(|_| ())
        }
    }
}

/// Stashes all uncommitted changes.
#[tauri::command]
pub fn git_stash(path: String) -> Result<String, String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    let output = run_git(&["stash", "push", "-m", "IDEOCODE GUI stash"], &cwd)?;
    Ok(output.trim().to_string())
}

/// Pulls from the remote tracking branch.
#[tauri::command]
pub fn git_pull(path: String) -> Result<String, String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    run_git(&["pull"], &cwd)
}

/// Pushes to the remote tracking branch.
#[tauri::command]
pub fn git_push(path: String) -> Result<String, String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    run_git(&["push"], &cwd)
}
