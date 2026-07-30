// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::{Result, bail};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;
use windows_sys::Win32::UI::WindowsAndMessaging::{GetCursorPos, SetCursorPos};

pub fn cursor_pos() -> Result<(i32, i32)> {
    let mut pt = std::mem::MaybeUninit::uninit();
    let ret = unsafe { GetCursorPos(pt.as_mut_ptr()) };
    if ret == 0 {
        bail!("GetCursorPos failed");
    }
    let pt = unsafe { pt.assume_init() };
    Ok((pt.x, pt.y))
}

pub fn move_to(x: f64, y: f64) -> Result<()> {
    let ret = unsafe { SetCursorPos(x as i32, y as i32) };
    if ret == 0 {
        bail!("SetCursorPos failed");
    }
    Ok(())
}

pub fn click(x: Option<f64>, y: Option<f64>, times: u32) -> Result<(f64, f64)> {
    let (cx, cy) = resolve_xy(x, y)?;
    move_to(cx, cy)?;
    std::thread::sleep(std::time::Duration::from_millis(30));
    for _ in 0..times {
        send_mouse(MOUSEEVENTF_LEFTDOWN, 0, 0, 0);
        std::thread::sleep(std::time::Duration::from_millis(10));
        send_mouse(MOUSEEVENTF_LEFTUP, 0, 0, 0);
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    Ok((cx, cy))
}

pub fn right_click(x: Option<f64>, y: Option<f64>) -> Result<(f64, f64)> {
    let (cx, cy) = resolve_xy(x, y)?;
    move_to(cx, cy)?;
    std::thread::sleep(std::time::Duration::from_millis(30));
    send_mouse(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0);
    std::thread::sleep(std::time::Duration::from_millis(10));
    send_mouse(MOUSEEVENTF_RIGHTUP, 0, 0, 0);
    Ok((cx, cy))
}

pub fn drag(from_x: f64, from_y: f64, to_x: f64, to_y: f64) -> Result<()> {
    move_to(from_x, from_y)?;
    std::thread::sleep(std::time::Duration::from_millis(30));
    send_mouse(MOUSEEVENTF_LEFTDOWN, 0, 0, 0);
    let steps = 20;
    for i in 1..=steps {
        let t = i as f64 / steps as f64;
        let cx = from_x + (to_x - from_x) * t;
        let cy = from_y + (to_y - from_y) * t;
        move_to(cx, cy)?;
        std::thread::sleep(std::time::Duration::from_millis(8));
    }
    std::thread::sleep(std::time::Duration::from_millis(30));
    send_mouse(MOUSEEVENTF_LEFTUP, 0, 0, 0);
    Ok(())
}

pub fn scroll(_x: Option<f64>, _y: Option<f64>, _dx: i32, dy: i32) -> Result<()> {
    send_mouse(MOUSEEVENTF_WHEEL, 0, 0, (dy * 120) as u32);
    Ok(())
}

pub fn type_text(text: &str) -> Result<()> {
    for c in text.chars() {
        type_char(c)?;
        std::thread::sleep(std::time::Duration::from_millis(5));
    }
    Ok(())
}

fn type_char(c: char) -> Result<()> {
    let vk = char_to_vk(c);
    if vk == 0 {
        return Ok(());
    }
    press_key(vk, false)?;
    std::thread::sleep(std::time::Duration::from_millis(5));
    release_key(vk)?;
    Ok(())
}

pub fn key_chord(chord: &str) -> Result<()> {
    let keys = chord.split('+').map(|k| k.trim()).collect::<Vec<_>>();
    let mut vk_codes = Vec::new();
    for k in &keys {
        vk_codes.push(vk_from_name(k));
    }
    for &vk in &vk_codes {
        if vk != 0 {
            press_key(vk, false)?;
        }
    }
    std::thread::sleep(std::time::Duration::from_millis(20));
    for &vk in vk_codes.iter().rev() {
        if vk != 0 {
            release_key(vk)?;
        }
    }
    Ok(())
}

fn press_key(vk: u16, _extended: bool) -> Result<()> {
    let input = KEYBDINPUT {
        wVk: vk,
        wScan: 0,
        dwFlags: 0,
        time: 0,
        dwExtraInfo: 0,
    };
    let sz = std::mem::size_of::<INPUT>() as i32;
    let sent = unsafe {
        SendInput(
            1,
            std::mem::transmute::<*const KEYBDINPUT, *const INPUT>(&input as *const _),
            sz,
        )
    };
    if sent != 1 {
        bail!("SendInput key_down failed");
    }
    Ok(())
}

fn release_key(vk: u16) -> Result<()> {
    let input = KEYBDINPUT {
        wVk: vk,
        wScan: 0,
        dwFlags: KEYEVENTF_KEYUP,
        time: 0,
        dwExtraInfo: 0,
    };
    let sz = std::mem::size_of::<INPUT>() as i32;
    let sent = unsafe {
        SendInput(
            1,
            std::mem::transmute::<*const KEYBDINPUT, *const INPUT>(&input as *const _),
            sz,
        )
    };
    if sent != 1 {
        bail!("SendInput key_up failed");
    }
    Ok(())
}

fn vk_from_name(name: &str) -> u16 {
    match name.to_lowercase().as_str() {
        "ctrl" | "control" => VK_CONTROL,
        "shift" => VK_SHIFT,
        "alt" | "menu" => VK_MENU,
        "win" | "lwin" | "meta" => VK_LWIN,
        "rwin" => VK_RWIN,
        "tab" => VK_TAB,
        "return" | "enter" => VK_RETURN,
        "esc" | "escape" => VK_ESCAPE,
        "space" | " " => VK_SPACE,
        "backspace" | "bs" => VK_BACK,
        "delete" | "del" => VK_DELETE,
        "insert" | "ins" => VK_INSERT,
        "home" => VK_HOME,
        "end" => VK_END,
        "pageup" | "pgup" => VK_PRIOR,
        "pagedown" | "pgdn" => VK_NEXT,
        "up" | "uparrow" => VK_UP,
        "down" | "downarrow" => VK_DOWN,
        "left" | "leftarrow" => VK_LEFT,
        "right" | "rightarrow" => VK_RIGHT,
        "f1" => VK_F1, "f2" => VK_F2, "f3" => VK_F3, "f4" => VK_F4,
        "f5" => VK_F5, "f6" => VK_F6, "f7" => VK_F7, "f8" => VK_F8,
        "f9" => VK_F9, "f10" => VK_F10, "f11" => VK_F11, "f12" => VK_F12,
        "capslock" | "caps" => VK_CAPITAL,
        "numlock" => VK_NUMLOCK,
        "scrolllock" | "scrlock" => VK_SCROLL,
        "prtsc" | "printscreen" | "snapshot" => VK_SNAPSHOT,
        "pause" | "break" => VK_PAUSE,
        _ => char_to_vk(name.chars().next().unwrap_or('\0')),
    }
}

fn char_to_vk(c: char) -> u16 {
    let upper = c.to_ascii_uppercase();
    if upper.is_ascii_alphabetic() {
        upper as u16
    } else if c.is_ascii_digit() {
        c as u16
    } else {
        match c {
            '.' => VK_OEM_PERIOD,
            ',' => VK_OEM_COMMA,
            ';' => VK_OEM_1,
            '/' => VK_OEM_2,
            '`' => VK_OEM_3,
            '[' => VK_OEM_4,
            '\\' => VK_OEM_5,
            ']' => VK_OEM_6,
            '\'' => VK_OEM_7,
            '-' => VK_OEM_MINUS,
            '=' => VK_OEM_PLUS,
            ' ' => VK_SPACE,
            '\t' => VK_TAB,
            '\n' | '\r' => VK_RETURN,
            _ => 0,
        }
    }
}

fn resolve_xy(x: Option<f64>, y: Option<f64>) -> Result<(f64, f64)> {
    match (x, y) {
        (Some(x), Some(y)) => Ok((x, y)),
        _ => {
            let p = cursor_pos()?;
            Ok((p.0 as f64, p.1 as f64))
        }
    }
}

fn send_mouse(flags: u32, dx: i32, dy: i32, data: u32) {
    let input = MOUSEINPUT {
        dx,
        dy,
        mouseData: data,
        dwFlags: flags,
        time: 0,
        dwExtraInfo: 0,
    };
    let sz = std::mem::size_of::<INPUT>() as i32;
    unsafe {
        SendInput(
            1,
            std::mem::transmute::<*const MOUSEINPUT, *const INPUT>(&input as *const _),
            sz,
        );
    }
}
