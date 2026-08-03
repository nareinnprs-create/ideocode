// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! Harness API wiring for desktop2.
//!
//! Connects to the harness API socket (`~/.IDEOCODE/IDEOCODE-api.sock`, served by
//! `IDEOCODE-harness-api-bridge`) on a background thread, attaches a session,
//! and forwards streamed events to the UI thread over a channel.
//!
//! The connection uses a Unix domain socket, so the worker is Unix-only. On
//! Windows it reports that the harness connection is unsupported so the app
//! still boots and the crate stays compilable on every platform.

use std::sync::mpsc::{Receiver, Sender, channel};

#[cfg(unix)]
use ideocode_harness_api::{ApiEvent, ApiRequest, ClientFrame, HarnessClient, write_frame};
#[cfg(unix)]
use std::path::PathBuf;
#[cfg(unix)]
use std::io::BufReader;
#[cfg(unix)]
use std::sync::atomic::{AtomicU64, Ordering};
#[cfg(unix)]
use std::sync::{Arc, Mutex};

/// UI-facing updates produced by the connection worker.
#[cfg_attr(not(unix), allow(dead_code))]
#[derive(Debug)]
pub enum HarnessUpdate {
    Status(String),
    Attached { session_id: String },
    Text(String),
    TurnDone,
}

#[cfg(unix)]
fn api_socket_path() -> PathBuf {
    if let Ok(custom) = std::env::var("IDEOCODE_API_SOCKET") {
        return PathBuf::from(custom);
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".IDEOCODE").join("IDEOCODE-api.sock")
}

/// Spawn the connection worker. Returns the receiving side for the UI and a
/// sender for outgoing user messages.
pub fn spawn(redraw: impl Fn() + Send + 'static) -> (Receiver<HarnessUpdate>, Sender<String>) {
    let (update_tx, update_rx) = channel::<HarnessUpdate>();
    let (outgoing_tx, outgoing_rx) = channel::<String>();
    std::thread::spawn(move || {
        let send = move |update: HarnessUpdate| {
            let _ = update_tx.send(update);
            redraw();
        };
        if let Err(error) = run(&send, outgoing_rx) {
            send(HarnessUpdate::Status(format!("disconnected: {error}")));
        }
    });
    (update_rx, outgoing_tx)
}

#[cfg(unix)]
fn run(
    send: &impl Fn(HarnessUpdate),
    outgoing: Receiver<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let path = api_socket_path();
    send(HarnessUpdate::Status(format!(
        "connecting to {}...",
        path.display()
    )));
    let stream = std::os::unix::net::UnixStream::connect(&path).map_err(|error| {
        format!(
            "{error} (start the bridge: IDEOCODE-harness-api-bridge, socket {})",
            path.display()
        )
    })?;
    let reader = BufReader::new(stream.try_clone()?);
    let mut client = HarnessClient::new(reader, stream.try_clone()?);
    client.hello(concat!("IDEOCODE-desktop2/", env!("CARGO_PKG_VERSION")))?;
    send(HarnessUpdate::Status("connected, attaching...".into()));
    client.send(ApiRequest::CreateSession { working_dir: None })?;

    // Writer thread: forwards user messages immediately even while the read
    // loop below is blocked on the stream. Frame ids start high so they never
    // collide with the reader-side HarnessClient's counter.
    let session_id = Arc::new(Mutex::new(String::new()));
    let writer_ids = AtomicU64::new(1_000_000);
    std::thread::spawn({
        let session_id = Arc::clone(&session_id);
        let mut writer_stream = stream.try_clone()?;
        move || {
            while let Ok(content) = outgoing.recv() {
                let session = session_id.lock().map(|s| s.clone()).unwrap_or_default();
                if session.is_empty() {
                    continue;
                }
                let frame = ClientFrame::new(
                    writer_ids.fetch_add(1, Ordering::Relaxed),
                    ApiRequest::SendMessage {
                        session_id: session,
                        content,
                        images: vec![],
                    },
                );
                if write_frame(&mut writer_stream, &frame).is_err() {
                    break;
                }
            }
        }
    });

    loop {
        let frame = client.recv()?;
        match frame.event {
            ApiEvent::Attached { session } => {
                if let Ok(mut guard) = session_id.lock() {
                    *guard = session.session_id.clone();
                }
                send(HarnessUpdate::Attached {
                    session_id: session.session_id,
                });
            }
            ApiEvent::TextDelta { text, .. } => send(HarnessUpdate::Text(text)),
            ApiEvent::TurnDone { .. } => send(HarnessUpdate::TurnDone),
            ApiEvent::Error { message, .. } => {
                send(HarnessUpdate::Status(format!("error: {message}")));
            }
            _ => {}
        }
    }
}

#[cfg(not(unix))]
fn run(
    send: &impl Fn(HarnessUpdate),
    _outgoing: Receiver<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    send(HarnessUpdate::Status(
        "harness API connection requires Unix sockets (unsupported on Windows)".into(),
    ));
    Ok(())
}
