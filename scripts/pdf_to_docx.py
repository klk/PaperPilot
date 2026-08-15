#!/usr/bin/env python3
"""Convert a PDF to an editable DOCX using pdf2docx.

The PyMuPDF pin is intentional: pdf2docx 0.5.x uses APIs removed from newer
PyMuPDF releases. The deployment requirements are documented in README.md.
"""

from __future__ import annotations

import argparse
import os
import platform
import sys
import tempfile
import zipfile
from pathlib import Path


def target_font() -> str:
    configured = os.environ.get("PDF2DOCX_FONT")
    if configured:
        return configured
    return "Hiragino Sans GB" if platform.system() == "Darwin" else "Noto Sans CJK SC"


def normalize_docx_fonts(source: str, destination: str) -> None:
    replacements = {
        b"Arial Unicode MS": target_font().encode("utf-8"),
        b"MS PGothic": target_font().encode("utf-8"),
        b"Gulim": target_font().encode("utf-8"),
    }
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as temporary:
        temporary_path = temporary.name
    try:
        with zipfile.ZipFile(source, "r") as input_zip, zipfile.ZipFile(temporary_path, "w", zipfile.ZIP_DEFLATED) as output_zip:
            for item in input_zip.infolist():
                data = input_zip.read(item.filename)
                if item.filename.endswith(".xml"):
                    for old, new in replacements.items():
                        data = data.replace(old, new)
                output_zip.writestr(item, data)
        Path(temporary_path).replace(destination)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf")
    parser.add_argument("output_docx")
    args = parser.parse_args()

    try:
        from pdf2docx import Converter
    except ImportError as error:
        print(
            "pdf2docx worker is not installed. Run: "
            "python3 -m pip install pdf2docx==0.5.8 PyMuPDF==1.24.14",
            file=sys.stderr,
        )
        print(str(error), file=sys.stderr)
        return 2

    raw_output = f"{args.output_docx}.raw"
    converter = Converter(args.input_pdf)
    try:
        converter.convert(raw_output, multi_processing=False)
    finally:
        converter.close()
    normalize_docx_fonts(raw_output, args.output_docx)
    os.unlink(raw_output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
