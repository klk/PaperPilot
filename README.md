# PaperPilot

PaperPilot is an SEO-first PDF utility site inspired by the information architecture of large online document toolkits. It is a new brand and does not reuse PDF24 branding, copy, or assets.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000.

## Included in this first build

- Home page, all-tools directory, 90+ SEO-friendly tool routes, FAQ, privacy, terms and contact pages.
- Browser-local PDF operations: merge, split, extract, remove pages, rearrange, rotate, watermark, page numbers, metadata cleanup, page-size changes, crop, text-to-PDF, image-to-PDF, overlay, re-serialize/compress, PDF-to-image ZIP, and browser image conversion for supported formats.
- Admin dashboard at `/admin` for tool coverage, example usage metrics, content status and security checks.
- `sitemap.xml`, `robots.txt`, per-tool metadata, canonical URLs and WebApplication JSON-LD.

## Contact form delivery

The `/contact` page provides a PDF24-style contact form for feedback and support.
Every submission is stored in `data/contact-messages.json` and can be reviewed in
`/admin`, where messages can be searched, viewed, marked for follow-up, closed, or
deleted. This file is deliberately ignored by Git and should be replaced with a managed
database before multi-instance deployment. Set `CONTACT_WEBHOOK_URL` to additionally
forward the same payload to a trusted HTTPS endpoint.

## Administrator login

The first administrator account is `admin` with the initial password `111111`. Sign in
at `/admin` with the displayed image verification code, then use **Change password** in
the top bar immediately. Passwords are stored using a per-password salt and Node's
`scrypt` hash; the browser only receives an HttpOnly signed session cookie. Set a long,
random `ADMIN_SESSION_SECRET` in production. The local JSON user store is suitable for a
single-instance deployment only; move it to a managed database before running multiple
application instances.

## PDF to editable Word

The PDF-to-Word route uses the server-side `scripts/pdf_to_docx.py` worker when
the `Flow`/editable-text mode is selected. It uses `pdf2docx` to rebuild text,
tables, and page layout instead of sending a PDF to LibreOffice. LibreOffice
is not a PDF-to-DOCX converter and remains available only for other Office
format conversions.

Install the worker in a dedicated Python environment:

```bash
python3 -m venv .venv-pdf2docx
.venv-pdf2docx/bin/pip install "pdf2docx==0.5.8" "PyMuPDF==1.24.14"
```

Set `PDF2DOCX_PYTHON` to that environment's Python executable for deployment.
The PyMuPDF pin is required because `pdf2docx 0.5.x` calls APIs removed from
newer PyMuPDF releases. For production quality closer to PDF24, replace this
worker with a commercial PDF conversion API such as Adobe PDF Services and
keep the same `/api/convert-document` contract.

PDF to PowerPoint uses `scripts/pdf_to_pptx.py` as a self-hosted layout worker.
It rebuilds PDF text as independent PowerPoint text boxes and common PDF
rectangles/lines as independent PowerPoint shapes. Embedded PDF images are
kept as separate image objects.
Install its worker dependencies with:

```bash
python3 -m venv .venv-pdf2pptx
.venv-pdf2pptx/bin/pip install "PyMuPDF==1.24.14" "python-pptx==1.0.2"
```

The result does not use a page-sized background image: text, shapes, and image
objects can be selected and edited in PowerPoint. Native PowerPoint tables,
clipping paths, rotated text, and highly complex vector graphics are not fully
reconstructed. For those cases, use a commercial layout engine such as Adobe
PDF Services API, which officially supports PDF export to PPTX.

## PDF to EPUB

PDF to EPUB uses `scripts/pdf_to_epub.py`, a server-side EPUB3 generator. It
does not route PDF files through LibreOffice. Three output modes are available:
`flow` extracts readable headings and paragraphs for ebook readers, `pdf-flow`
keeps a chapter boundary for each source page, and `fixed` embeds each rendered
page for visual fidelity. The worker only needs the existing PyMuPDF runtime;
set `PDF2EPUB_PYTHON` to its Python executable in production.

## PDF to Excel

PDF to Excel uses `scripts/pdf_to_xlsx.py`, a server-side table reconstruction
worker. It detects repeated PDF cell boundaries, maps text into editable Excel
cells, and restores common merged cells, fills, borders, column widths, and
row heights. Pages without a genuine table become their own readable worksheet.

## PDF to Rich Text

PDF to Rich Text uses `scripts/pdf_to_rtf.py` instead of asking LibreOffice to
open a PDF as an office document. The worker extracts readable text blocks and
writes Unicode-safe RTF, so Chinese text opens correctly in WPS, Microsoft Word,
LibreOffice, and macOS TextEdit. The output is editable text, not a layout-perfect
PDF replica.

```bash
python3 -m venv .venv-pdf2xlsx
.venv-pdf2xlsx/bin/pip install "PyMuPDF==1.24.14" "openpyxl==3.1.5"
```

## Production boundary

Office conversion, OCR, password encryption/decryption, webpage capture, PDF editing/signing, and several archival/structured-invoice operations need dedicated server workers or WASM modules. Their SEO routes and workspaces are present, but the current UI intentionally reports the missing worker instead of pretending a pass-through file is a conversion. The next production step is to connect queue-backed workers for those operations and persist the admin data in a database.
