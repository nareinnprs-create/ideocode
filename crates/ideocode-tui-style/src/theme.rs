// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use crate::color;
use crate::color::rgb;
use ratatui::prelude::*;

// ── NEON CYBERPUNK PALETTE ──────────────────────────────────────────
// Inspired by: Cyberpunk 2077, synthwave, neon-lit cityscapes.
// Primary triad: Cyan #00f0ff · Magenta #ff00ff · Purple #8b5cf6
// Background: deep dark #0a0a0f with subtle blue undertone.

/// Neon Cyan — primary accent, AI color, links, active elements.
pub fn neon_cyan() -> Color {
    rgb(0, 240, 255)
}
/// Neon Magenta — secondary accent, user messages, highlights.
pub fn neon_magenta() -> Color {
    rgb(255, 0, 255)
}
/// Neon Purple — tertiary accent, tool calls, decorative.
pub fn neon_purple() -> Color {
    rgb(139, 92, 246)
}
/// Neon Pink — system messages, warnings, personality.
pub fn neon_pink() -> Color {
    rgb(255, 107, 157)
}
/// Neon Green — success, completed, git clean.
pub fn neon_green() -> Color {
    rgb(0, 255, 136)
}
/// Neon Yellow — queued, pending, attention.
pub fn neon_yellow() -> Color {
    rgb(255, 234, 0)
}
/// Neon Orange — warnings, in-progress, streaks.
pub fn neon_orange() -> Color {
    rgb(255, 159, 67)
}
/// Neon Blue — info, connection status, secondary actions.
pub fn neon_blue() -> Color {
    rgb(59, 130, 246)
}

// ── SEMANTIC COLORS (Neon Cyberpunk) ────────────────────────────────

pub fn user_color() -> Color {
    neon_magenta()
}
pub fn ai_color() -> Color {
    neon_cyan()
}
pub fn tool_color() -> Color {
    neon_purple()
}
pub fn file_link_color() -> Color {
    rgb(100, 200, 255)
}
pub fn dim_color() -> Color {
    rgb(80, 80, 100)
}
pub fn accent_color() -> Color {
    neon_purple()
}
pub fn system_message_color() -> Color {
    neon_pink()
}
pub fn queued_color() -> Color {
    neon_yellow()
}
pub fn asap_color() -> Color {
    neon_cyan()
}
pub fn pending_color() -> Color {
    rgb(100, 100, 120)
}
pub fn user_text() -> Color {
    rgb(255, 200, 240)
}
pub fn user_bg() -> Color {
    rgb(30, 15, 35)
}
pub fn ai_text() -> Color {
    rgb(200, 255, 255)
}
pub fn header_icon_color() -> Color {
    neon_cyan()
}
pub fn header_name_color() -> Color {
    neon_cyan()
}
pub fn header_session_color() -> Color {
    rgb(255, 255, 255)
}

// Spinner frames for animated status. Keep these single-cell because the fast
// spinner-only renderer patches one status cell between full TUI redraws. This
// sequence should read as a circular spin, not a grow/recede pulse.
const SPINNER_FRAMES: &[&str] = &["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/// Frame rate for slow, full-line "liveness" indicators that can only be
/// repainted by a full TUI redraw (e.g. the running-tool progress bar) when
/// decorative animations are disabled (Minimal tier, SSH, WSL, etc.). These
/// ride the ~1 Hz passive-liveness redraw, so advancing them faster would just
/// skip frames. Keep this slow so they read as alive without forcing more
/// expensive full-frame redraws.
pub const LIVENESS_INDICATOR_FPS: f32 = 1.5;

/// Frame rate for the low-cost single-cell circular spinner when decorative
/// animations are disabled. Unlike the full-line indicators above, this spinner
/// is patched by the cheap one-cell fast path between full redraws, so it can
/// animate at a smooth, responsive cadence (well above ~1 Hz) while still
/// staying very light on resources. Keep this in sync with the spinner-only
/// tick interval in the TUI run loop (`STATUS_SPINNER_ONLY_INTERVAL`, 80ms) so
/// each tick lands on exactly one new frame.
pub const LIVENESS_SPINNER_FPS: f32 = 12.5;

pub fn spinner_frame_index(elapsed: f32, fps: f32) -> usize {
    ((elapsed * fps) as usize) % SPINNER_FRAMES.len()
}

pub fn spinner_frame(elapsed: f32, fps: f32) -> &'static str {
    SPINNER_FRAMES[spinner_frame_index(elapsed, fps)]
}

/// Whether `symbol` is one of the cells owned by the primary activity spinner.
///
/// The TUI's single-cell spinner redraw uses this to avoid patching a status-row
/// cell after a late overlay, such as the slash-command palette, has taken
/// ownership of it.
pub fn is_activity_indicator_frame(symbol: &str) -> bool {
    SPINNER_FRAMES.contains(&symbol)
}

pub fn activity_indicator_frame_index(
    elapsed: f32,
    fps: f32,
    enable_decorative_animations: bool,
) -> usize {
    if enable_decorative_animations {
        spinner_frame_index(elapsed, fps)
    } else {
        // Keep ticking at the smooth liveness rate instead of freezing on a
        // single frame. The single-cell fast path repaints this cheaply, so it
        // can animate well above ~1 Hz without a full-frame redraw.
        spinner_frame_index(elapsed, LIVENESS_SPINNER_FPS)
    }
}

pub fn activity_indicator(
    elapsed: f32,
    fps: f32,
    enable_decorative_animations: bool,
) -> &'static str {
    SPINNER_FRAMES[activity_indicator_frame_index(elapsed, fps, enable_decorative_animations)]
}

/// Convert HSL to RGB (h in 0-360, s and l in 0-1)
/// Chroma color based on position and time - creates flowing rainbow wave
/// Calculate chroma color with fade-in from dim during startup
/// Calculate smooth animated color for the header (single color, no position)
pub fn color_to_floats(c: Color, fallback: (f32, f32, f32)) -> (f32, f32, f32) {
    match c {
        Color::Rgb(r, g, b) => (r as f32, g as f32, b as f32),
        Color::Indexed(n) => {
            let (r, g, b) = color::indexed_to_rgb(n);
            (r as f32, g as f32, b as f32)
        }
        _ => fallback,
    }
}

pub fn blend_color(from: Color, to: Color, t: f32) -> Color {
    let (fr, fg, fb) = color_to_floats(from, (80.0, 80.0, 80.0));
    let (tr, tg, tb) = color_to_floats(to, (200.0, 200.0, 200.0));
    let r = fr + (tr - fr) * t;
    let g = fg + (tg - fg) * t;
    let b = fb + (tb - fb) * t;
    rgb(
        r.clamp(0.0, 255.0) as u8,
        g.clamp(0.0, 255.0) as u8,
        b.clamp(0.0, 255.0) as u8,
    )
}

pub fn rainbow_prompt_color(distance: usize) -> Color {
    // Rainbow colors (hue progression): red -> orange -> yellow -> green -> cyan -> blue -> violet
    const RAINBOW: [(u8, u8, u8); 7] = [
        (255, 80, 80),   // Red (softened)
        (255, 160, 80),  // Orange
        (255, 230, 80),  // Yellow
        (80, 220, 100),  // Green
        (80, 200, 220),  // Cyan
        (100, 140, 255), // Blue
        (180, 100, 255), // Violet
    ];

    // Gray target (dim_color())
    const GRAY: (u8, u8, u8) = (80, 80, 80);

    // Exponential decay factor - how quickly we fade to gray
    // decay = e^(-distance * rate), rate of ~0.4 gives nice falloff
    let decay = (-0.4 * distance as f32).exp();

    // Select rainbow color based on distance (cycle through)
    let rainbow_idx = distance.min(RAINBOW.len() - 1);
    let (r, g, b) = RAINBOW[rainbow_idx];

    // Blend rainbow color with gray based on decay
    // At distance 0: 100% rainbow, as distance increases: approaches gray
    let blend = |rainbow: u8, gray: u8| -> u8 {
        (rainbow as f32 * decay + gray as f32 * (1.0 - decay)) as u8
    };

    rgb(blend(r, GRAY.0), blend(g, GRAY.1), blend(b, GRAY.2))
}

pub fn prompt_entry_color(base: Color, t: f32) -> Color {
    let peak = rgb(255, 230, 120);
    // Quick pulse in/out over the animation window.
    let phase = if t < 0.5 { t * 2.0 } else { (1.0 - t) * 2.0 };
    blend_color(base, peak, phase.clamp(0.0, 1.0) * 0.7)
}

pub fn prompt_entry_bg_color(base: Color, t: f32) -> Color {
    let spotlight = rgb(58, 66, 82);
    let ease_in = 1.0 - (1.0 - t).powi(3);
    let ease_out = (1.0 - t).powi(2);
    let phase = (ease_in * ease_out * 1.65).clamp(0.0, 1.0);
    blend_color(base, spotlight, phase * 0.85)
}

pub fn prompt_entry_shimmer_color(base: Color, pos: f32, t: f32) -> Color {
    let travel = (t * 1.15).clamp(0.0, 1.0);
    let width = 0.18;
    let dist = (pos - travel).abs();
    let shimmer = (1.0 - (dist / width).clamp(0.0, 1.0)).powf(2.2);
    let pulse = (1.0 - t).powf(0.55);
    let highlight = rgb(255, 248, 210);
    blend_color(base, highlight, shimmer * pulse * 0.7)
}

/// Generate an animated color that pulses between two colors
pub fn animated_tool_color(elapsed: f32, enable_decorative_animations: bool) -> Color {
    if !enable_decorative_animations {
        return tool_color();
    }

    // Cycle period of ~1.5 seconds
    let t = (elapsed * 2.0).sin() * 0.5 + 0.5; // 0.0 to 1.0

    // Neon Cyberpunk: pulse between cyan and magenta
    let r = (0.0 + t * 255.0) as u8; // 0 -> 255 (cyan to magenta)
    let g = (240.0 - t * 240.0) as u8; // 240 -> 0
    let b = (255.0 + t * 0.0) as u8; // 255 -> 255

    rgb(r, g, b)
}

// ── V2: GRADIENT TEXT ───────────────────────────────────────────────
// Char-by-char color transition for headers and important text.

/// Neon Cyberpunk gradient: Cyan → Magenta → Purple → Cyan (cycles)
/// Use `gradient_color(index, total)` for each character position.
pub fn gradient_color(index: usize, total: usize) -> Color {
    if total <= 1 {
        return neon_cyan();
    }
    // Cycle through neon triad: cyan → magenta → purple → cyan
    const GRADIENT: [(u8, u8, u8); 3] = [
        (0, 240, 255),  // Cyan
        (255, 0, 255),  // Magenta
        (139, 92, 246), // Purple
    ];
    let t = index as f32 / (total - 1) as f32;
    let segment = t * (GRADIENT.len() - 1) as f32;
    let i = segment.floor() as usize;
    let frac = segment - i as f32;
    let c0 = GRADIENT[i.min(GRADIENT.len() - 1)];
    let c1 = GRADIENT[(i + 1).min(GRADIENT.len() - 1)];
    let r = (c0.0 as f32 + (c1.0 as f32 - c0.0 as f32) * frac) as u8;
    let g = (c0.1 as f32 + (c1.1 as f32 - c0.1 as f32) * frac) as u8;
    let b = (c0.2 as f32 + (c1.2 as f32 - c0.2 as f32) * frac) as u8;
    rgb(r, g, b)
}

/// Create a gradient-styled Line from text (for headers, titles, branding).
pub fn gradient_line(text: &str) -> Line<'static> {
    let chars: Vec<char> = text.chars().collect();
    let total = chars.len();
    let spans: Vec<Span<'static>> = chars
        .into_iter()
        .enumerate()
        .map(|(i, c)| {
            Span::styled(
                c.to_string(),
                Style::default().fg(gradient_color(i, total)).bold(),
            )
        })
        .collect();
    Line::from(spans)
}

// ── V3: ANIMATED BORDERS ────────────────────────────────────────────
// Borders that slowly shift color over time. Like RGB gaming keyboard.

/// Animated border color that cycles through the neon triad.
/// `elapsed` = seconds since start, `speed` = cycles per second (default 0.1).
pub fn animated_border_color(elapsed: f32, speed: f32) -> Color {
    let t = (elapsed * speed * 2.0 * std::f32::consts::PI).sin() * 0.5 + 0.5;
    blend_color(neon_cyan(), neon_magenta(), t)
}

/// Animated border style that cycles through neon colors.
pub fn animated_border_style(elapsed: f32) -> Style {
    Style::default().fg(animated_border_color(elapsed, 0.1))
}

// ── V5: NEON GLOW EFFECTS ──────────────────────────────────────────
// Bright + bold variants for active/focused elements.

/// Neon glow style for active/focused elements (bright + bold).
pub fn neon_glow(color: Color) -> Style {
    Style::default().fg(color).add_modifier(Modifier::BOLD)
}

/// Neon glow for the header name (always glowing cyan).
pub fn header_glow_style() -> Style {
    neon_glow(neon_cyan())
}

/// Neon glow for active model name (magenta + bold).
pub fn model_glow_style() -> Style {
    neon_glow(neon_magenta())
}

/// Neon glow for tool calls (purple + bold).
pub fn tool_glow_style() -> Style {
    neon_glow(neon_purple())
}

// ── V6: EMOJI ENHANCED CHROME ──────────────────────────────────────
// Strategic emoji usage throughout the UI.

/// Emoji prefixes for different UI elements.
pub mod emoji {
    pub const ROCKET: &str = "🚀";
    pub const BRAIN: &str = "🧠";
    pub const LIGHTNING: &str = "⚡";
    pub const PAINT: &str = "🎨";
    pub const CRYSTAL: &str = "🔮";
    pub const SPARKLE: &str = "💫";
    pub const FIRE: &str = "🔥";
    pub const CHECK: &str = "✅";
    pub const WARNING: &str = "⚠️";
    pub const ERROR: &str = "❌";
    pub const INFO: &str = "ℹ️";
    pub const TROPHY: &str = "🏆";
    pub const STAR: &str = "⭐";
    pub const GEAR: &str = "⚙️";
    pub const LINK: &str = "🔗";
    pub const CHART: &str = "📊";
    pub const CLOCK: &str = "⏱️";
    pub const CASH: &str = "💰";
    pub const MEMORY: &str = "🧠";
    pub const TARGET: &str = "🎯";
    pub const SCROLL: &str = "📜";
    pub const PENCIL: &str = "✏️";
    pub const COPY: &str = "📋";
    pub const REFRESH: &str = "🔄";
    pub const SEARCH: &str = "🔍";
    pub const FOLDER: &str = "📁";
    pub const GIT: &str = "🌿";
    pub const CONNECTED: &str = "🟢";
    pub const RECONNECTING: &str = "🟡";
    pub const OFFLINE: &str = "🔴";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spinner_frames_are_circular_braille_sequence() {
        assert_eq!(
            SPINNER_FRAMES,
            &["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        );
        assert!(is_activity_indicator_frame("⠋"));
        assert!(is_activity_indicator_frame("⠏"));
        assert!(!is_activity_indicator_frame("/"));
    }

    #[test]
    fn spinner_frame_wraps_at_sequence_length() {
        let fps = 10.0;
        assert_eq!(spinner_frame(0.0, fps), "⠋");
        assert_eq!(spinner_frame(0.9, fps), "⠏");
        assert_eq!(spinner_frame(1.0, fps), "⠋");
    }

    #[test]
    fn activity_indicator_still_advances_without_decorative_animations() {
        // With decorative animations disabled the single-cell spinner must keep
        // ticking instead of freezing on one frame.
        let first = activity_indicator(0.0, 12.5, false);
        let later = activity_indicator(1.0, 12.5, false);
        assert!(SPINNER_FRAMES.contains(&first));
        assert_ne!(
            first, later,
            "liveness spinner should advance within one second"
        );
    }

    #[test]
    fn liveness_spinner_advances_smoothly_within_a_few_frames() {
        // The single-cell fast path patches one status cell per 80ms tick, so the
        // non-decorative liveness spinner should advance well faster than ~1 Hz
        // (it should not still read as frozen between consecutive fast-path ticks).
        let frame_at = |elapsed: f32| activity_indicator(elapsed, 12.5, false);
        // One 80ms fast-path tick should already move to the next frame.
        assert_ne!(
            frame_at(0.0),
            frame_at(0.08),
            "liveness spinner should advance every fast-path tick (80ms)"
        );
        // It must be meaningfully faster than the old ~1.5 Hz cadence.
        const {
            assert!(
                LIVENESS_SPINNER_FPS >= 8.0,
                "liveness spinner should animate at a smooth, responsive rate"
            );
        }
    }
}
