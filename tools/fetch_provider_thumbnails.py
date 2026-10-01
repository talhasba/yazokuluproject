"""Download provider-supplied programme thumbnails that are already in the catalogue.

This is intentionally limited to programmes whose normalized records contain a
unique, programme-specific ``image_url`` and that do not already have a local
programme image. The files are resized and cropped to a consistent 16:9 WebP.

Provider images are not assumed to be openly licensed. Their source URLs and
programme pages are recorded so publication rights can be checked separately.
"""

from __future__ import annotations

import io
import json
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PROGRAMS_PATH = ROOT / "data" / "programs.normalized.json"
CANDIDATES_PATH = ROOT / "data" / "image-candidates.json"
OUTPUT_DIR = ROOT / "assets" / "program-images" / "providers"
MANIFEST_PATH = ROOT / "assets" / "program-images" / "provider-image-sources.json"
USER_AGENT = "SummerProgramsCatalogue/1.0 (local content preparation)"
MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
THUMBNAIL_SIZE = (1200, 675)

# These providers currently expose unique programme artwork in normalized data
# but only have generic subject fallbacks in image-candidates.json.
TARGET_PROVIDERS = {"mpw", "sportech"}
TARGET_IDS = {"immerse-online-research-programme"}


def download(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                content_length = int(response.headers.get("Content-Length") or 0)
                if content_length > MAX_DOWNLOAD_BYTES:
                    raise RuntimeError(f"image is too large ({content_length} bytes)")
                payload = response.read(MAX_DOWNLOAD_BYTES + 1)
                if len(payload) > MAX_DOWNLOAD_BYTES:
                    raise RuntimeError("image exceeds download limit")
                return payload
        except urllib.error.HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("download retry loop ended unexpectedly")


def save_thumbnail(payload: bytes, target: Path, provider: str) -> tuple[int, int, str]:
    with Image.open(io.BytesIO(payload)) as source:
        source.load()
        source = ImageOps.exif_transpose(source).convert("RGB")
        original_size = source.size
        crop_strategy = "center crop"
        centering = (0.5, 0.5)
        if provider == "mpw":
            # MPW's image URLs point to landscape timetable sheets. The right
            # quarter is a vertical strip of genuine programme photography;
            # selecting its centre produces a useful activity thumbnail.
            source = source.crop((round(source.width * 0.735), 0, source.width, source.height))
            crop_strategy = "centre photo from right-hand timetable strip"
            centering = (0.5, 0.35)
        thumbnail = ImageOps.fit(
            source,
            THUMBNAIL_SIZE,
            method=Image.Resampling.LANCZOS,
            centering=centering,
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        thumbnail.save(target, "WEBP", quality=82, method=6)
        return original_size[0], original_size[1], crop_strategy


def main() -> None:
    programs = json.loads(PROGRAMS_PATH.read_text(encoding="utf-8"))
    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    selected = [
        record for record in programs
        if record.get("image_url")
        and (record.get("provider") in TARGET_PROVIDERS or record.get("id") in TARGET_IDS)
    ]

    manifest = {
        "generated_on": date.today().isoformat(),
        "usage_note": (
            "Provider-owned images; open-license status was not independently verified. "
            "Confirm permission before public redistribution."
        ),
        "thumbnail_size": list(THUMBNAIL_SIZE),
        "images": {},
        "failures": {},
    }

    for record in selected:
        program_id = record["id"]
        provider = record["provider"]
        relative_path = f"/assets/program-images/providers/{provider}/{program_id}.webp"
        target = ROOT / relative_path.lstrip("/")
        try:
            payload = download(record["image_url"])
            original_width, original_height, crop_strategy = save_thumbnail(payload, target, provider)
            existing = candidates.get(program_id, [])
            if not isinstance(existing, list):
                existing = []
            existing = [item for item in existing if item != relative_path]
            candidates[program_id] = [relative_path, *existing]
            manifest["images"][program_id] = {
                "provider": record.get("provider_label") or provider,
                "source_url": record["image_url"],
                "programme_page": record.get("source_url") or record.get("detail_url"),
                "local_path": relative_path,
                "original_width": original_width,
                "original_height": original_height,
                "crop_strategy": crop_strategy,
            }
            print(f"downloaded {program_id}")
        except Exception as exc:
            manifest["failures"][program_id] = {
                "source_url": record["image_url"],
                "error": str(exc),
            }
            print(f"failed {program_id}: {exc}")

    CANDIDATES_PATH.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest["programmes_selected"] = len(selected)
    manifest["images_downloaded"] = len(manifest["images"])
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "programmes_selected": len(selected),
        "images_downloaded": len(manifest["images"]),
        "failures": len(manifest["failures"]),
        "manifest": str(MANIFEST_PATH.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
