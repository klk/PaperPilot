#!/usr/bin/env python3
"""Protect a PDF with an opening password and optional permission flags."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf")
    parser.add_argument("output_pdf")
    parser.add_argument("--password", required=True)
    parser.add_argument("--permissions", default="{}")
    args = parser.parse_args()

    permissions = json.loads(args.permissions)
    reader = PdfReader(args.input_pdf)
    writer = PdfWriter()
    for page in reader.pages:
      writer.add_page(page)

    user_password = args.password
    owner_password = f"{args.password}-owner"
    writer.encrypt(
        user_password=user_password,
        owner_password=owner_password,
        allow_printing=bool(permissions.get("print", True)),
        allow_copying=bool(permissions.get("copy", True)),
        allow_annotations=bool(permissions.get("comments", True)),
        allow_form_filling=bool(permissions.get("fillForms", True)),
        allow_modification=bool(permissions.get("contentModify", True)),
        allow_assembly=bool(permissions.get("combine", True)),
        allow_higher_printing=bool(permissions.get("highQualityPrint", True)),
    )
    with open(args.output_pdf, "wb") as output:
        writer.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
