#!/usr/bin/env python3
"""Remove PDF encryption with a known password."""

from __future__ import annotations

import argparse
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf")
    parser.add_argument("output_pdf")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    reader = PdfReader(args.input_pdf)
    if reader.is_encrypted:
      result = reader.decrypt(args.password)
      if not result:
        raise SystemExit("Invalid password")

    writer = PdfWriter()
    for page in reader.pages:
      writer.add_page(page)

    if reader.metadata:
      writer.add_metadata({key: value for key, value in reader.metadata.items() if value is not None})

    with open(args.output_pdf, "wb") as output:
      writer.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
