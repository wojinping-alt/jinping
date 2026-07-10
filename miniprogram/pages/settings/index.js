const { clearLogin, getStoredUserProfile } = require("../../utils/request");

Page({
  data: {
    userName: "字书用户",
    avatarUrl: ""
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "设置" });
    const profile = getStoredUserProfile();
    this.setData({
      userName: profile.nickName || "字书用户",
      avatarUrl: profile.avatarUrl || ""
    });
  },

  tapRow(event) {
    const type = event.currentTarget.dataset.type;
    if (type === "service" || type === "privacy" || type === "merchant") {
      wx.navigateTo({ url: `/pages/protocol/index?type=${type}` });
      return;
    }
    wx.showToast({ title: "该功能正在完善", icon: "none" });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出当前账号吗？",
      confirmText: "退出登录",
      confirmColor: "#f05b78",
      success: (res) => {
        if (!res.confirm) return;
        clearLogin();
        wx.showToast({ title: "已退出" });
        setTimeout(() => {
          wx.redirectTo({ url: "/pages/mine/index?login=1" });
        }, 500);
      }
    });
  }
});
