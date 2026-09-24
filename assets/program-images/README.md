# Program image library

This folder contains local images used by program cards and detail pages.

## Campus images

`campuses/` contains web-optimized campus and destination photographs downloaded from Wikimedia Commons. The original page, creator, license, license URL, download URL, and local path for every image are recorded in `image-sources.json`.

Keep the relevant attribution and license information when an image is published or redistributed. Some licenses, especially CC BY and CC BY-SA, require attribution.

## Program subject images

When a campus image is unavailable or a more specific image is needed, `data/image-candidates.json` also points to the site's existing local subject imagery in `assets/` (business, engineering, medicine, law, arts, and other subjects).

The candidates are ordered with local program-specific imagery first, followed by campus and subject imagery, then remote provider URLs. The current website displays the first candidate and retains its placeholder for programs with no usable image.

## Refreshing the library

Run `tools/fetch_program_images.py` to re-download the approved Commons images, refresh the source manifest, remove stale campus candidates, and rebuild the image mapping for all programs.
