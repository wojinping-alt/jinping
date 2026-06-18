const app = getApp();

function request(options) {
  const token = wx.getStorageSync("zishoo_token");

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
          wx.setStorageSync("zishoo_token", data.token);
          wx.setStorageSync("zishoo_openid", data.openid);
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

async function ensureLogin() {
  const token = wx.getStorageSync("zishoo_token");
  if (token) return token;
  const data = await login();
  return data.token;
}

module.exports = {
  request,
  login,
  ensureLogin
};
