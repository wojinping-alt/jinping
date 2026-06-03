import crypto from "crypto";

let cachedVodPlayKey: string | null | undefined;

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

function sha256Hmac(message: string, secret: crypto.BinaryLike) {
  return crypto.createHmac("sha256", secret).update(message).digest();
}

function sha256Hex(message: string) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

async function fetchDefaultVodPlayKey() {
  if (cachedVodPlayKey !== undefined) return cachedVodPlayKey;

  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;

  if (!secretId || !secretKey) {
    cachedVodPlayKey = null;
    return cachedVodPlayKey;
  }

  const action = "DescribeDefaultDistributionConfig";
  const host = "vod.tencentcloudapi.com";
  const service = "vod";
  const version = "2018-07-17";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const payload = "{}";
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(
    payload
  )}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256Hex(
    canonicalRequest
  )}`;
  const secretDate = sha256Hmac(date, `TC3${secretKey}`);
  const secretService = sha256Hmac(service, secretDate);
  const secretSigning = sha256Hmac("tc3_request", secretService);
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign)
    .digest("hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: host,
      "X-TC-Action": action,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Version": version,
      "X-TC-Region": process.env.TENCENT_VOD_REGION || "ap-guangzhou",
    },
    body: payload,
  });
  const data = await res.json();

  cachedVodPlayKey = data?.Response?.PlayKey || null;
  return cachedVodPlayKey;
}

async function getVodAntiLeechKey() {
  return (
    process.env.TENCENT_VOD_ANTI_LEECH_KEY ||
    process.env.TENCENT_VOD_KEY ||
    process.env.VOD_ANTI_LEECH_KEY ||
    process.env.TENCENT_VOD_PLAY_KEY ||
    (await fetchDefaultVodPlayKey())
  );
}

export async function signVodUrl(rawUrl: string, userId: string) {
  const key = await getVodAntiLeechKey();

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
