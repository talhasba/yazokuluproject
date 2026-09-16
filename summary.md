# Summer Programs Website — Codebase Summary

## Overview

This repository contains a bilingual (English/Turkish), client-side catalogue for browsing summer and winter education programs. Users can filter programs, view cards and detailed program pages, change language, choose a page size, and follow links to the original provider websites.

The site is a static single-page application. It has no database, authentication, backend API, or server-side business logic. Program information is loaded in the browser from local JSON files.

## Main user experience

- A bilingual landing page explaining summer schools and their benefits, with calls to action leading to the catalogue.
- A responsive catalogue of program cards.
- Filters for subject, school/provider, and location.
- A mobile filter drawer and a persistent desktop filter sidebar.
- Program cards showing provider, title, description, age range, city, price, and an image when available.
- Hash-based detail routes in the form `#/programs/<program-id>`.
- Detail pages with an introduction, structured content sections, key facts, and a link to the provider.
- English and Turkish interfaces; the chosen language is saved in `localStorage` under the key `lang`.
- Pagination with selectable results per page.
- A custom pricing/options section for the Immerse Online Research Programme.

## Technical architecture

- **UI framework:** React 19, rendered into the `#root` element in `index.html`.
- **Build tooling:** Vite 6.
- **Icons:** Lucide React.
- **Styling:** A precompiled Tailwind-style stylesheet plus a small dedicated stylesheet for the online research options.
- **Routing:** Browser URL hashes rather than a routing library.
- **Data loading:** Browser `fetch()` calls for `data/programs.normalized.json` and `data/image-candidates.json`.
- **Hosting model:** Static files only. Any ordinary static web host can serve the site.

An important maintenance detail is that `script.js` is a minified production bundle containing React, React DOM, icons, program-normalization logic, and the application components. The original JSX/component source and Tailwind/Vite configuration are not present in this folder. As a result, the current site can be run and deployed, but substantial UI changes should ideally be made from the missing source project and rebuilt rather than edited directly in `script.js`.

## Data summary

`data/programs.normalized.json` contains **176 programs**. All 176 records include Turkish content.

### Programs by provider

| Provider | Programs |
| --- | ---: |
| Immerse Education | 86 |
| Oxford Royale | 53 |
| InvestIN Education | 16 |
| St Clare's, Oxford | 10 |
| Bucksmore | 8 |
| TED Summer School | 3 |

### Geographic coverage

- United Kingdom: 148 programs
- United States: 18 programs
- Canada: 8 programs
- Unspecified country: 2 programs
- Main cities: Oxford (53), London (48), Cambridge (47), New York (8), Toronto (8), and New Haven (7)

### Publication and quality state

- 168 records are marked `ready`.
- 8 records are marked `needs_review`.
- 29 records contain one or more quality flags.
- Common flags include shared venue/detail pages, named or flagship programs, missing prices, and missing dates.
- Only 19 records have a direct `image_url`; the separate image-candidate map covers 162 program IDs and provides local or remote fallback choices.

Each program record can include identifiers, provider/type/category information, location and age data, duration and delivery modes, structured prices and dates, short/full descriptions, curricula, learning outcomes, source links, publication flags, detail sections, key facts, and Turkish equivalents.

## Special online research feature

`online-research-options.js` adds a dedicated options grid only on `#/programs/immerse-online-research-programme`. It reads the relevant program from the main JSON dataset and displays three pathways:

- Classic
- UK Accredited
- USA Accredited

The section supports English and Turkish, expandable feature lists, pricing, and durations. It observes route, language-storage, and DOM changes so it can attach itself to the bundled React detail page without modifying the main bundle.

## Important files

| File or folder | Purpose |
| --- | --- |
| `index.html` | Minimal page shell, font imports, root element, and asset references. |
| `script.js` | Minified production bundle for the main React application. |
| `app-loader.js` | Loads the production bundle and applies the maintained catalogue patches for country and subject filtering. |
| `catalogue-cleanup.js` | Removes redundant detail content and external links, then formats useful detail copy as bullet points. |
| `catalogue-cleanup.css` | Styling for concise bullet-point program details. |
| `style.css` | Compiled global/application styles. |
| `online-research-options.js` | Readable enhancement for the online research program's pathway cards. |
| `online-research-options.css` | Styles for that enhancement. |
| `home-page.js` | Landing-page routing, language handling, and catalogue navigation. |
| `home-page.css` | Responsive landing-page layout and visual styling. |
| `data/programs.normalized.json` | Main normalized bilingual program dataset. |
| `data/image-candidates.json` | Program-to-image fallback candidates. |
| `assets/` | 41 local JPG, PNG, and WebP images used by program cards/details. |
| `local-server.mjs` | Small Node static server on `127.0.0.1:5173`; opens the browser automatically. |
| `open-localhost.bat` | Windows launcher that clears port 5173 and starts the local server. |
| `package.json` | Dependencies and Vite development/build scripts. |
| `package-lock.json` / `pnpm-lock.yaml` | Lockfiles from two package managers. |

## Running the project

For the included Windows workflow, run `open-localhost.bat`. It starts the included local server at `http://localhost:5173` and opens the site in the default browser.

The package scripts also support the standard Vite workflow:

```text
npm install
npm run dev
npm run build
npm run preview
```

Because both npm and pnpm lockfiles exist, future maintenance should select one package manager and keep only its lockfile updated to avoid dependency drift.

## Maintenance notes

- Recover or add the original React source before undertaking major design or feature work.
- Treat `script.js` and `style.css` as generated assets; direct edits will be difficult to review and easy to overwrite.
- Review the 8 `needs_review` records and the records flagged for missing dates/prices before presenting the catalogue as fully verified.
- Remote image candidates and Google Fonts require network access; local fallback images allow much of the catalogue to remain usable without them.
- Provider links open third-party sites in a new tab using `noopener noreferrer`.
- The included static server correctly limits requests to files under the project directory and accepts only GET and HEAD requests.
