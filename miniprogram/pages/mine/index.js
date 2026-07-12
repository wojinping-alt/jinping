const {
  request,
  ensureLogin,
  isLoggedIn,
  getStoredUserProfile,
  saveUserProfile,
  acceptAgreement
} = require("../../utils/request");

const baseOrderItems = [
  { label: "待付款", icon: "wallet", status: "pending" },
  { label: "待发货", icon: "box", status: "shipping" },
  { label: "待收货", icon: "truck", status: "receiving" },
  { label: "待评价", icon: "chat", status: "review" },
  { label: "退款/售后", icon: "refund", status: "refund" }
];

const defaultStats = {
  account: 0,
  coupons: 0,
  favorites: 0,
  owned: 0,
  learningMinutes: 0
};

Page({
  data: {
    loading: true,
    loginLoading: false,
    loggedIn: false,
    showLoginPanel: false,
    userName: "字书用户",
    avatarUrl: "",
    authNickname: "",
    authAvatarUrl: "",
    stats: defaultStats,
    orderItems: baseOrderItems,
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

  onLoad(options) {
    if (options && options.login) {
      this.setData({ showLoginPanel: true });
    }
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "我的" });
    this.syncStoredProfile();
    if (!isLoggedIn()) {
      this.setData({
        loggedIn: false,
        loading: false,
        showLoginPanel: true,
        stats: defaultStats,
        orderItems: baseOrderItems
      });
      return;
    }
    this.loadMine();
  },

  syncStoredProfile() {
    const profile = getStoredUserProfile();
    this.setData({
      userName: profile.nickName || "字书用户",
      avatarUrl: profile.avatarUrl || "",
      authNickname: profile.nickName || "",
      authAvatarUrl: profile.avatarUrl || ""
    });
  },

  async loginAndLoad() {
    if (this.data.loginLoading) return;
    this.setData({ loginLoading: true });
    try {
      acceptAgreement();
      const nickName = (this.data.authNickname || "").trim() || "字书用户";
      saveUserProfile({
        nickName,
        avatarUrl: this.data.authAvatarUrl || ""
      });
      await ensureLogin({ skipConsent: true, withProfile: false });
      this.setData({
        loginLoading: false,
        loggedIn: true,
        showLoginPanel: false,
        loading: true
      });
      this.syncStoredProfile();
      await this.loadMine();
    } catch (error) {
      this.setData({ loginLoading: false });
      wx.showToast({ title: error.message || "登录已取消", icon: "none" });
    }
  },

  hideLoginPanel() {
    this.setData({ showLoginPanel: false });
  },

  requireLoggedIn() {
    if (isLoggedIn()) return true;
    this.setData({ showLoginPanel: true });
    return false;
  },

  async loadMine() {
    try {
      const [data, orderData] = await Promise.all([
        request({ url: "/api/miniprogram/my" }),
        request({ url: "/api/miniprogram/orders" }).catch(() => ({ orders: [] }))
      ]);
      const profile = getStoredUserProfile();
      this.setData({
        loggedIn: true,
        userName: profile.nickName || (data.user && data.user.name) || "字书用户",
        avatarUrl: profile.avatarUrl || "",
        stats: data.stats || this.data.stats,
        orderItems: this.buildOrderItems(orderData.orders || []),
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "个人中心加载失败", icon: "none" });
    }
  },

  buildOrderItems(orders) {
    const counts = {
      pending: orders.filter((order) => order.status === "pending").length,
      shipping: orders.filter((order) => order.type === "product" && order.status === "paid").length,
      receiving: 0,
      review: orders.filter((order) => order.status === "paid" && !order.reviewed).length,
      refund: orders.filter((order) => order.status === "refund").length
    };
    return baseOrderItems.map((item) => ({ ...item, badge: counts[item.status] || 0 }));
  },

  goOwned() {
    if (!this.requireLoggedIn()) return;
    wx.redirectTo({ url: "/pages/owned/index" });
  },

  goOrders(event) {
    if (!this.requireLoggedIn()) return;
    const status = event && event.currentTarget ? event.currentTarget.dataset.status : "";
    wx.navigateTo({ url: `/pages/orders/index${status ? `?status=${status}` : ""}` });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/courses/index" });
  },

  tapPromo() {
    wx.showToast({ title: "推广功能正在完善", icon: "none" });
  },

  chooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;
    if (!avatarUrl) return;
    const profile = getStoredUserProfile();
    saveUserProfile({ ...profile, avatarUrl });
    this.setData({ avatarUrl });
  },

  chooseAuthAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({ authAvatarUrl: avatarUrl });
  },

  inputAuthNickname(event) {
    this.setData({ authNickname: event.detail.value || "" });
  },

  openSettings() {
    if (!this.requireLoggedIn()) return;
    wx.navigateTo({ url: "/pages/settings/index" });
  },

  tapHeaderIcon() {
    wx.showToast({ title: "消息功能正在完善", icon: "none" });
  },

  tapTool(event) {
    if (!this.requireLoggedIn()) return;
    const target = event.currentTarget.dataset.target;
    if (target === "owned") {
      this.goOwned();
      return;
    }
    wx.showToast({ title: "该功能正在完善", icon: "none" });
  },

  tapOrder(event) {
    this.goOrders(event);
  },

  openProtocol(event) {
    const type = event.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/protocol/index?type=${type}` });
  },

  stopBubble() {
  }
});
