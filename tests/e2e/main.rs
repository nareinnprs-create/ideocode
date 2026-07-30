// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! End-to-end tests for IDEOCODE using a mock provider
//!
//! These tests verify the full flow from user input to response
//! without making actual API calls.

mod mock_provider;
mod test_support;

mod ambient;
mod binary_integration;
mod burst_spawn;
mod provider_behavior;
mod reload_multiclient;
mod safety;
mod session_flow;
mod transport;
#[cfg(windows)]
mod windows_lifecycle;
