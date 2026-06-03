import crypto from "crypto";

export const VIDEO_PLAY_EXPIRE_SECONDS = Number(
  process.env.VIDEO_PLAY_EXPIRE_SECONDS || 7200
);

export const VIDEO_PLAY_RLIMIT = Number(process.env.VIDEO_PLAY_RLIMIT || 3);

export function maskVideoUser(value?: string | null) {
  if (!value) return "已授权用户";
  if (/^\+?\d{8,}$/.test(value)) {
    return value.replace(/^(\+?\d{2,4})\d+(\d{4})$/, "$1****$2");
  }
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return value.length > 10 ? `${value.slice(0, 4)}***${value.slice(-4)}` : value;
}

export function signVodUrl(rawUrl: string, userId: string) {
  const key =
    process.env.TENCENT_VOD_ANTI_LEECH_KEY ||
    process.env.TENCENT_VOD_KEY ||
    process.env.VOD_ANTI_LEECH_KEY;

  const expiresAt = Math.floor(Date.now() / 1000) + VIDEO_PLAY_EXPIRE_SECONDS;

  if (!key) {
    return {
      url: rawUrl,
      expiresAt,
      signed: false,
    };
  }

  const url = new URL(rawUrl);
  const dir = url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
  const t = expiresAt.toString(16).toLowerCase();
  const rlimit = String(VIDEO_PLAY_RLIMIT);
  const us = crypto
    .createHash("sha1")
    .update(`${userId}:${rawUrl}:${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex")
    .slice(0, 10);
  const sign = crypto
    .createHash("md5")
    .update(`${key}${dir}${t}${rlimit}${us}`)
    .digest("hex");

  url.search = "";
  url.searchParams.set("t", t);
  url.searchParams.set("rlimit", rlimit);
  url.searchParams.set("us", us);
  url.searchParams.set("sign", sign);

  return {
    url: url.toString(),
    expiresAt,
    signed: true,
  };
}
