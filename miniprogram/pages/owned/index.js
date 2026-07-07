const { request, ensureLogin } = require("../../utils/request");

Page({
  data: {
    loading: true,
    error: "",
    loggedIn: false,
    activeCategory: "course",
    ownedCourses: [],
    categories: [
      { key: "course", label: "课程" },
      { key: "offline", label: "线下课" },
      { key: "interaction", label: "课堂互动" },
      { key: "ai", label: "AI助理" }
    ],
    activeTab: "owned"
  },

  onShow() {
    this.loadMine();
  },

  async loadMine() {
    this.setData({ loading: true, error: "" });
    try {
      await ensureLogin();
      const data = await request({ url: "/api/miniprogram/my" });
      this.setData({
        loggedIn: Boolean(data.loggedIn),
        ownedCourses: data.ownedCourses || [],
        loading: false
      });
    } catch (error) {
      this.setData({
        error: error.message || "已购课程加载失败",
        loading: false
      });
    }
  },

  selectCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.key });
  },

  openCourse(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/lesson/index?id=${id}` });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/courses/index" });
  },

  goMine() {
    wx.redirectTo({ url: "/pages/mine/index" });
  },

  tapPromo() {
    wx.showToast({ title: "推广功能正在完善", icon: "none" });
  }
});
