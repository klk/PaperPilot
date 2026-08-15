#!/usr/bin/env python3
"""Extract readable PDF text into a Unicode-safe, editable RTF document."""

from __future__ import annotations

import argparse
from pathlib import Path

import fitz


def rtf_text(value: str) -> str:
    """Encode Unicode as RTF UTF-16 escape sequences understood by WPS/Word."""
    output: list[str] = []
    for character in value:
        if character in "\\{}":
            output.append(f"\\{character}")
        elif character == "\t":
            output.append("\\tab ")
        elif character in "\r\n":
            output.append("\\line ")
        elif 32 <= ord(character) <= 126:
            output.append(character)
        else:
            encoded = character.encode("utf-16-le")
            for index in range(0, len(encoded), 2):
                code_unit = int.from_bytes(encoded[index:index + 2], "little", signed=True)
                output.append(f"\\u{code_unit}?")
    return "".join(output)


def page_blocks(page: fitz.Page) -> list[str]:
    blocks: list[str] = []
    for block in page.get_text("blocks", sort=True):
        text = block[4].strip()
        if text:
            blocks.append(text)
    return blocks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf")
    parser.add_argument("output_rtf")
    args = parser.parse_args()

    pdf = fitz.open(args.input_pdf)
    title = pdf.metadata.get("title") or Path(args.input_pdf).stem
    document: list[str] = [
        r"{\rtf1\ansi\deff0\uc1\deflang2052",
        r"{\fonttbl{\f0\fnil\fcharset134 Noto Sans CJK SC;}}",
        r"\viewkind4\pard\sa120\sl276\slmult1\f0\fs24 ",
        rtf_text(title),
        r"\par\par ",
    ]
    for page_index, page in enumerate(pdf):
        for block in page_blocks(page):
            document.append(rtf_text(block))
            document.append(r"\par ")
        if page_index < pdf.page_count - 1:
            document.append(r"\page ")
    document.append("}")
    Path(args.output_rtf).write_text("".join(document), encoding="ascii")
    pdf.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
