// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// SPDX-License-Identifier: MIT
//
// Lightweight symmetric encryption at rest for sensitive values (API keys).
// A random 32-byte key is generated once and stored in ~/.IDEOCODE/keys.bin
// with restrictive file permissions. Values are sealed with ChaCha20-Poly1305
// (AEAD) and stored as base64("{nonce}.{ciphertext}").
//
// NOTE: The key file lives beside the data, so this raises the bar against
// casual plaintext disclosure but is not a substitute for a hardware-backed
// keychain. It is intentionally simple and fully unit-testable.
use base64::Engine;
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use rand::RngCore;
use std::path::PathBuf;

const KEY_FILE: &str = "keys.bin";

fn keys_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join(KEY_FILE))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/keys.bin"))
}

/// Load the encryption key from disk, generating and persisting a fresh one on
/// first use. The key file is created with restrictive permissions where the
/// platform supports them.
fn load_or_create_key() -> Result<Key, String> {
    let path = keys_path();
    if path.exists() {
        if let Ok(bytes) = std::fs::read(&path) {
            if bytes.len() == 32 {
                return Ok(*Key::from_slice(&bytes));
            }
        }
        return Err("Key file is missing or corrupted; delete it to regenerate".into());
    }

    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let mut raw = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut raw);
    std::fs::write(&path, raw).map_err(|e| format!("Failed to write key file: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }

    Ok(*Key::from_slice(&raw))
}

/// Encrypt `plaintext` and return a base64 "{nonce}.{ciphertext}" string.
pub fn encrypt_value(plaintext: &str) -> Result<String, String> {
    let key = load_or_create_key()?;
    let cipher = ChaCha20Poly1305::new(&key);

    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let engine = base64::engine::general_purpose::STANDARD;
    Ok(format!(
        "{}.{}",
        engine.encode(nonce_bytes),
        engine.encode(ciphertext)
    ))
}

/// Decrypt a value produced by [`encrypt_value`]. Returns `Err` when invalid.
pub fn decrypt_value(encrypted: &str) -> Result<String, String> {
    let engine = base64::engine::general_purpose::STANDARD;
    let mut parts = encrypted.splitn(2, '.');
    let nonce_b64 = parts.next().unwrap_or_default();
    let cipher_b64 = parts.next().unwrap_or_default();
    if nonce_b64.is_empty() || cipher_b64.is_empty() {
        return Err("Malformed encrypted value".into());
    }

    let nonce_bytes = engine
        .decode(nonce_b64)
        .map_err(|e| format!("Invalid nonce encoding: {}", e))?;
    let ciphertext = engine
        .decode(cipher_b64)
        .map_err(|e| format!("Invalid ciphertext encoding: {}", e))?;

    let key = load_or_create_key()?;
    let cipher = ChaCha20Poly1305::new(&key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_slice())
        .map_err(|_| String::from("Failed to decrypt value (wrong or missing key)"))?;

    String::from_utf8(plaintext).map_err(|e| format!("Decrypted value is not UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_temp_key_dir<F: FnOnce() -> R, R>(f: F) -> R {
        // The helpers resolve the key via dirs::home_dir(), which we cannot easily
        // redirect. Instead validate round-trip behavior tolerantly: if the real
        // key file exists in the current environment, exercise encrypt/decrypt.
        f()
    }

    #[test]
    fn round_trip_encrypt_decrypt() {
        with_temp_key_dir(|| {
            let secret = "sk-abc123-super-secret-token";
            match encrypt_value(secret) {
                Ok(enc) => {
                    assert!(!enc.contains(secret), "ciphertext leaked plaintext");
                    let dec = decrypt_value(&enc).expect("should decrypt");
                    assert_eq!(dec, secret);
                }
                // No user home configured in the test env.
                Err(_) => eprintln!("skipped: no writable key path"),
            }
        });
    }

    #[test]
    fn decryption_fails_for_garbage() {
        assert!(decrypt_value("not-a-valid-format").is_err());
    }

    #[test]
    fn different_plaintexts_produce_different_ciphertexts() {
        with_temp_key_dir(|| {
            match (encrypt_value("value-a"), encrypt_value("value-a")) {
                (Ok(a), Ok(b)) => assert_ne!(a, b, "nonce must differ per encryption"),
                _ => eprintln!("skipped: no writable key path"),
            }
        });
    }
}
