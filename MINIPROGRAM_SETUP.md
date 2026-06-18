# 字书 Zishoo 小程序体验版部署说明

## 现在已经完成的体验版功能

- 课程合集列表
- 课程详情和每集目录
- 微信小程序登录，服务端保存 openid 会话
- 小程序微信支付下单
- 支付成功后沿用网站现有回调解锁课程
- 已购买用户播放腾讯云点播 VOD 短时效地址
- 播放页显示用户水印

## 需要在 EdgeOne 环境变量里补充

```env
WECHAT_MINI_APP_ID=你的小程序AppID
WECHAT_MINI_APP_SECRET=你的小程序AppSecret
MINIPROGRAM_SESSION_SECRET=一串随机长字符串
```

如果你的小程序 AppID 就是微信支付绑定的 AppID，原来的微信支付配置可以继续用：

```env
WECHAT_PAY_MCH_ID=微信支付商户号
WECHAT_PAY_SERIAL_NO=商户证书序列号
WECHAT_PAY_API_V3_KEY=APIv3密钥
WECHAT_PAY_PRIVATE_KEY_B64_1=商户私钥分段1
WECHAT_PAY_PRIVATE_KEY_B64_2=商户私钥分段2
WECHAT_PAY_PRIVATE_KEY_B64_3=商户私钥分段3
WECHAT_PAY_NOTIFY_URL=https://www.zishoo.cn/api/pay/notify
```

## 微信公众平台后台需要配置

位置：小程序后台 -> 开发管理 -> 开发设置 -> 服务器域名。

至少添加：

```text
request合法域名：https://www.zishoo.cn
downloadFile合法域名：https://www.zishoo.cn
```

如果小程序播放器提示 VOD 域名不合法，再把腾讯云点播域名也加入合法域名，例如：

```text
downloadFile合法域名：https://1309315684.vod-qcloud.com
```

实际域名以腾讯云点播返回的播放地址为准。

## 用微信开发者工具打开

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：

```text
C:\Users\Lenovo\Desktop\hanzi-project\hanzi-school\miniprogram
```

4. AppID 填你的小程序 AppID。
5. 编译后进入课程列表。
6. 先用体验版测试课程列表、登录、购买、播放。

## 注意

- 小程序支付必须使用已经绑定微信支付商户号的小程序 AppID。
- 体验版可以先测试登录和页面；正式支付需要小程序已认证、商户号已绑定、支付权限正常。
- 小程序正式发布前需要完成小程序备案和微信审核。
