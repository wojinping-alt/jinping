import crypto from "crypto";
import { toStableUuid } from "@/lib/stable-id";

export type MiniProgramSession = {
  openid: string;
  sessionKey?: string;
};

function getSessionSecret() {
  return (
    process.env.MINIPROGRAM_SESSION_SECRET ||
    process.env.SMS_CODE_SECRET ||
    process.env.WECHAT_PAY_API_V3_KEY ||
    "zishoo-miniprogram-dev-secret"
  );
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function signMiniProgramSession(session: MiniProgramSession) {
  const payload = base64url(
    JSON.stringify({
      openid: session.openid,
      sessionKey: session.sessionKey,
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest();

  return `${payload}.${base64url(signature)}`;
}

export function verifyMiniProgramSession(token: string): MiniProgramSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = base64url(
    crypto.createHmac("sha256", getSessionSecret()).update(payload).digest()
  );

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    const data = JSON.parse(json) as MiniProgramSession;
    return data.openid ? data : null;
  } catch {
    return null;
  }
}

export function miniProgramUserFromToken(token: string) {
  const session = verifyMiniProgramSession(token);
  if (!session) return null;

  return {
    id: toStableUuid(`mp:${session.openid}`),
    email: undefined,
    openid: session.openid,
  };
}
