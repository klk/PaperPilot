"use client";

const contentTypes: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  epub: "application/epub+zip",
  rtf: "application/rtf",
};

function safeName(name: string) {
  return name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "paperpilot-file";
}

export async function convertPdfOnServer(file: File, format: string, mode?: string) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", format);
  if (mode) form.append("mode", mode);
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `PDF→${format.toUpperCase()} 服务端转换失败`);
  }
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    name: `${safeName(file.name)}.${format}`,
    type: contentTypes[format] || "application/octet-stream",
  };
}
