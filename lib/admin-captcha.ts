import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function captchaSecret() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") return "paperpilot-development-session-secret-change-before-production";
  throw new Error("ADMIN_SESSION_SECRET must be configured in production.");
}

function randomText() { return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(""); }
function encode(value: string) { return Buffer.from(value).toString("base64url"); }
function decode(value: string) { return Buffer.from(value, "base64url").toString("utf8"); }
function sign(value: string) { return createHmac("sha256", captchaSecret()).update(value).digest("base64url"); }

function svg(text: string) {
  const letters = [...text].map((letter, index) => `<text x="${24 + index * 31}" y="43" transform="rotate(${[-11, 8, -6, 10, -9][index]} ${24 + index * 31} 43)" fill="${["#0759b8", "#087f9f", "#cb5a15", "#344f73", "#0879dc"][index]}" font-family="Arial, sans-serif" font-size="29" font-weight="700">${letter}</text>`).join("");
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="182" height="62" viewBox="0 0 182 62"><rect width="182" height="62" rx="6" fill="#f1f7fb"/><path d="M0 39 C28 4 48 64 78 22 S130 55 182 18" fill="none" stroke="#9fc1da" stroke-width="2"/><path d="M0 17 L182 47 M15 58 L162 4" stroke="#c8ddea" stroke-width="1"/>${letters}</svg>`).toString("base64")}`;
}

export function createCaptcha() {
  const answer = randomText();
  const payload = encode(JSON.stringify({ answer, expiresAt: Date.now() + 5 * 60 * 1000, nonce: randomBytes(12).toString("base64url") }));
  return { id: `${payload}.${sign(payload)}`, image: svg(answer) };
}

export function verifyCaptcha(token: string, answer: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const challenge = JSON.parse(decode(payload)) as { answer: string; expiresAt: number };
    return challenge.expiresAt >= Date.now() && challenge.answer === answer.trim().toUpperCase();
  } catch { return false; }
}
