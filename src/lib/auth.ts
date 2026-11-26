import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE_NAME = "tugasku_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 hari

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "tugasku-local-dev-secret-change-in-production";
}

/** Hash password using Node's built-in scrypt with a random 16-byte salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/** Verify a plaintext password against a stored `salt:hash` value. */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedBuffer = scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return timingSafeEqual(keyBuffer, derivedBuffer);
}

function signToken(payload: { userId: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): { userId: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = createHmac("sha256", getSessionSecret()).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as {
      userId: string;
      exp: number;
    };
    if (!parsed.userId || typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const headerList = await headers();
  const isHttps = headerList.get("x-forwarded-proto") === "https";
  const token = signToken({
    userId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isHttps,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarColor: true,
    },
  });

  return user;
}
