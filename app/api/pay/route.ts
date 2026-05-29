import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1️⃣ 获取前端传来的价格
    const { price } = await req.json();

    if (!price || typeof price !== "number") {
      return NextResponse.json({ success: false, error: "价格必须是数字" });
    }

    // 2️⃣ 微信支付配置
    const appid = "wxaabb8e5561161ecb"; // 你的公众号AppID
    const mchid = "1746250881"; // 商户号
    const serialNo = "3E10EC19F81B27606EBB1B314B07B6EEF5D5DFD3"; // 证书序列号
    const apiV3Key = "Zishu123456789101112131415161718"; // APIv3密钥

    // 3️⃣ 读取本地私钥
    const privateKey = fs.readFileSync(
      path.join(process.cwd(), "server/certs/apiclient_key.pem"),
      "utf8"
    );

    // 4️⃣ 生成订单号
    const out_trade_no = Date.now().toString();

    // 5️⃣ 构造请求体
    const body = {
      appid,
      mchid,
      description: "汉字课程购买",
      out_trade_no,
      notify_url: "https://zishoo.cn/api/wechat/notify", // 你回调接口地址必须公网可访问
      amount: {
        total: price * 100, // 分
        currency: "CNY",
      },
    };

    const urlPath = "/v3/pay/transactions/native";
    const url = "https://api.mch.weixin.qq.com" + urlPath;

    const bodyStr = JSON.stringify(body);

    // 6️⃣ 生成签名
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(16).toString("hex");

    const message = `POST\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;

    const signature = crypto
      .createSign("RSA-SHA256")
      .update(message)
      .sign(privateKey, "base64");

    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serialNo}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

    // 7️⃣ 请求微信支付
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: bodyStr,
    });

    // 8️⃣ 打印微信原始返回，方便调试
    const text = await res.text();
    console.log("微信支付返回原始内容：", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("解析微信返回JSON失败：", e);
      return NextResponse.json({ success: false, error: text });
    }

    // 9️⃣ 返回二维码链接给前端
    return NextResponse.json({
      success: true,
      code_url: data.code_url ?? "",
      raw: data,
    });
  } catch (err: any) {
    console.error("支付接口异常：", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
