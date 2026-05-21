"""
Site kalite denetim aracı.

Ne işe yarar?
- Yayındaki HTML/JSON haber dosyalarını bozmadan tarar.
- UTF-8 bozulması, kırık link, kopya başlık/içerik, boş sayfa, H etiket
  hiyerarşisi, breadcrumb schema, tekrar eden yorum alanı, yazı ile yapılmış
  paylaşım ikonları ve kategori uyumsuzluğu gibi sorunları raporlar.

İş akışı:
1. Bu dosya `site_edit/tools/` içinde çalıştırılır.
2. Site kökündeki `haber.html`, `news/`, `nachrichten/` ve `articles/`
   klasörlerini okur.
3. Dosyaları değiştirmez; sadece `site_edit/reports/` altında JSON rapor üretir.
4. `reports/` klasörü git'e eklenmez, yerel kontrol çıktısı olarak kalır.

Kullanım:
    python tools/site_quality_audit.py
"""

import hashlib
import json
import re
from collections import Counter, defaultdict
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "reports"
HTML_ROOTS = [
    ROOT / "haber.html",
    ROOT / "news" / "index.html",
    ROOT / "nachrichten" / "index.html",
    *sorted((ROOT / "articles").glob("*.html")),
    *sorted((ROOT / "news" / "articles").glob("*.html")),
    *sorted((ROOT / "nachrichten" / "artikel").glob("*.html")),
]
JSON_ROOTS = [
    *sorted((ROOT / "articles").glob("*.json")),
    *sorted((ROOT / "news" / "articles").glob("*.json")),
    *sorted((ROOT / "nachrichten" / "artikel").glob("*.json")),
    *sorted((ROOT / "review" / "pending").glob("*.json")),
]

MOJIBAKE_RE = re.compile(
    r"(Ã[¼œ¶–ç‡¢‚îï©èáíóúñäÄŸß]|Ä[±°Ÿž]|Å[Ÿž]|Â[·©° ]|â(?:€™|€˜|€œ|€�|€“|€”|€¦|†’|†)|ğŸ|ðŸ|ï¿½)"
)
TAG_RE = re.compile(r"<(/?)(h[1-6])\b[^>]*>", re.IGNORECASE)
HREF_RE = re.compile(r"\b(?:href|src)=['\"]([^'\"]+)['\"]", re.IGNORECASE)
COMMENT_SECTION_RE = re.compile(r"<section\b[^>]*class=['\"][^'\"]*article-comments[^'\"]*['\"][\s\S]*?</section>", re.IGNORECASE)
SCRIPT_RE = re.compile(r"<script[\s\S]*?</script>", re.IGNORECASE)
STYLE_RE = re.compile(r"<style[\s\S]*?</style>", re.IGNORECASE)
TAG_STRIP_RE = re.compile(r"<[^>]+>")


CATEGORY_KEYWORDS = {
    "Son Dakika": ["son dakika", "acil", "patlama", "saldırı", "saldiri", "öldü", "oldu", "deprem"],
    "Gündem": ["gündem", "gundem", "belediye", "mahkeme", "soruşturma", "sorusturma", "trafik", "kaza"],
    "Siyaset": ["başkan", "bakan", "erdoğan", "trump", "putin", "seçim", "meclis", "parti", "hükümet", "koalisyon"],
    "Ekonomi": ["ekonomi", "piyasa", "faiz", "enflasyon", "dolar", "euro", "borsa", "petrol", "vergi", "ticaret", "şirket", "firma"],
    "Dünya": ["abd", "iran", "israil", "rusya", "çin", "china", "germany", "ukraine", "gazze", "nato", "ab ", "avrupa", "suriye"],
    "Spor": ["spor", "futbol", "basketbol", "maç", "mac", "liga", "world cup", "kupası", "transfer"],
    "Magazin": ["magazin", "sanatçı", "ünlü", "festival", "film", "müzik", "eurovision", "oyuncu"],
    "Teknoloji": ["teknoloji", "yapay zeka", "ai", "openai", "çip", "chip", "halbleiter", "robot", "yazılım"],
    "Sağlık": ["sağlık", "saglik", "virüs", "virus", "ebola", "hastalık", "hastane", "salgın", "vaccine"],
    "Video": ["video", "youtube", "kanal"],
}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def scope_for_path(path_label: str) -> str:
    if path_label.startswith("news/articles/"):
        return "news/articles"
    if path_label.startswith("nachrichten/artikel/"):
        return "nachrichten/artikel"
    if path_label.startswith("articles/"):
        return "articles"
    return path_label.rsplit("/", 1)[0] if "/" in path_label else "."


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def clean_text(value: str) -> str:
    value = SCRIPT_RE.sub(" ", value)
    value = STYLE_RE.sub(" ", value)
    value = TAG_STRIP_RE.sub(" ", value)
    value = unescape(value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_key(value: str) -> str:
    value = clean_text(value).lower()
    value = re.sub(r"[^a-z0-9ığüşöçİĞÜŞÖÇäöüß\s-]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        return {"__error__": str(exc)}


def html_title(text: str) -> str:
    match = re.search(r"<h1\b[^>]*>([\s\S]*?)</h1>", text, re.IGNORECASE)
    if match:
        return clean_text(match.group(1))
    match = re.search(r"<title\b[^>]*>([\s\S]*?)</title>", text, re.IGNORECASE)
    return clean_text(match.group(1)) if match else ""


def heading_issues(path: Path, text: str):
    headings = [(int(tag[1]), closing) for closing, tag in TAG_RE.findall(text) if not closing]
    h1_count = sum(1 for level, _ in headings if level == 1)
    issues = []
    if h1_count != 1:
        issues.append(f"h1_count={h1_count}")
    previous = 0
    for level, _ in headings:
        if previous and level > previous + 1:
            issues.append(f"heading_skip_h{previous}_to_h{level}")
            break
        previous = level
    return issues


def resolve_internal_link(page: Path, link: str):
    if not link or link.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    if "${" in link or "}" in link:
        return None
    parsed = urlparse(link)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc and "hakancetin.com.tr" not in parsed.netloc:
            return None
        raw_path = parsed.path
    else:
        raw_path = link.split("#", 1)[0].split("?", 1)[0]
    raw_path = unquote(raw_path)
    if not raw_path:
        return None
    if raw_path.startswith("/"):
        target = ROOT / raw_path.lstrip("/")
    else:
        target = (page.parent / raw_path).resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        return None
    if str(target).endswith(("\\", "/")) or raw_path.endswith("/"):
        target = target / "index.html"
    if target.is_dir():
        target = target / "index.html"
    return target


def infer_category(data):
    text = normalize_key(" ".join([
        str(data.get("title", "")),
        str(data.get("spot", "")),
        str(data.get("summary", "")),
        clean_text(str(data.get("content_html", "")))[:1200],
    ]))
    scores = Counter()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                scores[category] += 1
    if not scores:
        return "", 0
    category, score = scores.most_common(1)[0]
    return category, score


def slug_for_json(path: Path, data: dict) -> str:
    return str(data.get("slug") or path.stem)


def audit():
    html_files = [path for path in HTML_ROOTS if path.exists()]
    json_files = [path for path in JSON_ROOTS if path.exists()]
    report = {
        "summary": {
            "html_files": len(html_files),
            "json_files": len(json_files),
        },
        "utf8_suspects": [],
        "broken_links": [],
        "duplicate_titles": [],
        "duplicate_content": [],
        "empty_or_thin_pages": [],
        "category_mismatches": [],
        "heading_issues": [],
        "missing_breadcrumb_schema": [],
        "comment_repeats": [],
        "text_share_icons": [],
        "slider": {},
        "json_errors": [],
    }

    title_map = defaultdict(list)
    content_map = defaultdict(list)

    for path in html_files:
        text = read_text(path)
        page_rel = rel(path)
        mojibake = MOJIBAKE_RE.findall(text)
        if mojibake:
            report["utf8_suspects"].append({
                "file": page_rel,
                "count": len(mojibake),
                "examples": sorted(set(mojibake))[:8],
            })

        visible = clean_text(text)
        title = html_title(text)
        if title and 'name="robots" content="noindex' not in text.lower():
            title_map[(scope_for_path(page_rel), normalize_key(title))].append(page_rel)
        fingerprint_source = normalize_key(visible[:5000])
        if fingerprint_source:
            digest = hashlib.sha1(fingerprint_source.encode("utf-8", errors="ignore")).hexdigest()[:16]
            content_map[digest].append(page_rel)

        if len(visible) < 450 or not title:
            report["empty_or_thin_pages"].append({
                "file": page_rel,
                "chars": len(visible),
                "title": title,
            })

        h_issues = heading_issues(path, text)
        if h_issues:
            report["heading_issues"].append({"file": page_rel, "issues": h_issues})

        if "BreadcrumbList" not in text and path.name != "index.html" and path.name != "haber.html":
            report["missing_breadcrumb_schema"].append(page_rel)

        comment_count = len(COMMENT_SECTION_RE.findall(text))
        form_count = len(re.findall(r'id=["\']comment-form["\']', text, re.IGNORECASE))
        if comment_count > 1 or form_count > 1:
            report["comment_repeats"].append({
                "file": page_rel,
                "article_comments": comment_count,
                "comment_forms": form_count,
            })

        share_text_count = len(re.findall(r'<a\b[^>]*class=["\'][^"\']*share-(?:btn|link)[^"\']*["\'][^>]*>\s*(?:X|f|W|T)\s*</a>', text, re.IGNORECASE))
        if share_text_count:
            report["text_share_icons"].append({"file": page_rel, "count": share_text_count})

        for link in HREF_RE.findall(text):
            target = resolve_internal_link(path, link)
            if target is not None and not target.exists():
                report["broken_links"].append({
                    "file": page_rel,
                    "link": link,
                    "resolved": rel(target) if ROOT in target.parents or target == ROOT else str(target),
                })

    for (_scope, key), files in title_map.items():
        if key and len(files) > 1:
            report["duplicate_titles"].append({"title_key": key[:120], "files": files})
    for digest, files in content_map.items():
        if len(files) > 1:
            report["duplicate_content"].append({"fingerprint": digest, "files": files})

    seen_slugs = defaultdict(list)
    for path in json_files:
        data = parse_json(path)
        if "__error__" in data:
            report["json_errors"].append({"file": rel(path), "error": data["__error__"]})
            continue
        path_label = rel(path)
        slug = slug_for_json(path, data)
        seen_slugs[(scope_for_path(path_label), slug)].append(path_label)
        raw = path.read_text(encoding="utf-8", errors="replace")
        mojibake = MOJIBAKE_RE.findall(raw)
        if mojibake:
            report["utf8_suspects"].append({
                "file": rel(path),
                "count": len(mojibake),
                "examples": sorted(set(mojibake))[:8],
            })
        current = str(data.get("category", "")).strip()
        inferred, score = infer_category(data)
        if current and inferred and score >= 2 and normalize_key(current) != normalize_key(inferred):
            report["category_mismatches"].append({
                "file": rel(path),
                "title": str(data.get("title", ""))[:140],
                "current": current,
                "suggested": inferred,
                "confidence": score,
            })

    duplicate_slugs = [{"slug": slug, "files": files} for (_scope, slug), files in seen_slugs.items() if len(files) > 1]
    if duplicate_slugs:
        report["duplicate_slugs"] = duplicate_slugs

    for page in [ROOT / "haber.html", ROOT / "news" / "index.html", ROOT / "nachrichten" / "index.html"]:
        if page.exists():
            text = read_text(page)
            report["slider"][rel(page)] = {
                "has_set_interval": "setInterval" in text,
                "has_touch_handlers": "touchstart" in text or "pointerdown" in text,
                "hero_cards": len(re.findall(r'class=["\'][^"\']*(?:hero-card|showcase-card|headline-card)[^"\']*["\']', text)),
            }

    for key, value in list(report.items()):
        if isinstance(value, list):
            report["summary"][key] = len(value)
    return report


def write_reports(report):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = REPORT_DIR / "site-quality-audit.json"
    md_path = REPORT_DIR / "site-quality-audit.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# Site Quality Audit", ""]
    for key, value in report["summary"].items():
        lines.append(f"- {key}: {value}")
    lines.append("")
    for section in [
        "utf8_suspects",
        "broken_links",
        "category_mismatches",
        "duplicate_titles",
        "duplicate_content",
        "empty_or_thin_pages",
        "heading_issues",
        "missing_breadcrumb_schema",
        "comment_repeats",
        "text_share_icons",
    ]:
        items = report.get(section, [])
        lines.append(f"## {section} ({len(items)})")
        for item in items[:25]:
            lines.append(f"- `{item if isinstance(item, str) else item.get('file', item.get('title_key', item.get('fingerprint', '')))} `")
        if len(items) > 25:
            lines.append(f"- ... {len(items) - 25} more")
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return json_path, md_path


if __name__ == "__main__":
    result = audit()
    json_report, md_report = write_reports(result)
    print(f"Audit written: {json_report.relative_to(ROOT)}")
    print(f"Markdown written: {md_report.relative_to(ROOT)}")
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
