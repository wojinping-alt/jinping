const { request, ensureLogin } = require("../../utils/request");

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待付款" },
  { key: "shipping", label: "待发货" },
  { key: "receiving", label: "待收货" },
  { key: "review", label: "待评价" },
  { key: "refund", label: "退款/售后" }
];

Page({
  data: {
    loading: true,
    canceling: "",
    paying: "",
    showCancelConfirm: false,
    cancelTargetOrder: null,
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
      this.updateTabs();
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

  updateTabs() {
    const pendingCount = this.data.orders.filter((order) => order.status === "pending").length;
    const reviewCount = this.data.orders.filter((order) => order.status === "paid").length;
    this.setData({
      tabs: tabs.map((tab) => {
        if (tab.key === "pending") return { ...tab, badge: pendingCount || 0 };
        if (tab.key === "review") return { ...tab, badge: reviewCount || 0 };
        return { ...tab, badge: 0 };
      })
    });
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
    const order = this.data.orders.find((item) => item.id === event.currentTarget.dataset.id);
    if (!order) return;

    this.setData({ paying: order.id });
    request({
      url: "/api/miniprogram/orders",
      method: "POST",
      data: {
        action: "pay",
        orderId: order.orderId,
        type: order.type
      }
    })
      .then((data) => {
        const payParams = data.payParams;
        wx.requestPayment({
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType,
          paySign: payParams.paySign,
          success: async () => {
            wx.showToast({ title: "支付成功" });
            setTimeout(() => this.loadOrders(), 1200);
          },
          fail: (error) => {
            if (error.errMsg && error.errMsg.includes("cancel")) {
              wx.showToast({ title: "已取消支付", icon: "none" });
            } else {
              wx.showToast({ title: "支付未完成", icon: "none" });
            }
          },
          complete: () => {
            this.setData({ paying: "" });
          }
        });
      })
      .catch((error) => {
        wx.showToast({ title: error.message || "支付失败", icon: "none" });
        this.setData({ paying: "" });
      });
  },

  cancelOrder(event) {
    const order = this.data.orders.find((item) => item.id === event.currentTarget.dataset.id);
    if (!order) return;
    this.setData({
      showCancelConfirm: true,
      cancelTargetOrder: order
    });
  },

  closeCancelConfirm() {
    this.setData({
      showCancelConfirm: false,
      cancelTargetOrder: null
    });
  },

  async confirmCancelOrder() {
    const order = this.data.cancelTargetOrder;
    if (!order) return;

    this.setData({ canceling: order.id });
    try {
      await request({
        url: "/api/miniprogram/orders",
        method: "POST",
        data: {
          action: "cancel",
          orderId: order.orderId,
          type: order.type
        }
      });
      wx.showToast({ title: "已取消" });
      this.closeCancelConfirm();
      await this.loadOrders();
    } catch (error) {
      wx.showToast({ title: error.message || "取消失败", icon: "none" });
    } finally {
      this.setData({ canceling: "" });
    }
  },

  requestAfterSale() {
    wx.showToast({ title: "售后功能正在完善", icon: "none" });
  },

  reviewOrder(event) {
    const order = this.data.orders.find((item) => item.id === event.currentTarget.dataset.id);
    if (!order) return;
    const params = [
      `title=${encodeURIComponent(order.title || "字书课程")}`,
      `subtitle=${encodeURIComponent(order.subtitle || order.title || "")}`,
      `cover=${encodeURIComponent(order.coverImage || "")}`,
      `orderId=${encodeURIComponent(order.orderId || "")}`
    ].join("&");
    wx.navigateTo({ url: `/pages/review/index?${params}` });
  },

  noop() {},

  goHome() {
    wx.redirectTo({ url: "/pages/courses/index" });
  }
});
