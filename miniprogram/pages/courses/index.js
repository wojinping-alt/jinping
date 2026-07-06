const { request } = require("../../utils/request");

const menuItems = [
  { label: "推广", icon: "/assets/xet/menu-promo.png", target: "promo" },
  { label: "打卡", icon: "/assets/xet/menu-checkin.png", target: "checkin" },
  { label: "直播", icon: "/assets/xet/menu-live.png", target: "live" },
  { label: "课程", icon: "/assets/xet/menu-course.png", target: "courses" },
  { label: "货品", icon: "/assets/xet/menu-goods.png", target: "goods" },
  { label: "玩赚", icon: "/assets/xet/menu-play.png", target: "play" }
];

const adItems = [
  { title: "第1集试看片段", image: "/assets/xet/ad-preview-1.jpg" },
  { title: "甲骨文 hip-hop", image: "/assets/xet/ad-preview-2.jpg" },
  { title: "一字千金产品发布", image: "/assets/xet/ad-preview-3.jpg" },
  { title: "甲骨文表情包", image: "/assets/xet/ad-preview-4.jpg" }
];

function getCoverImage(title) {
  if (title.includes("Q2") || title.includes("第2季")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1季")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
}

Page({
  data: {
    loading: true,
    error: "",
    courses: [],
    qCourses: [],
    simpleCourse: null,
    featuredCourse: null,
    totalEpisodes: 0,
    menuItems,
    adItems,
    activeTab: "home"
  },

  onShow() {
    this.loadCourses();
  },

  async loadCourses() {
    this.setData({ loading: true, error: "" });
    try {
      const data = await request({ url: "/api/miniprogram/courses" });
      const courses = (data.courses || []).map((course, index) => {
        const price = Number(course.price || 0);
        const title = course.title || "";
        const coverImage = getCoverImage(title);
        return {
          ...course,
          index,
          priceText: price.toFixed(2),
          coverImage,
          shortTitle: title.replace("《", "").replace("》", "")
        };
      });
      const qCourses = courses.filter((course) => course.title.includes("一字千金"));
      const simpleCourse = courses.find((course) => course.title.includes("汉字就这么简单")) || null;
      const totalEpisodes = courses.reduce((sum, course) => sum + Number(course.episodeCount || 0), 0);
      this.setData({
        courses,
        qCourses,
        simpleCourse,
        featuredCourse: qCourses[0] || courses[0] || null,
        totalEpisodes,
        loading: false
      });
    } catch (error) {
      this.setData({
        error: error.message || "课程加载失败",
        loading: false
      });
    }
  },

  openCourse(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/lesson/index?id=${id}`
    });
  },

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab !== "home") {
      wx.showToast({ title: "该栏目正在完善", icon: "none" });
    }
  },

  tapMenu(event) {
    const target = event.currentTarget.dataset.target;
    if (target === "courses") return;
    if (target === "play") {
      wx.navigateTo({ url: "/pages/playearn/index" });
      return;
    }
    wx.showToast({ title: "该入口正在完善", icon: "none" });
  },

  openPlayEarn() {
    wx.navigateTo({ url: "/pages/playearn/index" });
  },

  tapSearch() {
    wx.showToast({ title: "搜索功能正在完善", icon: "none" });
  }
});
