"""Download reusable campus images from Wikimedia Commons and map program images.

The script only accepts files with reusable Creative Commons or public-domain
license metadata. It writes local web-ready files and a source manifest, then
adds campus and subject fallbacks to data/image-candidates.json.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import date
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PROGRAMS_PATH = ROOT / "data" / "programs.normalized.json"
CANDIDATES_PATH = ROOT / "data" / "image-candidates.json"
OUTPUT_DIR = ROOT / "assets" / "program-images" / "campuses"
MANIFEST_PATH = ROOT / "assets" / "program-images" / "image-sources.json"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "SummerProgramsCatalogue/1.0 (local content preparation)"

ALLOWED_LICENSE_MARKERS = (
    "cc by",
    "cc-by",
    "cc by-sa",
    "cc-by-sa",
    "public domain",
    "pdm",
    "cc0",
)

BLOCKED_TITLE_MARKERS = (
    "logo",
    "seal",
    "map",
    "diagram",
    "coat of arms",
    "flag",
    "portrait",
    "icon",
    "plan ",
)

# One reusable scene per major catalogue location. Combined locations are mapped
# to their nearest base location later in LOCATION_ALIASES.
LOCATION_QUERIES = {
    "ucla": "UCLA campus Royce Hall",
    "university-of-michigan": "University of Michigan Ann Arbor campus Diag",
    "georgetown-university": "Georgetown University campus Healy Hall",
    "oxford": "University of Oxford campus colleges",
    "cambridge": "University of Cambridge college campus",
    "london": "King's College London campus",
    "dartmouth": "Dartmouth College campus green",
    "bryn-mawr-college": "Bryn Mawr College campus",
    "university-of-texas-at-austin": "University of Texas at Austin campus",
    "yale-university": "Yale University campus Old Campus",
    "fairfield-university": "Fairfield University campus",
    "milan": "University campus Milan Italy",
    "uc-berkeley": "University of California Berkeley campus",
    "kings-college-london": "King's College London campus building",
    "toronto": "University of Toronto campus",
    "new-york": "New York university campus students",
    "san-francisco": "University of San Francisco campus",
    "rome": "university campus Rome Italy",
    "rochester-minnesota": "Mayo Clinic Rochester Minnesota campus",
    "indianapolis": "Indiana University Indianapolis campus",
    "venice": "Ca Foscari University Venice campus",
    "parma": "University of Parma campus",
    "motor-valley": "Italian Motor Valley race track",
}

# Exact Commons filenames used where broad search terms can confuse places with
# similarly named institutions or return an object rather than a campus scene.
PREFERRED_TITLES = {
    "ucla": "File:2019 UCLA Royce Hall and Haines Hall.jpg",
    "georgetown-university": "File:Georgetown University campus.JPG",
    "oxford": "File:Radcliffe Camera Oxford 2018 02.jpg",
    "cambridge": "File:University of Cambridge, King's College.jpg",
    "london": "File:Strand Building, King's College London.jpg",
    "dartmouth": "File:Dartmouth College campus 2007-10-13 - The Green 2.JPG",
    "bryn-mawr-college": "File:Great Hall Bryn Mawr College PA.jpg",
    "fairfield-university": "File:Bellarmine Hall at Fairfield University, CT.jpg",
    "kings-college-london": "File:Strand Building, King's College London.jpg",
    "new-york": "File:Washington square park.jpg",
    "rome": "File:AulaMagna Sapienza.jpg",
    "motor-valley": "File:Imola Circuit, 1998 - Tower and start-finish line.jpg",
}

LOCATION_ALIASES = {
    "UCLA": "ucla",
    "UCLA Anderson School of Management": "ucla",
    "University of Michigan": "university-of-michigan",
    "Georgetown University": "georgetown-university",
    "Oxford": "oxford",
    "Cambridge": "cambridge",
    "London": "london",
    "London & Cambridge": "london",
    "Cambridge & London": "cambridge",
    "Dartmouth": "dartmouth",
    "Bryn Mawr College": "bryn-mawr-college",
    "University of Texas at Austin": "university-of-texas-at-austin",
    "Yale University": "yale-university",
    "Yale": "yale-university",
    "Yale & New York": "yale-university",
    "Fairfield University": "fairfield-university",
    "Milan": "milan",
    "Milan & Motor Valley": "milan",
    "Milan, Piacenza & Turin": "milan",
    "UC Berkeley": "uc-berkeley",
    "King's College London": "kings-college-london",
    "Toronto": "toronto",
    "New York": "new-york",
    "New York City": "new-york",
    "San Francisco": "san-francisco",
    "Rome": "rome",
    "Rochester, MN": "rochester-minnesota",
    "Indianapolis": "indianapolis",
    "Venice": "venice",
    "Parma": "parma",
    "Motor Valley": "motor-valley",
}

SUBJECT_ASSETS = {
    "business": "/assets/Business-Management-Product-Image-4-300x300-D6z5b-10.webp",
    "economics": "/assets/Programme_2Economics-Cambridge--300x200.jpg-BEHvOGyk.webp",
    "engineering": "/assets/751ee3451e68--ENGINEER-51cd88-C38kLcd1.png",
    "computer": "/assets/751ee3451e68--SOFTWARE-ENGINEER-403c3f-BZx7lpN4.png",
    "artificial intelligence": "/assets/Programme-_1_-Artificial-Intelligence-Oxford--300x200.jpg-BXlIZFPP.webp",
    "medicine": "/assets/Medicine_360x.progressive-vkJoXFKf.jpg",
    "health": "/assets/751ee3451e68--751ee3451e68-DOCTOR-129bf3-1-2dc460-cYVOTqlD.png",
    "biology": "/assets/Biology-Product-Image-2-300x300-CH2Cuhib.webp",
    "chemistry": "/assets/Chemistry-Product-Image-1-300x300-Bun8Vcox.webp",
    "law": "/assets/Law_360x.progressive-Bmmbhk2e.jpg",
    "politics": "/assets/Politics_360x.progressive-CLSMd2uQ.jpg",
    "government": "/assets/751ee3451e68--POLITICAL-LEADER-a2efc2-Cd-oSFgG.png",
    "psychology": "/assets/Psychologist-square_082194a6-f5ff-4008-8bc4-db46a309ad72_360x.progressive-C1T2yPBQ.jpg",
    "architecture": "/assets/Programme_1_Architecture-Summer-Programme-in-Cambridge--300x190.jpg-DOYBmGr1.webp",
    "fashion": "/assets/751ee3451e68--FASHION-1-671118-Dl1dFefQ.png",
    "film": "/assets/Filmmaker_43ab077b-a1e3-44b7-986a-f9f540b838f5_360x.progressive-BrjhSYoJ.jpg",
    "creative": "/assets/751ee3451e68--art-7386f8-CSktBB85.png",
    "humanities": "/assets/751ee3451e68--JOURNALIST-1-b14c30-BOPTYdxa.png",
    "journalism": "/assets/751ee3451e68--JOURNALIST-1-b14c30-BOPTYdxa.png",
    "sports": "/assets/Bucksmore-20-scaled-optimized-C7L9tHLE.jpg",
    "veterinary": "/assets/751ee3451e68--VET-0a639b-BgP8MWlb.png",
    "vet": "/assets/751ee3451e68--VET-0a639b-BgP8MWlb.png",
    "forensic": "/assets/751ee3451e68--FORENSIC-SCIENTIST-cccdc5-gS6hhBAT.png",
    "english": "/assets/Young-Professionals-Performing-Arts-1024x683-optimized-CfbT-NW1.jpg",
    "language": "/assets/Young-Professionals-Performing-Arts-1024x683-optimized-CfbT-NW1.jpg",
    "default": "/assets/Summer-School-Oxford-1.jpg-CcuClKyn.webp",
}


def request_json(params: dict) -> dict:
    url = COMMONS_API + "?" + urllib.parse.urlencode(params)
    for attempt in range(5):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 4:
                raise
            time.sleep(2 ** (attempt + 1))
    raise RuntimeError("Commons API retry loop ended unexpectedly")


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    return html.unescape(re.sub(r"<[^>]+>", " ", value)).replace("\n", " ").strip()


def reusable_license(metadata: dict) -> bool:
    license_name = strip_html((metadata.get("LicenseShortName") or {}).get("value")).lower()
    usage = strip_html((metadata.get("UsageTerms") or {}).get("value")).lower()
    combined = f"{license_name} {usage}"
    return any(marker in combined for marker in ALLOWED_LICENSE_MARKERS)


def image_record(page: dict) -> dict:
    info = (page.get("imageinfo") or [{}])[0]
    metadata = info.get("extmetadata") or {}
    if not reusable_license(metadata):
        raise RuntimeError(f"Selected file is not marked with a reusable license: {page.get('title')}")
    return {
        "title": page["title"],
        "download_url": info.get("thumburl") or info.get("url"),
        "original_url": info.get("url"),
        "commons_page": info.get("descriptionurl"),
        "width": info.get("width"),
        "height": info.get("height"),
        "license": strip_html((metadata.get("LicenseShortName") or {}).get("value")),
        "license_url": strip_html((metadata.get("LicenseUrl") or {}).get("value")),
        "artist": strip_html((metadata.get("Artist") or {}).get("value")),
        "credit": strip_html((metadata.get("Credit") or {}).get("value")),
        "description": strip_html((metadata.get("ImageDescription") or {}).get("value")),
    }


def commons_query(extra: dict) -> dict:
    return request_json({
        "action": "query",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": 1600,
        "format": "json",
        "formatversion": 2,
        "origin": "*",
        **extra,
    })


def fetch_preferred_image(title: str) -> dict:
    payload = commons_query({"titles": title})
    pages = payload.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        raise RuntimeError(f"Preferred Commons file not found: {title}")
    return image_record(pages[0])


def choose_commons_image(query: str) -> dict:
    payload = commons_query({
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": 25,
    })
    pages = payload.get("query", {}).get("pages", [])
    choices = []
    for page in pages:
        title = page.get("title", "")
        lower_title = title.lower()
        if any(marker in lower_title for marker in BLOCKED_TITLE_MARKERS):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        metadata = info.get("extmetadata") or {}
        if not reusable_license(metadata):
            continue
        width = info.get("width") or 0
        height = info.get("height") or 0
        mime = info.get("mime") or ""
        if not mime.startswith("image/") or mime.endswith("svg+xml"):
            continue
        landscape_score = 1 if width >= height else 0
        resolution_score = min(width * height, 20_000_000)
        choices.append((landscape_score, resolution_score, page, info, metadata))
    if not choices:
        raise RuntimeError(f"No reusable photo found for: {query}")
    choices.sort(key=lambda item: (item[0], item[1]), reverse=True)
    _, _, page, _, _ = choices[0]
    return image_record(page)


def download_file(url: str, target: Path) -> None:
    for attempt in range(5):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                target.write_bytes(response.read())
                return
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 4:
                raise
            time.sleep(2 ** (attempt + 1))


def convert_to_webp(source: Path, target: Path) -> None:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        if image.width > 1600:
            new_height = round(image.height * (1600 / image.width))
            image = image.resize((1600, new_height), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=84, method=6)


def subject_asset(subject: str) -> str:
    lower = subject.lower()
    for marker, asset in SUBJECT_ASSETS.items():
        if marker != "default" and marker in lower:
            return asset
    return SUBJECT_ASSETS["default"]


def campus_asset(record: dict, downloaded: dict[str, dict]) -> str | None:
    location = record.get("location") or ""
    city = record.get("city") or ""
    key = LOCATION_ALIASES.get(location) or LOCATION_ALIASES.get(city)
    if not key or key not in downloaded:
        return None
    return f"/assets/program-images/campuses/{key}.webp"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "generated_on": date.today().isoformat(),
        "source": "Wikimedia Commons",
        "usage_note": "Retain attribution and license information when redistributing these images.",
        "images": {},
        "failures": {},
    }
    temporary_dir = OUTPUT_DIR / ".downloads"
    temporary_dir.mkdir(exist_ok=True)

    for key, query in LOCATION_QUERIES.items():
        try:
            metadata = fetch_preferred_image(PREFERRED_TITLES[key]) if key in PREFERRED_TITLES else choose_commons_image(query)
            temporary = temporary_dir / f"{key}.source"
            target = OUTPUT_DIR / f"{key}.webp"
            download_file(metadata["download_url"], temporary)
            convert_to_webp(temporary, target)
            metadata["local_path"] = f"/assets/program-images/campuses/{key}.webp"
            metadata["query"] = query
            manifest["images"][key] = metadata
            print(f"downloaded {key}: {metadata['title']}")
            time.sleep(0.15)
        except Exception as exc:
            manifest["failures"][key] = {"query": query, "error": str(exc)}
            print(f"failed {key}: {exc}")

    for temporary in temporary_dir.glob("*"):
        temporary.unlink()
    temporary_dir.rmdir()

    programs = json.loads(PROGRAMS_PATH.read_text(encoding="utf-8"))
    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    mapped = {}
    for record in programs:
        existing = candidates.get(record["id"], [])
        if not isinstance(existing, list):
            existing = []
        # Campus paths are regenerated from the verified manifest on every run,
        # so a stale or rejected search result can never survive in the map.
        existing = [
            candidate for candidate in existing
            if not candidate.startswith("/assets/program-images/campuses/")
        ]
        existing = [
            candidate for candidate in existing
            if not candidate.startswith("/assets/")
            or (ROOT / candidate.lstrip("/")).is_file()
        ]
        local_existing = [candidate for candidate in existing if candidate.startswith("/assets/")]
        remote_existing = [candidate for candidate in existing if not candidate.startswith("/assets/")]
        additions = [
            campus_asset(record, manifest["images"]),
            subject_asset(record.get("subject") or ""),
        ]
        ordered = []
        # Prefer reliable local program-specific imagery, then the campus and
        # subject fallbacks, while retaining remote provider images afterward.
        for candidate in [*local_existing, *additions, *remote_existing]:
            if candidate and candidate not in ordered:
                ordered.append(candidate)
        mapped[record["id"]] = ordered

    CANDIDATES_PATH.write_text(json.dumps(mapped, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest["programs_mapped"] = len(mapped)
    manifest["campus_images_downloaded"] = len(manifest["images"])
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "campus_images": len(manifest["images"]),
        "failed_queries": len(manifest["failures"]),
        "programs_mapped": len(mapped),
        "manifest": str(MANIFEST_PATH.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
