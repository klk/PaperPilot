import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { assertPublicHttpUrl, rejectOversizedRequest, validatePdfBytes } from "../lib/request-security";

for (const url of [
  "http://localhost/",
  "http://127.0.0.1/",
  "http://10.0.0.1/",
  "http://169.254.169.254/latest/meta-data/",
  "http://[::1]/",
  "https://user:password@example.com/",
  "https://example.com:8443/",
]) {
  test(`SSRF guard rejects ${url}`, async () => {
    await assert.rejects(() => assertPublicHttpUrl(url));
  });
}

test("request size guard rejects oversized declared bodies", () => {
  const request = new Request("https://paperpilot.test/api/convert", { method: "POST", headers: { "content-length": "101" } });
  assert.equal(rejectOversizedRequest(request, 100)?.status, 413);
});

test("PDF validation accepts a valid document and enforces page limits", async () => {
  const document = await PDFDocument.create();
  document.addPage();
  document.addPage();
  const bytes = await document.save();
  assert.equal(await validatePdfBytes(bytes, 2), null);
  assert.match(await validatePdfBytes(bytes, 1) || "", /最大支持 1 页/);
});

test("PDF validation rejects non-PDF bytes", async () => {
  assert.match(await validatePdfBytes(new TextEncoder().encode("hello")) || "", /有效的 PDF/);
});
