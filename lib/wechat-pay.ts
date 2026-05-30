import crypto from "crypto";
import fs from "fs";
import path from "path";

export type WechatPayMode = "native" | "h5" | "jsapi";

type WechatOrderInput = {
  description: string;
  outTradeNo: string;
  amountFen: number;
  notifyUrl: string;
  mode: WechatPayMode;
  payerOpenid?: string;
  clientIp?: string;
  userAgent?: string;
};

type WechatConfig = {
  appid: string;
  mchid: string;
  serialNo: string;
  privateKey: string;
};

export function detectPayMode(userAgent: string): WechatPayMode {
  const ua = userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const isWechat = ua.includes("micromessenger");

  if (isWechat) {
    return "jsapi";
  }

  return isMobile ? "h5" : "native";
}

export function getWechatConfig(): WechatConfig {
  const appid = process.env.WECHAT_PAY_APPID || process.env.WECHAT_APP_ID;
  const mchid = process.env.WECHAT_PAY_MCH_ID;
  const serialNo = process.env.WECHAT_PAY_SERIAL_NO;
  const privateKey =
    readPrivateKeyFromBase64() ||
    process.env.WECHAT_PAY_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
    readPrivateKeyFromFile();

  const missing = [
    ["WECHAT_PAY_APPID", appid],
    ["WECHAT_PAY_MCH_ID", mchid],
    ["WECHAT_PAY_SERIAL_NO", serialNo],
    ["WECHAT_PAY_PRIVATE_KEY or WECHAT_PAY_PRIVATE_KEY_PATH", privateKey],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(
      `Missing WeChat Pay config: ${missing.map(([name]) => name).join(", ")}`
    );
  }

  return {
    appid: appid!,
    mchid: mchid!,
    serialNo: serialNo!,
    privateKey: privateKey!,
  };
}

function readPrivateKeyFromFile() {
  const configuredPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH;
  const keyPath = configuredPath
    ? path.resolve(configuredPath)
    : path.join(process.cwd(), "server", "certs", "apiclient_key.pem");

  if (!fs.existsSync(keyPath)) {
    return "";
  }

  return fs.readFileSync(keyPath, "utf8");
}

function readPrivateKeyFromBase64() {
  const encoded = process.env.WECHAT_PAY_PRIVATE_KEY_BASE64;
  if (!encoded) return "";

  return Buffer.from(encoded, "base64").toString("utf8");
}

function signRequest(
  method: string,
  urlPath: string,
  body: string,
  config: WechatConfig
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(message)
    .sign(config.privateKey, "base64");

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

export async function createWechatPayOrder(input: WechatOrderInput) {
  const config = getWechatConfig();
  const urlPath =
    input.mode === "native"
      ? "/v3/pay/transactions/native"
      : input.mode === "h5"
        ? "/v3/pay/transactions/h5"
        : "/v3/pay/transactions/jsapi";

  const body: Record<string, unknown> = {
    appid: config.appid,
    mchid: config.mchid,
    description: input.description,
    out_trade_no: input.outTradeNo,
    notify_url: input.notifyUrl,
    amount: {
      total: input.amountFen,
      currency: "CNY",
    },
  };

  if (input.mode === "h5") {
    body.scene_info = {
      payer_client_ip: input.clientIp || "127.0.0.1",
      h5_info: {
        type: /iphone|ipad|ipod/i.test(input.userAgent || "")
          ? "iOS"
          : "Android",
      },
    };
  }

  if (input.mode === "jsapi") {
    if (!input.payerOpenid) {
      throw new Error("JSAPI payment requires a WeChat openid.");
    }
    body.payer = { openid: input.payerOpenid };
  }

  const bodyStr = JSON.stringify(body);
  const res = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: "POST",
    headers: {
      Authorization: signRequest("POST", urlPath, bodyStr, config),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyStr,
  });

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!res.ok) {
    const message = data.message || data.detail?.message || raw;
    throw new Error(message || "WeChat Pay order creation failed.");
  }

  return data as {
    code_url?: string;
    h5_url?: string;
    prepay_id?: string;
  };
}

export function decryptWechatResource(resource: {
  associated_data?: string;
  nonce: string;
  ciphertext: string;
}) {
  const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY;
  if (!apiV3Key) {
    throw new Error("WECHAT_PAY_API_V3_KEY is not configured.");
  }

  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(apiV3Key, "utf8"),
    Buffer.from(resource.nonce, "utf8")
  );

  decipher.setAuthTag(authTag);
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted);
}

export function buildNotifyUrl(req: Request) {
  const configured = process.env.WECHAT_PAY_NOTIFY_URL;
  if (configured) return configured;

  const url = new URL(req.url);
  return `${url.origin}/api/pay/notify`;
}
