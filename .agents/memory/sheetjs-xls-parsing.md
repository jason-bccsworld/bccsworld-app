---
name: SheetJS for legacy .xls
description: How legacy .xls uploads are parsed safely and why the npm xlsx package must not be used
---

The npm `xlsx` package is abandoned at 0.18.5 with unfixed high-severity prototype-pollution/ReDoS advisories (fails completion code review and `npm audit`). Use the patched SheetJS build from `https://cdn.sheetjs.com/xlsx-<ver>/xlsx-<ver>.tgz` instead (installed as a tarball URL dependency).

**Why:** Uploaded .xls files are hostile input hitting an admin endpoint in-process; the vulnerable parser was rejected by review.

**How to apply:** Legacy .xls is converted to .xlsx in-memory (SheetJS read+write) and then flows through the normal ExcelJS pipeline. Containment required: CFB magic-byte check (SheetJS otherwise accepts plain text), `sheetRows` cap during read, output-size cap, and the same zip-expansion guard as direct .xlsx uploads — a converted archive is still attacker-derived, "generated locally" is not a trust boundary.
