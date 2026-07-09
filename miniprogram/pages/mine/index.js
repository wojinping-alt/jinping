const { request, ensureLogin } = require("../../utils/request");

Page({
  data: {
    loading: true,
    userName: "字书用户",
    stats: {
      account: 0,
      coupons: 0,
      favorites: 1,
      owned: 0,
      learningMinutes: 0
    },
    orderItems: [
      { label: "待付款", icon: "wallet", status: "pending" },
      { label: "待发货", icon: "box", status: "shipping" },
      { label: "待收货", icon: "truck", status: "receiving" },
      { label: "待评价", icon: "chat", status: "review", badge: 7 },
      { label: "退款/售后", icon: "refund", status: "refund" }
    ],
    toolItems: [
      { label: "我的课程", target: "owned" },
      { label: "打卡" },
      { label: "作业" },
      { label: "考试" },
      { label: "圈子" },
      { label: "线下课" },
      { label: "练习" },
      { label: "错题本" },
      { label: "题目收藏" },
      { label: "刷题本" }
    ]
  },

  onShow() {
    this.loadMine();
  },

  async loadMine() {
    try {
      await ensureLogin();
      const data = await request({ url: "/api/miniprogram/my" });
      this.setData({
        userName: (data.user && data.user.name) || "字书用户",
        stats: data.stats || this.data.stats,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "个人中心加载失败", icon: "none" });
    }
  },

  goOwned() {
    wx.redirectTo({ url: "/pages/owned/index" });
  },

  goOrders(event) {
    const status = event && event.currentTarget ? event.currentTarget.dataset.status : "";
    wx.navigateTo({ url: `/pages/orders/index${status ? `?status=${status}` : ""}` });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/courses/index" });
  },

  tapPromo() {
    wx.showToast({ title: "推广功能正在完善", icon: "none" });
  },

  tapTool(event) {
    const target = event.currentTarget.dataset.target;
    if (target === "owned") {
      this.goOwned();
      return;
    }
    wx.showToast({ title: "该功能正在完善", icon: "none" });
  },

  tapOrder(event) {
    this.goOrders(event);
  }
});
