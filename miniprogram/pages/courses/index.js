const { request } = require("../../utils/request");

Page({
  data: {
    loading: true,
    error: "",
    courses: []
  },

  onShow() {
    this.loadCourses();
  },

  async loadCourses() {
    this.setData({ loading: true, error: "" });
    try {
      const data = await request({ url: "/api/miniprogram/courses" });
      const courses = (data.courses || []).map((course) => ({
        ...course,
        priceText: Number(course.price).toFixed(2)
      }));
      this.setData({ courses, loading: false });
    } catch (error) {
      this.setData({
        error: error.message || "课程加载失败",
        loading: false
      });
    }
  },

  openCourse(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/lesson/index?id=${id}`
    });
  }
});
