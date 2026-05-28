import crypto from "crypto";

/**
 * 微信支付 V3 签名
 */
export function signRequest({
  method,
  url,
  body,
  mchid,
  serialNo,
  privateKey,
}: {
  method: string;
  url: string;
  body: any;
  mchid: string;
  serialNo: string;
  privateKey: string;
}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = crypto.randomBytes(16).toString("hex");

  const bodyStr = body ? JSON.stringify(body) : "";

  // 1️⃣ 构造签名字符串（重点）
  const message =
    `${method}\n${url}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;

  // 2️⃣ RSA 私钥签名
  const sign = crypto
    .createSign("RSA-SHA256")
    .update(message)
    .sign(privateKey, "base64");

  // 3️⃣ 生成 Authorization 头
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonceStr}",signature="${sign}",timestamp="${timestamp}",serial_no="${serialNo}"`;

  return {
    authorization,
    timestamp,
    nonceStr,
    sign,
  };
}