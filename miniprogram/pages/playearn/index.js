const { request, ensureLogin } = require("../../utils/request");

Page({
  data: {
    showSku: false,
    paying: false,
    selectedType: "",
    quantity: 1,
    types: ["纹身", "手机", "服饰", "茶器", "酒标", "其他"],
    detailImages: [
      "/assets/xet/playearn-detail-1.jpg",
      "/assets/xet/playearn-detail-2.jpg",
      "/assets/xet/playearn-detail-3.jpg",
      "/assets/xet/playearn-detail-4.jpg",
      "/assets/xet/playearn-detail-5.jpg"
    ]
  },

  contactService() {
    wx.showToast({ title: "请联系客服确认定制需求", icon: "none" });
  },

  openSku() {
    this.setData({ showSku: true });
  },

  closeSku() {
    this.setData({ showSku: false });
  },

  stopBubble() {},

  selectType(event) {
    this.setData({ selectedType: event.currentTarget.dataset.type });
  },

  decreaseQuantity() {
    if (this.data.quantity <= 1) return;
    this.setData({ quantity: this.data.quantity - 1 });
  },

  increaseQuantity() {
    this.setData({ quantity: this.data.quantity + 1 });
  },

  async confirmSku() {
    if (!this.data.selectedType) {
      wx.showToast({ title: "请选择类型", icon: "none" });
      return;
    }

    this.setData({ paying: true });
    try {
      await ensureLogin();
      const data = await request({
        url: "/api/miniprogram/product-pay",
        method: "POST",
        data: {
          productType: this.data.selectedType,
          quantity: this.data.quantity,
        },
      });

      const payParams = data.payParams;
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: () => {
          this.setData({ showSku: false });
          wx.showToast({ title: "支付成功" });
        },
        fail: (error) => {
          if (error.errMsg && error.errMsg.includes("cancel")) {
            wx.showToast({ title: "已取消支付", icon: "none" });
          } else {
            wx.showToast({ title: "支付未完成", icon: "none" });
          }
        },
        complete: () => {
          this.setData({ paying: false });
        },
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "创建支付失败",
        icon: "none",
      });
      this.setData({ paying: false });
    }
  },

  buyProduct() {
    this.openSku();
  }
});
