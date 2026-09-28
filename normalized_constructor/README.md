# Normalized Constructor University

This folder holds the normalized records for Constructor University's Summer Camp
(Bremen, Germany), added as a new provider separately from `normalized_new_providers/`.

## Files

- `normalize_constructor.mjs` — reproducible normalizer (Node, not Python — see below).
- `constructor.normalized.json` — the 9 course records, in the same `BASE_FIELDS` schema
  used by `normalized_new_providers/normalize_new_providers.py`.
- `add_image_candidates.mjs` — one-off script that wires photos into
  `data/image-candidates.json` for the 9 records (see **Photos** below). Safe to rerun.

## Source material

`../constructor/` holds the inputs the normalizer's text was extracted from:

- `Summer Camp at Constructor University – A Top Program for High School Students.html`
  — the saved public program page (camp-wide facts: ages 16–18, English B2, 12 days,
  price/dates TBA for the next cycle, what the price includes/excludes).
- `[public] Summer Camp 2026.docx` — the course-by-course syllabus (one description +
  topic list per course).

The extracted text is embedded directly in `normalize_constructor.mjs` rather than kept
as separate raw JSON, because (unlike the four providers in `normalized_new_providers/`)
no prior scrape produced machine-readable raw files for this provider.

## Important normalization decisions

- The camp is one program with 9 selectable courses (participants choose 2 of 9), and
  there is no per-course URL — only one public program page. Each course becomes its own
  catalogue record sharing that one `detail_url`/`source_url`, the same location
  (Bremen, Germany), the same age range (16–18) and the same 12-day duration, following
  the same "shared catalogue page" pattern already used for MPW's academic streams.
- Price and dates for the next cycle are not yet published by the provider, so `price` is
  left empty and `dates`/`date_months` are left empty, each with an explanatory
  `price_note` / `date_note` field. This intentionally makes every record `needs_review`
  (consistent with how `add_publish_status` already treats missing price/dates elsewhere).
- A previous cycle's example arrival/departure dates (24 July / 4 August) are preserved in
  `date_note` as historical context only, not presented as confirmed dates.

## Rebuild

Run from the project root:

```powershell
node .\normalized_constructor\normalize_constructor.mjs
```

This also merges the 9 records into `data/programs.normalized.json` in place (replacing
any existing `constructor_university` records first, so it is safe to rerun). After
rerunning it, also rerun `node .\tools\build-digests.mjs` to regenerate
`data/program-digests.json` from `data/digest-src/constructor_university/`.

## Photos

The provider's site has only one shared marketing photo for all 9 courses. Two additions
were made instead:

- `assets/program-images/campuses/bremen.jpg` — a Constructor University campus sign
  photo the user supplied directly (not downloaded by this pipeline, so its license is
  marked "Unknown — provenance not verified" in `image-sources.json`; confirm rights
  before redistributing beyond this internal catalogue). `program-page.js`'s
  `photosFor()` always promotes whichever image-candidate path contains `/campuses/` to
  the page's hero image, so this became the header for all 9 Constructor pages simply by
  being listed in each record's candidates — no code change was needed for that part.
- `assets/program-images/constructor/*.jpg` — six license-checked Wikimedia Commons
  photos (CC0 / CC BY / CC BY-SA / public domain; full attribution in
  `image-sources.json`'s `constructor_topic_images` block), one per course that had no
  existing local subject image (Math, Programming, Robotics, Physics, Human Behavior,
  Design Thinking). The other 3 courses (Chemistry, Biology, Business) reuse the site's
  existing `*-Product-Image` subject assets instead of a fresh download.

`add_image_candidates.mjs` lists each record's candidates as
`[course topic photo, bremen.jpg, the provider's image_url]`, so every course keeps a
distinct topic photo alongside the shared Bremen header.

## Why Node instead of Python

`normalized_new_providers/normalize_new_providers.py` is a Python script, but no Python
interpreter was available in this environment (only a Windows Store stub). Node was
already used elsewhere in the repository (`tools/build-digests.mjs`,
`tools/extract-sd.mjs`, `local-server.mjs`), so this normalizer was written as a `.mjs`
script instead of an unverifiable `.py` file.
