import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTICLE_DIRS = [
    ROOT / "articles",
    ROOT / "news" / "articles",
    ROOT / "nachrichten" / "artikel",
]


def clean(value):
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    return str(value).strip()


def esc(value):
    return html.escape(clean(value), quote=True)


def replace_once(content, pattern, replacement, flags=re.DOTALL | re.IGNORECASE):
    updated, count = re.subn(pattern, lambda _: replacement, content, count=1, flags=flags)
    return updated if count else content


def update_meta(content, name, value):
    if not value:
        return content
    pattern = rf'(<meta\s+name="{re.escape(name)}"\s+content=")[^"]*(">)'
    updated, count = re.subn(
        pattern,
        lambda match: f"{match.group(1)}{esc(value)}{match.group(2)}",
        content,
        count=1,
        flags=re.IGNORECASE,
    )
    return updated if count else content


def update_property(content, prop, value):
    if not value:
        return content
    pattern = rf'(<meta\s+property="{re.escape(prop)}"\s+content=")[^"]*(">)'
    updated, count = re.subn(
        pattern,
        lambda match: f"{match.group(1)}{esc(value)}{match.group(2)}",
        content,
        count=1,
        flags=re.IGNORECASE,
    )
    return updated if count else content


def update_article_html(json_path):
    html_path = json_path.with_suffix(".html")
    if not html_path.exists():
        return False

    data = json.loads(json_path.read_text(encoding="utf-8"))
    title = clean(data.get("title"))
    spot = clean(data.get("spot") or data.get("summary"))
    content_html = clean(data.get("content_html"))
    image_url = clean(data.get("image_url"))
    image_alt = clean(data.get("image_alt") or title)
    meta_title = clean(data.get("meta_title") or title)
    meta_description = clean(data.get("meta_description") or spot)
    tags = data.get("tags") if isinstance(data.get("tags"), list) else []

    content = html_path.read_text(encoding="utf-8")
    original = content

    if title:
        content = replace_once(content, r"<h1>.*?</h1>", f"<h1>{esc(title)}</h1>")
        content = replace_once(content, r"<title>.*?</title>", f"<title>{esc(meta_title)} | hakancetin.com.tr</title>")
        content = update_property(content, "og:title", meta_title)
        content = update_property(content, "twitter:title", meta_title)

    if meta_description:
        content = update_meta(content, "description", meta_description)
        content = update_property(content, "og:description", meta_description)
        content = update_property(content, "twitter:description", meta_description)

    if tags:
        keyword_text = ", ".join(clean(tag) for tag in tags)
        content = update_meta(content, "keywords", keyword_text)
        tag_html = "".join(f"<span>{esc(tag)}</span>" for tag in tags if clean(tag))
        if tag_html:
            content = replace_once(content, r'<div class="tag-list">.*?</div>', f'<div class="tag-list">{tag_html}</div>')

    if spot:
        content = replace_once(content, r'<p class="spot">.*?</p>', f'<p class="spot">{esc(spot)}</p>')

    if image_url:
        figure = (
            f'<figure class="article-image"><img src="{esc(image_url)}" '
            f'alt="{esc(image_alt)}" loading="eager" fetchpriority="high" '
            f'width="1280" height="720"></figure>'
        )
        content = replace_once(content, r'<figure class="article-image">.*?</figure>', figure)
        content = update_property(content, "og:image", image_url)
        content = update_property(content, "twitter:image", image_url)

    if content_html:
        content, _ = re.subn(
            r'(<figure class="article-image">.*?</figure>\s*)(.*?)(\s*<div class="tag-list">)',
            lambda match: f"{match.group(1)}{content_html}{match.group(3)}",
            content,
            count=1,
            flags=re.DOTALL | re.IGNORECASE,
        )

    if content != original:
        html_path.write_text(content, encoding="utf-8")
        return True
    return False


def main():
    changed = 0
    scanned = 0
    for article_dir in ARTICLE_DIRS:
        if not article_dir.exists():
            continue
        for json_path in article_dir.glob("*.json"):
            scanned += 1
            try:
                if update_article_html(json_path):
                    changed += 1
            except Exception as exc:
                print(f"CMS sync skipped {json_path}: {exc}")
    print(f"CMS sync scanned={scanned} changed={changed}")


if __name__ == "__main__":
    main()
