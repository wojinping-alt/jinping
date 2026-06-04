/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { VodUploadClient, VodUploadRequest } = require("vod-node-sdk");

const root = path.resolve(__dirname, "..");
const envFiles = [
  path.join(root, "vod-upload.env.local"),
  path.join(root, ".env.local"),
];
const statePath = path.join(root, "vod-replace-course-state.json");
const HLS_DEFINITION = 10;

const jobs = [
  {
    key: "ai-simple",
    courseId: 103,
    title: "汉字就这么简单",
    folder: "D:\\批量视频\\AI营销\\汉字就这么简单",
  },
  {
    key: "q1-xiaoe",
    courseId: 101,
    title: "一字千金——文字构形与书法造型Q1",
    folder: "C:\\Users\\Lenovo\\Downloads\\小鹅通",
  },
];

function loadEnv() {
  for (const file of envFiles) {
    if (!fs.existsSync(file)) continue;

    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function readState() {
  if (!fs.existsSync(statePath)) return { jobs: {} };
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function getVideos(folder) {
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(mp4|mov|m4v|avi|mkv)$/i.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      title: path.basename(entry.name, path.extname(entry.name)),
      fullPath: path.join(folder, entry.name),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "zh-Hans-CN", {
        numeric: true,
        sensitivity: "base",
      })
    )
    .map((video, index) => ({ ...video, episodeNumber: index + 1 }));
}

function uploadOne(client, region, request) {
  return new Promise((resolve, reject) => {
    client.upload(region, request, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

function hmacSha256(message, key) {
  return crypto.createHmac("sha256", key).update(message).digest();
}

function sha256Hex(message) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

async function tencentApi(action, payload) {
  const secretId = requireEnv("TENCENTCLOUD_SECRET_ID");
  const secretKey = requireEnv("TENCENTCLOUD_SECRET_KEY");
  const host = "vod.tencentcloudapi.com";
  const service = "vod";
  const version = "2018-07-17";
  const region = process.env.TENCENT_VOD_REGION || "ap-guangzhou";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload || {});
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(body)}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
  const secretDate = hmacSha256(date, `TC3${secretKey}`);
  const secretService = hmacSha256(service, secretDate);
  const secretSigning = hmacSha256("tc3_request", secretService);
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
      "X-TC-Region": region,
    },
    body,
  });
  const data = await res.json();
  if (data.Response?.Error) {
    throw new Error(`${action}: ${data.Response.Error.Code} ${data.Response.Error.Message}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hlsUrlFromTask(detail) {
  const results = detail.Response.ProcedureTask?.MediaProcessResultSet || [];
  const task = results.find(
    (item) =>
      item.Type === "AdaptiveDynamicStreaming" &&
      item.AdaptiveDynamicStreamingTask?.Input?.Definition === HLS_DEFINITION
  );

  return task?.AdaptiveDynamicStreamingTask?.Output?.Url || "";
}

async function ensureUploaded(job, state, client, region, storageRegion) {
  const jobState = state.jobs[job.key] || { episodes: [] };
  state.jobs[job.key] = jobState;

  const videos = getVideos(job.folder);
  console.log(`${job.title}: ${videos.length} videos`);

  for (const video of videos) {
    const existing = jobState.episodes.find(
      (item) => item.filePath === video.fullPath && item.fileId
    );
    if (existing) {
      existing.episodeNumber = video.episodeNumber;
      existing.title = video.title;
      continue;
    }

    const request = new VodUploadRequest();
    request.MediaFilePath = video.fullPath;
    request.MediaName = `${job.title} ${video.title}`;
    request.StorageRegion = storageRegion;

    console.log(`upload ${job.title} ${video.episodeNumber}/${videos.length}: ${video.name}`);
    const uploaded = await uploadOne(client, region, request);

    jobState.episodes.push({
      episodeNumber: video.episodeNumber,
      title: video.title,
      fileName: video.name,
      filePath: video.fullPath,
      fileId: uploaded.FileId,
      mediaUrl: uploaded.MediaUrl,
      hlsUrl: "",
      taskId: "",
    });
    jobState.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    writeState(state);
  }

  jobState.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  writeState(state);
}

async function ensureHls(job, state) {
  const episodes = state.jobs[job.key].episodes;

  for (const episode of episodes) {
    if (episode.hlsUrl) continue;

    if (!episode.taskId) {
      console.log(`transcode ${job.title} ${episode.episodeNumber}/${episodes.length}: ${episode.title}`);
      const task = await tencentApi("ProcessMedia", {
        FileId: episode.fileId,
        MediaProcessTask: {
          AdaptiveDynamicStreamingTaskSet: [{ Definition: HLS_DEFINITION }],
        },
      });
      episode.taskId = task.Response.TaskId;
      writeState(state);
      await sleep(300);
    }
  }

  for (;;) {
    let pending = 0;

    for (const episode of episodes) {
      if (episode.hlsUrl) continue;
      const detail = await tencentApi("DescribeTaskDetail", {
        TaskId: episode.taskId,
      });
      const status = detail.Response.Status;

      if (status === "FINISH") {
        episode.hlsUrl = hlsUrlFromTask(detail);
        if (!episode.hlsUrl) {
          throw new Error(`Missing HLS url for ${episode.fileId}`);
        }
        writeState(state);
      } else if (status === "FAIL") {
        throw new Error(`HLS task failed: ${episode.taskId}`);
      } else {
        pending += 1;
      }
      await sleep(80);
    }

    console.log(`${job.title}: HLS pending ${pending}`);
    if (pending === 0) break;
    await sleep(15000);
  }
}

async function updateDatabase(job, state, supabase) {
  const episodes = state.jobs[job.key].episodes;

  console.log(`replace database episodes for course ${job.courseId}`);
  const { error: deleteError } = await supabase
    .from("course_episodes")
    .delete()
    .eq("course_id", job.courseId);
  if (deleteError) throw deleteError;

  const rows = episodes.map((episode) => ({
    course_id: job.courseId,
    episode_number: episode.episodeNumber,
    title: episode.title,
    video_url: episode.hlsUrl,
    vod_file_id: episode.fileId,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("course_episodes").insert(rows);
    if (insertError) throw insertError;

    const { error: courseError } = await supabase
      .from("courses")
      .update({
        title: job.title,
        video_url: rows[0].video_url,
      })
      .eq("id", job.courseId);
    if (courseError) throw courseError;
  }

  console.log(`updated ${job.title}: ${rows.length} episodes`);
}

async function main() {
  loadEnv();

  const secretId = requireEnv("TENCENTCLOUD_SECRET_ID");
  const secretKey = requireEnv("TENCENTCLOUD_SECRET_KEY");
  const region = process.env.TENCENT_VOD_REGION || "ap-guangzhou";
  const storageRegion = process.env.TENCENT_VOD_STORAGE_REGION || "ap-guangzhou";
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const client = new VodUploadClient(secretId, secretKey);
  const supabase = createClient(supabaseUrl, supabaseKey);
  const state = readState();

  for (const job of jobs) {
    if (!fs.existsSync(job.folder)) {
      throw new Error(`Folder does not exist: ${job.folder}`);
    }
    await ensureUploaded(job, state, client, region, storageRegion);
    await ensureHls(job, state);
    await updateDatabase(job, state, supabase);
  }

  writeState(state);
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
