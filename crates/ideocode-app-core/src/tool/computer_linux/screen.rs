// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::{Context, Result};
use base64::Engine;

use super::ToolOutput;

pub fn screenshot() -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("screenshot.png");
    let status = std::process::Command::new("scrot")
        .arg("-z")
        .arg(&path)
        .status()
        .or_else(|_| {
            std::process::Command::new("import")
                .arg("-window")
                .arg("root")
                .arg(&path)
                .status()
        })
        .context("Failed to capture screenshot (needs scrot or imagemagick)")?;
    if !status.success() {
        anyhow::bail!("Screenshot command failed");
    }
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Screenshot captured".to_string()).with_labeled_image(
            "image/png",
            b64,
            "Screen",
        ),
    )
}

pub fn ocr(x: Option<f64>, y: Option<f64>, w: Option<f64>, h: Option<f64>) -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("ocr_region.png");
    if let (Some(rx), Some(ry), Some(rw), Some(rh)) = (x, y, w, h) {
        std::process::Command::new("import")
            .arg("-crop")
            .arg(&format!("{rw:.0}x{rh:.0}+{rx:.0}+{ry:.0}"))
            .arg(&path)
            .status()
            .context("Failed to capture region")?;
    } else {
        std::process::Command::new("scrot")
            .arg("-z")
            .arg(&path)
            .status()
            .or_else(|_| {
                std::process::Command::new("import")
                    .arg("-window")
                    .arg("root")
                    .arg(&path)
                    .status()
            })
            .context("Failed to capture screenshot")?;
    }
    let output = std::process::Command::new("tesseract")
        .arg(&path)
        .arg("stdout")
        .arg("-l")
        .arg("eng")
        .output()
        .context("Tesseract OCR failed (install tesseract-ocr)")?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(ToolOutput::new(if text.is_empty() {
        "No text found".to_string()
    } else {
        text
    }))
}
