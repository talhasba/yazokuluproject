# Program image library

This folder contains local images used by program cards and detail pages.

## Unique programme photographs

`unique/` contains one separately downloaded photograph for each of the 480 programmes. Both catalogue cards and detail-page heroes use that programme's imported image first. Files retain their original downloaded bytes.

`data/program-image-sources.json` records the programme, original download URL, source page, photographer/provider, licence, dimensions and fingerprints for every photograph. Provider photographs take priority; when a distinct suitable provider photo is unavailable, a reusable subject photograph from Wikimedia Commons or Openverse is used. Representative photos are explicitly labelled **Illustrative photo / Temsili fotoğraf**. Source and licence links appear on the card and detail page. These photographs illustrate the subject and do not establish the actual participants or facilities of a programme.

`data/program-photo-curation.json` preserves rejected source URLs and reviewed stock-search choices so unsuitable photos are not reintroduced. Reusable photos have CC BY, CC BY-SA, CC0 or public-domain terms recorded individually. Provider photos are identified as provider-owned; an open licence is not asserted.

Use `tools/fetch_unique_program_images.py --stage=all` for a resumable import. `--stage=illustrative` fills only missing records using the reviewed searches. Pages, search responses and downloads are cached under ignored `.local-editor/image-import/`. Pillow is required. Metadata API calls are throttled and public raster images are validated before saving.

After running any earlier image mapper or programme normalizer, run `tools/fetch_unique_program_images.py --stage=apply` to restore the imported images to first position without network access. The importer refuses to apply an incomplete collection.

Run `node --test tests/program-images.test.mjs` to verify coverage, local bytes, provenance and whole-image uniqueness. `tools/audit_program_photos.py` additionally checks shared visual details and pixel agreement for cropped/re-encoded duplicates; it requires Pillow, NumPy and OpenCV. Its output is a review aid, not proof against every possible duplicate. The final human visual review and feature audit are recorded in `data/program-image-audit.json`.

## Campus images

`campuses/` contains web-optimized campus and destination photographs downloaded from Wikimedia Commons. The original page, creator, license, license URL, download URL, and local path for every image are recorded in `image-sources.json`.

Keep the relevant attribution and license information when an image is published or redistributed. Some licenses, especially CC BY and CC BY-SA, require attribution.

## Program subject images

When a campus image is unavailable or a more specific image is needed, `data/image-candidates.json` also points to the site's existing local subject imagery in `assets/` (business, engineering, medicine, law, arts, and other subjects).

The candidates are ordered with local program-specific imagery first, followed by campus and subject imagery, then remote provider URLs. The current website displays the first candidate and retains its placeholder for programs with no usable image.

## Provider thumbnails

`providers/` contains optimized local copies of programme-specific images whose URLs are already present in the normalized catalogue. Their source image URL and programme page are recorded in `provider-image-sources.json`.

These images are provider-owned and are not assumed to have an open license. Confirm permission before publicly redistributing them. If a download fails, the catalogue keeps its existing local subject or campus fallback.

## Refreshing the library

Run `tools/fetch_program_images.py` to re-download the approved Commons images, refresh the source manifest, remove stale campus candidates, and rebuild the image mapping for all programs.

Run `tools/fetch_provider_thumbnails.py` to refresh the selected programme-specific provider thumbnails and place successful downloads first in the image candidate list.
