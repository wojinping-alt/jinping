const { request, ensureLogin } = require("../../utils/request");

const app = getApp();

const assetBase = `${app.globalData.apiBase}/miniprogram-assets`;

function getCoverImage(title) {
  if (title.includes("Q2") || title.includes("第2季")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1季")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function getCourseKind(title) {
  if (title.includes("Q2") || title.includes("第2季")) return "q2";
  if (title.includes("Q1") || title.includes("第1季")) return "q1";
  return "other";
}

function getDisplayTitle(title) {
  if (title.includes("Q2") || title.includes("第2季")) {
    return "《一字千金——文字构形&书法造型》视频课第2季";
  }
  if (title.includes("Q1") || title.includes("第1季")) {
    return "《一字千金——文字构形&书法造型》视频课第1季";
  }
  return title;
}

function getDetailImages(kind) {
  const q1 = [
    `${assetBase}/course-q1/Q11.jpg`,
    `${assetBase}/course-q1/Q12.jpg`,
    `${assetBase}/course-q1/Q13.jpg`,
    `${assetBase}/course-q1/Q14.jpg`,
    `${assetBase}/course-q1/Q15.png`,
    `${assetBase}/course-q1/Q16.jpg`,
    `${assetBase}/course-q1/Q17.jpg`,
    `${assetBase}/course-q1/Q18.jpg`,
    `${assetBase}/course-q1/Q19.jpg`,
    `${assetBase}/course-q1/tool-0.jpg`,
    `${assetBase}/course-q1/tool-1.jpg`,
    `${assetBase}/course-q1/tool-2.jpg`,
    `${assetBase}/course-q1/tool-3.jpg`
  ];

  if (kind === "q2") {
    return [
      `${assetBase}/course-q2/Q21.jpg`,
      `${assetBase}/course-q1/Q12.jpg`,
      `${assetBase}/course-q1/Q13.jpg`,
      `${assetBase}/course-q1/Q14.jpg`,
      `${assetBase}/course-q2/Q25.jpg`,
      `${assetBase}/course-q1/Q16.jpg`,
      `${assetBase}/course-q1/Q17.jpg`,
      `${assetBase}/course-q1/Q18.jpg`,
      `${assetBase}/course-q1/Q19.jpg`,
      `${assetBase}/course-q1/tool-0.jpg`,
      `${assetBase}/course-q1/tool-1.jpg`,
      `${assetBase}/course-q1/tool-2.jpg`,
      `${assetBase}/course-q1/tool-3.jpg`
    ];
  }

  if (kind === "q1") return q1;
  return [];
}

function getHeroCover(kind, title) {
  if (kind === "q2") return `${assetBase}/course-q2/cover.webp`;
  if (kind === "q1") return `${assetBase}/course-q1/cover.webp`;
  return getCoverImage(title);
}

function getEpisodeDate(kind, episodeNumber) {
  if (kind === "q1") return episodeNumber === 1 ? "2024.03.07" : "2025.02.26";
  if (kind === "q2") return episodeNumber === 1 ? "2024.03.07" : "2025.02.26";
  return "2025.02.26";
}

Page({
  data: {
    courseId: "",
    referrer: "",
    giftCode: "",
    loading: true,
    paying: false,
    giftPaying: false,
    error: "",
    course: null,
    episodes: [],
    unlocked: false,
    loggedIn: false,
    activeTab: "catalog",
    detailImages: [],
    courseKind: "other",
    showPoster: false,
    showGiftOrder: false,
    showGiftShare: false,
    posterQrUrl: "",
    posterImagePath: "",
    posterGenerating: false,
    sharePath: "",
    giftSharePath: "",
    giftMessage: ""
  },

  onLoad(options) {
    this.setData({
      courseId: options.id,
      referrer: options.ref || "",
      giftCode: options.gift || ""
    });
    if (options.gift) {
      this.claimGift(options.gift);
    }
  },

  onShow() {
    if (this.data.courseId && !this.data.course) {
      this.loadLesson();
    }
  },

  async loadLesson() {
    this.setData({ loading: true, error: "" });
    try {
      const data = await request({
        url: `/api/miniprogram/lesson?courseId=${this.data.courseId}`
      });
      const course = data.course || {};
      const courseKind = getCourseKind(course.title || "");
      const episodeCount = (data.episodes || []).length;
      const displayTitle = getDisplayTitle(course.title || "");
      wx.setNavigationBarTitle({ title: displayTitle.slice(0, 18) });
      this.setData({
        course: {
          ...course,
          displayTitle,
          coverAsset: getHeroCover(courseKind, course.title || ""),
          priceText: Number(course.price || 0).toFixed(2),
          coverImage: getCoverImage(course.title || ""),
          subscriberCount: Number(course.subscriberCount || 0)
        },
        episodes: (data.episodes || []).map((episode) => ({
          ...episode,
          displayDate: getEpisodeDate(courseKind, Number(episode.episode_number || 0))
        })),
        detailImages: getDetailImages(courseKind),
        courseKind,
        unlocked: Boolean(data.unlocked),
        loggedIn: Boolean(data.loggedIn),
        loading: false
      });
    } catch (error) {
      this.setData({
        error: error.message || "课程详情加载失败",
        loading: false
      });
    }
  },

  async buyCourse() {
    this.setData({ paying: true });
    try {
      await ensureLogin();
      const data = await request({
        url: "/api/miniprogram/pay",
        method: "POST",
        data: { courseId: this.data.courseId }
      });

      if (data.paid) {
        await this.loadLesson();
        this.setData({ paying: false });
        return;
      }

      const payParams = data.payParams;
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: async () => {
          wx.showToast({ title: "购买成功" });
          setTimeout(() => this.loadLesson(), 1200);
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
        }
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "购买失败",
        icon: "none"
      });
      this.setData({ paying: false });
    }
  },

  async claimGift(giftCode) {
    try {
      await ensureLogin();
      const data = await request({
        url: "/api/miniprogram/gift/claim",
        method: "POST",
        data: { giftCode }
      });
      if (data.claimed) {
        wx.showToast({ title: "礼物领取成功" });
        setTimeout(() => this.loadLesson(), 800);
      }
    } catch (error) {
      wx.showToast({ title: error.message || "礼物领取失败", icon: "none" });
    }
  },

  getShareRef() {
    return wx.getStorageSync("zishoo_openid") || "guest";
  },

  buildSharePath(extra = "") {
    const ref = encodeURIComponent(this.getShareRef());
    const suffix = extra ? `&${extra}` : "";
    return `/pages/lesson/index?id=${this.data.courseId}&ref=${ref}${suffix}`;
  },

  async openPoster() {
    try {
      await ensureLogin();
      const sharePath = this.buildSharePath();
      this.setData({
        showPoster: true,
        sharePath,
        posterQrUrl: `${app.globalData.apiBase}/api/miniprogram/share-qr?path=${encodeURIComponent(sharePath)}`,
        posterImagePath: "",
        posterGenerating: true
      });
      setTimeout(() => {
        this.generatePosterImage();
      }, 80);
    } catch (error) {
      wx.showToast({ title: error.message || "请先登录后分享", icon: "none" });
    }
  },

  downloadPosterAsset(url) {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error("图片地址为空"));
        return;
      }
      if (url.startsWith("/")) {
        resolve(url);
        return;
      }
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error(`图片下载失败 ${res.statusCode}`));
          }
        },
        fail: reject
      });
    });
  },

  drawPosterText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = String(text || "").split("");
    let line = "";
    let lineCount = 0;
    for (let index = 0; index < chars.length; index += 1) {
      const testLine = line + chars[index];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lineCount += 1;
        if (lineCount >= maxLines) {
          ctx.fillText(`${line.slice(0, Math.max(0, line.length - 1))}...`, x, y);
          return;
        }
        ctx.fillText(line, x, y);
        line = chars[index];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line && lineCount < maxLines) {
      ctx.fillText(line, x, y);
    }
  },

  async generatePosterImage() {
    try {
      const course = this.data.course || {};
      const coverPath = await this.downloadPosterAsset(course.coverImage || course.coverAsset);
      const qrPath = await this.downloadPosterAsset(this.data.posterQrUrl);
      const ctx = wx.createCanvasContext("sharePosterCanvas", this);

      ctx.setFillStyle("#62c5ff");
      ctx.fillRect(0, 0, 600, 900);
      ctx.setFillStyle("#e6f7ff");
      ctx.fillRect(0, 650, 600, 250);

      ctx.setFillStyle("#ffffff");
      ctx.fillRect(54, 50, 492, 800);
      ctx.setStrokeStyle("#1f2937");
      ctx.setLineWidth(4);
      ctx.strokeRect(54, 50, 492, 800);

      ctx.setFillStyle("#fff28a");
      ctx.fillRect(58, 54, 484, 135);
      ctx.setFillStyle("#ffffff");
      ctx.beginPath();
      ctx.arc(118, 120, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.setFillStyle("#d6a400");
      ctx.setFontSize(36);
      ctx.setTextAlign("center");
      ctx.fillText("字", 118, 132);

      ctx.setTextAlign("left");
      ctx.setFillStyle("#111111");
      ctx.setFontSize(28);
      ctx.fillText("字书用户", 170, 112);
      ctx.setFillStyle("#333333");
      ctx.setFontSize(23);
      ctx.fillText("邀请你一起学习", 170, 148);

      ctx.setFillStyle("#bfeeff");
      ctx.fillRect(76, 210, 448, 162);
      ctx.drawImage(coverPath, 76, 210, 448, 162);

      ctx.setFillStyle("#ffd3de");
      ctx.fillRect(88, 405, 424, 74);
      ctx.setFillStyle("#111111");
      ctx.setFontSize(24);
      this.drawPosterText(ctx, course.displayTitle || course.title || "字书课程", 110, 450, 380, 30, 1);

      ctx.setFillStyle("#111111");
      ctx.setFontSize(28);
      ctx.setTextAlign("center");
      ctx.fillText("字书", 300, 538);
      ctx.setFillStyle("#ffffff");
      ctx.fillRect(206, 560, 188, 188);
      ctx.drawImage(qrPath, 216, 570, 168, 168);

      ctx.setFillStyle("#333333");
      ctx.setFontSize(20);
      ctx.fillText("长按扫码查看详情", 300, 778);
      ctx.setFillStyle("#b5c8d8");
      ctx.setFontSize(18);
      ctx.fillText("字书 Zishoo", 300, 824);

      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: "sharePosterCanvas",
          width: 600,
          height: 900,
          destWidth: 1200,
          destHeight: 1800,
          success: (res) => {
            this.setData({
              posterImagePath: res.tempFilePath,
              posterGenerating: false
            });
          },
          fail: (error) => {
            this.setData({ posterGenerating: false });
            wx.showToast({ title: error.errMsg || "海报生成失败", icon: "none" });
          }
        }, this);
      });
    } catch (error) {
      this.setData({ posterGenerating: false });
      wx.showToast({ title: error.message || "海报生成失败", icon: "none" });
    }
  },

  closePoster() {
    this.setData({ showPoster: false });
  },

  previewPosterImage() {
    if (!this.data.posterImagePath) return;
    wx.previewImage({
      current: this.data.posterImagePath,
      urls: [this.data.posterImagePath]
    });
  },

  savePosterImage() {
    if (!this.data.posterImagePath) {
      wx.showToast({ title: "海报还在生成", icon: "none" });
      return;
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterImagePath,
      success: () => wx.showToast({ title: "已保存" }),
      fail: () => wx.showToast({ title: "保存失败，请长按图片保存", icon: "none" })
    });
  },

  copyShareLink() {
    const link = `${app.globalData.apiBase}/lesson/${this.data.courseId}?ref=${encodeURIComponent(this.getShareRef())}`;
    wx.setClipboardData({ data: link });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/courses/index" });
  },

  selectTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  },

  sendFriend() {
    this.openPoster();
  },

  openGiftOrder() {
    this.setData({ showGiftOrder: true, giftMessage: "" });
  },

  closeGiftOrder() {
    this.setData({ showGiftOrder: false });
  },

  onGiftMessageInput(event) {
    this.setData({ giftMessage: event.detail.value });
  },

  async submitGiftOrder() {
    this.setData({ giftPaying: true });
    try {
      await ensureLogin();
      const data = await request({
        url: "/api/miniprogram/pay",
        method: "POST",
        data: { courseId: this.data.courseId, gift: true }
      });

      const payParams = data.payParams;
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: () => {
          const giftSharePath = this.buildSharePath(`gift=${encodeURIComponent(data.outTradeNo)}`);
          this.setData({
            showGiftOrder: false,
            showGiftShare: true,
            giftSharePath,
            giftCode: data.outTradeNo
          });
          wx.showToast({ title: "支付成功，转发给好友领取" });
        },
        fail: (error) => {
          if (error.errMsg && error.errMsg.includes("cancel")) {
            wx.showToast({ title: "已取消支付", icon: "none" });
          } else {
            wx.showToast({ title: "支付未完成", icon: "none" });
          }
        },
        complete: () => {
          this.setData({ giftPaying: false });
        }
      });
    } catch (error) {
      wx.showToast({ title: error.message || "赠送下单失败", icon: "none" });
      this.setData({ giftPaying: false });
    }
  },

  closeGiftShare() {
    this.setData({ showGiftShare: false });
  },

  stopBubble() {},

  onShareAppMessage(event) {
    const shareType = event && event.target && event.target.dataset.shareType;
    if (shareType === "gift" && this.data.giftSharePath) {
      return {
        title: `送你一门课：${this.data.course.displayTitle}`,
        path: this.data.giftSharePath,
        imageUrl: this.data.course.coverAsset
      };
    }

    return {
      title: this.data.course ? this.data.course.displayTitle : "字书课程",
      path: this.data.sharePath || this.buildSharePath(),
      imageUrl: this.data.course ? this.data.course.coverAsset : ""
    };
  },

  startLearning() {
    const first = this.data.episodes[0];
    if (!first) return;
    wx.navigateTo({
      url: `/pages/player/index?courseId=${this.data.courseId}&episodeId=${first.id}&title=${encodeURIComponent(first.title)}`
    });
  },

  async openEpisode(event) {
    if (!this.data.unlocked) {
      wx.showToast({ title: "请先购买课程", icon: "none" });
      return;
    }

    const episodeId = event.currentTarget.dataset.id;
    const title = event.currentTarget.dataset.title;
    wx.navigateTo({
      url: `/pages/player/index?courseId=${this.data.courseId}&episodeId=${episodeId}&title=${encodeURIComponent(title)}`
    });
  }
});
