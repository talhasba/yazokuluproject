from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


OUT_DIR = Path(__file__).resolve().parent
ROOT = OUT_DIR.parent

INPUTS = {
    "edconic": ROOT / "edconic_programs_combined.json",
    "sportech": ROOT / "sportech_programs_combined.json",
    "summer_discovery": ROOT / "summerdiscovery_programs_combined.json",
    "mpw": ROOT / "mpw_streams_metadata.json",
    "mpw_general": ROOT / "mpw_summer_school_general_info.json",
}

BASE_FIELDS = [
    "id", "provider", "provider_label", "program_type", "title", "raw_title",
    "subject", "categories", "location", "city", "country", "age_ranges",
    "duration", "delivery_modes", "price", "dates", "date_months",
    "description_short", "description_full", "curriculum_sections",
    "learning_outcomes", "image_url", "detail_url", "source_url",
    "source_files", "flags", "publish_status",
]


def load(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))


def clean(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def unique(values: list[Any]) -> list[str]:
    return list(dict.fromkeys(clean(value) for value in values if clean(value)))


def slugify(value: str) -> str:
    value = clean(value).lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "program"


def id_from_url(provider: str, url: str, suffix: str = "") -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/") or parsed.netloc or suffix
    value = f"{provider}-{slugify(path)}"
    return f"{value}-{slugify(suffix)}" if suffix else value


def parse_amount(value: Any) -> int | None:
    match = re.search(r"\d[\d,]*", clean(value))
    return int(match.group(0).replace(",", "")) if match else None


def price_summary(tiers: list[dict[str, Any]], currency: str) -> dict[str, Any]:
    normalized = []
    amounts = []
    symbols = {"GBP": "£", "EUR": "€", "USD": "$"}
    for tier in tiers:
        amount = parse_amount(tier.get("amount"))
        if amount is None:
            continue
        amounts.append(amount)
        normalized.append({
            "label": clean(tier.get("label")),
            "currency": currency,
            "amount": amount,
            "display": f"{symbols.get(currency, currency + ' ')}{amount:,}",
        })
    low, high = (min(amounts), max(amounts)) if amounts else (None, None)
    if low is None:
        display = ""
    elif low == high:
        display = f"{symbols.get(currency, currency + ' ')}{low:,}"
    else:
        display = f"{symbols.get(currency, currency + ' ')}{low:,} - {symbols.get(currency, currency + ' ')}{high:,}"
    return {"currency": currency if amounts else "", "min_amount": low, "max_amount": high, "display": display, "tiers": normalized}


def empty_price() -> dict[str, Any]:
    return {"currency": "", "min_amount": None, "max_amount": None, "display": "", "tiers": []}


def section(title: str, body: Any) -> dict[str, str] | None:
    text = clean(body)
    return {"title": title, "body": text} if text else None


def infer_country(location: str) -> str:
    text = clean(location).lower()
    if text == "online":
        return ""
    if any(token in text for token in ["london", "cambridge"]):
        return "United Kingdom"
    if any(token in text for token in ["new york", "rochester", "indianapolis"]):
        return "United States"
    if any(token in text for token in ["milan", "rome", "parma", "venice", "turin", "piacenza", "motor valley"]):
        return "Italy"
    if re.search(r",\s*(?:PA|CT|CA|MI|TX|DC|NY|MA|IL|NJ|MD|VA|MN)\b", clean(location)):
        return "United States"
    return ""


def age_label(requirements: dict[str, Any]) -> list[str]:
    minimum, maximum = requirements.get("minimum_age"), requirements.get("maximum_age")
    if minimum is not None and maximum is not None:
        return [f"{minimum}-{maximum}"]
    if minimum is not None:
        return [f"{minimum}+"]
    return []


def edconic_price(record: dict[str, Any]) -> dict[str, Any]:
    data = record.get("price") or {}
    tiers = []
    for key in ("day", "residential", "online"):
        if data.get(key) is not None:
            tiers.append({"label": key.replace("_", " ").title(), "amount": data[key]})
    return price_summary(tiers, clean(data.get("currency")) or "USD")


def normalize_edconic(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output = []
    for record in records:
        url = clean(record.get("external_url"))
        location = clean(record.get("location"))
        ages = age_label(record.get("age_requirements") or {})
        curriculum = clean(" • ".join(record.get("curriculum") or []))
        seasonal = clean(record.get("seasonal"))
        mode = "virtual" if location.lower() == "online" else "in_person"
        flags = unique((record.get("flags") or []) + [
            "missing_age" if not ages else "",
            "missing_dates" if not record.get("dates") else "",
            "not_summer" if seasonal == "winter" else "",
            "year_round_online" if seasonal == "year_round_online" else "",
            "operator_attribution_provisional" if "provisional" in clean(record.get("provider_attribution_status")) else "",
        ])
        output.append({
            "id": id_from_url("edconic", url, record.get("title", "")),
            "provider": "edconic",
            "provider_label": "Edconic",
            "operating_institution": clean(record.get("operating_institution")),
            "program_type": f"edconic_{seasonal or 'program'}",
            "title": clean(record.get("title")),
            "raw_title": clean(record.get("title")),
            "subject": clean(record.get("topic_tag")),
            "categories": unique([record.get("topic_tag"), seasonal, record.get("operating_institution")]),
            "location": location,
            "city": location,
            "country": infer_country(location),
            "age_ranges": ages,
            "grade_ranges": unique([(record.get("age_requirements") or {}).get("grades")]),
            "duration": clean(record.get("duration")),
            "delivery_modes": [mode],
            "price": edconic_price(record),
            "dates": unique(record.get("dates") or []),
            "date_months": [],
            "description_short": clean(record.get("description_short")),
            "description_full": clean(record.get("description_full") or record.get("description_short")),
            "curriculum_sections": [x for x in [section("Curriculum", curriculum)] if x],
            "learning_outcomes": [],
            "image_url": "",
            "detail_url": url,
            "source_url": url,
            "source_files": [INPUTS["edconic"].name],
            "flags": flags,
        })
    return output


def sportech_price(record: dict[str, Any]) -> dict[str, Any]:
    raw = record.get("prices") or []
    currency = "USD" if any("$" in clean(value) for value in raw) else "EUR"
    duration = clean(record.get("duration_detail") or record.get("duration")).lower()
    if len(raw) == 4 and "1 or 2" in duration:
        labels = ["Residential - 1 week", "Residential - 2 weeks", "Day - 1 week", "Day - 2 weeks"]
    elif len(raw) == 2:
        labels = ["Residential", "Day"]
    elif len(raw) == 1:
        labels = ["Residential"]
    else:
        labels = [f"Published option {index + 1}" for index in range(len(raw))]
    return price_summary([{"label": label, "amount": amount} for label, amount in zip(labels, raw)], currency)


def normalize_sportech(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output = []
    for record in records:
        url = clean(record.get("url"))
        location = clean(record.get("location_detail") or record.get("location"))
        age = clean(record.get("age_range_detail") or record.get("age_range"))
        audience = clean(record.get("audience"))
        flags = unique((record.get("detail_parse_flags") or []) + [
            "missing_age" if not age else "",
            "likely_out_of_scope" if record.get("scope_status") == "likely_out_of_scope" else "",
            "location_outside_italy" if record.get("location_outside_italy") else "",
        ])
        curriculum = record.get("curriculum") or []
        output.append({
            "id": id_from_url("sportech", url),
            "provider": "sportech",
            "provider_label": "Sportech Academy",
            "program_type": f"sportech_{audience or 'program'}",
            "title": clean(record.get("title")),
            "raw_title": clean(record.get("title")),
            "subject": clean(record.get("category_tag")),
            "categories": unique([record.get("category_tag"), audience] + (record.get("partner_institution_detail") or [])),
            "location": location,
            "city": location,
            "country": infer_country(location),
            "age_ranges": unique([age]),
            "duration": clean(record.get("duration_detail") or record.get("duration")),
            "delivery_modes": ["in_person"],
            "price": sportech_price(record),
            "dates": unique(record.get("dates") or []),
            "date_months": [],
            "description_short": clean(record.get("description_short")),
            "description_full": clean(record.get("description_full") or record.get("description_short")),
            "curriculum_sections": [x for x in [section("Curriculum", " • ".join(curriculum)), section("Program highlights", " • ".join(record.get("program_highlights") or []))] if x],
            "learning_outcomes": unique(record.get("program_highlights") or []),
            "image_url": clean(record.get("image_url")),
            "detail_url": url,
            "source_url": url,
            "source_files": [INPUTS["sportech"].name],
            "flags": flags,
        })
    return output


def normalize_summer_discovery(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output = []
    for record in records:
        url = clean(record.get("course_url"))
        location = clean(record.get("campus_name"))
        city = clean(record.get("campus_location"))
        fields = unique(record.get("fields_of_study") or [])
        grade_ranges = unique(record.get("grade_details") or [])
        price = price_summary([
            {"label": "Campus range lower bound", "amount": record.get("price_low")},
            {"label": "Campus range upper bound", "amount": record.get("price_high")},
        ], clean(record.get("currency")) or "USD")
        sections = [
            section("Activities", record.get("activities")),
            section("Learning outcomes", record.get("learning_outcomes")),
            section("Who should attend", record.get("who_should_attend")),
        ]
        flags = unique([
            "grades_only_no_age_range",
            "campus_level_price_not_course_specific" if record.get("price_scope") == "campus_tuition_range" else "",
            "missing_price" if not price.get("min_amount") else "",
        ])
        dates = []
        if record.get("start_date") and record.get("end_date"):
            dates = [f"{clean(record['start_date'])}/{clean(record['end_date'])}"]
        output.append({
            "id": f"summer-discovery-{slugify(record.get('course_instance_slug', ''))}",
            "provider": "summer_discovery",
            "provider_label": "Summer Discovery",
            "program_type": f"summer_discovery_{slugify(record.get('course_type', 'course'))}",
            "title": clean(record.get("program_title")),
            "raw_title": clean(record.get("program_title")),
            "subject": fields[0] if fields else "",
            "categories": unique(fields + (record.get("grade_levels") or []) + [record.get("course_type"), record.get("course_time")]),
            "location": location,
            "city": city,
            "country": infer_country(city) or "United States",
            "age_ranges": [],
            "grade_ranges": grade_ranges,
            "duration": f"{record.get('duration_weeks')} weeks" if record.get("duration_weeks") else "",
            "delivery_modes": ["in_person"],
            "price": price,
            "price_scope": clean(record.get("price_scope")),
            "price_note": clean(record.get("pricing_note")),
            "dates": dates,
            "date_months": [],
            "description_short": clean(record.get("description"))[:360],
            "description_full": clean(record.get("description")),
            "curriculum_sections": [item for item in sections if item],
            "learning_outcomes": unique([record.get("learning_outcomes")]),
            "image_url": "",
            "detail_url": url,
            "source_url": url,
            "source_files": [INPUTS["summer_discovery"].name],
            "flags": flags,
        })
    return output


def normalize_mpw(data: dict[str, Any], general: dict[str, Any]) -> list[dict[str, Any]]:
    output = []
    overview = general.get("current_overview") or {}
    historical = general.get("brochure_2026") or {}
    for record in data.get("streams") or []:
        campuses = unique(record.get("campuses") or [])
        location = " & ".join(campuses)
        url = clean(record.get("source_url"))
        flags = [
            "shared_catalogue_page_no_detail_url",
            "current_age_unpublished",
            "current_price_unpublished",
            "historical_2026_age_and_price_available" if historical.get("age_range") and historical.get("fees_gbp") else "",
        ]
        output.append({
            "id": id_from_url("mpw", url, record.get("stream_title", "")),
            "provider": "mpw",
            "provider_label": "MPW Summer School",
            "program_type": "mpw_academic_stream",
            "title": clean(record.get("stream_title")),
            "raw_title": clean(record.get("stream_title")),
            "subject": clean(record.get("stream_title")),
            "categories": unique([record.get("stream_title"), "Academic stream"]),
            "location": location,
            "city": location,
            "country": "United Kingdom",
            "age_ranges": [],
            "historical_age_ranges": unique([historical.get("age_range")]),
            "duration": clean(record.get("duration")),
            "delivery_modes": ["in_person"],
            "price": empty_price(),
            "historical_2026_fees_gbp": historical.get("fees_gbp"),
            "dates": unique(record.get("date_options") or overview.get("course_date_ranges") or []),
            "date_months": [],
            "description_short": clean(record.get("description"))[:360],
            "description_full": clean(record.get("description")),
            "curriculum_sections": [],
            "learning_outcomes": [],
            "image_url": clean(record.get("timetable_image_url")),
            "detail_url": url,
            "source_url": url,
            "source_files": [INPUTS["mpw"].name, INPUTS["mpw_general"].name],
            "flags": unique(flags),
        })
    return output


def add_publish_status(programs: list[dict[str, Any]]) -> None:
    blocking = {
        "missing_age", "missing_price", "missing_dates", "not_summer",
        "likely_out_of_scope", "grades_only_no_age_range",
        "current_age_unpublished", "current_price_unpublished",
    }
    for program in programs:
        flags = set(program.get("flags") or [])
        missing = (
            not program.get("title") or not program.get("provider") or
            not program.get("location") or not program.get("description_full") or
            not program.get("detail_url") or
            (not program.get("age_ranges") and not program.get("grade_ranges")) or
            not program.get("price", {}).get("min_amount") or
            (not program.get("dates") and not program.get("date_months"))
        )
        program["publish_status"] = "needs_review" if missing or flags.intersection(blocking) else "ready"


def ensure_schema(programs: list[dict[str, Any]]) -> None:
    for program in programs:
        for field in BASE_FIELDS:
            if field not in program:
                raise ValueError(f"{program.get('id')}: missing schema field {field}")


def build_qa(programs: list[dict[str, Any]]) -> dict[str, Any]:
    by_provider = Counter(item["provider"] for item in programs)
    by_status = Counter(item["publish_status"] for item in programs)
    by_type = Counter(item["program_type"] for item in programs)
    duplicates = sorted(url for url, count in Counter(item["detail_url"] for item in programs).items() if count > 1)
    missing: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in programs:
        checks = {
            "title": bool(item.get("title")),
            "location": bool(item.get("location")),
            "age_or_grade": bool(item.get("age_ranges") or item.get("grade_ranges")),
            "price": bool(item.get("price", {}).get("min_amount")),
            "dates": bool(item.get("dates") or item.get("date_months")),
            "description": bool(item.get("description_full")),
            "detail_url": bool(item.get("detail_url")),
        }
        for field, present in checks.items():
            if not present:
                missing[field].append({"id": item["id"], "title": item["title"]})
    flags: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in programs:
        for flag in item.get("flags") or []:
            flags[flag].append({"id": item["id"], "title": item["title"]})
    ids = [item["id"] for item in programs]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_programs": len(programs),
        "by_provider": dict(sorted(by_provider.items())),
        "by_program_type": dict(sorted(by_type.items())),
        "by_publish_status": dict(sorted(by_status.items())),
        "duplicate_ids": sorted(value for value, count in Counter(ids).items() if count > 1),
        "duplicate_detail_urls": duplicates,
        "expected_shared_detail_urls": [
            "https://www.mpw.ac.uk/international-students/summer-school/academic-programme/"
        ],
        "missing_fields": {key: value for key, value in sorted(missing.items())},
        "flags": {key: value for key, value in sorted(flags.items())},
        "source_counts_expected": {"edconic": 7, "sportech": 19, "summer_discovery": 265, "mpw": 8},
        "schema_fields_required": BASE_FIELDS,
    }


def write_qa(qa: dict[str, Any]) -> None:
    lines = [
        "# New-provider normalization QA", "",
        f"Total records: **{qa['total_programs']}**", "",
        "## Providers", "",
    ]
    for provider, count in qa["by_provider"].items():
        lines.append(f"- `{provider}`: {count}")
    lines.extend(["", "## Publish status", ""])
    for status, count in qa["by_publish_status"].items():
        lines.append(f"- `{status}`: {count}")
    lines.extend(["", "## Missing fields", ""])
    for field, items in qa["missing_fields"].items():
        lines.append(f"- `{field}`: {len(items)}")
    if not qa["missing_fields"]:
        lines.append("- None")
    lines.extend(["", "## Important flags", ""])
    for flag, items in qa["flags"].items():
        lines.append(f"- `{flag}`: {len(items)}")
    lines.extend([
        "", "## Duplicates", "",
        f"- Duplicate IDs: {len(qa['duplicate_ids'])}",
        f"- Duplicate detail URLs: {len(qa['duplicate_detail_urls'])}",
        "- MPW's eight streams intentionally share one catalogue URL because no stream-specific pages exist.",
        "", "## Scope notes", "",
        "- Summer Discovery provides grade ranges, not ages; grade data is preserved and records are flagged for age-filter review.",
        "- MPW 2027 dates are current, but 2026 age/fee evidence remains historical and separate.",
        "- Sportech university programmes remain present but flagged as likely out of scope.",
        "- Edconic winter and year-round online products remain present with explicit scope flags.",
        "- This folder is separate from the earlier `site_data` normalization.",
    ])
    (OUT_DIR / "normalization_qa.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    provider_outputs = {
        "edconic": normalize_edconic(load(INPUTS["edconic"])),
        "sportech": normalize_sportech(load(INPUTS["sportech"])),
        "summer_discovery": normalize_summer_discovery(load(INPUTS["summer_discovery"])["programs"]),
        "mpw": normalize_mpw(load(INPUTS["mpw"]), load(INPUTS["mpw_general"])),
    }
    programs = [record for records in provider_outputs.values() for record in records]
    add_publish_status(programs)
    ensure_schema(programs)
    programs.sort(key=lambda item: (item["provider"], item["location"], item["title"], item["id"]))
    qa = build_qa(programs)

    for provider, records in provider_outputs.items():
        records.sort(key=lambda item: (item["location"], item["title"], item["id"]))
        (OUT_DIR / f"{provider}.normalized.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / "programs.normalized.json").write_text(json.dumps(programs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / "normalization_qa.json").write_text(json.dumps(qa, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_qa(qa)
    print(json.dumps({"total": len(programs), "providers": qa["by_provider"], "status": qa["by_publish_status"], "duplicate_ids": len(qa["duplicate_ids"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
