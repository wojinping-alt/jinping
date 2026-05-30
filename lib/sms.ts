import crypto from "crypto";

const SMS_ENDPOINT = "sms.tencentcloudapi.com";
const SMS_SERVICE = "sms";
const SMS_VERSION = "2021-01-11";

export function normalizeChinaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("86") && digits.length === 13
    ? digits.slice(2)
    : digits;

  if (!/^1[3-9]\d{9}$/.test(local)) {
    throw new Error("请输入正确的中国大陆手机号");
  }

  return {
    local,
    e164: `+86${local}`,
  };
}

export function maskPhone(phone: string) {
  const { local } = normalizeChinaPhone(phone);
  return `${local.slice(0, 3)}****${local.slice(-4)}`;
}

export function createSmsCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashSmsCode(phone: string, code: string) {
  const secret =
    process.env.SMS_CODE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.TENCENTCLOUD_SECRET_KEY ||
    "zishoo-local-sms-secret";

  return crypto
    .createHash("sha256")
    .update(`${normalizeChinaPhone(phone).e164}:${code}:${secret}`)
    .digest("hex");
}

function sha256(message: string) {
  return crypto.createHash("sha256").update(message, "utf8").digest("hex");
}

function hmac(key: Buffer | string, message: string) {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest();
}

function getTencentConfig() {
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const smsSdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
  const signName = process.env.TENCENT_SMS_SIGN_NAME;
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;

  const missing = [
    ["TENCENTCLOUD_SECRET_ID", secretId],
    ["TENCENTCLOUD_SECRET_KEY", secretKey],
    ["TENCENT_SMS_SDK_APP_ID", smsSdkAppId],
    ["TENCENT_SMS_SIGN_NAME", signName],
    ["TENCENT_SMS_TEMPLATE_ID", templateId],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(
      `缺少腾讯短信配置：${missing.map(([name]) => name).join(", ")}`
    );
  }

  return {
    secretId: secretId!,
    secretKey: secretKey!,
    smsSdkAppId: smsSdkAppId!,
    signName: signName!,
    templateId: templateId!,
    region: process.env.TENCENT_SMS_REGION || "ap-guangzhou",
  };
}

function getTemplateParams(code: string) {
  const minutes = process.env.SMS_CODE_EXPIRE_MINUTES || "5";
  const pattern = process.env.TENCENT_SMS_TEMPLATE_PARAMS;

  if (!pattern) return [code];

  return pattern.split(",").map((part) =>
    part.trim().replace("{code}", code).replace("{minutes}", minutes)
  );
}

export async function sendTencentSmsCode(phone: string, code: string) {
  const config = getTencentConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const payload = JSON.stringify({
    PhoneNumberSet: [normalizeChinaPhone(phone).e164],
    SmsSdkAppId: config.smsSdkAppId,
    SignName: config.signName,
    TemplateId: config.templateId,
    TemplateParamSet: getTemplateParams(code),
  });

  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${SMS_ENDPOINT}\nx-tc-action:sendsms\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256(payload),
  ].join("\n");
  const credentialScope = `${date}/${SMS_SERVICE}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const secretDate = hmac(`TC3${config.secretKey}`, date);
  const secretService = hmac(secretDate, SMS_SERVICE);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${SMS_ENDPOINT}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: SMS_ENDPOINT,
      "X-TC-Action": "SendSms",
      "X-TC-Timestamp": timestamp.toString(),
      "X-TC-Version": SMS_VERSION,
      "X-TC-Region": config.region,
    },
    body: payload,
  });
  const data = await res.json();
  const status = data.Response?.SendStatusSet?.[0];

  if (!res.ok || data.Response?.Error || status?.Code !== "Ok") {
    const message =
      data.Response?.Error?.Message ||
      status?.Message ||
      status?.Code ||
      "短信发送失败";
    throw new Error(message);
  }

  return data;
}

