"""Import one distinct real photograph per catalogue programme.

Provider course-page photographs take priority. Reusable Commons subject photos
are explicitly marked illustrative. Downloads retain their original bytes; no
cropping, recolouring or generated imagery is used. Source/licence data is kept.
Run with bundled Python, which provides Pillow, and internet access.
"""
from __future__ import annotations
import argparse
import concurrent.futures
import hashlib
import html
import io
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".local-editor/image-import"
OUT = ROOT / "assets/program-images/unique"
MANIFEST = ROOT / "data/program-image-sources.json"
UA = "SummerButWhereCatalogue/1.0 (educational photo attribution; local import)"
API = "https://commons.wikimedia.org/w/api.php"
OPENVERSE = "https://api.openverse.org/v1/images/"
MAX_BYTES = 18 * 1024 * 1024
LOCK = threading.Lock()
HOST_LIMITS: dict[str, threading.Semaphore] = {}
NEXT_API_REQUEST = 0.0
BLOCKED = re.compile(r"logo|seal|icon|headshot|portrait|timetable|-tt(?:-|\.)|certificate|brochure|banner-ad|watermark|screenshot|diagram|drawing|engraving|lithograph|coat.of.arms|autopsy|cadaver|dissection|surgery|injur|nudity|nude|poster|\.svg", re.I)

def write(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    temp.replace(path)

def read(path: Path, default=None):
    return json.loads(path.read_text(encoding="utf8")) if path.exists() else default

def get(url: str, limit=MAX_BYTES) -> tuple[bytes, str]:
    global NEXT_API_REQUEST
    if urllib.parse.urlparse(url).scheme != "https":
        raise ValueError("Only public HTTPS image sources are accepted")
    host = urllib.parse.urlparse(url).netloc
    with LOCK:
        semaphore = HOST_LIMITS.setdefault(host, threading.Semaphore(2))
    for attempt in range(3):
        try:
            with semaphore:
                if url.startswith(API) or url.startswith(OPENVERSE):
                    with LOCK:
                        delay = max(0, NEXT_API_REQUEST - time.monotonic())
                        NEXT_API_REQUEST = max(NEXT_API_REQUEST, time.monotonic()) + 4
                    if delay:
                        time.sleep(delay)
                request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
                with urllib.request.urlopen(request, timeout=20 if url.startswith(API) or url.startswith(OPENVERSE) else 12) as response:
                    payload = response.read(limit + 1)
                    if len(payload) > limit:
                        raise ValueError("Download exceeds size limit")
                    return payload, response.url
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and not (url.startswith(API) or url.startswith(OPENVERSE)):
                raise
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            retry_after = exc.headers.get("Retry-After", "")
            time.sleep(min(45, int(retry_after)) if retry_after.isdigit() else (15 if exc.code == 429 else 2 ** (attempt + 1)))
    raise RuntimeError("Retry limit reached")

def canonical(url: str) -> str:
    u = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(u.query)
    if "url" in params and "/_next/image" in u.path:
        return canonical(params["url"][0])
    path = re.sub(r"-p-\d+(?=\.)", "", u.path)
    return urllib.parse.urlunparse((u.scheme, u.netloc, path, "", "", ""))

def publisher_url(value: str, page: str) -> str:
    url = urllib.parse.urljoin(page, html.unescape(value))
    # Use the publisher's web-sized Next thumbnail, not the multi-megabyte original.
    u = urllib.parse.urlparse(url)
    if "/_next/image" in u.path:
        params = urllib.parse.parse_qs(u.query)
        params["w"] = ["1200"]
        url = urllib.parse.urlunparse(u._replace(query=urllib.parse.urlencode({k:v[0] for k,v in params.items()})))
    return url

class PageImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.og = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "meta" and values.get("property") == "og:image":
            self.og.append(values.get("content", ""))
        if tag == "img":
            self.images.append(values)

def crawl(record: dict) -> dict:
    page = record.get("detail_url") or record.get("source_url")
    key = hashlib.sha256(page.encode()).hexdigest()
    cache = CACHE / "pages" / (key + ".json")
    if cache.exists():
        return read(cache)
    try:
        payload, final_page = get(page, 5 * 1024 * 1024)
        parser = PageImages()
        parser.feed(payload.decode("utf8", "replace"))
        options = []
        def add(url, score, alt=""):
            if not url or url.startswith("data:"):
                return
            absolute = publisher_url(url, final_page)
            key = canonical(absolute)
            if BLOCKED.search(urllib.parse.unquote(key)) or BLOCKED.search(alt):
                return
            options.append({"download_url": absolute, "canonical_url": key, "source_page": final_page, "description": alt, "score": score})
        for url in parser.og:
            add(url, 100)
        for index, image in enumerate(parser.images):
            url = image.get("data-src") or image.get("src")
            alt = image.get("alt", "")
            try:
                width, height = int(image.get("width", 0)), int(image.get("height", 0))
            except (ValueError, TypeError):
                width, height = 0, 0
            if width and (width < 600 or height < 300):
                continue
            if record["provider"] == "summer_discovery":
                if alt.lower() != "banner":
                    continue
                add(url, 100, alt)
            elif record["provider"] == "immerse":
                # Navigation images precede the course body; use the page's OG.
                if "student" in alt.lower() or "class" in alt.lower():
                    add(url, 60, alt)
            else:
                if index < 20 or re.search(r"student|class|learning|workshop|campus", alt, re.I):
                    add(url, 80 - min(index, 35), alt)
        seen = set()
        choices = []
        for item in sorted(options, key=lambda x: -x["score"]):
            if item["canonical_url"] not in seen:
                choices.append(item)
                seen.add(item["canonical_url"])
        result = {"source_page": final_page, "choices": choices[:6]}
    except Exception as exc:
        result = {"source_page": page, "choices": [], "error": str(exc)}
    write(cache, result)
    return result

def inspect(payload: bytes) -> dict:
    with Image.open(io.BytesIO(payload)) as image:
        image.load()
        width, height = image.size
        if width < 700 or height < 350 or not 0.6 <= width / height <= 3.5:
            raise ValueError(f"Not a usable programme photo: {width}x{height}")
        if image.format not in ("JPEG", "PNG", "WEBP", "AVIF"):
            raise ValueError(f"Unsupported raster format: {image.format}")
        # Read-only perceptual fingerprint: derivatives of the same photograph
        # cannot satisfy uniqueness merely by having different URLs or filenames.
        gray = image.convert("L").resize((9, 8))
        pixels = list(gray.get_flattened_data() if hasattr(gray, "get_flattened_data") else gray.getdata())
        bits = sum((pixels[y*9+x] > pixels[y*9+x+1]) << (y*8+x) for y in range(8) for x in range(8))
        return {"width": width, "height": height, "extension": {"JPEG":"jpg", "PNG":"png", "WEBP":"webp", "AVIF":"avif"}[image.format], "sha256": hashlib.sha256(payload).hexdigest(), "dhash": f"{bits:016x}"}

def photo_bytes(url: str) -> bytes:
    cache = CACHE / "downloads" / (hashlib.sha256(url.encode()).hexdigest() + ".bin")
    if cache.exists():
        return cache.read_bytes()
    payload = get(url)[0]
    inspect(payload)
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(payload)
    return payload

def repair_publisher_thumbnail(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    original = urllib.parse.parse_qs(parsed.query).get("url", [""])[0]
    # Academy Royale's Next proxy rejects external fetches. The actual image
    # URLs are openly supplied in its markup and can be fetched from its CDN.
    if "/_next/image" in parsed.path and original.startswith("https://cdn.sanity.io/"):
        return original
    return url

def plain(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()

def commons_pool(query: str) -> list[dict]:
    cache = CACHE / "commons" / (hashlib.sha256(query.encode()).hexdigest() + ".json")
    if cache.exists():
        return read(cache)
    params = {"action":"query", "format":"json", "formatversion":2, "generator":"search", "gsrsearch":query,
        "gsrnamespace":6, "gsrlimit":100, "prop":"imageinfo", "iiprop":"url|size|mime|extmetadata", "iiurlwidth":1280}
    payload, _ = get(API + "?" + urllib.parse.urlencode(params), 8 * 1024 * 1024)
    results = []
    for page in sorted(json.loads(payload).get("query", {}).get("pages", []), key=lambda x:x.get("index",1000)):
        title = page.get("title", "")
        if BLOCKED.search(title) or re.search(r"\b(map|flag|plan|scan)\b", title, re.I):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime") != "image/jpeg":
            continue
        width, height = info.get("width", 0), info.get("height", 1)
        if width < 900 or height < 400 or not 1.2 <= width / height <= 3:
            continue
        meta = info.get("extmetadata", {})
        field = lambda k: plain(meta.get(k, {}).get("value", ""))
        license_name = field("LicenseShortName")
        if not re.fullmatch(r"CC BY(?:-SA)? [\d.]+|CC0(?: [\d.]+)?|Public domain|PDM(?: [\d.]+)?", license_name, re.I):
            continue
        results.append({"title": title, "download_url": info.get("thumburl") or info.get("url"), "canonical_url": info.get("url"),
            "source_page": info.get("descriptionurl"), "artist": field("Artist"), "license": license_name, "license_url": field("LicenseUrl"),
            "description": field("ImageDescription"), "query":query, "source_kind":"illustrative", "source_platform":"Wikimedia Commons"})
    write(cache, results)
    return results

def openverse_pool(query: str, page: int = 1, stock: bool = False) -> list[dict]:
    key = query if page == 1 else query + f"|page={page}"
    if stock:
        key += "|stocksnap-cc0"
    cache = CACHE / "openverse" / (hashlib.sha256(key.encode()).hexdigest() + ".json")
    if cache.exists():
        return read(cache)
    params = {"q":query, "license_type":"commercial", "extension":"jpg", "page_size":20, "page":page, "mature":"false"}
    if stock:
        params.update(source="stocksnap", license="cc0")
    payload, _ = get(OPENVERSE + "?" + urllib.parse.urlencode(params), 5 * 1024 * 1024)
    results = []
    for image in json.loads(payload).get("results", []):
        if image.get("mature") or image.get("license") not in ("by", "by-sa", "cc0", "pdm"):
            continue
        if BLOCKED.search(image.get("title", "")):
            continue
        if image.get("category") not in (None, "photograph"):
            continue
        width, height = image.get("width") or 0, image.get("height") or 0
        if width and (width < 700 or height < 350 or not 1.15 <= width / height <= 3.5):
            continue
        url, source = image.get("url", ""), image.get("foreign_landing_url", "")
        if not url.startswith("https:") or not source.startswith("https:") or not image.get("creator"):
            continue
        name = {"by":"CC BY", "by-sa":"CC BY-SA", "cc0":"CC0", "pdm":"PDM"}[image["license"]]
        results.append({"title":plain(image.get("title")), "download_url":url, "canonical_url":canonical(url), "source_page":source,
            "artist":plain(image["creator"]), "license":name + " " + (image.get("license_version") or "1.0"), "license_url":image.get("license_url"),
            "description":plain(image.get("title")), "query":query, "source_kind":"illustrative", "source_platform":"Openverse", "openverse_id":image["id"],
            "indexed_source":image.get("source"), "attribution":plain(image.get("attribution"))})
    write(cache, results)
    return results

# Queries describe representative subject photographs, never another provider's
# students as the actual participants of this programme.
TOPICS = [
    (r"cooking|culinary|\bchef\b", ["culinary students kitchen", "cooking school students", "cooking class kitchen"]),
    (r"creative writing|literature|journalism", ["students writing classroom", "university students library", "students reading books"]),
    (r"psychology|philosophy|sociology|society|human behavior", ["university seminar students", "university students library", "students classroom discussion"]),
    (r"dentist|dentistry", ["dental students training", "dentistry laboratory"]),
    (r"vet|veterinar", ["veterinary students", "veterinary examination"]),
    (r"forensic|criminolog", ["forensic science laboratory", "laboratory microscope"]),
    (r"robot|microcontroller", ["students robotics", "robotics laboratory", "educational robot"]),
    (r"cybersecurity|cryptograph|ciphers|encryption", ["computer science students", "computer laboratory", "computer networking equipment"]),
    (r"artificial intelligence|\bai\b|neural network", ["artificial intelligence robot", "computer science laboratory", "students computers"]),
    (r"computer|software|coding|programming|technology", ["students computer laboratory", "computer science students", "programming classroom"]),
    (r"chemistry|chemical", ["students chemistry laboratory", "chemistry laboratory experiment", "chemistry glassware laboratory"]),
    (r"biology|biotech|genetic|life sciences", ["biology students laboratory", "biology laboratory microscope", "biology science laboratory"]),
    (r"medicine|health|medical|anatomy|neuroscience", ["medical students training", "medical simulation laboratory", "medical teaching classroom"]),
    (r"architecture|urban design", ["architecture students models", "architecture studio students", "architectural model"]),
    (r"automotive|transportation|motorsport|motor|esports", ["students formula racing car", "automotive engineering laboratory", "racing car engineering"]),
    (r"engineer|physics|stem|science|mathematic|research", ["students engineering laboratory", "science laboratory students", "physics laboratory equipment", "university science classroom"]),
    (r"fashion", ["fashion design students", "fashion design sewing workshop", "fashion runway"]),
    (r"film|digital media|media|photograph", ["students filmmaking", "film production camera", "film production set"]),
    (r"music|theatre|performing|drama", ["students theatre rehearsal", "music students orchestra", "theatre stage rehearsal"]),
    (r"sports|football|sport management", ["university students sports", "students football training", "university basketball practice"]),
    (r"\bart\b|design|creative arts|creative industries", ["art students painting", "students art studio", "sculpture workshop"]),
    (r"business|finance|banking|econom|entrepreneur|marketing|leadership|innovation", ["university students group discussion", "students business classroom", "university students presentation", "students teamwork"]),
    (r"law|politic|government|international relations|global leadership", ["law students moot court", "university students debate", "university seminar classroom"]),
    (r"english|language|literature|writing|journalism", ["students language classroom", "university students library", "students writing classroom"]),
    (r"psychology|philosophy|history|humanit|society|human behavior", ["university seminar students", "university students library", "students classroom discussion"]),
    (r"sustainab|environment|eco", ["students environmental science", "ecology fieldwork", "environmental science laboratory"]),
]

def queries(record: dict) -> list[str]:
    # Specific course titles take priority over broad labels such as Creative
    # Arts or Psychology & Social Science, which otherwise distort the subject.
    for text in [record["title"], record.get("subject", "")]:
        for pattern, candidates in TOPICS:
            if re.search(pattern, text, re.I):
                return candidates
    return ["university students classroom", "university students studying"]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=["crawl", "download", "illustrative", "apply", "all"], default="all")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    programs = read(ROOT / "data/programs.normalized.json")
    if args.limit:
        programs = programs[:args.limit]
    provider_cache = CACHE / "provider-candidates.json"
    candidates = read(provider_cache, {})
    for page in candidates.values():
        for choice in page.get("choices", []):
            choice["download_url"] = repair_publisher_thumbnail(choice["download_url"])
    if args.stage == "apply":
        manifest = read(MANIFEST)
        if len(manifest["images"]) != len(programs) or manifest["failures"]:
            raise SystemExit("Image import is incomplete")
        mapping = read(ROOT / "data/image-candidates.json")
        for program_id, image in manifest["images"].items():
            mapping[program_id] = [image["local_path"], *[x for x in mapping.get(program_id, []) if "/program-images/unique/" not in x]]
        write(ROOT / "data/image-candidates.json", mapping)
        print("Reapplied imported programme images without network requests.")
        return
    if args.stage in ("crawl", "all"):
        # Shared provider pages are downloaded once; source candidates stay cached.
        pages = {}
        for record in programs:
            pages.setdefault(record.get("detail_url") or record.get("source_url"), record)
        with concurrent.futures.ThreadPoolExecutor(6) as executor:
            futures = {executor.submit(crawl, r): page for page, r in pages.items()}
            for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
                page = futures[future]
                result = future.result()
                for record in programs:
                    if (record.get("detail_url") or record.get("source_url")) == page:
                        candidates[record["id"]] = result
                if index % 20 == 0 or index == len(pages):
                    write(provider_cache, candidates)
                    print(f"Read {index}/{len(pages)} course pages", flush=True)
        write(provider_cache, candidates)
    if args.stage == "crawl":
        urls = {x["canonical_url"] for p in candidates.values() for x in p.get("choices", [])}
        print(f"Provider pages offer {len(urls)} distinct candidate photographs.", flush=True)
        return
    # Fetch distinct first choices concurrently; matching and catalogue updates
    # remain serial and deterministic. Host limits avoid hammering one provider.
    first_choices = set()
    completed_ids = set(read(MANIFEST, {"images":{}})["images"])
    for record in ([] if args.stage == "illustrative" else programs):
        if record["id"] in completed_ids:
            continue
        direct = record.get("image_url", "")
        if direct.startswith("https:") and record["provider"] != "mpw":
            first_choices.add(direct)
        elif candidates.get(record["id"], {}).get("choices"):
            first_choices.add(candidates[record["id"]]["choices"][0]["download_url"])
    def prefetch(url):
        try:
            photo_bytes(url)
        except Exception:
            pass
    print(f"Prefetching {len(first_choices)} distinct provider first choices", flush=True)
    with concurrent.futures.ThreadPoolExecutor(6) as executor:
        for index, _ in enumerate(executor.map(prefetch, sorted(first_choices)), 1):
            if index % 30 == 0:
                print(f"Provider downloads cached: {index}/{len(first_choices)}", flush=True)
    manifest = read(MANIFEST, {"_meta":{}, "images":{}, "failures":{}})
    curation = read(ROOT / "data/program-photo-curation.json", {"blocked_urls":[], "searches":{}})
    images = manifest["images"]
    used_urls = {x.get("canonical_url") for x in images.values()}
    used_hashes = {x.get("sha256") for x in images.values()}
    used_phashes = {int(x["dhash"],16) for x in images.values() if x.get("dhash")}
    rejected_urls = set(curation["blocked_urls"])
    def accept(record, item, local_payload=None):
        key = item["canonical_url"]
        if BLOCKED.search(urllib.parse.unquote(key)):
            return False
        if key in used_urls or key in rejected_urls:
            return False
        try:
            payload = local_payload if local_payload is not None else photo_bytes(item["download_url"])
            info = inspect(payload)
            signature = int(info["dhash"],16)
            if info["sha256"] in used_hashes or any((signature ^ h).bit_count() <= 3 for h in used_phashes):
                rejected_urls.add(key)
                return False
            relative = f"/assets/program-images/unique/{record['id']}.{info.pop('extension')}"
            (ROOT / relative.lstrip("/")).write_bytes(payload)
            images[record["id"]] = {**item, **info, "local_path":relative, "program_title":record["title"], "provider":record.get("provider_label"), "changes":"None; original downloaded bytes"}
            used_urls.add(key)
            used_hashes.add(info["sha256"])
            used_phashes.add(signature)
            manifest.get("failures", {}).pop(record["id"], None)
            write(MANIFEST, manifest)
            return True
        except Exception as exc:
            rejected_urls.add(key)
            return False
    # First give every programme a chance at its actual provider's photography.
    for index, record in enumerate([] if args.stage == "illustrative" else programs, 1):
        if record["id"] in images:
            continue
        if record["id"] in curation["searches"] and record["id"] not in curation.get("provider_choices", {}):
            continue
        choices = curation.get("provider_choices", {}).get(record["id"]) or candidates.get(record["id"], {}).get("choices", [])
        if record.get("image_url", "").startswith("https:") and record["provider"] != "mpw":
            direct = record["image_url"]
            choices = [{"download_url":direct, "canonical_url":canonical(direct), "source_page":record["detail_url"], "description":record["title"]}, *choices]
        for item in choices:
            item = {**item, "source_kind":"provider", "artist":record.get("provider_label"), "license":"Provider-owned; no open licence asserted", "license_url":""}
            if accept(record, item):
                break
        # Preserve the two source-brochure photographs already supplied for Ireland.
        if record["provider"] == "emerald" and record["id"] not in images:
            source = ROOT / record["image_url"].lstrip("/")
            accept(record, {"download_url":record["source_url"], "canonical_url":str(source.relative_to(ROOT)), "source_page":record["source_url"], "source_kind":"provider", "artist":record["provider_label"], "license":"Provider-owned; supplied brochure", "license_url":"", "description":record["title"]}, source.read_bytes())
        if index % 20 == 0:
            print(f"Provider pass {index}/{len(programs)}; {len(images)} distinct photos saved", flush=True)
    pending = [r for r in programs if r["id"] not in images]
    print(f"Looking for illustrative subject photos for {len(pending)} programmes", flush=True)
    for index, record in enumerate(pending, 1):
        found = False
        attempted = []
        stock_queries = curation["searches"].get(record["id"])
        for query in stock_queries or queries(record):
            attempted.append(query)
            try:
                searches = ((lambda q: openverse_pool(q, 1, True)), (lambda q: openverse_pool(q, 2, True)), (lambda q: openverse_pool(q, 3, True))) if stock_queries else ((lambda q: openverse_pool(q, 1)), (lambda q: openverse_pool(q, 2)), (lambda q: openverse_pool(q, 3)), commons_pool)
                for search in searches:
                    pool = search(query)
                    for item in pool:
                        if accept(record, item):
                            found = True
                            break
                    if found:
                        break
            except Exception as exc:
                print(f"Search unavailable: {query}: {exc}", flush=True)
            if found:
                break
        if not found:
            manifest["failures"][record["id"]] = {"queries":attempted, "reason":"No distinct usable photo found"}
            write(MANIFEST, manifest)
        if index % 10 == 0 or index == len(pending):
            print(f"Subject pass {index}/{len(pending)}; {len(images)} photos saved, {len(manifest['failures'])} unresolved", flush=True)
    manifest["_meta"] = {"reviewed":"2026-10-12", "programmes":len(programs), "images":len(images), "provider_photos":sum(x["source_kind"]=="provider" for x in images.values()),
        "illustrative_photos":sum(x["source_kind"]=="illustrative" for x in images.values()), "note":"Photographs sourced from programme providers, Wikimedia Commons or Openverse. Representative subject photographs do not depict the actual programme. Import rejects identical bytes and near-identical whole-image fingerprints; crop variants require the separate visual/feature audit."}
    write(MANIFEST, manifest)
    print(json.dumps(manifest["_meta"]), flush=True)
    if len(images) != len(programs):
        raise SystemExit(2)
    mapping = read(ROOT / "data/image-candidates.json")
    for program_id, image in images.items():
        mapping[program_id] = [image["local_path"], *[x for x in mapping.get(program_id, []) if "/program-images/unique/" not in x]]
    write(ROOT / "data/image-candidates.json", mapping)

if __name__ == "__main__":
    main()
