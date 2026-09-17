# New-provider normalization QA

Total records: **299**

## Providers

- `edconic`: 7
- `mpw`: 8
- `sportech`: 19
- `summer_discovery`: 265

## Publish status

- `needs_review`: 280
- `ready`: 19

## Missing fields

- `age_or_grade`: 13
- `dates`: 1
- `price`: 14

## Important flags

- `2026_applications_closed`: 1
- `2026_sections_reported_closed`: 1
- `age_and_grade_need_review`: 1
- `age_floor_needs_review`: 1
- `age_range_needs_review`: 1
- `campus_level_price_not_course_specific`: 259
- `current_age_unpublished`: 8
- `current_price_unpublished`: 8
- `dates_need_review`: 1
- `grades_only_no_age_range`: 265
- `historical_2026_age_and_price_available`: 8
- `inaugural_2026_cohort_100_seats`: 1
- `likely_out_of_scope`: 4
- `location_outside_italy`: 1
- `missing_age`: 7
- `missing_dates`: 1
- `missing_price`: 6
- `not_season_specific`: 1
- `not_summer`: 1
- `operator_attribution_provisional`: 7
- `operator_page_not_directly_fetchable`: 1
- `shared_catalogue_page_no_detail_url`: 8
- `year_round_online`: 1

## Duplicates

- Duplicate IDs: 0
- Duplicate detail URLs: 1
- MPW's eight streams intentionally share one catalogue URL because no stream-specific pages exist.

## Scope notes

- Summer Discovery provides grade ranges, not ages; grade data is preserved and records are flagged for age-filter review.
- MPW 2027 dates are current, but 2026 age/fee evidence remains historical and separate.
- Sportech university programmes remain present but flagged as likely out of scope.
- Edconic winter and year-round online products remain present with explicit scope flags.
- This folder is separate from the earlier `site_data` normalization.
