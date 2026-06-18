App({
  globalData: {
    apiBase: "https://www.zishoo.cn"
  },

  onLaunch() {
    const token = wx.getStorageSync("zishoo_token");
    this.globalData.token = token || "";
  }
});
