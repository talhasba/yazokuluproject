# Website and Content Library Summary

## Purpose of the Website

The website is a bilingual catalogue for discovering and comparing international summer programs. Its purpose is to help students, families, and advisers explore available programs from multiple education providers in one consistent place instead of reviewing every provider website separately.

Visitors can:

- Browse summer programs from different providers and institutions.
- Filter programs by subject, provider, and country.
- Review important information such as location, age or grade range, duration, dates, delivery format, and price.
- Open a program detail page to read its description, curriculum information, learning outcomes, and key facts.
- Switch between English and Turkish where translated content is available.
- Use the catalogue on desktop and mobile devices.

The website currently contains **471 programs from nine providers**:

1. Bucksmore
2. Edconic
3. Immerse Education
4. InvestIN Education
5. MPW Summer School
6. Oxford Royale
7. Sportech Academy
8. St Clare's, Oxford
9. Summer Discovery

The website is a static application. It loads its program information from JSON files in the repository and does not use a database or server-side content-management system.

## Main Website Data

The main source of program information is:

`data/programs.normalized.json`

This file contains the structured records used by the website. Depending on the provider and the available source information, a program record may contain:

- Program ID and provider name
- English and Turkish titles
- Subject and category information
- Country, city, campus, or delivery location
- Age and grade ranges
- Duration and delivery format
- Dates and available sessions
- Price, currency, and price notes
- Short and full descriptions
- Curriculum sections and learning outcomes
- English and Turkish detail-page content
- Image and source URLs
- Publication status and data-quality flags

The file currently contains **184 records marked `ready`** and **287 records marked `needs_review`**. A `needs_review` status does not necessarily mean that the program is unusable. It indicates that one or more fields may need confirmation, such as age, grade, price, date, scope, source attribution, or whether the program fits the intended catalogue.

## Purpose of the `contents` Folder

The `contents` folder provides human-friendly versions of the JSON catalogue. These files make it easier to read, review, discuss, and edit provider content without working directly inside a large JSON file.

The folder contains:

- `provider-contents.xlsx`
- `provider-reference.docx`
- `README.md`

These files are generated snapshots of `data/programs.normalized.json`. They are reference and editing tools; they are not automatically connected to the website.

## `provider-contents.xlsx`

The Excel workbook is the main content-editing file. It contains **19 worksheets**:

- One `Index` worksheet
- One `Info` worksheet for each of the nine providers
- One `Content` worksheet for each of the nine providers

### Index Worksheet

The `Index` worksheet gives a provider-level overview. It shows:

- Provider name
- Number of programs
- Represented countries
- Number of subjects
- Number of ready records
- Number of records needing review
- Names of the provider's Info and Content worksheets

### Provider Info Worksheets

Each provider has an `Info` worksheet for structured program information. These worksheets include fields such as:

- Program ID
- Provider and operating institution
- Program type and publication status
- English and Turkish titles
- English and Turkish subjects
- Categories
- Country, city, and location
- Age and grade ranges
- Duration and delivery mode
- Dates
- Price, currency, minimum price, and maximum price
- Price scope and price notes
- Detail and source URLs
- Flags and source filenames

The publication-status column is visually highlighted to make ready and review-required records easier to identify.

### Provider Content Worksheets

Each provider also has a `Content` worksheet for text-heavy fields. These worksheets include:

- Program ID and title
- English short description
- Turkish short description, when available
- English full description
- English and Turkish detail introductions
- Curriculum sections
- Learning outcomes
- English and Turkish detail sections
- English and Turkish key facts
- English and Turkish pricing options
- Image URL

The Program ID is the stable connection between the Info worksheet, the Content worksheet, the JSON source, and the website. It should not be changed unless the corresponding website record is intentionally being renamed and all references are updated.

## `provider-reference.docx`

The Word document is designed for reading and review rather than detailed data editing. It contains:

- A summary table for all nine providers
- Program totals and publication-status counts
- Provider-level country, location, subject, and delivery information
- A separate program directory for every provider
- Program titles and available Turkish titles
- Short program descriptions
- Subject and location information
- Key details such as age or grade range, duration, price, dates, and publication status

This document is useful for meetings, content reviews, proofreading, and sharing a readable catalogue with someone who does not need to work directly with JSON or large spreadsheets.

The Word file intentionally presents a concise version of each program. The Excel workbook and JSON file contain the more detailed long-form fields.

## How the Website and Content Files Relate

The content flow is:

`Provider sources → normalized JSON → website`

The Excel and Word files are derived working views:

`data/programs.normalized.json → provider-contents.xlsx and provider-reference.docx`

Editing the Excel or Word files does **not** automatically change the website. To publish an approved edit:

1. Locate the program using its Program ID.
2. Review or edit the content in the Excel workbook.
3. Copy the approved changes into the matching record in `data/programs.normalized.json`.
4. Preserve the JSON structure and data types.
5. Validate the JSON and confirm that program IDs remain unique.
6. Open the website and check the affected catalogue card, filters, and detail page.
7. Regenerate the Excel and Word files if they need to reflect the updated JSON.

The Word document should normally be treated as a reading and proofreading reference. The Excel workbook is the better place to prepare structured edits before updating JSON.

## Important Content Notes

- English content is more complete than Turkish content for some providers.
- Many newer-provider records are marked `needs_review` because the source supplied grades instead of ages, campus-level pricing instead of course-specific pricing, historical information, or incomplete dates and fees.
- Some providers use shared catalogue pages instead of program-specific detail URLs.
- Image coverage is incomplete. The website uses mapped image candidates, record-level image URLs, or a placeholder when no image is available.
- Provider source information can change. Prices, dates, availability, locations, and eligibility requirements should be checked before publication or advising a student.
- The website's password screen is client-side access control and should not be treated as protection for confidential information.

## Which File to Use

| Goal | Recommended file |
| --- | --- |
| Browse the public-facing catalogue | Website |
| Review all providers quickly | `contents/provider-reference.docx` |
| Edit structured program information | `contents/provider-contents.xlsx`, provider Info worksheet |
| Edit descriptions and long-form text | `contents/provider-contents.xlsx`, provider Content worksheet |
| Publish changes to the website | `data/programs.normalized.json` |
| Review normalization decisions for newer providers | `normalized_new_providers/README.md` and QA files |
| Understand the application code and technical risks | `summary.md` |

## Recommended Maintenance Practice

Treat `data/programs.normalized.json` as the source of truth. Use Program IDs to track every edit, preserve review flags until the underlying issue has been confirmed, and regenerate the Excel and Word files after substantial JSON changes. This prevents the website, spreadsheet, and document from gradually containing different versions of the same program information.
