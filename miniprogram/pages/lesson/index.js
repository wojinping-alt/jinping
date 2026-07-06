const { request, ensureLogin } = require("../../utils/request");

function getCoverImage(title) {
  if (title.includes("Q2") || title.includes("第2季")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1季")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
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
    loggedIn: false
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
      this.setData({
        course: {
          ...course,
          priceText: Number(course.price || 0).toFixed(2),
          coverImage: getCoverImage(course.title || "")
        },
        episodes: data.episodes || [],
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
