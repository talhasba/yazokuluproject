# Codebase Summary

## Overview

This repository contains a password-gated, bilingual (English/Turkish) catalogue of international summer programs. It is a static browser application: the client loads normalized JSON data, renders a filterable program grid, and shows a detail page for each program. There is no backend, database, account system, or server-side API.

The catalogue currently contains **475 programs** from thirteen providers. The application supports desktop and mobile layouts, subject/provider/country filtering, pagination, localized program content, and image fallbacks.

The repository also includes a local browser-based Program Editor. Running `open-program-editor.bat` opens `http://localhost:5173/admin`, where an editor can search for a program and update titles, locations, dates, ages, pricing, catalogue summaries, and structured English/Turkish detail content without editing JSON manually. Saved changes are stored as a small override layer in `data/program-editor-overrides.json`; generated source files remain untouched.

The newer-provider normalization sources and their QA reports are kept in `normalized_new_providers/`; their combined output has been merged into the main catalogue data. Constructor University's Summer Camp (Bremen, Germany) was normalized separately from its saved program page and course-syllabus document in `constructor/`; the reproducible normalizer and its standalone output live in `normalized_constructor/` and were merged into the same main catalogue data (see **Constructor University normalization** below).

A second layer, added after the original bundle, replaces the generated detail page with a bullet-first "digest" page for 474 of the 475 programs (see **Program Digest Layer** below). This layer sits beside the original React catalogue rather than replacing it.

## Runtime Architecture

`index.html` is the only page shell. It contains the password dialog and a hand-written marketing home page, plus an empty `#root` element where the React catalogue is mounted, and a `#program-page` element used by the digest layer.

The browser loads the application in this order:

1. `password-lock.js` blocks the page until the visitor enters the client-side password.
2. `app-loader.js` fetches the generated `script.js` bundle as text, applies a series of exact string replacements, converts the result to a Blob module, and imports it.
3. The patched React application fetches the program and image JSON files, merges any fields in `data/program-editor-overrides.json`, and renders into `#root`.
4. `online-research-options.js`, `home-page.js`, and `catalogue-cleanup.js` observe or modify the rendered page to add behavior not present in the generated bundle.
5. `program-page.js` watches the hash route. On `#/programs/<id>`, if `data/program-digests.json` has an entry for that id, it hides `#root` and renders its own digest page into `#program-page` instead; otherwise it leaves the original React page visible.

This means `script.js` is effectively a compiled artifact, while `app-loader.js` and the smaller scripts form a browser-side customization layer around it. `program-page.js` is a further, independent layer on top of that: it never modifies `script.js` or the React output, only decides whether to show it.

## User-Facing Behavior

### Routes

- `#/` (or no hash): the marketing home page.
- `#/programs`: the searchable program catalogue.
- `#/programs/<program-id>`: an individual program detail page — the digest page (below) for 474 of 475 programs, the original React detail page otherwise.

Routing is hash-based and handled in the browser. No server rewrite rules are required.

### Catalogue

The React bundle provides:

- English and Turkish UI copy, with the selected language stored in `localStorage` under `lang`.
- Responsive program cards with provider, subject, age, location, price, and image information.
- Filters for subject group, provider, and country.
- Desktop sidebar filters and a mobile filter drawer. In the School filter, providers with more than one location (e.g. Summer Discovery's campuses, Immerse's cities) get an expandable list of locations with program counts (`codexSchoolFilter` in `app-loader.js`). Provider filter values are `"<provider>"` or `"<provider>||<location>"`; a program matches if either is selected.
- Pagination with 25, 50, or 100 results per page. The bundle only had prev/next arrows and a "1 / N" label; `app-loader.js` replaces that component (`Gh`) with numbered page buttons (1 2 3 … N, ellipsis, prev/next, scroll-to-top on change), styled by the `.catalogue-pager*` rules in `catalogue-cleanup.css`.
- Program detail pages with hero imagery, localized descriptions, content sections, and key facts.
- Loading, data-fetch error, empty-result, and missing-image states.

The original bundle groups many raw subjects into broader display buckets such as Business & Finance, Computer Science & AI, Medicine & Life Sciences, and Law, Politics & Society.

### Browser-Side Customizations

- `app-loader.js` adds the Online Research Program category, changes the location filter from city to country, formats every displayed title as `Program - Campus/City`, shows `City · Campus` on catalogue cards when the two differ, decorates provider labels with locations, and preserves the base provider name for filtering. It also holds `additionalSubjectBuckets`, which maps every newer-provider subject missing from the generated bundle and adds the Science & Mathematics and Sports filters. **Important:** the provider filter list (`_0`), country filter list (`O0`/`U0`), and base subject-bucket map (`Uh`) are hardcoded arrays/objects baked into the minified `script.js` at build time — they are NOT derived from `data/programs.normalized.json` at runtime. Adding a new provider, a new country, or a subject not covered by either the bundle or `additionalSubjectBuckets` requires an additional `replaceOnce(...)` patch here or the new programs will exist in the data and catalogue count but be unreachable via the filter checkboxes and will show up under the generic "Other" subject bucket.
- `home-page.js` switches between the static home page and React catalogue, coordinates the language selector, and corrects the detail-page back navigation so it returns to `#/programs`.
- `catalogue-cleanup.js` removes external provider links and redundant generated detail sections, then converts remaining long prose into short bullet lists. This only affects the 1 program still served by the original React detail page.
- `online-research-options.js` adds localized pricing/pathway cards to the Immerse Online Research Programme detail page. It reads those options from the main program dataset and omits the `publication-research` and `group-accredited` variants. This is also the one program excluded from the digest layer, so it keeps its original page.
- `password-lock.js` stores successful access in `sessionStorage`, so access lasts only for the current browser tab/session.

## Program Digest Layer

`program-page.js` / `program-page.css` render a redesigned detail page — hero photo, a facts strip (age/duration/dates/price/location/format), a focus statement, topic chips, "what you'll do" modules, outcomes, "good fit if…", extras, and a bilingual "Bilgi Formu" enquiry form (name, phone, email, participant age, city) — for any program with an entry in `data/program-digests.json`. Before rendering, it merges the program and digest entries from `data/program-editor-overrides.json`. It never edits `script.js`; it only toggles which of `#root` / `#program-page` is visible.

- **Facts always come from `data/programs.normalized.json`**, read live, never from the digest — so age/price/dates/location can't drift out of sync with the dataset.
- **Photos** come from `data/image-candidates.json`, preferring local campus photos from `assets/program-images/`; attribution (photographer, license) is shown on the page when known.
- **The enquiry form** validates client-side and checks the entered age against the program's listed age range, but does not send anywhere yet: `FORM_ENDPOINT` and `WHATSAPP_NUMBER` in `program-page.js` are placeholders to be filled in once an email/WhatsApp destination exists.
- **`?review` query flag**: adds `?review` before the `#` in the site URL to show internal data-quality notes (e.g. missing age range, campus-wide price, contradicting source text) inline on each digest page. These notes are generated per record and are not shown to visitors by default.

### Digest data pipeline (`data/digest-src/`, `tools/build-digests.mjs`)

`data/program-digests.json` (one entry per program, keyed by program id) is generated — not hand-edited — by `node tools/build-digests.mjs`, which reads hand-authored source files under `data/digest-src/` and validates every field (length limits, no placeholder text, no duplicate bullets) before writing output. Two authoring styles are used:

- **Per-provider files** (`data/digest-src/<provider>/*.json`, optional `data/digest-src/<provider>-templates.json` for shared blocks like a certificate note or a campus's excursion list): used for Immerse, Academy Royale International, InvestIN, St Clare's, Bucksmore, MPW, Edconic, Sportech, and Constructor University. Immerse additionally reuses one of two shared curriculum templates ("academic" or "career") matched by the program's curriculum-section titles.
- **Summer Discovery** (265 of the 475 programs) is handled differently because its source text is already bulleted and highly repetitive: `tools/extract-sd.mjs` auto-extracts the English structure from `programs.normalized.json` into `data/digest-src/summer_discovery-units.json`, de-duplicating 265 records down to 171 unique course "units" by content hash. Turkish translations are hand-written per unit (not per program) in `data/digest-src/summer_discovery-tr/part*.json`; the build fails if a translated list doesn't match its English counterpart item-for-item.

Turkish catalogue metadata for Edconic, MPW, Sportech, Summer Discovery, and Constructor University is maintained in `data/tr-translations.json`. Run `node tools/apply-tr-translations.mjs` after rebuilding normalized data and digests. The script adds the reviewed Turkish title, subject, and location labels, reuses each program's reviewed Turkish digest focus as `description_short_tr`, updates the main and provider-level normalized files, and fails if any catalogue record remains incomplete.

Coverage: 474 of 475 programs have a digest (Immerse's Online Research Programme is intentionally excluded — see above). Running `node tools/build-digests.mjs` after any source edit is required to regenerate `data/program-digests.json`; it exits non-zero on validation failure.

### Academy Royale International normalization

Academy Royale International's current 2027 source set lives under `royale international/academy-royale-pages/`: 24 official course pages plus `index.json`, which retains the course-card titles, ages, locations and prices from the saved course listing. `normalized_academy_royale/normalize_academy_royale.mjs` parses those saved pages and replaces only the `oxford_royale` provider records in the main catalogue. The stable provider key and `oxford-royale-` ID prefix remain unchanged even though the public brand is Academy Royale International.

The 24 pages produce 36 catalogue records because the twelve pages offered in both Oxford and Cambridge are split into campus-specific entries. Current offerings are limited to Oxford, Cambridge and Marlborough College; retired London, Yale and New York records are removed. The normalizer also refreshes Academy Royale digest sources, Turkish lookup values, image candidates, the reviewed photo manifest and its collection fingerprint. Run it before `node tools/build-digests.mjs` and `node tools/apply-tr-translations.mjs`.

### Campus labels (campus / campus_tr)

Catalogue and detail-page titles read "<program> - <campus>" when a record has a `campus` (falling back to the city); the city still shows under each card. The field is written by `node tools/apply-campuses.mjs` (rules by provider + location, plus per-id exceptions) - rerun it after any normalizer rebuilds `data/programs.normalized.json`. Only venues confirmed on provider pages are listed: Immerse (UCL / Oxford / Cambridge / Barnard-Columbia / Toronto / Berkeley), InvestIN (UCL, Dulwich College), Academy Royale, St Clare's, MPW, Constructor, Edconic (`operating_institution`), and the six Sportech programs whose page names a host. Remaining Sportech programs, Emerald Young Adult and online programs keep the city.

### Logo

The site logo is `assets/summerbutwhere-logo.png` (sun + "SummerButWhere" wordmark, tagline removed). It is referenced from `index.html` (password screen, home header), `program-page.js` (digest page header) and `app-loader.js` (catalogue header); its height-based sizing is at the end of `palette.css`. The original root `summerbutwhere-logo.png` is no longer used.

### Testing without the password gate

`prototypes/layer-test.html` loads a minimal page shell (`#root` + `#program-page`, no password lock) and includes `program-page.js`/`.css`, for exercising the digest layer directly during development, e.g. `http://localhost:5173/prototypes/layer-test.html?review#/programs/<id>`. `prototypes/index.html` is an earlier, self-contained mockup of the same visual design used to choose the layout before the real integration existed.

### Constructor University normalization

Constructor University's Summer Camp is a single 12-day residential program in Bremen where participants choose 2 of 9 academic courses; there is one public program page and no per-course URL. It was added as its own provider (`constructor_university`, id prefix `constructor-university-summer-camp-`) modeled on how MPW's academic streams share one catalogue page:

- Source material lives in `constructor/`: the saved public program page (`Summer Camp at Constructor University….html`, general camp facts — ages 16–18, English B2, 12 days) and a course-syllabus document (`[public] Summer Camp 2026.docx`, one description + topic list per course). Price (€4,600) and dates (25 July – 5 August) were confirmed directly by the user on 2026-09-28 and are not published on the site itself; they're hardcoded as `CAMP_PRICE`/`CAMP_DATES` constants in the normalizer rather than scraped.
- `normalized_constructor/normalize_constructor.mjs` (Node, not Python — see below) embeds the extracted text for all 9 courses, builds one BASE_FIELDS-schema record per course (all sharing the same detail/source URL, location, ages, duration, price, and dates — the camp is one 12-day program, not priced per course), writes `normalized_constructor/constructor.normalized.json`, and merges the 9 records into `data/programs.normalized.json` (replacing any prior Constructor records first, so the script is safe to rerun). Run it with `node .\normalized_constructor\normalize_constructor.mjs`.
- Unlike `normalized_new_providers/normalize_new_providers.py`, this normalizer is JavaScript: no Python interpreter was available in this environment to run or verify a `.py` version, so a `.mjs` script (consistent with `tools/build-digests.mjs`) was used instead.
- All 9 records are digested like any other authored provider: `data/digest-src/constructor_university/courses.json` (per-course EN/TR focus, tags, highlights, "do" steps, outcomes, fit) plus `data/digest-src/constructor_university-templates.json` (a shared closing "do" step about the company visit/excursions and a shared outcome about campus life). `constructor_university` was added to the `PREFIX` map in `tools/build-digests.mjs` so `buildAuthored()` picks it up automatically.
- Building a digest for these records isn't just cosmetic: the original generated React detail page (`script.js`) renders blank past the hero image for any record whose `price` and `dates` are both empty (a latent bug that was previously unreachable because every other record with that shape already had a digest overriding it). The digest layer bypasses this entirely and shows "On request" for price/dates instead.
- The home page's hard-coded programme/country stats in `index.html` were updated after this merge and must still be maintained whenever the catalogue changes (see **Maintenance Notes and Risks**).
- `data/programs.normalized.json`, `data/program-digests.json`, and `data/image-candidates.json` alone were not enough for the new provider to be usable: `script.js`'s provider filter list, country filter list, and subject-bucket map are hardcoded at build time, so `app-loader.js` needed three additional `replaceOnce(...)` patches (provider `_0`, country `O0`/`U0`, subject `Uh`) or Constructor's programs would exist in the data and catalogue count but be unreachable via the filter sidebar and would show under the generic "Other" subject.
- Photos: the site's own campus-photo pipeline (Wikimedia Commons, tracked in `assets/program-images/image-sources.json`) had no Bremen entry. The user supplied a campus-sign photo directly, saved as `assets/program-images/campuses/bremen.jpg` (marked "provenance not verified" in the manifest, since it wasn't sourced or license-checked by this pipeline). Six additional, license-checked Commons photos (one per course topic without an existing local subject image) were downloaded into `assets/program-images/constructor/`; the other 3 courses (Chemistry, Biology, Business) reuse the site's existing `*-Product-Image` subject assets. `normalized_constructor/add_image_candidates.mjs` wires all of this into `data/image-candidates.json`, ordered [course topic photo, `bremen.jpg`, the provider's `image_url`] — `program-page.js`'s `photosFor()` always promotes whichever candidate contains `/campuses/` to the page hero, so Bremen becomes the header photo automatically and the topic photo appears in the gallery below it.

### Study Mind work-experience normalization

Study Mind (London) lists 15 work-experience programmes for ages 15–18 on one course-card page; 12 are catalogued and 3 are "coming soon" and left out. The card list is embedded in that page as a `var cardsData = [...]` JSON array rather than as `<a>` tags, so it is read from there.

- Source material lives in `studymind/`: the saved listing page, `download-courses.mjs` (downloads each course page into `studymind/studymind-pages/` with an `index.json`; re-run with `node studymind/download-courses.mjs`).
- `normalized_studymind/extract_studymind.mjs` parses each saved page: JSON-LD `Course` data (weekly start dates, price offers) plus the visible text (ages, duration, class size, highlights, per-plan module lists). `normalize_studymind.mjs` builds one BASE_FIELDS record per course (provider `studymind`, id prefix `studymind-`, `studymind-<subject>-work-experience`), writes `normalized_studymind/studymind.normalized.json` and merges it into `data/programs.normalized.json`, replacing any earlier Study Mind records so reruns are safe. Run it from the project root, then `node tools/build-digests.mjs` and `node tools/apply-tr-translations.mjs`.
- English and Turkish digest copy is hand-authored in `normalized_studymind/digest-content.mjs`; the normalizer writes it to `data/digest-src/studymind/programs.json` and `data/digest-src/studymind-templates.json` (shared certificate outcome, London extras, common review flags). `studymind` was added to the `PREFIX` map in `tools/build-digests.mjs` and to `tools/apply-tr-translations.mjs`; its Turkish titles/subjects/location are in `data/tr-translations.json`.
- **Price**: one fee per programme length — £1,799 (1 week), £2,999 (2 weeks), £3,999 (3 weeks; Careers & Life Skills has only the first two). Each fee is a price tier with bilingual title/note, so the generic pricing comparison shows it as duration options; `data/price-inclusions.json` (`providers.studymind`) explains why prices differ. The pages do not say whether the optional UCL Ramsay Hall accommodation is included or what it costs; this is flagged, not guessed.
- **Dates**: the 12 live courses list seven weekly start dates (28 June – 9 August 2027) in their JSON-LD; they are stored as single ISO start dates. The JSON-LD `endDate` is the following Monday, so it is not used as a programme end date.
- **Coming soon (not catalogued)**: Business & Entrepreneurship, Chemistry and Media & Journalism are "coming soon" pages with enquiry links only: no fee and no 2027 dates (Business and Chemistry still carry past 2026 sessions in their structured data). The normalizer skips any page flagged coming soon; their English/Turkish copy is parked in `PARKED_PROGRAMS` in `digest-content.mjs`. When a page opens for booking (plans and 2027 dates appear), delete `soon: true` on its entry and rerun the normalizer; the Turkish titles are already in `data/tr-translations.json`. Their saved pages stay in `studymind/studymind-pages/`.
- **Page quirks recorded as flags**: Careers & Life Skills labels its 1-week plan "1 day"; Creative Writing's headline says "1 or 2 weeks" but prices a 3-week plan; the Chemistry highlight "Python Basics for Chemists" repeats a criminology mock-trial sentence; Economics' price heading says "Pricing for 2026" next to 2027 sessions.
- **Photos**: each course uses the photo from its own provider page (`assets/program-images/unique/`, source kind `provider`). Careers & Life Skills shares Creative Writing's stock photo on the provider site, so it uses a distinct CC0 illustrative photo (configured in `data/program-photo-curation.json`). Imported with `python tools/fetch_unique_program_images.py --stage download`; the audit record notes that ORB matching was not re-run for this addition.
- **Catalogue wiring**: `app-loader.js` adds "Study Mind" to the provider filter list and maps the new subjects `Careers & Life Skills` → Career Discovery and `Chemical Engineering` → Engineering & Tech (the other subjects already had buckets). `program-page.js` gained a Turkish label for the `1-3 weeks` duration.
- Tests: `tests/studymind-programs.test.mjs`.

## Data Model

### `data/programs.normalized.json`

The main data file is an array of 475 normalized program records. Common records include:

- Identity and source: `id`, provider fields, source URLs/files, flags, and publish status.
- Classification: program type, subject, categories, location, city, country, and delivery modes.
- Offering details: ages, duration, dates, pricing, descriptions, curriculum, and learning outcomes.
- Media and links: image URL, detail URL, and source URL.
- English detail content: intro, sections, and key facts.
- Turkish content: translated title, subject/location labels, summaries, intro, sections, and key facts.
- Location metadata: location ID, name, and type.

The represented providers are Academy Royale International, Bucksmore, Constructor University, Edconic, Emerald Cultural Institute, Immerse Education, InvestIN Education, MPW Summer School, Schiller International University, Sportech Academy, St Clare's Oxford, Study Mind, and Summer Discovery. New-provider records also retain provider-specific fields where applicable, including grade ranges, historical age/fee evidence, operating institution, and price scope/notes.

### `data/program-digests.json`

Generated output of the digest pipeline (see **Program Digest Layer** above). ~1.6 MB, one entry per digested program id, each with `en`/`tr` blocks (focus, tags, highlights, "do" items, outcomes, fit, extras, optional schedule/tracks) plus a `review.flags` array of data-quality notes. Never hand-edited; regenerate with `tools/build-digests.mjs`.

### `data/image-candidates.json`

This object maps all 475 program IDs to ordered arrays of image candidates. The library includes reusable campus photography for the major catalogue locations and local subject-based fallbacks for business, engineering, medicine, law, arts, and other program areas. The UI uses the first candidate when available, then falls back to the program's own `image_url`, and finally displays a placeholder. The digest layer's `photosFor()` (`program-page.js`) always picks whichever candidate path contains `/campuses/` as the page's hero (rendered as a CSS `background-image`, not an `<img>` tag); the remaining local candidates become the small gallery below it. The 9 Constructor University records each list a course-specific topic photo first, then the shared `campuses/bremen.jpg` campus photo (so Bremen is always the hero), then the provider's own `image_url` as a last-resort fallback.

### `data/program-editor-overrides.json`

This is the publishable output of the Local Program Editor. It contains only the program and digest fields that differ from generated source content, keyed by stable program ID. `app-loader.js` applies program overrides before the React catalogue renders, and `program-page.js` applies both program and digest overrides before a detail page renders. Resetting a program in the editor removes its entries from this file. Rebuilding the normalized catalogue or digest does not erase editor changes because the overrides are applied afterward.

## Local Program Editor

`open-program-editor.bat` starts `local-server.mjs` in editor mode and opens `/admin`. The editor provides search and provider filters, changed-program tracking, structured overview/pricing/content forms, repeatable price/activity fields, a built-in detail-page preview, `Ctrl+S` saving, and per-program reset.

The editor write API exists only in `local-server.mjs`; GitHub Pages serves no write endpoint. The server binds to `127.0.0.1`, injects a random session token into `/admin`, checks the request origin, validates the payload, and backs up the prior override file under the Git-ignored `.local-editor/backups/` directory before saving.

### `assets/`

Contains local JPG, PNG, and WebP images used by the home page and as catalogue image fallbacks. `assets/program-images/` holds the campus photo library and a manifest with creator, source, and license information for every downloaded image.

## Important Files

| File | Responsibility |
| --- | --- |
| `index.html` | Page shell, password dialog, marketing home-page markup, and script/style loading order. |
| `script.js` | Minified generated React application containing the catalogue UI, filtering, routing, localization, and details. |
| `app-loader.js` | Loads and patches `script.js` before execution. |
| `style.css` | Generated Tailwind-based styles for the React catalogue. |
| `home-page.js` / `home-page.css` | Static landing page, route visibility, and bilingual copy. |
| `password-lock.js` / `password-lock.css` | Client-side session password gate and its presentation. |
| `catalogue-cleanup.js` / `catalogue-cleanup.css` | Post-render cleanup and bullet formatting for detail pages (now only reached by the one non-digested program). |
| `online-research-options.js` / `online-research-options.css` | Special pricing/pathway section for one online research program. |
| `program-page.js` / `program-page.css` | Digest detail-page layer: renders the redesigned program page and Bilgi Formu, or falls back to the original React page. |
| `local-editor/` | Local browser UI for editing program facts and bilingual detail content. |
| `data/program-editor-overrides.json` | Small, committed editorial layer generated by the local editor and applied at runtime. |
| `open-program-editor.bat` | Windows launcher that starts the local editor at `/admin`. |
| `tools/build-digests.mjs` | Builds/validates `data/program-digests.json` from `data/digest-src/`. |
| `tools/extract-sd.mjs` | Auto-extracts and de-duplicates Summer Discovery's English digest content into `data/digest-src/summer_discovery-units.json`. |
| `tools/fetch_program_images.py` | Re-downloads the approved Commons campus images and rebuilds the image mapping. |
| `local-server.mjs` | Minimal static HTTP server on `127.0.0.1:5173`; opens the default browser automatically. |
| `open-localhost.bat` | Windows launcher that stops an existing listener on port 5173 and starts the local server. |
| `package.json` | Vite commands and React, Lucide, Tailwind, and Vite dependencies. |

## Development and Local Use

The package defines these commands:

- `npm run dev` / `pnpm dev`: start Vite in development mode.
- `npm run build` / `pnpm build`: create a production build.
- `npm run preview` / `pnpm preview`: preview the Vite build.
- `npm run build:compress` and `preview:compress`: use the custom `compress` mode/output.

On Windows, `open-localhost.bat` offers a dependency-light alternative that serves the repository directly through `local-server.mjs`. For normal site paths the server accepts GET and HEAD requests, prevents path traversal, sends basic MIME types, disables browser caching, and does not provide history-route fallback because routing uses URL hashes. Its local-only `/api/editor/` endpoints accept validated save/reset requests from `/admin`. `open-program-editor.bat` starts the same server with the editor as its opening page. `.claude/launch.json` defines a `local-site` preview configuration that runs the same server for the built-in browser pane.

Both `package-lock.json` and `pnpm-lock.yaml` are committed, although the pnpm workspace file indicates pnpm is likely the intended package manager.

## Maintenance Notes and Risks

- The access control is only a client-side convenience. The password and all protected content are delivered to the browser, so this is not suitable for securing sensitive information.
- `app-loader.js` depends on unique, exact snippets inside a minified generated bundle. Rebuilding or changing `script.js` can make a patch target disappear or become ambiguous, causing startup to fail. The patches should be reapplied to source code if maintainable source becomes available.
- Several scripts use `MutationObserver` to modify React-generated DOM after rendering. This works for the current markup but is coupled to headings, class names, text labels, and element structure in the bundle. This risk is now confined to the single non-digested program.
- The home page's hard-coded stats (currently 475 programs / 7 countries in `index.html`) must be updated by hand whenever the dataset total or country count changes; they are not computed from `data/programs.normalized.json`.
- The image map (`data/image-candidates.json`) has entries for all 475 program IDs. Campus photos and local subject images provide fallback coverage; any future addition without an entry falls back to its own `image_url` and finally a placeholder.
- Of the 308 newer-provider records, 287 are marked `needs_review` (the 9 Constructor University records are `ready`: price €4,600 and dates 25 July – 5 August were confirmed 2026-09-28). Flags preserve known scope, age/grade, pricing, date, and source limitations. The digest build surfaces many of these same issues (and others, e.g. campus-wide pricing, missing age ranges) per-record in `review.flags`, visible via `?review` on the live site.
- The Bilgi Formu on digest pages does not send its submissions anywhere yet (`FORM_ENDPOINT` / `WHATSAPP_NUMBER` are empty in `program-page.js`); this must be wired up before relying on it for real enquiries.
- All 475 catalogue records now include `title_tr`, `subject_tr`, `location_tr`, and `description_short_tr`. The newer-provider values are reproducible through `data/tr-translations.json` and `tools/apply-tr-translations.mjs`.
- The repository has no automated test files, lint configuration, or visible CI configuration. Verification is currently manual (see **Testing without the password gate** above) or build-based.
- The bundle and generated CSS are checked in, but their original React/Tailwind source files and build configuration are not present. That makes direct feature development and regeneration harder than editing a typical Vite project.
