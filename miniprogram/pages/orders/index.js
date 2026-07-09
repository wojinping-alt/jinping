const { request, ensureLogin } = require("../../utils/request");

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待付款" },
  { key: "shipping", label: "待发货" },
  { key: "receiving", label: "待收货" },
  { key: "review", label: "待评价", badge: 7 },
  { key: "refund", label: "退款/售后" }
];

Page({
  data: {
    loading: true,
    error: "",
    keyword: "",
    activeTab: "all",
    tabs,
    orders: [],
    filteredOrders: []
  },

  onLoad(options) {
    this.setData({ activeTab: options.status || "all" });
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true, error: "" });
    try {
      await ensureLogin();
      const data = await request({ url: "/api/miniprogram/orders" });
      this.setData({
        orders: data.orders || [],
        loading: false
      });
      this.applyFilters();
    } catch (error) {
      this.setData({
        error: error.message || "订单加载失败",
        loading: false
      });
    }
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const activeTab = this.data.activeTab;
    const filteredOrders = this.data.orders.filter((order) => {
      const statusMatched =
        activeTab === "all" ||
        order.status === activeTab ||
        (activeTab === "shipping" && order.type === "product" && order.status === "paid") ||
        (activeTab === "receiving" && false) ||
        (activeTab === "review" && order.status === "paid");
      const keywordMatched =
        !keyword ||
        String(order.title || "").toLowerCase().includes(keyword) ||
        String(order.outTradeNo || "").toLowerCase().includes(keyword);
      return statusMatched && keywordMatched;
    });
    this.setData({ filteredOrders });
  },

  selectTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.key });
    this.applyFilters();
  },

  onSearchInput(event) {
    this.setData({ keyword: event.detail.value || "" });
    this.applyFilters();
  },

  goDetail(event) {
    const order = this.data.orders.find((item) => item.id === event.currentTarget.dataset.id);
    if (!order) return;
    if (order.type === "course" && order.courseId) {
      wx.navigateTo({ url: `/pages/lesson/index?id=${order.courseId}` });
      return;
    }
    wx.showToast({ title: "订单详情功能正在完善", icon: "none" });
  },

  payAgain(event) {
    wx.showToast({ title: "请回到课程页重新下单", icon: "none" });
  },

  requestAfterSale() {
    wx.showToast({ title: "售后功能正在完善", icon: "none" });
  },

  reviewOrder() {
    wx.showToast({ title: "评价功能正在完善", icon: "none" });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/courses/index" });
  }
});
