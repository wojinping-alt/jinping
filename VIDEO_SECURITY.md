# 视频防下载配置

网站已经做了以下防护：

- 课程页不再直接输出数据库里的视频地址。
- 播放前必须请求 `/api/video/play`，服务端会校验登录和购买权限。
- 腾讯云 VOD 默认播放域名已经开启 Key 防盗链。
- 播放地址会变成短时效签名 URL，未签名地址会返回 403。
- 播放器支持 MP4 和 HLS `.m3u8`。
- 前端播放器隐藏下载按钮、禁止右键、禁止画中画，并显示用户水印。

## EdgeOne 环境变量

优先在 EdgeOne Pages 项目里添加：

```text
TENCENT_VOD_ANTI_LEECH_KEY=腾讯云点播默认分发配置里的播放密钥
VIDEO_PLAY_EXPIRE_SECONDS=7200
VIDEO_PLAY_RLIMIT=3
```

如果没有添加 `TENCENT_VOD_ANTI_LEECH_KEY`，服务端会使用 `TENCENTCLOUD_SECRET_ID` 和 `TENCENTCLOUD_SECRET_KEY` 自动读取腾讯云点播默认播放密钥，并缓存在运行时内存里。

## 腾讯云点播控制台

当前已通过 API 开启默认播放域名 `1309315684.vod-qcloud.com` 的 Key 防盗链。

建议后续在控制台把 Referer 白名单限制为：

```text
https://www.zishoo.cn
https://zishoo.cn
```

## HLS 分片和加密

已对当前课程视频执行腾讯云 VOD 预置模板 `Definition=14`：

```text
Adpative-HLS-EncryptBase
HLS + SimpleAES
```

数据库里的 `courses.video_url` 和 `course_episodes.video_url` 已经更新为 `.m3u8` 地址。

腾讯云官方更推荐 HLS 私有加密或 DRM，而不是旧版 HLS 普通 AES 加密。

## 注意

网页视频无法做到 100% 防下载。以上方案能显著提高普通用户、浏览器下载按钮、外链盗链、长期 URL 分享、简单抓包下载的门槛。对抗专业录屏和破解，需要 HLS 私有加密/DRM、动态水印、风控和人工追踪配合。
