import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "zishoo_admin_session";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getSigningSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(value: string) {
  const secret = getSigningSecret();
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword() && getSigningSecret());
}

export async function isAdminAuthed() {
  if (!isAdminConfigured()) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value || "";
  const [value, signature] = token.split(".");

  if (!value || !signature) return false;

  const expected = sign(value);
  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function setAdminSession(password: string) {
  if (!isAdminConfigured() || password !== getAdminPassword()) {
    return false;
  }

  const value = `admin:${Date.now()}`;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });

  return true;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/admin",
    maxAge: 0,
  });
}
