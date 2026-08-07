// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Issue {
    pub id: String,
    pub title: String,
    pub body: String,
    pub state: String,
    pub url: String,
    pub source: String,
    pub repository: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub labels: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResult {
    pub fetched: usize,
    pub source: String,
    pub repository: String,
}

fn issues_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("issues"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/issues"))
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn load_issues() -> Vec<Issue> {
    let dir = issues_dir();
    if !dir.exists() {
        return Vec::new();
    }
    let mut issues = Vec::new();
    if let Ok(read) = std::fs::read_dir(&dir) {
        for entry in read.flatten() {
            if entry
                .path()
                .extension()
                .map(|e| e == "json")
                .unwrap_or(false)
            {
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    if let Ok(parsed) = serde_json::from_str::<Issue>(&content) {
                        issues.push(parsed);
                    }
                }
            }
        }
    }
    issues.sort_by_key(|i| std::cmp::Reverse(i.updated_at));
    issues
}

fn save_issues(issues: &[Issue]) {
    let dir = issues_dir();
    let _ = std::fs::create_dir_all(&dir);
    for issue in issues {
        let path = dir.join(format!(
            "{}_{}.json",
            super::sanitize_id(&issue.source),
            super::sanitize_id(&issue.id)
        ));
        if let Ok(json) = serde_json::to_string_pretty(issue) {
            let _ = std::fs::write(&path, json);
        }
    }
}

#[tauri::command]
pub fn list_issues(source: Option<String>) -> Vec<Issue> {
    let issues = load_issues();
    if let Some(src) = source {
        issues.into_iter().filter(|i| i.source == src).collect()
    } else {
        issues
    }
}

#[tauri::command]
pub fn search_issues(query: String) -> Vec<Issue> {
    let issues = load_issues();
    let q = query.to_lowercase();
    issues
        .into_iter()
        .filter(|i| {
            i.title.to_lowercase().contains(&q)
                || i.body.to_lowercase().contains(&q)
                || i.labels.iter().any(|l| l.to_lowercase().contains(&q))
                || i.repository.to_lowercase().contains(&q)
        })
        .collect()
}

#[tauri::command]
pub fn fetch_github_issues(
    owner: String,
    repo: String,
    token: String,
) -> Result<FetchResult, String> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/issues?state=all&per_page=100&sort=updated",
        owner, repo
    );

    let client = reqwest::blocking::Client::builder()
        .user_agent("IDEOCODE/0.61.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "GitHub API returned {}: {}",
            response.status(),
            response.text().unwrap_or_default()
        ));
    }

    let json: Vec<serde_json::Value> = response
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let mut issues = load_issues();
    let now = now_secs();

    for item in &json {
        let id = item["number"].as_u64().unwrap_or(0).to_string();
        let title = item["title"].as_str().unwrap_or("").to_string();
        let body = item["body"].as_str().unwrap_or("").to_string();
        let state = item["state"].as_str().unwrap_or("open").to_string();
        let html_url = item["html_url"].as_str().unwrap_or("").to_string();
        let created = item["created_at"].as_str().unwrap_or("");
        let updated = item["updated_at"].as_str().unwrap_or("");
        let labels: Vec<String> = item["labels"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|l| l["name"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        let created_ts = parse_github_time(created).unwrap_or(now);
        let updated_ts = parse_github_time(updated).unwrap_or(now);

        // Don't add PRs (GitHub Issues API includes PRs)
        if item["pull_request"].is_object() {
            continue;
        }

        let existing = issues.iter_mut().find(|i| {
            i.id == id && i.source == "github" && i.repository == format!("{}/{}", owner, repo)
        });
        if let Some(existing) = existing {
            existing.title = title;
            existing.body = body;
            existing.state = state;
            existing.url = html_url;
            existing.updated_at = updated_ts;
            existing.labels = labels;
        } else {
            issues.push(Issue {
                id,
                title,
                body,
                state,
                url: html_url,
                source: "github".into(),
                repository: format!("{}/{}", owner, repo),
                created_at: created_ts,
                updated_at: updated_ts,
                labels,
            });
        }
    }

    save_issues(&issues);
    Ok(FetchResult {
        fetched: json.len(),
        source: "github".into(),
        repository: format!("{}/{}", owner, repo),
    })
}

fn parse_github_time(s: &str) -> Option<u64> {
    // GitHub format: 2024-01-15T10:30:00Z
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        Some(dt.timestamp() as u64)
    } else {
        None
    }
}
