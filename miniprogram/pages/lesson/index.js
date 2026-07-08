const { request, ensureLogin } = require("../../utils/request");

const app = getApp();

const assetBase = `${app.globalData.apiBase}/miniprogram-assets`;

function getCoverImage(title) {
  if (title.includes("Q2") || title.includes("第2季")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1季")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function getCourseKind(title) {
  if (title.includes("Q2") || title.includes("第2季")) return "q2";
  if (title.includes("Q1") || title.includes("第1季")) return "q1";
  return "other";
}

function getDisplayTitle(title) {
  if (title.includes("Q2") || title.includes("第2季")) {
    return "《一字千金——文字构形&书法造型》视频课第2季";
  }
  if (title.includes("Q1") || title.includes("第1季")) {
    return "《一字千金——文字构形&书法造型》视频课第1季";
  }
  return title;
}

function getDetailImages(kind) {
  const q1 = [
    `${assetBase}/course-q1/cover.webp`,
    `${assetBase}/course-q1/Q11.jpg`,
    `${assetBase}/course-q1/Q12.jpg`,
    `${assetBase}/course-q1/Q13.jpg`,
    `${assetBase}/course-q1/Q14.jpg`,
    `${assetBase}/course-q1/Q15.png`,
    `${assetBase}/course-q1/Q16.jpg`,
    `${assetBase}/course-q1/Q17.jpg`,
    `${assetBase}/course-q1/Q18.jpg`,
    `${assetBase}/course-q1/Q19.jpg`,
    `${assetBase}/course-q1/tool-0.jpg`,
    `${assetBase}/course-q1/tool-1.jpg`,
    `${assetBase}/course-q1/tool-2.jpg`,
    `${assetBase}/course-q1/tool-3.jpg`
  ];

  if (kind === "q2") {
    return [
      `${assetBase}/course-q2/cover.webp`,
      `${assetBase}/course-q2/Q21.jpg`,
      `${assetBase}/course-q1/Q12.jpg`,
      `${assetBase}/course-q1/Q13.jpg`,
      `${assetBase}/course-q1/Q14.jpg`,
      `${assetBase}/course-q2/Q25.jpg`,
      `${assetBase}/course-q1/Q16.jpg`,
      `${assetBase}/course-q1/Q17.jpg`,
      `${assetBase}/course-q1/Q18.jpg`,
      `${assetBase}/course-q1/Q19.jpg`,
      `${assetBase}/course-q1/tool-0.jpg`,
      `${assetBase}/course-q1/tool-1.jpg`,
      `${assetBase}/course-q1/tool-2.jpg`,
      `${assetBase}/course-q1/tool-3.jpg`
    ];
  }

  if (kind === "q1") return q1;
  return [];
}

function getEpisodeDate(kind, episodeNumber) {
  if (kind === "q1") return episodeNumber === 1 ? "2024.03.07" : "2025.02.26";
  if (kind === "q2") return episodeNumber === 1 ? "2024.03.07" : "2025.02.26";
  return "2025.02.26";
}

Page({
  data: {
    courseId: "",
    loading: true,
    paying: false,
    error: "",
    course: null,
    episodes: [],
    unlocked: false,
    loggedIn: false,
    activeTab: "catalog",
    detailImages: [],
    courseKind: "other"
  },

  onLoad(options) {
    this.setData({ courseId: options.id });
  },

  onShow() {
    if (this.data.courseId) {
      this.loadLesson();
    }
  },

  async loadLesson() {
    this.setData({ loading: true, error: "" });
    try {
      const data = await request({
        url: `/api/miniprogram/lesson?courseId=${this.data.courseId}`
      });
      const course = data.course || {};
      const courseKind = getCourseKind(course.title || "");
      const episodeCount = (data.episodes || []).length;
      const displayTitle = getDisplayTitle(course.title || "");
      wx.setNavigationBarTitle({ title: displayTitle.slice(0, 18) });
      this.setData({
        course: {
          ...course,
          displayTitle,
          coverAsset: getDetailImages(courseKind)[0] || getCoverImage(course.title || ""),
          priceText: Number(course.price || 0).toFixed(2),
          coverImage: getCoverImage(course.title || ""),
          subscriberCount: episodeCount || 22
        },
        episodes: (data.episodes || []).map((episode) => ({
          ...episode,
          displayDate: getEpisodeDate(courseKind, Number(episode.episode_number || 0))
        })),
        detailImages: getDetailImages(courseKind),
        courseKind,
        unlocked: Boolean(data.unlocked),
        loggedIn: Boolean(data.loggedIn),
        loading: false
      });
    } catch (error) {
      this.setData({
        error: error.message || "课程详情加载失败",
        loading: false
      });
    }
  },

  async buyCourse() {
    this.setData({ paying: true });
    try {
      await ensureLogin();
      const data = await request({
        url: "/api/miniprogram/pay",
        method: "POST",
        data: { courseId: this.data.courseId }
      });

      if (data.paid) {
        await this.loadLesson();
        this.setData({ paying: false });
        return;
      }

      const payParams = data.payParams;
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: async () => {
          wx.showToast({ title: "购买成功" });
          setTimeout(() => this.loadLesson(), 1200);
        },
        fail: (error) => {
          if (error.errMsg && error.errMsg.includes("cancel")) {
            wx.showToast({ title: "已取消支付", icon: "none" });
          } else {
            wx.showToast({ title: "支付未完成", icon: "none" });
          }
        },
        complete: () => {
          this.setData({ paying: false });
        }
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "购买失败",
        icon: "none"
      });
      this.setData({ paying: false });
    }
  },

  selectTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  },

  sendFriend() {
    wx.showToast({ title: "请点击右上角分享给好友", icon: "none" });
  },

  startLearning() {
    const first = this.data.episodes[0];
    if (!first) return;
    wx.navigateTo({
      url: `/pages/player/index?courseId=${this.data.courseId}&episodeId=${first.id}&title=${encodeURIComponent(first.title)}`
    });
  },

  async openEpisode(event) {
    if (!this.data.unlocked) {
      wx.showToast({ title: "请先购买课程", icon: "none" });
      return;
    }

    const episodeId = event.currentTarget.dataset.id;
    const title = event.currentTarget.dataset.title;
    wx.navigateTo({
      url: `/pages/player/index?courseId=${this.data.courseId}&episodeId=${episodeId}&title=${encodeURIComponent(title)}`
    });
  }
});
