# Codebase Summary

## Overview

This repository contains a password-gated, bilingual (English/Turkish) catalogue of international summer programs. It is a static browser application: the client loads normalized JSON data, renders a filterable program grid, and shows a detail page for each program. There is no backend, database, account system, or server-side API.

The catalogue currently contains **471 programs** from nine providers. The application supports desktop and mobile layouts, subject/provider/country filtering, pagination, localized program content, and image fallbacks.

The newer-provider normalization sources and their QA reports are kept in `normalized_new_providers/`; their combined output has been merged into the main catalogue data.

## Runtime Architecture

`index.html` is the only page shell. It contains the password dialog and a hand-written marketing home page, plus an empty `#root` element where the React catalogue is mounted.

The browser loads the application in this order:

1. `password-lock.js` blocks the page until the visitor enters the client-side password.
2. `app-loader.js` fetches the generated `script.js` bundle as text, applies a series of exact string replacements, converts the result to a Blob module, and imports it.
3. The patched React application fetches the program and image JSON files and renders into `#root`.
4. `online-research-options.js`, `home-page.js`, and `catalogue-cleanup.js` observe or modify the rendered page to add behavior not present in the generated bundle.

This means `script.js` is effectively a compiled artifact, while `app-loader.js` and the smaller scripts form a browser-side customization layer around it.

## User-Facing Behavior

### Routes

- `#/` (or no hash): the marketing home page.
- `#/programs`: the searchable program catalogue.
- `#/programs/<program-id>`: an individual program detail page.

Routing is hash-based and handled in the browser. No server rewrite rules are required.

### Catalogue

The React bundle provides:

- English and Turkish UI copy, with the selected language stored in `localStorage` under `lang`.
- Responsive program cards with provider, subject, age, location, price, and image information.
- Filters for subject group, provider, and country.
- Desktop sidebar filters and a mobile filter drawer.
- Pagination with 25, 50, or 100 results per page.
- Program detail pages with hero imagery, localized descriptions, content sections, and key facts.
- Loading, data-fetch error, empty-result, and missing-image states.

The original bundle groups many raw subjects into broader display buckets such as Business & Finance, Computer Science & AI, Medicine & Life Sciences, and Law, Politics & Society.

### Browser-Side Customizations

- `app-loader.js` adds the Online Research Program category, changes the location filter from city to country, cleans location text out of titles, decorates provider labels with locations, and preserves the base provider name for filtering.
- `home-page.js` switches between the static home page and React catalogue, coordinates the language selector, and corrects the detail-page back navigation so it returns to `#/programs`.
- `catalogue-cleanup.js` removes external provider links and redundant generated detail sections, then converts remaining long prose into short bullet lists.
- `online-research-options.js` adds localized pricing/pathway cards to the Immerse Online Research Programme detail page. It reads those options from the main program dataset and omits the `publication-research` and `group-accredited` variants.
- `password-lock.js` stores successful access in `sessionStorage`, so access lasts only for the current browser tab/session.

## Data Model

### `data/programs.normalized.json`

The main data file is an array of 471 normalized program records. The original 172-record catalogue is supplemented by 299 records from four newer providers. Common records include:

- Identity and source: `id`, provider fields, source URLs/files, flags, and publish status.
- Classification: program type, subject, categories, location, city, country, and delivery modes.
- Offering details: ages, duration, dates, pricing, descriptions, curriculum, and learning outcomes.
- Media and links: image URL, detail URL, and source URL.
- English detail content: intro, sections, and key facts.
- Turkish content: translated title, subject/location labels, summaries, intro, sections, and key facts.
- Location metadata: location ID, name, and type.

The represented providers are Bucksmore, Edconic, Immerse Education, InvestIN Education, MPW Summer School, Oxford Royale, Sportech Academy, St Clare's, Oxford, and Summer Discovery. New-provider records also retain provider-specific fields where applicable, including grade ranges, historical age/fee evidence, operating institution, and price scope/notes.

### `data/image-candidates.json`

This object maps all 471 program IDs to ordered arrays of image candidates. The library includes reusable campus photography for the major catalogue locations and local subject-based fallbacks for business, engineering, medicine, law, arts, and other program areas. The UI uses the first candidate when available, then falls back to the program's own `image_url`, and finally displays a placeholder.

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
| `catalogue-cleanup.js` / `catalogue-cleanup.css` | Post-render cleanup and bullet formatting for detail pages. |
| `online-research-options.js` / `online-research-options.css` | Special pricing/pathway section for one online research program. |
| `local-server.mjs` | Minimal static HTTP server on `127.0.0.1:5173`; opens the default browser automatically. |
| `open-localhost.bat` | Windows launcher that stops an existing listener on port 5173 and starts the local server. |
| `package.json` | Vite commands and React, Lucide, Tailwind, and Vite dependencies. |

## Development and Local Use

The package defines these commands:

- `npm run dev` / `pnpm dev`: start Vite in development mode.
- `npm run build` / `pnpm build`: create a production build.
- `npm run preview` / `pnpm preview`: preview the Vite build.
- `npm run build:compress` and `preview:compress`: use the custom `compress` mode/output.

On Windows, `open-localhost.bat` offers a dependency-light alternative that serves the repository directly through `local-server.mjs`. The local server accepts only GET and HEAD requests, prevents path traversal, sends basic MIME types, disables browser caching, and does not provide history-route fallback because routing uses URL hashes.

Both `package-lock.json` and `pnpm-lock.yaml` are committed, although the pnpm workspace file indicates pnpm is likely the intended package manager.

## Maintenance Notes and Risks

- The access control is only a client-side convenience. The password and all protected content are delivered to the browser, so this is not suitable for securing sensitive information.
- `app-loader.js` depends on unique, exact snippets inside a minified generated bundle. Rebuilding or changing `script.js` can make a patch target disappear or become ambiguous, causing startup to fail. The patches should be reapplied to source code if maintainable source becomes available.
- Several scripts use `MutationObserver` to modify React-generated DOM after rendering. This works for the current markup but is coupled to headings, class names, text labels, and element structure in the bundle.
- The home page displays a hard-coded total of **176 programs**, while the dataset contains **471**.
- The image map has entries for all 471 program IDs. Campus photos and local subject images provide fallback coverage, while the UI still retains its final placeholder state for failed or missing files.
- Of the 299 newer-provider records, 280 are marked `needs_review`; their flags preserve known scope, age/grade, pricing, date, and source limitations.
- The repository has no automated test files, lint configuration, or visible CI configuration. Verification is currently manual or build-based.
- The bundle and generated CSS are checked in, but their original React/Tailwind source files and build configuration are not present. That makes direct feature development and regeneration harder than editing a typical Vite project.
