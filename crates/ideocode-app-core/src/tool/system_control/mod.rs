// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result, bail};
use async_trait::async_trait;
use base64::Engine;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct SystemControlTool;

impl SystemControlTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Debug, Deserialize)]
#[allow(
    dead_code,
    reason = "fields used for future dispatch actions; kept for schema completeness"
)]
struct SystemInput {
    action: String,
    #[serde(default)]
    device: Option<String>,
    #[serde(default)]
    level: Option<f64>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    address: Option<String>,
    #[serde(default)]
    width: Option<u32>,
    #[serde(default)]
    height: Option<u32>,
    #[serde(default)]
    refresh_rate: Option<u32>,
    #[serde(default)]
    timeout_secs: Option<u64>,
}

#[async_trait]
impl Tool for SystemControlTool {
    fn name(&self) -> &str {
        "system_control"
    }

    fn description(&self) -> &str {
        "Control system-level hardware and settings: volume (get/set/mute), \
         power (battery status, sleep, lock, hibernate), display (list monitors, \
         resolution), bluetooth (scan, pair, connect/disconnect), \
         camera (capture photo), microphone (capture audio), \
         and system settings (brightness, night light). \
         Platform support varies: Windows uses PowerShell, macOS uses osascript, \
         Linux uses pactl/amixer/upower/bluetoothctl."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "enum": [
                        "volume_get", "volume_set", "volume_mute",
                        "power_battery", "power_sleep", "power_lock", "power_hibernate",
                        "display_list", "display_resolution",
                        "bluetooth_scan", "bluetooth_pair", "bluetooth_connect", "bluetooth_disconnect",
                        "camera_photo", "mic_audio",
                        "brightness_get", "brightness_set"
                    ],
                    "description": "The system control action to perform."
                },
                "device": { "type": "string", "description": "Device name or identifier." },
                "level": { "type": "number", "description": "Level 0.0-1.0 (volume, brightness)." },
                "name": { "type": "string", "description": "Bluetooth device name." },
                "address": { "type": "string", "description": "Bluetooth MAC address." },
                "width": { "type": "integer", "description": "Display width in pixels." },
                "height": { "type": "integer", "description": "Display height in pixels." },
                "refresh_rate": { "type": "integer", "description": "Display refresh rate in Hz." },
                "timeout_secs": { "type": "integer", "description": "Timeout in seconds." }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let parsed: SystemInput =
            serde_json::from_value(input).context("invalid `system_control` tool input")?;
        tokio::task::spawn_blocking(move || dispatch(&parsed.action, &parsed))
            .await
            .context("system_control tool task panicked")?
    }
}

fn dispatch(action: &str, input: &SystemInput) -> Result<ToolOutput> {
    match action {
        "volume_get" => platform_volume_get(),
        "volume_set" => platform_volume_set(input.level.context("volume_set requires `level`")?),
        "volume_mute" => platform_volume_mute(),
        "power_battery" => platform_power_battery(),
        "power_sleep" => platform_power_sleep(),
        "power_lock" => platform_power_lock(),
        "power_hibernate" => platform_power_hibernate(),
        "display_list" => platform_display_list(),
        "display_resolution" => platform_display_resolution(
            input.width.context("display_resolution requires `width`")?,
            input
                .height
                .context("display_resolution requires `height`")?,
            input.refresh_rate,
        ),
        "bluetooth_scan" => platform_bluetooth_scan(),
        "bluetooth_pair" => platform_bluetooth_pair(
            input
                .address
                .as_deref()
                .context("bluetooth_pair requires `address`")?,
        ),
        "bluetooth_connect" => platform_bluetooth_connect(
            input
                .address
                .as_deref()
                .context("bluetooth_connect requires `address`")?,
        ),
        "bluetooth_disconnect" => platform_bluetooth_disconnect(
            input
                .address
                .as_deref()
                .context("bluetooth_disconnect requires `address`")?,
        ),
        "camera_photo" => platform_camera_photo(),
        "mic_audio" => platform_mic_audio(input.timeout_secs.unwrap_or(3)),
        "brightness_get" => platform_brightness_get(),
        "brightness_set" => {
            platform_brightness_set(input.level.context("brightness_set requires `level`")?)
        }
        _ => bail!("Unknown system_control action: {action}"),
    }
}

// --- Platform implementations ---

fn run_cmd(program: &str, args: &[&str]) -> Result<String> {
    let output = std::process::Command::new(program).args(args).output()?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

// -- Volume --

#[cfg(windows)]
fn platform_volume_get() -> Result<ToolOutput> {
    let out = run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; \
         $vol = [System.Windows.Forms.Audio]::Volume; \
         Write-Output $vol",
        ],
    )?;
    Ok(ToolOutput::new(format!("Volume: {out}")))
}

#[cfg(target_os = "macos")]
fn platform_volume_get() -> Result<ToolOutput> {
    let out = run_cmd(
        "osascript",
        &["-e", "output volume of (get volume settings)"],
    )?;
    Ok(ToolOutput::new(format!("Volume: {out}%")))
}

#[cfg(target_os = "linux")]
fn platform_volume_get() -> Result<ToolOutput> {
    let out = run_cmd("pactl", &["get-sink-volume", "@DEFAULT_SINK@"])
        .or_else(|_| run_cmd("amixer", &["sget", "Master"]))?;
    Ok(ToolOutput::new(out))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_volume_get() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Volume control not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_volume_set(level: f64) -> Result<ToolOutput> {
    let pct = (level * 100.0) as u32;
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
             [System.Windows.Forms.Audio]::Volume = {pct}"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Volume set to {pct}%")))
}

#[cfg(target_os = "macos")]
fn platform_volume_set(level: f64) -> Result<ToolOutput> {
    let pct = (level * 100.0) as u32;
    run_cmd(
        "osascript",
        &["-e", &format!("set volume output volume {pct}")],
    )?;
    Ok(ToolOutput::new(format!("Volume set to {pct}%")))
}

#[cfg(target_os = "linux")]
fn platform_volume_set(level: f64) -> Result<ToolOutput> {
    let pct = (level * 100.0) as u32;
    run_cmd(
        "pactl",
        &["set-sink-volume", "@DEFAULT_SINK@", &format!("{pct}%")],
    )
    .or_else(|_| run_cmd("amixer", &["sset", "Master", &format!("{pct}%")]))?;
    Ok(ToolOutput::new(format!("Volume set to {pct}%")))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_volume_set(_level: f64) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Volume control not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_volume_mute() -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "$obj = New-Object -ComObject wscript.shell; \
         $obj.SendKeys([char]173)",
        ],
    )?;
    Ok(ToolOutput::new("Volume toggled mute"))
}

#[cfg(target_os = "macos")]
fn platform_volume_mute() -> Result<ToolOutput> {
    run_cmd(
        "osascript",
        &[
            "-e",
            "set volume output muted not (output muted of (get volume settings))",
        ],
    )?;
    Ok(ToolOutput::new("Volume toggled mute"))
}

#[cfg(target_os = "linux")]
fn platform_volume_mute() -> Result<ToolOutput> {
    run_cmd("pactl", &["set-sink-mute", "@DEFAULT_SINK@", "toggle"])
        .or_else(|_| run_cmd("amixer", &["sset", "Master", "toggle"]))?;
    Ok(ToolOutput::new("Volume toggled mute"))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_volume_mute() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Volume control not supported on this platform".to_string(),
    ))
}

// -- Power --

#[cfg(windows)]
fn platform_power_battery() -> Result<ToolOutput> {
    let out = run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus, EstimatedRunTime | ConvertTo-Json",
        ],
    )?;
    Ok(ToolOutput::new(if out.is_empty() {
        "No battery found".to_string()
    } else {
        out
    }))
}

#[cfg(target_os = "macos")]
fn platform_power_battery() -> Result<ToolOutput> {
    let out = run_cmd("pmset", &["-g", "batt"])?;
    Ok(ToolOutput::new(out))
}

#[cfg(target_os = "linux")]
fn platform_power_battery() -> Result<ToolOutput> {
    let out =
        run_cmd("upower", &["-i", "$(upower -e | grep BAT)"]).or_else(|_| run_cmd("acpi", &[]))?;
    Ok(ToolOutput::new(out))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_power_battery() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Battery status not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_power_sleep() -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; \
         [System.Windows.Forms.Application]::SetSuspendState('Sleep', $false, $false)",
        ],
    )?;
    Ok(ToolOutput::new("System going to sleep"))
}

#[cfg(target_os = "macos")]
fn platform_power_sleep() -> Result<ToolOutput> {
    run_cmd("osascript", &["-e", "tell app \"System Events\" to sleep"])?;
    Ok(ToolOutput::new("System going to sleep"))
}

#[cfg(target_os = "linux")]
fn platform_power_sleep() -> Result<ToolOutput> {
    run_cmd("systemctl", &["suspend"])?;
    Ok(ToolOutput::new("System going to sleep"))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_power_sleep() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Sleep not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_power_lock() -> Result<ToolOutput> {
    run_cmd("rundll32.exe", &["user32.dll,LockWorkStation"])?;
    Ok(ToolOutput::new("Workstation locked"))
}

#[cfg(target_os = "macos")]
fn platform_power_lock() -> Result<ToolOutput> {
    run_cmd(
        "osascript",
        &[
            "-e",
            "tell app \"System Events\" to keystroke \"q\" using {command down, control down}",
        ],
    )?;
    Ok(ToolOutput::new("Screen locked"))
}

#[cfg(target_os = "linux")]
fn platform_power_lock() -> Result<ToolOutput> {
    run_cmd("xdg-screensaver", &["lock"])
        .or_else(|_| run_cmd("gnome-screensaver-command", &["--lock"]))
        .or_else(|_| run_cmd("loginctl", &["lock-session"]))?;
    Ok(ToolOutput::new("Screen locked"))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_power_lock() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Lock not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_power_hibernate() -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; \
         [System.Windows.Forms.Application]::SetSuspendState('Hibernate', $false, $false)",
        ],
    )?;
    Ok(ToolOutput::new("System hibernating"))
}

#[cfg(target_os = "macos")]
fn platform_power_hibernate() -> Result<ToolOutput> {
    run_cmd("osascript", &["-e", "tell app \"System Events\" to sleep"])?;
    Ok(ToolOutput::new(
        "System sleeping (macOS has no separate hibernate)",
    ))
}

#[cfg(target_os = "linux")]
fn platform_power_hibernate() -> Result<ToolOutput> {
    run_cmd("systemctl", &["hibernate"])?;
    Ok(ToolOutput::new("System hibernating"))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_power_hibernate() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Hibernate not supported on this platform".to_string(),
    ))
}

// -- Display --

#[cfg(windows)]
fn platform_display_list() -> Result<ToolOutput> {
    let out = run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; \
         $screens = [System.Windows.Forms.Screen]::AllScreens; \
         $screens | Select-Object DeviceName, Bounds, Primary, WorkingArea | ConvertTo-Json",
        ],
    )?;
    Ok(ToolOutput::new(out))
}

#[cfg(target_os = "macos")]
fn platform_display_list() -> Result<ToolOutput> {
    let out = run_cmd("system_profiler", &["SPDisplaysDataType"])?;
    Ok(ToolOutput::new(out))
}

#[cfg(target_os = "linux")]
fn platform_display_list() -> Result<ToolOutput> {
    let out = run_cmd("xrandr", &["--query"]).or_else(|_| run_cmd("wlr-randr", &[]))?;
    Ok(ToolOutput::new(out))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_display_list() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Display info not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_display_resolution(
    width: u32,
    height: u32,
    _refresh: Option<u32>,
) -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
             [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width = {width}; \
             [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height = {height}"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!(
        "Resolution set to {width}x{height}"
    )))
}

#[cfg(target_os = "macos")]
fn platform_display_resolution(
    width: u32,
    height: u32,
    refresh: Option<u32>,
) -> Result<ToolOutput> {
    let mode = if let Some(r) = refresh {
        format!("{}x{}@{}", width, height, r)
    } else {
        format!("{}x{}", width, height)
    };
    run_cmd(
        "osascript",
        &[
            "-e",
            &format!(
                "tell app \"System Events\" to tell appearance preferences to set resolution to {{{width}, {height}}}"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Resolution set to {mode}")))
}

#[cfg(target_os = "linux")]
fn platform_display_resolution(
    width: u32,
    height: u32,
    _refresh: Option<u32>,
) -> Result<ToolOutput> {
    run_cmd("xrandr", &["-s", &format!("{width}x{height}")])?;
    Ok(ToolOutput::new(format!(
        "Resolution set to {width}x{height}"
    )))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_display_resolution(_w: u32, _h: u32, _r: Option<u32>) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Display control not supported on this platform".to_string(),
    ))
}

// -- Bluetooth --

#[cfg(windows)]
fn platform_bluetooth_scan() -> Result<ToolOutput> {
    let out = run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Get-WmiObject -Class BluetoothDevice | Select-Object Name, Address, Connected | ConvertTo-Json",
        ],
    )?;
    Ok(ToolOutput::new(if out.is_empty() {
        "No Bluetooth devices found".to_string()
    } else {
        out
    }))
}

#[cfg(target_os = "macos")]
fn platform_bluetooth_scan() -> Result<ToolOutput> {
    let out = run_cmd("system_profiler", &["SPBluetoothDataType"])?;
    Ok(ToolOutput::new(out))
}

#[cfg(target_os = "linux")]
fn platform_bluetooth_scan() -> Result<ToolOutput> {
    let out = run_cmd("bluetoothctl", &["scan", "on"])?;
    Ok(ToolOutput::new(out))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_bluetooth_scan() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Bluetooth not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_bluetooth_pair(address: &str) -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                  $bt = New-Object -ComObject BluetoothDevice; \
                  $bt.Pair('{address}')"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Paired with {address}")))
}

#[cfg(target_os = "macos")]
fn platform_bluetooth_pair(address: &str) -> Result<ToolOutput> {
    run_cmd(
        "osascript",
        &[
            "-e",
            &format!(
                "tell application \"System Events\" to tell process \"bluetoothd\" to pair \"{address}\""
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Paired with {address}")))
}

#[cfg(target_os = "linux")]
fn platform_bluetooth_pair(address: &str) -> Result<ToolOutput> {
    run_cmd("bluetoothctl", &["pair", address])?;
    Ok(ToolOutput::new(format!("Paired with {address}")))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_bluetooth_pair(_addr: &str) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Bluetooth not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_bluetooth_connect(address: &str) -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                  $bt = New-Object -ComObject BluetoothDevice; \
                  $bt.Connect('{address}')"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Connected to {address}")))
}

#[cfg(target_os = "macos")]
fn platform_bluetooth_connect(address: &str) -> Result<ToolOutput> {
    run_cmd(
        "osascript",
        &[
            "-e",
            &format!(
                "tell application \"System Events\" to tell process \"bluetoothd\" to connect \"{address}\""
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Connected to {address}")))
}

#[cfg(target_os = "linux")]
fn platform_bluetooth_connect(address: &str) -> Result<ToolOutput> {
    run_cmd("bluetoothctl", &["connect", address])?;
    Ok(ToolOutput::new(format!("Connected to {address}")))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_bluetooth_connect(_addr: &str) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Bluetooth not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_bluetooth_disconnect(address: &str) -> Result<ToolOutput> {
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                  $bt = New-Object -ComObject BluetoothDevice; \
                  $bt.Disconnect('{address}')"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Disconnected from {address}")))
}

#[cfg(target_os = "macos")]
fn platform_bluetooth_disconnect(address: &str) -> Result<ToolOutput> {
    run_cmd(
        "osascript",
        &[
            "-e",
            &format!(
                "tell application \"System Events\" to tell process \"bluetoothd\" to disconnect \"{address}\""
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Disconnected from {address}")))
}

#[cfg(target_os = "linux")]
fn platform_bluetooth_disconnect(address: &str) -> Result<ToolOutput> {
    run_cmd("bluetoothctl", &["disconnect", address])?;
    Ok(ToolOutput::new(format!("Disconnected from {address}")))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_bluetooth_disconnect(_addr: &str) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Bluetooth not supported on this platform".to_string(),
    ))
}

// -- Camera --

#[cfg(windows)]
fn platform_camera_photo() -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("camera.jpg");
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
             Add-Type -AssemblyName System.Drawing; \
             $cap = New-Object -ComObject WIA.CommonDialog; \
             $img = $cap.ShowAcquireImage(); \
             $img.SaveFile('{}')",
                path.to_string_lossy()
            ),
        ],
    )?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Camera photo captured".to_string()).with_labeled_image(
            "image/jpeg",
            b64,
            "Camera",
        ),
    )
}

#[cfg(target_os = "macos")]
fn platform_camera_photo() -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("camera.jpg");
    run_cmd("imagesnap", &[&path.to_string_lossy()])?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Camera photo captured".to_string()).with_labeled_image(
            "image/jpeg",
            b64,
            "Camera",
        ),
    )
}

#[cfg(target_os = "linux")]
fn platform_camera_photo() -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("camera.jpg");
    run_cmd(
        "ffmpeg",
        &[
            "-f",
            "v4l2",
            "-i",
            "/dev/video0",
            "-vframes",
            "1",
            &path.to_string_lossy(),
        ],
    )?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Camera photo captured".to_string()).with_labeled_image(
            "image/jpeg",
            b64,
            "Camera",
        ),
    )
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_camera_photo() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Camera not supported on this platform".to_string(),
    ))
}

// -- Microphone --

#[cfg(windows)]
fn platform_mic_audio(timeout: u64) -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("mic.wav");
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
             $capture = New-Object -ComObject SoundCapture; \
             $capture.Record('{}', {timeout})",
                path.to_string_lossy()
            ),
        ],
    )?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Microphone audio captured".to_string()).with_labeled_image(
            "audio/wav",
            b64,
            "Microphone",
        ),
    )
}

#[cfg(target_os = "macos")]
fn platform_mic_audio(timeout: u64) -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("mic.wav");
    run_cmd(
        "sox",
        &[
            "-d",
            "-t",
            "wav",
            &path.to_string_lossy(),
            "trim",
            "0",
            &timeout.to_string(),
        ],
    )?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Microphone audio captured".to_string()).with_labeled_image(
            "audio/wav",
            b64,
            "Microphone",
        ),
    )
}

#[cfg(target_os = "linux")]
fn platform_mic_audio(timeout: u64) -> Result<ToolOutput> {
    let tmp = tempfile::tempdir()?;
    let path = tmp.path().join("mic.wav");
    run_cmd(
        "parec",
        &[
            "--device=@DEFAULT_SOURCE@",
            "--format=s16le",
            "--rate=44100",
            "--channels=1",
            &format!("--latency={}", timeout * 1000),
            &path.to_string_lossy(),
        ],
    )?;
    let data = std::fs::read(&path)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(
        ToolOutput::new("Microphone audio captured".to_string()).with_labeled_image(
            "audio/wav",
            b64,
            "Microphone",
        ),
    )
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_mic_audio(_timeout: u64) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Microphone not supported on this platform".to_string(),
    ))
}

// -- Brightness --

#[cfg(windows)]
fn platform_brightness_get() -> Result<ToolOutput> {
    let out = run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness | \
         Select-Object CurrentBrightness | ConvertTo-Json",
        ],
    )?;
    Ok(ToolOutput::new(out))
}

#[cfg(target_os = "macos")]
fn platform_brightness_get() -> Result<ToolOutput> {
    let out = run_cmd(
        "osascript",
        &[
            "-e",
            "tell app \"System Events\" to tell appearance preferences to get brightness",
        ],
    )?;
    Ok(ToolOutput::new(format!("Brightness: {out}")))
}

#[cfg(target_os = "linux")]
fn platform_brightness_get() -> Result<ToolOutput> {
    let out = run_cmd("brightnessctl", &["g"])
        .or_else(|_| run_cmd("xbacklight", &["-get"]))
        .or_else(|_| {
            let raw = std::fs::read_to_string("/sys/class/backlight/*/brightness")
                .map(|s| s.trim().to_string());
            raw.map_err(|e| anyhow::anyhow!("{}", e))
        })?;
    Ok(ToolOutput::new(format!("Brightness: {out}")))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_brightness_get() -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Brightness not supported on this platform".to_string(),
    ))
}

#[cfg(windows)]
fn platform_brightness_set(level: f64) -> Result<ToolOutput> {
    let pct = (level * 100.0) as u32;
    run_cmd(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            &format!(
                "$monitor = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods; \
             $monitor.WmiSetBrightness({pct}, 0)"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Brightness set to {pct}%")))
}

#[cfg(target_os = "macos")]
fn platform_brightness_set(level: f64) -> Result<ToolOutput> {
    let pct = (level * 100.0) as u32;
    run_cmd(
        "osascript",
        &[
            "-e",
            &format!(
                "tell app \"System Events\" to tell appearance preferences to set brightness to {pct}"
            ),
        ],
    )?;
    Ok(ToolOutput::new(format!("Brightness set to {pct}%")))
}

#[cfg(target_os = "linux")]
fn platform_brightness_set(level: f64) -> Result<ToolOutput> {
    let pct = (level * 100000.0) as u32;
    run_cmd("brightnessctl", &["s", &pct.to_string()]).or_else(|_| {
        let pct_f = level;
        run_cmd("xbacklight", &["-set", &format!("{:.0}", pct_f * 100.0)])
    })?;
    Ok(ToolOutput::new(format!(
        "Brightness set to {:.0}%",
        level * 100.0
    )))
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn platform_brightness_set(_level: f64) -> Result<ToolOutput> {
    Ok(ToolOutput::new(
        "Brightness not supported on this platform".to_string(),
    ))
}
