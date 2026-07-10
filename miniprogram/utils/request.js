const app = getApp();

const TOKEN_KEY = "zishoo_token";
const OPENID_KEY = "zishoo_openid";
const PROFILE_KEY = "zishooUserProfile";
const AVATAR_KEY = "zishooAvatarUrl";
const NICKNAME_KEY = "zishooNickName";
const AGREEMENT_KEY = "zishooAgreementAccepted";

function request(options) {
  const token = wx.getStorageSync(TOKEN_KEY);

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBase}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        const message = res.data && res.data.error ? res.data.error : "请求失败";
        reject(new Error(message));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function isLoggedIn() {
  return Boolean(wx.getStorageSync(TOKEN_KEY));
}

function getStoredUserProfile() {
  return wx.getStorageSync(PROFILE_KEY) || {
    nickName: wx.getStorageSync(NICKNAME_KEY) || "",
    avatarUrl: wx.getStorageSync(AVATAR_KEY) || ""
  };
}

function saveUserProfile(profile = {}) {
  const stored = {
    nickName: profile.nickName || profile.nickname || "字书用户",
    avatarUrl: profile.avatarUrl || profile.avatar || ""
  };
  wx.setStorageSync(PROFILE_KEY, stored);
  wx.setStorageSync(NICKNAME_KEY, stored.nickName);
  if (stored.avatarUrl) wx.setStorageSync(AVATAR_KEY, stored.avatarUrl);
  return stored;
}

function clearLogin() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(OPENID_KEY);
  wx.removeStorageSync(PROFILE_KEY);
  wx.removeStorageSync(AVATAR_KEY);
  wx.removeStorageSync(NICKNAME_KEY);
  app.globalData.token = "";
}

function acceptAgreement() {
  wx.setStorageSync(AGREEMENT_KEY, true);
}

function requestPrivacyConsent() {
  if (wx.getStorageSync(AGREEMENT_KEY)) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    wx.showModal({
      title: "为给您提供更好的服务",
      content:
        "深圳字书科技有限公司将通过《字书服务协议》《字书个人信息保护政策》和《商家隐私声明》帮助您了解我们收集、使用、存储和共享个人信息的情况。",
      confirmText: "同意并继续",
      cancelText: "取消",
      confirmColor: "#07c160",
      success(res) {
        if (res.confirm) {
          acceptAgreement();
          resolve(true);
          return;
        }
        reject(new Error("已取消登录"));
      },
      fail: reject
    });
  });
}

function requestUserProfile() {
  const stored = getStoredUserProfile();
  if (stored.nickName && stored.avatarUrl) return Promise.resolve(stored);

  return new Promise((resolve, reject) => {
    if (!wx.getUserProfile) {
      resolve(saveUserProfile(stored));
      return;
    }

    wx.getUserProfile({
      desc: "用于完善字书会员昵称和头像",
      success(res) {
        resolve(saveUserProfile(res.userInfo || {}));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const data = await request({
            url: "/api/miniprogram/login",
            method: "POST",
            data: { code }
          });
          wx.setStorageSync(TOKEN_KEY, data.token);
          wx.setStorageSync(OPENID_KEY, data.openid);
          app.globalData.token = data.token;
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      fail: reject
    });
  });
}

async function ensureLogin(options = {}) {
  const token = wx.getStorageSync(TOKEN_KEY);
  if (token) return token;

  if (!options.skipConsent) {
    await requestPrivacyConsent();
  }

  if (options.withProfile !== false) {
    await requestUserProfile();
  }

  const data = await login();
  return data.token;
}

module.exports = {
  request,
  login,
  ensureLogin,
  isLoggedIn,
  clearLogin,
  getStoredUserProfile,
  saveUserProfile,
  acceptAgreement,
  requestPrivacyConsent,
  requestUserProfile
};
