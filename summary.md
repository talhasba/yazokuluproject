# Codebase Summary

## Overview

This repository contains a bilingual (English/Turkish) catalogue of international summer programs. It is a static Vite/React application: the client loads normalized JSON data, renders a filterable program grid, and shows a detail page for each program. There is no database, account system, or production server-side API.

The catalogue currently contains **473 programs** from thirteen providers; all are in-person programs (online-only offerings are removed on purpose, see **Accommodation fact and online programs**). The application supports desktop and mobile layouts, subject/provider/country filtering (providers expand into their campuses/locations), numbered pagination, localized program content, and image fallbacks.

The repository also includes a local browser-based Program Editor. Running `open-program-editor.bat` opens `http://localhost:5173/admin`, where an editor can search for a program and update titles, locations, dates, ages, pricing, catalogue summaries, and structured English/Turkish detail content without editing JSON manually. Saved changes are stored as a small override layer in `data/program-editor-overrides.json`; generated source files remain untouched.

The newer-provider normalization sources and their QA reports are kept in `normalized_new_providers/`; their combined output has been merged into the main catalogue data. Constructor University's Summer Camp (Bremen, Germany) was normalized separately from its saved program page and course-syllabus document in `constructor/`; the reproducible normalizer and its standalone output live in `normalized_constructor/` and were merged into the same main catalogue data (see **Constructor University normalization** below).

The catalogue is maintained as readable JavaScript and JSX under `src/`. Program detail pages use the existing bullet-first digest renderer in `program-page.js` (see **Program Digest Layer** below).

## Runtime Architecture

`index.html` is the single page shell. It contains the hand-written marketing home page, an empty `#root` element for the React catalogue, `#program-page` for program details, and `#about-page` for the About page.

The browser loads the application in this order:

1. Vite loads `src/main.jsx`, which imports the shared CSS and mounts `src/catalogue/CatalogueApp.jsx` on `/programs`.
2. `src/catalogue/programs.js` loads the main program data, image candidates, photo sources, and editor overrides, then exposes normalized display helpers.
3. `src/catalogue/constants.js` holds the explicit subject-bucket and bilingual UI mappings. Provider, country, and campus filter lists are derived from the live program JSON rather than compiled into a bundle.
4. `home-page.js`, `about-page.js`, and `program-page.js` render their path-based routes. `program-page.js` loads the matching digest and program facts into `#program-page`.
5. `seo.js` updates canonical, Open Graph, Twitter, and JSON-LD metadata for the current clean path.

The former minified `script.js` and browser-side `app-loader.js` patch system have been removed. The catalogue now has ordinary readable source modules and a reproducible `vite.config.js` build.

## User-Facing Behavior

### Routes

- `/`: the marketing home page.
- `/about`: the "Hakkımızda" / About Us page.
- `/programs`: the searchable program catalogue.
- `/programs/<program-id>`: an individual digest-based program detail page.

Routes use clean browser paths. `vercel.json` first serves real files, then rewrites unmatched routes to `index.html`; the inline compatibility redirect in `index.html` converts old `#/about` and `#/programs...` links to their clean equivalents.

### Catalogue

The readable React catalogue provides:

- English and Turkish UI copy, with the selected language stored in `localStorage` under `lang`.
- Responsive program cards with provider, subject, age, location, price, and image information.
- Filters for subject group, provider, and country.
- Desktop sidebar filters and a mobile drawer in Subject, Country, School order. In `CatalogueApp.jsx`, the School filter derives providers and campuses from the data, shows location counts, and supports full/partial provider selection using `"<provider>||<location>"` values.
- Numbered pagination with 25, 50, or 100 results per page, ellipses, previous/next controls, and scroll-to-top on page changes.
- Program detail pages with hero imagery, localized descriptions, content sections, and key facts.
- Loading, data-fetch error, empty-result, and missing-image states.

`src/catalogue/constants.js` groups raw subjects into broader display buckets such as Business & Finance, Computer Science & AI, Medicine & Life Sciences, and Law, Politics & Society. There is no catch-all "Other" checkbox; an unmapped program remains visible when no subject filter is active but must be mapped before it can be reached through a subject checkbox.

### Catalogue source modules

- `src/main.jsx` is the Vite entry point and shared stylesheet import list.
- `src/catalogue/CatalogueApp.jsx` contains the readable React header, filters, cards, pagination, mobile drawer, and right-column Information Form.
- `src/catalogue/programs.js` handles data loading, editor-override merging, image selection, title cleanup, and localized location formatting.
- `src/catalogue/constants.js` contains bilingual labels, subject groups, country labels, and the Turkish city list used by the catalogue form.

## Program Digest Layer

`program-page.js` / `program-page.css` render the detail page — hero photo, facts strip (age/duration/dates/price/location/accommodation), focus statement, topic chips, "what you'll do" modules, outcomes, "good fit if…", extras, and a bilingual "Bilgi Formu" (name, phone, email, participant age, city). Before rendering, it merges program and digest entries from `data/program-editor-overrides.json`.

- **Facts always come from `data/programs.normalized.json`**, read live, never from the digest — so age/price/dates/location can't drift out of sync with the dataset.
- **Photos** come from `data/image-candidates.json`, preferring local campus photos from `assets/program-images/`; attribution (photographer, license) is shown on the page when known.
- **The enquiry form** validates client-side and checks the entered age against the program's listed age range, but does not send anywhere yet: `FORM_ENDPOINT` and `WHATSAPP_NUMBER` in `program-page.js` are placeholders to be filled in once an email/WhatsApp destination exists.
- **`?review` query flag**: append `?review` to a clean program URL to show internal data-quality notes (e.g. missing age range, campus-wide price, contradicting source text). These notes are not shown to visitors by default.

### Digest data pipeline (`data/digest-src/`, `tools/build-digests.mjs`)

`data/program-digests.json` (one entry per program, keyed by program id) is generated — not hand-edited — by `node tools/build-digests.mjs`, which reads hand-authored source files under `data/digest-src/` and validates every field (length limits, no placeholder text, no duplicate bullets) before writing output. Two authoring styles are used:

- **Per-provider files** (`data/digest-src/<provider>/*.json`, optional `data/digest-src/<provider>-templates.json` for shared blocks like a certificate note or a campus's excursion list): used for Immerse, Academy Royale International, InvestIN, St Clare's, Bucksmore, MPW, Edconic, Sportech, and Constructor University. Immerse additionally reuses one of two shared curriculum templates ("academic" or "career") matched by the program's curriculum-section titles.
- **Summer Discovery** (265 of the 473 programs) is handled differently because its source text is already bulleted and highly repetitive: `tools/extract-sd.mjs` auto-extracts the English structure from `programs.normalized.json` into `data/digest-src/summer_discovery-units.json`, de-duplicating 265 records down to 171 unique course "units" by content hash. Turkish translations are hand-written per unit (not per program) in `data/digest-src/summer_discovery-tr/part*.json`; the build fails if a translated list doesn't match its English counterpart item-for-item.

Turkish catalogue metadata for Edconic, MPW, Sportech, Summer Discovery, and Constructor University is maintained in `data/tr-translations.json`. Run `node tools/apply-tr-translations.mjs` after rebuilding normalized data and digests. The script adds the reviewed Turkish title, subject, and location labels, reuses each program's reviewed Turkish digest focus as `description_short_tr`, updates the main and provider-level normalized files, and fails if any catalogue record remains incomplete.

Coverage: all 473 programs have a digest. Running `node tools/build-digests.mjs` after any source edit is required to regenerate `data/program-digests.json`; it exits non-zero on validation failure.

### Academy Royale International normalization

Academy Royale International's current 2027 source set lives under `royale international/academy-royale-pages/`: 24 official course pages plus `index.json`, which retains the course-card titles, ages, locations and prices from the saved course listing. `normalized_academy_royale/normalize_academy_royale.mjs` parses those saved pages and replaces only the `oxford_royale` provider records in the main catalogue. The stable provider key and `oxford-royale-` ID prefix remain unchanged even though the public brand is Academy Royale International.

The 24 pages produce 36 catalogue records because the twelve pages offered in both Oxford and Cambridge are split into campus-specific entries. Current offerings are limited to Oxford, Cambridge and Marlborough College; retired London, Yale and New York records are removed. The normalizer also refreshes Academy Royale digest sources, Turkish lookup values, image candidates, the reviewed photo manifest and its collection fingerprint. Run it before `node tools/build-digests.mjs` and `node tools/apply-tr-translations.mjs`.

### Accommodation fact and online programs

The digest page's facts strip shows **Accommodation / Konaklama** (where students stay) right after Location, instead of Format. The text is kept short (the institution or residence, e.g. "University of Oxford", "Queen's Gate House, London"). Values live in `accommodation` / `accommodation_tr` on each record, written by `node tools/apply-accommodation.mjs` from provider pages (rules by provider + location, plus per-program entries for Sportech, Edconic, Emerald and InvestIN Career Discovery). A program with no entry shows "On request" (currently the 3 Edconic Vogue programs). Verified against the saved provider pages in `mdoutput/` (markdown copies of the saved HTML): Immerse (UCL, Cambridge/Oxford colleges, Barnard, Toronto, Berkeley), InvestIN (University of London halls; Dulwich College boarding houses for Career Discovery), Bucksmore (King's College London), MPW (Queen's Gate House, Tripos Court), Sportech (hotels/residences per program), and Academy Royale (college residences). Summer Discovery pages only describe a residential programme per campus and name UCLA's hall, so other campuses show "<campus> campus".

Only in-person programs are offered, so `node tools/remove-online-programs.mjs` strips online-only records (Immerse Online Research Programme, Edconic Online Essentials) from `programs.normalized.json`, `image-candidates.json`, `program-digests.json` and `program-image-sources.json`. If a rebuild brings them back, rerun it, then `apply-accommodation.mjs` and `apply-campuses.mjs`. Removing photo records changes the photo-collection fingerprint: `data/program-image-audit.json` and the `_meta` counts in `data/program-image-sources.json` were updated to 473 photos so `tests/program-images.test.mjs` passes.

### Campus labels (`campus` / `campus_tr`)

Catalogue and detail-page titles read "<program> - <campus>" when a record has a `campus` (falling back to the city); the city still shows under each card, and School-filter location rows use the same campus/university names. The small long-name aliases live in `src/catalogue/programs.js`. The field is written by `node tools/apply-campuses.mjs` (rules by provider + location, plus per-id exceptions); rerun it after any normalizer rebuilds `data/programs.normalized.json`.

### Logo

The site logo is `assets/summerbutwhere-logo.png` (sun + "SummerButWhere" wordmark with the line "Akademik Yaz Okulu Programları" baked into the image, 938x513 transparent PNG). It is referenced from `index.html`, `program-page.js`, `about-page.js`, and `src/catalogue/CatalogueApp.jsx`; height-based sizing is at the end of `palette.css`.

**Header layout** (home, catalogue, programme and About headers share it): the SummerButWhere logo (links to `/`) sits on the left, separated by a thin rule from the ASBA logo (`assets/asba-logo.png`, links to asba.com.tr). The right side contains the "About Us / Hakkımızda" link and language button.

### About page (`/about`)

`about-page.js` / `about-page.css` render a bilingual "Hakkımızda" page into `#about-page`: SummerButWhere is a sub-brand/project of ASBA Yurtdışı Eğitim Danışmanlık, plus the ASBA contact card. It responds to the clean `/about` path and the link appears in every header and the home footer.

### Background ("Işın" sun rays)

`background-rays.css` is the permanent site-wide background: warm rays fanning out of the top-left corner, drawn on a fixed `body::before` layer behind `#root` / `#home-page` / `#program-page` / `#about-page`, so cards and photos are never tinted. `.pp` and `.ab` have transparent backgrounds so the rays show through on programme pages. The earlier temporary switcher (`bg-options.js` / `.css`, with dots/waves/rings/routes alternatives) was deleted.

### Detail-page prototype

`prototypes/layer-test.html` is a historical minimal shell for the digest renderer. The supported way to test the live implementation is now `npm run dev` followed by a clean URL such as `http://127.0.0.1:5173/programs/<id>?review`. `prototypes/index.html` is an earlier self-contained visual mockup.

### Constructor University normalization

Constructor University's Summer Camp is a single 12-day residential program in Bremen where participants choose 2 of 9 academic courses; there is one public program page and no per-course URL. It was added as its own provider (`constructor_university`, id prefix `constructor-university-summer-camp-`) modeled on how MPW's academic streams share one catalogue page:

- Source material lives in `constructor/`: the saved public program page (`Summer Camp at Constructor University….html`, general camp facts — ages 16–18, English B2, 12 days) and a course-syllabus document (`[public] Summer Camp 2026.docx`, one description + topic list per course). Price (€4,600) and dates (25 July – 5 August) were confirmed directly by the user on 2026-09-28 and are not published on the site itself; they're hardcoded as `CAMP_PRICE`/`CAMP_DATES` constants in the normalizer rather than scraped.
- `normalized_constructor/normalize_constructor.mjs` (Node, not Python — see below) embeds the extracted text for all 9 courses, builds one BASE_FIELDS-schema record per course (all sharing the same detail/source URL, location, ages, duration, price, and dates — the camp is one 12-day program, not priced per course), writes `normalized_constructor/constructor.normalized.json`, and merges the 9 records into `data/programs.normalized.json` (replacing any prior Constructor records first, so the script is safe to rerun). Run it with `node .\normalized_constructor\normalize_constructor.mjs`.
- Unlike `normalized_new_providers/normalize_new_providers.py`, this normalizer is JavaScript: no Python interpreter was available in this environment to run or verify a `.py` version, so a `.mjs` script (consistent with `tools/build-digests.mjs`) was used instead.
- All 9 records are digested like any other authored provider: `data/digest-src/constructor_university/courses.json` (per-course EN/TR focus, tags, highlights, "do" steps, outcomes, fit) plus `data/digest-src/constructor_university-templates.json` (a shared closing "do" step about the company visit/excursions and a shared outcome about campus life). `constructor_university` was added to the `PREFIX` map in `tools/build-digests.mjs` so `buildAuthored()` picks it up automatically.
- The digest renderer shows "On request" for missing price/dates and does not depend on the removed legacy detail implementation.
- The home page's hard-coded programme/country stats in `index.html` were updated after this merge and must still be maintained whenever the catalogue changes (see **Maintenance Notes and Risks**).
- Provider, country, and campus filter entries are now derived from `data/programs.normalized.json`; only genuinely new subject names need an entry in `src/catalogue/constants.js`.
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
- **Catalogue wiring**: providers are discovered from the data. `src/catalogue/constants.js` maps `Careers & Life Skills` → Career Discovery and `Chemical Engineering` → Engineering & Tech; `program-page.js` contains the Turkish label for the `1-3 weeks` duration.
- Tests: `tests/studymind-programs.test.mjs`.

## Data Model

### `data/programs.normalized.json`

The main data file is an array of 473 normalized program records. Common records include:

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

This object maps all 473 program IDs to ordered arrays of image candidates. The library includes reusable campus photography for the major catalogue locations and local subject-based fallbacks for business, engineering, medicine, law, arts, and other program areas. The UI uses the first candidate when available, then falls back to the program's own `image_url`, and finally displays a placeholder. The digest layer's `photosFor()` (`program-page.js`) always picks whichever candidate path contains `/campuses/` as the page's hero (rendered as a CSS `background-image`, not an `<img>` tag); the remaining local candidates become the small gallery below it. The 9 Constructor University records each list a course-specific topic photo first, then the shared `campuses/bremen.jpg` campus photo (so Bremen is always the hero), then the provider's own `image_url` as a last-resort fallback.

### `data/program-editor-overrides.json`

This is the publishable output of the Local Program Editor. It contains only program and digest fields that differ from generated source content, keyed by stable program ID. `src/catalogue/programs.js` applies program overrides before catalogue rendering, while `program-page.js` applies both program and digest overrides before a detail page renders.

## Local Program Editor

`open-program-editor.bat` starts `local-server.mjs` in editor mode and opens `/admin`. The editor provides search and provider filters, changed-program tracking, structured overview/pricing/content forms, repeatable price/activity fields, a built-in detail-page preview, `Ctrl+S` saving, and per-program reset.

The editor write API exists only in `local-server.mjs`; GitHub Pages serves no write endpoint. The server binds to `127.0.0.1`, injects a random session token into `/admin`, checks the request origin, validates the payload, and backs up the prior override file under the Git-ignored `.local-editor/backups/` directory before saving.

### `assets/`

Contains local JPG, PNG, and WebP images used by the home page and as catalogue image fallbacks. `assets/program-images/` holds the campus photo library and a manifest with creator, source, and license information for every downloaded image.

## Important Files

| File | Responsibility |
| --- | --- |
| `index.html` | Single page shell, home-page markup, legacy-hash compatibility redirect, and runtime entry scripts. |
| `src/main.jsx` | Vite/React entry and shared stylesheet imports. |
| `src/catalogue/CatalogueApp.jsx` | Readable catalogue UI: header, filters, cards, pagination, mobile drawer, and catalogue Information Form. |
| `src/catalogue/programs.js` | Catalogue data loading, override merging, image/title/location helpers, and normalization. |
| `src/catalogue/constants.js` | Subject groups, bilingual labels, country labels, and catalogue form cities. |
| `style.css` | Existing generated utility styles used by the readable catalogue components. |
| `home-page.js` / `home-page.css` | Static landing page, route visibility, and bilingual copy. |
| `catalogue-cleanup.css` | Catalogue checkbox, pagination, provider/campus filter, and right-column Information Form styles. |
| `program-page.js` / `program-page.css` | Clean-path program detail renderer and program-specific Bilgi Formu. |
| `local-editor/` | Local browser UI for editing program facts and bilingual detail content. |
| `data/program-editor-overrides.json` | Small, committed editorial layer generated by the local editor and applied at runtime. |
| `open-program-editor.bat` | Windows launcher that starts the local editor at `/admin`. |
| `tools/build-digests.mjs` | Builds/validates `data/program-digests.json` from `data/digest-src/`. |
| `tools/extract-sd.mjs` | Auto-extracts and de-duplicates Summer Discovery's English digest content into `data/digest-src/summer_discovery-units.json`. |
| `tools/fetch_program_images.py` | Re-downloads the approved Commons campus images and rebuilds the image mapping. |
| `tools/apply-campuses.mjs` | Writes `campus` / `campus_tr` (venue/university per program) into `programs.normalized.json`. |
| `tools/apply-accommodation.mjs` | Writes `accommodation` / `accommodation_tr` (where students stay) into `programs.normalized.json`. |
| `tools/apply-default-age-range.mjs` | Sets `age_ranges` to `13-18` only for records that have no explicit age bracket; rerun after provider normalization. |
| `tools/remove-online-programs.mjs` | Removes online-only programs (and their image/digest/photo records) from the data. |
| `about-page.js` / `about-page.css` | Bilingual About ("Hakkımızda") page on `/about`. |
| `background-rays.css` | Site-wide "Işın" sun-ray background (see **Background**). |
| `mdoutput/` | Markdown conversions of the saved provider HTML pages, used for fact checking (accommodation, venues). |
| `local-server.mjs` | Minimal static HTTP server on `127.0.0.1:5173`; opens the default browser automatically. |
| `open-localhost.bat` | Windows launcher that stops an existing listener on port 5173 and starts the local server. |
| `vite.config.js` | React build, readable production output, source maps, and validated runtime/data/asset copying. |
| `vercel.json` | Vercel build/output settings and filesystem-first clean-route fallback. |
| `package.json` | Vite commands and React, Lucide, Tailwind, and Vite dependencies. |

## Development and Local Use

The package defines these commands:

- `npm run dev` / `pnpm dev`: start Vite in development mode.
- `npm run build` / `pnpm build`: create a production build.
- `npm run preview` / `pnpm preview`: preview the Vite build.
- `npm run build:deploy`: build with Vite, then safely recreate `site-deploy/` from `dist/`.

For the visitor site, use Vite (`npm run dev`) so clean-route fallback and JSX transformation are available; `open-localhost.bat` launches that command on Windows. `local-server.mjs` remains the local Program Editor server and its `/api/editor/` endpoints accept validated save/reset requests from `/admin`.

Both `package-lock.json` and `pnpm-lock.yaml` are committed, although the pnpm workspace file indicates pnpm is likely the intended package manager.

## Maintenance Notes and Risks

- Clean client-side routes require a history fallback. Vercel is configured in `vercel.json`; another static host needs the equivalent filesystem-first rewrite to `index.html`.
- Subject buckets remain explicit in `src/catalogue/constants.js`; when a genuinely new raw subject appears, map it there. Provider, country, and campus lists update automatically from the program data.
- The home page's hard-coded stats (currently 473 programs / 7 countries in `index.html`) must be updated by hand whenever the dataset total or country count changes; they are not computed from `data/programs.normalized.json`.
- The image map (`data/image-candidates.json`) has entries for all 473 program IDs. Campus photos and local subject images provide fallback coverage; any future addition without an entry falls back to its own `image_url` and finally a placeholder.
- 285 of the 473 records are marked `needs_review` (all 265 Summer Discovery, 8 MPW, 4 Sportech, 4 Schiller, 2 Emerald, 2 Edconic; the 9 Constructor University records are `ready`: price €4,600 and dates 25 July – 5 August were confirmed 2026-09-28). Flags preserve known scope, age/grade, pricing, date, and source limitations. The digest build surfaces many of these same issues (and others, e.g. campus-wide pricing) per-record in `review.flags`, visible via `?review` on the live site.
- The Bilgi Formu on digest pages does not send its submissions anywhere yet (`FORM_ENDPOINT` / `WHATSAPP_NUMBER` are empty in `program-page.js`); this must be wired up before relying on it for real enquiries.
- All 473 catalogue records now include `title_tr`, `subject_tr`, `location_tr`, and `description_short_tr`. The newer-provider values are reproducible through `data/tr-translations.json` and `tools/apply-tr-translations.mjs`.
- Every catalogue record has an age bracket. Where a provider record has no explicit age range, `tools/apply-default-age-range.mjs` supplies the catalogue default `13-18` without changing any published range.
- The repository has no lint configuration or visible CI configuration. Automated checks are the `node --test` files in `tests/`; route/layout verification is also done with the Vite development/preview servers.
