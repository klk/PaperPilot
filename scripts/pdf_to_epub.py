#!/usr/bin/env python3
"""Convert PDF content to EPUB3 without relying on a server-side office suite."""

from __future__ import annotations

import argparse
import html
import io
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import fitz


EPUB_NS = "http://www.idpf.org/2007/ops"


def safe_title(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value or "").strip()
    return cleaned or "PaperPilot EPUB"


def page_xhtml(page: fitz.Page, mode: str) -> str:
    blocks = page.get_text("dict").get("blocks", [])
    paragraphs: list[str] = []
    for block in blocks:
        if block.get("type") != 0:
            continue
        lines = block.get("lines", [])
        text_lines = ["".join(span.get("text", "") for span in line.get("spans", [])).strip() for line in lines]
        text_lines = [line for line in text_lines if line]
        if not text_lines:
            continue
        font_size = max((span.get("size", 10) for line in lines for span in line.get("spans", [])), default=10)
        content = "<br/>".join(html.escape(line) for line in text_lines)
        tag = "h1" if font_size >= 20 else "h2" if font_size >= 15 else "p"
        paragraphs.append(f"<{tag}>{content}</{tag}>")
    body = "\n".join(paragraphs) or "<p>此页面未检测到可提取文字。</p>"
    page_class = "page-break" if mode == "pdf-flow" else ""
    return f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="{EPUB_NS}" lang="zh-CN">
<head><title>第 {page.number + 1} 页</title><link rel="stylesheet" href="../styles/book.css"/></head>
<body class="{page_class}"><section epub:type="bodymatter">{body}</section></body></html>'''


def fixed_page_xhtml(page_number: int, image_name: str) -> str:
    return f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head><title>第 {page_number} 页</title><link rel="stylesheet" href="../styles/book.css"/></head>
<body class="fixed"><img src="../images/{image_name}" alt="第 {page_number} 页"/></body></html>'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf")
    parser.add_argument("output_epub")
    parser.add_argument("--mode", choices=("flow", "pdf-flow", "fixed"), default="flow")
    args = parser.parse_args()

    pdf = fitz.open(args.input_pdf)
    if pdf.page_count == 0:
        raise ValueError("PDF 没有可转换的页面")
    metadata = pdf.metadata or {}
    title = safe_title(metadata.get("title") or Path(args.input_pdf).stem)
    identifier = f"urn:uuid:paperpilot-{Path(args.input_pdf).stat().st_size}-{pdf.page_count}"
    modified = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="css" href="styles/book.css" media-type="text/css"/>',
    ]
    spine: list[str] = []
    nav: list[str] = []

    output = Path(args.output_epub)
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr("META-INF/container.xml", '''<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>''')
        archive.writestr("EPUB/styles/book.css", '''body { font-family: serif; line-height: 1.7; margin: 5%; color: #172033; }
h1 { font-size: 1.7em; margin: 1.6em 0 .8em; } h2 { font-size: 1.25em; margin: 1.4em 0 .6em; }
p { margin: 0 0 1em; text-indent: 2em; } .page-break { page-break-after: always; }
body.fixed { margin: 0; padding: 0; } body.fixed img { display: block; width: 100%; height: auto; }''')

        for index, page in enumerate(pdf, start=1):
            chapter_id = f"chapter-{index}"
            chapter_name = f"chapter-{index}.xhtml"
            if args.mode == "fixed":
                image_name = f"page-{index}.png"
                pixmap = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
                archive.writestr(f"EPUB/images/{image_name}", pixmap.tobytes("png"))
                archive.writestr(f"EPUB/text/{chapter_name}", fixed_page_xhtml(index, image_name))
                manifest.append(f'<item id="image-{index}" href="images/{image_name}" media-type="image/png"/>')
            else:
                archive.writestr(f"EPUB/text/{chapter_name}", page_xhtml(page, args.mode))
            manifest.append(f'<item id="{chapter_id}" href="text/{chapter_name}" media-type="application/xhtml+xml"/>')
            spine.append(f'<itemref idref="{chapter_id}"/>')
            nav.append(f'<li><a href="text/{chapter_name}">第 {index} 页</a></li>')

        archive.writestr("EPUB/nav.xhtml", f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="{EPUB_NS}" lang="zh-CN">
<head><title>{html.escape(title)}</title></head><body><nav epub:type="toc" id="toc"><h1>目录</h1><ol>{''.join(nav)}</ol></nav></body></html>''')
        archive.writestr("EPUB/package.opf", f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="zh-CN">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">{identifier}</dc:identifier><dc:title>{html.escape(title)}</dc:title><dc:language>zh-CN</dc:language><meta property="dcterms:modified">{modified}</meta></metadata>
<manifest>{''.join(manifest)}</manifest><spine>{''.join(spine)}</spine></package>''')
    pdf.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
