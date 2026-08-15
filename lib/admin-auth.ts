import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { NextResponse } from "next/server";

const scryptAsync = promisify(scrypt);
const cookieName = "paperpilot_admin_session";
const sessionLifetimeSeconds = 8 * 60 * 60;
const userPath = path.join(process.cwd(), "data", "admin-user.json");
let writeQueue = Promise.resolve();

type AdminUser = { username: string; passwordHash: string; salt: string; sessionVersion: number; updatedAt: string };
type SessionPayload = { username: string; version: number; expiresAt: number };

function sessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") return "paperpilot-development-session-secret-change-before-production";
  throw new Error("ADMIN_SESSION_SECRET must be configured in production.");
}

async function hashPassword(password: string, salt: string) {
  return (await scryptAsync(password, salt, 64) as Buffer).toString("base64");
}

async function readUser(): Promise<AdminUser | null> {
  try { return JSON.parse(await readFile(userPath, "utf8")) as AdminUser; }
  catch (reason) { if ((reason as NodeJS.ErrnoException).code === "ENOENT") return null; throw reason; }
}

async function saveUser(user: AdminUser) {
  await mkdir(path.dirname(userPath), { recursive: true });
  const temporaryPath = `${userPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(user, null, 2)}\n`, "utf8");
  await rename(temporaryPath, userPath);
}

async function mutateUser<T>(operation: (user: AdminUser) => T | Promise<T>) {
  let value!: T;
  writeQueue = writeQueue.then(async () => {
    let user = await readUser();
    if (!user) {
      const salt = randomBytes(16).toString("base64");
      user = { username: "admin", salt, passwordHash: await hashPassword("111111", salt), sessionVersion: 1, updatedAt: new Date().toISOString() };
    }
    value = await operation(user);
    await saveUser(user);
  });
  await writeQueue;
  return value;
}

function encode(value: string) { return Buffer.from(value).toString("base64url"); }
function decode(value: string) { return Buffer.from(value, "base64url").toString("utf8"); }
function sign(value: string) { return createHmac("sha256", sessionSecret()).update(value).digest("base64url"); }

export async function verifyAdminCredentials(username: string, password: string) {
  return mutateUser(async (user) => {
    const attemptedHash = await hashPassword(password, user.salt);
    const matches = user.username === username && timingSafeEqual(Buffer.from(attemptedHash), Buffer.from(user.passwordHash));
    return matches ? user : null;
  });
}

export async function changeAdminPassword(currentPassword: string, nextPassword: string) {
  return mutateUser(async (user) => {
    const currentHash = await hashPassword(currentPassword, user.salt);
    if (!timingSafeEqual(Buffer.from(currentHash), Buffer.from(user.passwordHash))) return null;
    const salt = randomBytes(16).toString("base64");
    user.salt = salt;
    user.passwordHash = await hashPassword(nextPassword, salt);
    user.sessionVersion += 1;
    user.updatedAt = new Date().toISOString();
    return user;
  });
}

export function createAdminSession(user: Pick<AdminUser, "username" | "sessionVersion">) {
  const encodedPayload = encode(JSON.stringify({ username: user.username, version: user.sessionVersion, expiresAt: Date.now() + sessionLifetimeSeconds * 1000 } satisfies SessionPayload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export async function getAdminSession(request: Request) {
  const session = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!session) return null;
  const [encodedPayload, signature] = session.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = sign(encodedPayload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(decode(encodedPayload)) as SessionPayload;
    const user = await readUser();
    if (!user || payload.username !== user.username || payload.version !== user.sessionVersion || payload.expiresAt < Date.now()) return null;
    return user;
  } catch { return null; }
}

export async function requireAdmin(request: Request) {
  try {
    const user = await getAdminSession(request);
    if (user) return { user, denied: null };
    return { user: null, denied: NextResponse.json({ error: "Please sign in to continue." }, { status: 401 }) };
  } catch {
    return { user: null, denied: NextResponse.json({ error: "Administration authentication is not configured." }, { status: 503 }) };
  }
}

export function setAdminSession(response: NextResponse, session: string) {
  response.cookies.set(cookieName, session, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionLifetimeSeconds });
  return response;
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set(cookieName, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
