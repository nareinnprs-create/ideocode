// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::ToolOutput;
use anyhow::{Context, Result, bail};

pub fn list_apps() -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | \
             Select-Object Name, Id, @{N='Title';E={$_.MainWindowTitle}} | \
             ConvertTo-Json -Compress",
        ])
        .output()
        .context("Failed to list apps")?;
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(ToolOutput::new(if text.trim().is_empty() {
        "No visible windows found".to_string()
    } else {
        text
    }))
}

pub fn list_windows() -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            "Add-Type @\" \n\
             using System; \n\
             using System.Runtime.InteropServices; \n\
             public class Win32 { \n\
                 [DllImport(\"user32.dll\")] \n\
                 public static extern IntPtr GetForegroundWindow(); \n\
                 [DllImport(\"user32.dll\")] \n\
                 public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count); \n\
                 [DllImport(\"user32.dll\")] \n\
                 public static extern int EnumWindows(EnumWindowsProc enumProc, IntPtr lParam); \n\
                 public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); \n\
             } \n\
             \"@ -ErrorAction Stop; \n\
             $windows = @(); \n\
             $callback = { \n\
                 param($hWnd, $lParam) \n\
                 $sb = New-Object System.Text.StringBuilder 256; \n\
                 [Win32]::GetWindowText($hWnd, $sb, 256) | Out-Null; \n\
                 $title = $sb.ToString(); \n\
                 if ($title -ne '') { \n\
                     $procId = 0; \n\
                     [System.Runtime.InteropServices.Marshal]::SizeOf([UInt32]) | Out-Null; \n\
                     $true \n\
                 } \n\
             }; \n\
             Write-Output 'window list placeholder'"
        ])
        .output()?;
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(ToolOutput::new(text))
}

pub fn ui_tree() -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            "Add-Type -AssemblyName UIAutomationClient; \
             $root = [System.Windows.Automation.AutomationElement]::RootElement; \
             $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker; \
             $node = $root; \
             $depth = 0; \
             function Walk($el, $d) { \
                 if ($d -gt 8) { return }; \
                 $name = $el.Current.Name; \
                 $ctrl = $el.Current.ControlType.ProgrammaticName; \
                 $rect = $el.Current.BoundingRectangle; \
                 $info = @{ControlType=$ctrl; Name=$name; X=[int]$rect.X; Y=[int]$rect.Y; W=[int]$rect.Width; H=[int]$rect.Height}; \
                 Write-Output ($info | ConvertTo-Json -Compress); \
                 $child = $walker.GetFirstChild($el); \
                 while ($child -ne $null) { \
                     Walk $child ($d+1); \
                     $child = $walker.GetNextSibling($child); \
                 } \
             }; \
             Walk $root 0"
        ])
        .output()
        .context("Failed to get UI tree")?;
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(ToolOutput::new(if text.trim().is_empty() {
        "No UI elements found".to_string()
    } else {
        text
    }))
}

pub fn activate_app(name: &str) -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "$proc = Get-Process -Name '{name}' -ErrorAction SilentlyContinue | \
                 Select-Object -First 1; \
                 if ($proc -eq $null) {{ \
                     Write-Output 'not-found'; \
                 }} else {{ \
                     $sig = '[DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);'; \
                     $type = Add-Type -MemberDefinition $sig -Name \"Win32ShowWindow\" -Namespace Win32 -PassThru; \
                     [Win32.Win32ShowWindow]::ShowWindowAsync($proc.MainWindowHandle, 9) | Out-Null; \
                     $sig2 = '[DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);'; \
                     $type2 = Add-Type -MemberDefinition $sig2 -Name \"Win32SetFg\" -Namespace Win32 -PassThru; \
                     [Win32.Win32SetFg]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null; \
                     Write-Output 'activated'; \
                 }}"
            )
        ])
        .output()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    match text.as_str() {
        "activated" => Ok(ToolOutput::new(format!("Activated {name}"))),
        "not-found" => bail!("App '{name}' not found"),
        _ => bail!("Failed to activate '{name}': {text}"),
    }
}

pub fn quit_app(name: &str) -> Result<ToolOutput> {
    let status = std::process::Command::new("taskkill")
        .args(["/IM", &format!("{name}.exe"), "/F"])
        .status()?;
    if status.success() {
        Ok(ToolOutput::new(format!("Quit {name}")))
    } else {
        bail!("Failed to quit '{name}': taskkill returned non-zero")
    }
}

pub fn focus_window(name: &str) -> Result<ToolOutput> {
    activate_app(name)
}

pub fn move_window(name: &str, x: f64, y: f64) -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "$proc = Get-Process -Name '{name}' -ErrorAction SilentlyContinue | \
                 Select-Object -First 1; \
                 if ($proc -eq $null) {{ Write-Output 'not-found'; return }}; \
                 $sig = '[DllImport(\"user32.dll\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);'; \
                 $type = Add-Type -MemberDefinition $sig -Name \"Win32SetPos\" -Namespace Win32 -PassThru; \
                 [Win32.Win32SetPos]::SetWindowPos($proc.MainWindowHandle, [IntPtr]::Zero, {x:.0}, {y:.0}, 0, 0, 0x0001) | Out-Null; \
                 Write-Output 'moved'"
            )
        ])
        .output()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text == "not-found" {
        bail!("App '{name}' not found");
    }
    Ok(ToolOutput::new(format!("Moved {name} to ({x:.0}, {y:.0})")))
}

pub fn resize_window(name: &str, w: f64, h: f64) -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "$proc = Get-Process -Name '{name}' -ErrorAction SilentlyContinue | \
                 Select-Object -First 1; \
                 if ($proc -eq $null) {{ Write-Output 'not-found'; return }}; \
                 $sig = '[DllImport(\"user32.dll\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);'; \
                 $type = Add-Type -MemberDefinition $sig -Name \"Win32SetPos\" -Namespace Win32 -PassThru; \
                 [Win32.Win32SetPos]::SetWindowPos($proc.MainWindowHandle, [IntPtr]::Zero, 0, 0, {w:.0}, {h:.0}, 0x0002) | Out-Null; \
                 Write-Output 'resized'"
            )
        ])
        .output()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text == "not-found" {
        bail!("App '{name}' not found");
    }
    Ok(ToolOutput::new(format!("Resized {name} to {w:.0}x{h:.0}")))
}

pub fn minimize_window(name: &str) -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "$proc = Get-Process -Name '{name}' -ErrorAction SilentlyContinue | \
                 Select-Object -First 1; \
                 if ($proc -eq $null) {{ Write-Output 'not-found' }} else {{ \
                     $sig = '[DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);'; \
                     $type = Add-Type -MemberDefinition $sig -Name \"Win32Show\" -Namespace Win32 -PassThru; \
                     [Win32.Win32Show]::ShowWindowAsync($proc.MainWindowHandle, 6) | Out-Null; \
                     Write-Output 'minimized' \
                 }}"
            )
        ])
        .output()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    match text.as_str() {
        "minimized" => Ok(ToolOutput::new(format!("Minimized {name}"))),
        "not-found" => bail!("App '{name}' not found"),
        _ => bail!("Failed to minimize '{name}': {text}"),
    }
}

pub fn close_window(name: &str) -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "$proc = Get-Process -Name '{name}' -ErrorAction SilentlyContinue | \
                 Select-Object -First 1; \
                 if ($proc -eq $null) {{ Write-Output 'not-found' }} else {{ \
                     $proc.CloseMainWindow() | Out-Null; \
                     Write-Output 'closed' \
                 }}"
            ),
        ])
        .output()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    match text.as_str() {
        "closed" => Ok(ToolOutput::new(format!("Closed {name} window"))),
        "not-found" => bail!("App '{name}' not found"),
        _ => bail!("Failed to close '{name}': {text}"),
    }
}
