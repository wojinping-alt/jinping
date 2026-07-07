export const MINI_PROGRAM_VIDEO_ADS = [
  {
    key: "trial",
    title: "第1集试看片段",
    image: "/assets/xet/ad-preview-1.jpg",
    videoUrl:
      "https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/b2b9231c5001834810549461327/eHCtW3VEuXAA.mp4",
  },
  {
    key: "hiphop",
    title: "甲骨文 hip-hop",
    image: "/assets/xet/ad-preview-2.jpg",
    videoUrl:
      "https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/e06e30f25001834810550002478/py9ExAvNAKQA.mp4",
  },
  {
    key: "launch",
    title: "一字千金产品发布",
    image: "/assets/xet/ad-preview-3.jpg",
    videoUrl:
      "https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/a15c4b245001834807112855867/ptBU5K5YUyMA.mp4",
  },
  {
    key: "emoji",
    title: "甲骨文表情包",
    image: "/assets/xet/ad-preview-4.jpg",
    videoUrl:
      "https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/165cedc05001834810547350777/EE9oEhEg8oAA.mp4",
  },
];

export function getMiniProgramVideoAd(key: string | null) {
  return MINI_PROGRAM_VIDEO_ADS.find((item) => item.key === key);
}
