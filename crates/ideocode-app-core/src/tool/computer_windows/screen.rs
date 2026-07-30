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
    capture_screen(&path)?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(ToolOutput::new("Screenshot captured".to_string())
        .with_labeled_image("image/png", b64, "Screen"))
}

pub fn ocr(x: Option<f64>, y: Option<f64>, w: Option<f64>, h: Option<f64>) -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("ocr_region.png");
    if let (Some(rx), Some(ry), Some(rw), Some(rh)) = (x, y, w, h) {
        capture_region(&path, rx, ry, rw, rh)?;
    } else {
        capture_screen(&path)?;
    }
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "Add-Type -AssemblyName System.Drawing; \
                 Add-Type -AssemblyName System.Windows.Forms; \
                 $img = [System.Drawing.Image]::FromFile('{}'); \
                 $ocr = New-Object -ComObject Windows.OCR; \
                 $result = $ocr.Recognize($img); \
                 Write-Output $result.Text",
                path.to_string_lossy()
            )
        ])
        .output()
        .context("OCR via PowerShell failed")?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() {
        return Ok(ToolOutput::new("No text found in screen region".to_string()));
    }
    Ok(ToolOutput::new(text))
}

fn capture_screen(path: &std::path::Path) -> Result<()> {
    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                 Add-Type -AssemblyName System.Drawing; \
                 $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; \
                 $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height; \
                 $graphics = [System.Drawing.Graphics]::FromImage($bitmap); \
                 $graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bitmap.Size); \
                 $bitmap.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png); \
                 $graphics.Dispose(); \
                 $bitmap.Dispose()",
                path.to_string_lossy()
            )
        ])
        .status()
        .context("Failed to run PowerShell screenshot")?;
    if !status.success() {
        anyhow::bail!("PowerShell screenshot command failed");
    }
    Ok(())
}

fn capture_region(path: &std::path::Path, x: f64, y: f64, w: f64, h: f64) -> Result<()> {
    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                 Add-Type -AssemblyName System.Drawing; \
                 $bitmap = New-Object System.Drawing.Bitmap ({w:.0}), ({h:.0}); \
                 $graphics = [System.Drawing.Graphics]::FromImage($bitmap); \
                 $graphics.CopyFromScreen({x:.0}, {y:.0}, 0, 0, \
                     New-Object System.Drawing.Size({w:.0},{h:.0})); \
                 $bitmap.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png); \
                 $graphics.Dispose(); \
                 $bitmap.Dispose()",
                path.to_string_lossy()
            )
        ])
        .status()
        .context("Failed to capture screen region")?;
    if !status.success() {
        anyhow::bail!("PowerShell region capture failed");
    }
    Ok(())
}
