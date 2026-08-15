import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { PDFDocument } from "pdf-lib";

type RateLimitEntry = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var paperpilotRateLimits: Map<string, RateLimitEntry> | undefined;
}

const rateLimits = global.paperpilotRateLimits ?? new Map<string, RateLimitEntry>();
global.paperpilotRateLimits = rateLimits;

export function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export function enforceRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return Response.json({ error: "请求过于频繁，请稍后重试。" }, {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  });
}

export function rejectOversizedRequest(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return Response.json({ error: `文件过大，最大支持 ${Math.floor(maxBytes / 1024 / 1024)} MB。` }, { status: 413 });
  }
  return null;
}

export function validateUploadedFile(file: FormDataEntryValue | null, maxBytes: number) {
  if (!(file instanceof File)) return "缺少上传文件。";
  if (file.size === 0) return "上传文件为空。";
  if (file.size > maxBytes) return `文件过大，最大支持 ${Math.floor(maxBytes / 1024 / 1024)} MB。`;
  return null;
}

export async function validatePdfBytes(bytes: Uint8Array, maxPages = Number(process.env.MAX_PDF_PAGES) || 500) {
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return "文件不是有效的 PDF。";
  try {
    const document = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    if (document.getPageCount() > maxPages) return `PDF 页数超过限制，最大支持 ${maxPages} 页。`;
    return null;
  } catch {
    return "PDF 文件结构无效或暂不受支持。";
  }
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19));
}

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) !== 6) return true;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) return isPrivateIpv4(normalized.slice(7));
  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8")
    || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
}

export async function assertPublicHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("只支持 HTTP 或 HTTPS 网页地址。");
  if (url.username || url.password) throw new Error("网页地址不能包含登录凭据。");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("网页地址使用了不允许的端口。");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("不允许访问本机或内部网络地址。");
  }
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("不允许访问本机或内部网络地址。");
  }
  return url;
}
