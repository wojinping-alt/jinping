/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { VodUploadClient, VodUploadRequest } = require("vod-node-sdk");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, "vod-upload.env.local");
const resultsPath = path.join(root, "xet-video-ad-upload-results.json");
const compressedRoot = path.join(root, "tmp", "xet-video-ads-compressed");

const videos = [
  {
    key: "trial",
    title: "第1集试看片段",
    filePath: path.join(compressedRoot, "trial.mp4"),
    poster: "/assets/xet/ad-preview-1.jpg"
  },
  {
    key: "hiphop",
    title: "甲骨文 hip-hop",
    filePath: path.join(compressedRoot, "hiphop.mp4"),
    poster: "/assets/xet/ad-preview-2.jpg"
  },
  {
    key: "launch",
    title: "一字千金产品发布",
    filePath: path.join(compressedRoot, "launch.mp4"),
    poster: "/assets/xet/ad-preview-3.jpg"
  },
  {
    key: "emoji",
    title: "甲骨文表情包",
    filePath: path.join(compressedRoot, "emoji.mp4"),
    poster: "/assets/xet/ad-preview-4.jpg"
  }
];

function loadLocalEnv() {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Put it in ${path.basename(envPath)} or export it before running.`);
  }
  return value;
}

function uploadOne(client, region, request) {
  return new Promise((resolve, reject) => {
    client.upload(region, request, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

async function main() {
  loadLocalEnv();

  const secretId = requireEnv("TENCENTCLOUD_SECRET_ID");
  const secretKey = requireEnv("TENCENTCLOUD_SECRET_KEY");
  const region = process.env.TENCENT_VOD_REGION || "ap-guangzhou";
  const storageRegion = process.env.TENCENT_VOD_STORAGE_REGION || "ap-guangzhou";
  const client = new VodUploadClient(secretId, secretKey);

  const uploaded = fs.existsSync(resultsPath)
    ? JSON.parse(fs.readFileSync(resultsPath, "utf8"))
    : { videos: [] };

  for (const video of videos) {
    if (!fs.existsSync(video.filePath)) {
      throw new Error(`Video file does not exist: ${video.filePath}`);
    }

    const existing = uploaded.videos.find((item) => item.key === video.key);
    if (existing?.filePath === video.filePath && existing?.fileId && existing?.mediaUrl) {
      console.log(`skip ${video.title}: ${existing.fileId}`);
      continue;
    }

    const req = new VodUploadRequest();
    req.MediaFilePath = video.filePath;
    req.MediaName = video.title;
    if (storageRegion) req.StorageRegion = storageRegion;

    console.log(`upload ${video.title}`);
    try {
      const data = await uploadOne(client, region, req);
      if (!data.FileId || !data.MediaUrl) {
        throw new Error(`Upload did not return FileId/MediaUrl: ${JSON.stringify(data)}`);
      }

      uploaded.videos = uploaded.videos.filter((item) => item.key !== video.key);
      uploaded.videos.push({
        ...video,
        fileId: data.FileId,
        mediaUrl: data.MediaUrl
      });
      fs.writeFileSync(resultsPath, `${JSON.stringify(uploaded, null, 2)}\n`, "utf8");
    } catch (error) {
      const message = error?.message || String(error);
      uploaded.videos = uploaded.videos.filter((item) => item.key !== video.key);
      uploaded.videos.push({
        ...video,
        error: message
      });
      fs.writeFileSync(resultsPath, `${JSON.stringify(uploaded, null, 2)}\n`, "utf8");
      console.error(`failed ${video.title}: ${message}`);
    }
  }

  console.log(`done: ${resultsPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
