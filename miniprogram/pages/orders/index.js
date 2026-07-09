const { request, ensureLogin } = require("../../utils/request");

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待付款" },
  { key: "shipping", label: "待发货" },
  { key: "receiving", label: "待收货" },
  { key: "review", label: "待评价" },
  { key: "refund", label: "退款/售后" }
];

function getReviewedOrders() {
  return wx.getStorageSync("zishooReviews") || {};
}

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
    reviewSubTab: "pending",
    reviewCounts: {
      pending: 0,
      evaluated: 0
    },
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
    const reviewedOrders = getReviewedOrders();
    const filteredOrders = this.data.orders.filter((order) => {
      let statusMatched =
        activeTab === "all" || order.status === activeTab;
      if (activeTab === "shipping") {
        statusMatched = order.type === "product" && order.status === "paid";
      }
      if (activeTab === "receiving") {
        statusMatched = false;
      }
      if (activeTab === "review") {
        const hasReview = Boolean(reviewedOrders[order.orderId]);
        statusMatched =
          order.status === "paid" &&
          (this.data.reviewSubTab === "evaluated" ? hasReview : !hasReview);
      }
      const keywordMatched =
        !keyword ||
        String(order.title || "").toLowerCase().includes(keyword) ||
        String(order.outTradeNo || "").toLowerCase().includes(keyword);
      return statusMatched && keywordMatched;
    }).map((order) => {
      const review = reviewedOrders[order.orderId] || null;
      return {
        ...order,
        review,
        reviewContent: review ? review.content : "",
        reviewScore: review ? Number(review.score || 0) : 0,
        reviewStars: [1, 2, 3, 4, 5],
        reviewTimeText: review ? this.formatReviewTime(review.createdAt) : "",
        reviewUserName: review && review.anonymous ? "匿名用户" : "字书用户",
        reviewAvatar: review && !review.anonymous ? wx.getStorageSync("zishooAvatarUrl") || "" : ""
      };
    });
    this.setData({ filteredOrders });
  },

  formatReviewTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const pad = (num) => String(num).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-") + " " + [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join(":");
  },

  updateTabs() {
    const reviewedOrders = getReviewedOrders();
    const pendingCount = this.data.orders.filter((order) => order.status === "pending").length;
    const reviewPendingCount = this.data.orders.filter(
      (order) => order.status === "paid" && !reviewedOrders[order.orderId]
    ).length;
    const evaluatedCount = this.data.orders.filter(
      (order) => order.status === "paid" && reviewedOrders[order.orderId]
    ).length;
    this.setData({
      reviewCounts: {
        pending: reviewPendingCount,
        evaluated: evaluatedCount
      },
      tabs: tabs.map((tab) => {
        if (tab.key === "pending") return { ...tab, badge: pendingCount || 0 };
        if (tab.key === "review") return { ...tab, badge: reviewPendingCount || 0 };
        return { ...tab, badge: 0 };
      })
    });
  },

  selectTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.key });
    this.applyFilters();
  },

  selectReviewSubTab(event) {
    this.setData({ reviewSubTab: event.currentTarget.dataset.key });
    this.applyFilters();
  },

  onSearchInput(event) {
    this.setData({ keyword: event.detail.value || "" });
    this.applyFilters();
  },

  goDetail(event) {
    if (this.data.activeTab === "review") return;
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
    const reviewedOrders = getReviewedOrders();
    const mode = reviewedOrders[order.orderId] ? "detail" : "compose";
    const params = [
      `mode=${mode}`,
      `title=${encodeURIComponent(order.title || "字书课程")}`,
      `subtitle=${encodeURIComponent(order.subtitle || order.title || "")}`,
      `cover=${encodeURIComponent(order.coverImage || "")}`,
      `amount=${encodeURIComponent(order.amountText || "")}`,
      `orderId=${encodeURIComponent(order.orderId || "")}`
    ].join("&");
    wx.navigateTo({ url: `/pages/review/index?${params}` });
  },

  noop() {},

  goHome() {
    wx.redirectTo({ url: "/pages/courses/index" });
  }
});
