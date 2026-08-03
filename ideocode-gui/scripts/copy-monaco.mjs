#!/usr/bin/env node
// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
// Copies monaco-editor/min/vs to public/monaco/vs for offline/self-hosted use.

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve("node_modules/monaco-editor/min/vs");
const DST = resolve("public/monaco/vs");

if (!existsSync(SRC)) {
    console.error("Source not found:", SRC);
    process.exit(1);
}

mkdirSync(DST, { recursive: true });

function copyRecursive(src, dst) {
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name);
        const dstPath = join(dst, entry.name);
        if (entry.isDirectory()) {
            mkdirSync(dstPath, { recursive: true });
            copyRecursive(srcPath, dstPath);
        } else {
            copyFileSync(srcPath, dstPath);
        }
    }
}

console.log("Copying Monaco editor from", SRC, "to", DST);
copyRecursive(SRC, DST);
console.log("Done.");