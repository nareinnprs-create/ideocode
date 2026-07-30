// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
#[derive(Clone, Copy, Debug)]
pub struct WrappedLineMap {
    pub raw_line: usize,
    pub start_col: usize,
    pub end_col: usize,
}
