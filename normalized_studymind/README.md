# Study Mind normalization

Normalizes the 15 Study Mind work-experience programmes (central London, ages 15–18) into the
catalogue schema. See "Study Mind work-experience normalization" in `summary.md` for the decisions.

Inputs (read-only): `studymind/Study Mind Work Experience _ Career Programmes 2026.html` and the
saved pages in `studymind/studymind-pages/` (re-download with `node studymind/download-courses.mjs`).

From the project root:

```powershell
node normalized_studymind/normalize_studymind.mjs   # records + digest sources, merged into the catalogue
node tools/build-digests.mjs
node tools/apply-tr-translations.mjs
node --test tests/*.test.mjs
```

- `extract_studymind.mjs` — parses JSON-LD (dates, offers) and visible text from each saved page; run directly to print the extraction.
- `normalize_studymind.mjs` — builds records, `studymind.normalized.json`, and `data/digest-src/studymind*`.
- `digest-content.mjs` — hand-authored English/Turkish digest copy (every line condensed from the saved pages).
