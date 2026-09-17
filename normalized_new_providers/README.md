# Normalized New Providers

This folder contains website-facing normalized records for the four newer provider scrapes. It is intentionally separate from the earlier `site_data` folder.

## Files

- `edconic.normalized.json` — 7 records
- `sportech.normalized.json` — 19 records
- `summer_discovery.normalized.json` — 265 records
- `mpw.normalized.json` — 8 records
- `programs.normalized.json` — all 299 records combined
- `normalization_qa.json` and `normalization_qa.md` — coverage, flags, missing fields and duplicate checks
- `normalize_new_providers.py` — reproducible normalizer

## Important normalization decisions

- Edconic is the normalized provider; the underlying operator is retained as `operating_institution`.
- Sportech residential/day and one-/two-week prices remain separate tiers. University records are retained with `likely_out_of_scope`.
- Summer Discovery grade ranges are retained in `grade_ranges`; they are not converted into ages. Campus tuition ranges are explicitly marked as non-course-specific.
- MPW 2027 dates are current. The 2026 brochure's age and fees are retained as historical evidence and are not presented as current 2027 values.
- MPW streams share one catalogue URL because the provider has no stream-specific pages.

## Rebuild

Run from the project root:

```powershell
python .\normalized_new_providers\normalize_new_providers.py
```
