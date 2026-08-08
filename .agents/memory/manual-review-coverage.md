---
name: Manual AI-review coverage accounting
description: How prompt-coverage warnings for the ops-manual AI review must be measured
---

Coverage warnings/ratios for the checklist AI review must be **measured on raw source-text characters** — the same basis as the stored `text_chars` totals — never on theoretical caps (chunk-count × chunk-size math) and never on prompt text that includes labels.

**Why:** chunking preserves paragraph boundaries, so chunk counts don't map to character totals; and filename labels inside excerpt text both eat the budget and skew the ratio against `text_chars`.

**How to apply:** enforce the excerpt ceiling on raw chunk text only (add source labels outside the budget when building the prompt), report the least *measured* selected-source-chars across an area's batches, and fire the static warning whenever combined `text_chars` exceeds the same ceiling.
