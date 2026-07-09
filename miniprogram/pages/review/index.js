Page({
  data: {
    mode: "compose",
    orderId: "",
    title: "字书课程",
    subtitle: "",
    cover: "/assets/xet/q1-cover.jpg",
    amount: "",
    reviewTime: "",
    avatarUrl: "",
    userName: "字书用户",
    stars: [1, 2, 3, 4, 5],
    score: 0,
    content: "",
    images: [],
    anonymous: false,
    showMenu: false,
    submitting: false
  },

  onLoad(options) {
    const orderId = decodeURIComponent(options.orderId || "");
    const reviews = wx.getStorageSync("zishooReviews") || {};
    const review = reviews[orderId];
    const mode = options.mode === "detail" || review ? "detail" : "compose";
    this.setData({
      mode,
      orderId,
      title: decodeURIComponent(options.title || "字书课程"),
      subtitle: decodeURIComponent(options.subtitle || ""),
      cover: decodeURIComponent(options.cover || "/assets/xet/q1-cover.jpg"),
      amount: decodeURIComponent(options.amount || ""),
      avatarUrl: wx.getStorageSync("zishooAvatarUrl") || "",
      userName: review && review.anonymous ? "匿名用户" : "字书用户",
      score: review ? Number(review.score || 0) : 0,
      content: review ? review.content || "" : "",
      images: review ? review.images || [] : [],
      anonymous: review ? Boolean(review.anonymous) : false,
      reviewTime: review ? this.formatTime(review.createdAt) : ""
    });
    wx.setNavigationBarTitle({ title: mode === "detail" ? "评价详情" : "发表评价" });
  },

  formatTime(value) {
    const date = new Date(value || Date.now());
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },

  selectScore(event) {
    this.setData({ score: Number(event.currentTarget.dataset.score || 0) });
  },

  onContentInput(event) {
    this.setData({ content: event.detail.value || "" });
  },

  chooseImages() {
    const remain = 3 - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseMedia({
      count: remain,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const files = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean);
        this.setData({ images: this.data.images.concat(files).slice(0, 3) });
      }
    });
  },

  previewImage(event) {
    const current = this.data.images[Number(event.currentTarget.dataset.index || 0)];
    if (!current) return;
    wx.previewImage({ urls: this.data.images, current });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const images = this.data.images.slice();
    images.splice(index, 1);
    this.setData({ images });
  },

  toggleAnonymous() {
    this.setData({ anonymous: !this.data.anonymous });
  },

  toggleMenu() {
    this.setData({ showMenu: !this.data.showMenu });
  },

  editReview() {
    this.setData({ mode: "compose", showMenu: false });
    wx.setNavigationBarTitle({ title: "发表评价" });
  },

  deleteReview() {
    wx.showModal({
      title: "删除评价",
      content: "确定删除这条评价吗？",
      confirmText: "删除",
      confirmColor: "#ef4444",
      success: (res) => {
        if (!res.confirm) return;
        const reviews = wx.getStorageSync("zishooReviews") || {};
        delete reviews[this.data.orderId];
        wx.setStorageSync("zishooReviews", reviews);
        wx.showToast({ title: "已删除" });
        setTimeout(() => wx.navigateBack(), 500);
      }
    });
  },

  setAnonymousFromMenu() {
    const reviews = wx.getStorageSync("zishooReviews") || {};
    if (reviews[this.data.orderId]) {
      reviews[this.data.orderId].anonymous = true;
      wx.setStorageSync("zishooReviews", reviews);
    }
    this.setData({ anonymous: true, userName: "匿名用户", showMenu: false });
  },

  appendReview() {
    wx.showToast({ title: "追评功能正在完善", icon: "none" });
  },

  submitReview() {
    if (!this.data.score) {
      wx.showToast({ title: "请先评分", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    const reviews = wx.getStorageSync("zishooReviews") || {};
    reviews[this.data.orderId || `${Date.now()}`] = {
      score: this.data.score,
      content: this.data.content,
      images: this.data.images,
      anonymous: this.data.anonymous,
      title: this.data.title,
      subtitle: this.data.subtitle,
      cover: this.data.cover,
      amount: this.data.amount,
      createdAt: Date.now()
    };
    wx.setStorageSync("zishooReviews", reviews);
    wx.showToast({ title: "评价成功" });
    setTimeout(() => {
      this.setData({ submitting: false });
      wx.redirectTo({
        url: `/pages/review/index?mode=detail&orderId=${encodeURIComponent(
          this.data.orderId
        )}&title=${encodeURIComponent(this.data.title)}&subtitle=${encodeURIComponent(
          this.data.subtitle
        )}&cover=${encodeURIComponent(this.data.cover)}&amount=${encodeURIComponent(this.data.amount)}`
      });
    }, 700);
  }
});
