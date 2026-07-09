Page({
  data: {
    orderId: "",
    title: "字书课程",
    subtitle: "",
    cover: "/assets/xet/q1-cover.jpg",
    stars: [1, 2, 3, 4, 5],
    score: 0,
    content: "",
    images: [],
    anonymous: false,
    submitting: false
  },

  onLoad(options) {
    this.setData({
      orderId: decodeURIComponent(options.orderId || ""),
      title: decodeURIComponent(options.title || "字书课程"),
      subtitle: decodeURIComponent(options.subtitle || ""),
      cover: decodeURIComponent(options.cover || "/assets/xet/q1-cover.jpg")
    });
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
      createdAt: Date.now()
    };
    wx.setStorageSync("zishooReviews", reviews);
    wx.showToast({ title: "评价成功" });
    setTimeout(() => {
      this.setData({ submitting: false });
      wx.navigateBack();
    }, 700);
  }
});
