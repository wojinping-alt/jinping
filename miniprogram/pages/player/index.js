const { request, ensureLogin } = require("../../utils/request");

Page({
  data: {
    courseId: "",
    episodeId: "",
    title: "课程视频",
    playUrl: "",
    watermark: "",
    loading: true,
    error: ""
  },

  onLoad(options) {
    this.setData({
      courseId: options.courseId,
      episodeId: options.episodeId,
      title: decodeURIComponent(options.title || "课程视频")
    });
    this.loadVideo();
  },

  async loadVideo() {
    this.setData({ loading: true, error: "" });
    try {
      await ensureLogin();
      const data = await request({
        url: `/api/video/play?courseId=${this.data.courseId}&episodeId=${this.data.episodeId}`
      });
      this.setData({
        playUrl: data.playUrl,
        watermark: data.watermark || "",
        loading: false
      });
    } catch (error) {
      this.setData({
        error: error.message || "无法播放视频",
        loading: false
      });
    }
  }
});
