# 视频防下载配置

网站代码已经做了以下防护：

- 课程页不再直接输出数据库里的视频地址。
- 播放前必须请求 `/api/video/play`，服务端会校验登录和购买权限。
- 如果配置了腾讯云 VOD Key 防盗链密钥，播放地址会变成短时效签名 URL。
- 播放器支持 MP4 和 HLS `.m3u8`。
- 前端播放器隐藏下载按钮、禁止右键、禁止画中画，并显示用户水印。

## EdgeOne 环境变量

在 EdgeOne Pages 项目里添加：

```text
TENCENT_VOD_ANTI_LEECH_KEY=腾讯云点播默认分发配置里的播放密钥
VIDEO_PLAY_EXPIRE_SECONDS=7200
VIDEO_PLAY_RLIMIT=3
```

`TENCENT_VOD_ANTI_LEECH_KEY` 必须和腾讯云点播控制台的 Key 防盗链播放密钥保持一致。

## 腾讯云点播控制台

1. 打开腾讯云点播控制台。
2. 进入分发播放配置。
3. 开启 Key 防盗链。
4. 复制播放密钥，填到 EdgeOne 的 `TENCENT_VOD_ANTI_LEECH_KEY`。
5. 建议把 Referer 白名单限制为：

```text
https://www.zishoo.cn
https://zishoo.cn
```

## HLS 分片和加密

普通 MP4 直链天然容易被下载。更接近小鹅通的方案是：

1. 在腾讯云点播创建转自适应码流或 HLS 私有加密任务。
2. 对课程视频生成 `.m3u8` 播放地址。
3. 把 `courses.video_url` 或 `course_episodes.video_url` 更新为 `.m3u8` 地址。

腾讯云官方更推荐 HLS 私有加密或 DRM，而不是旧版 HLS 普通 AES 加密。

## 注意

网页视频无法做到 100% 防下载。以上方案能显著提高普通用户、浏览器下载按钮、外链盗链、长期 URL 分享、简单抓包下载的门槛。对抗专业录屏和破解，需要 HLS 私有加密/DRM、动态水印、风控和人工追踪配合。
