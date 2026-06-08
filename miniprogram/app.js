App({
  globalData: {
    env: 'ENV_ID',
    cart: {},
    isAdmin: false,
    openid: '',
    userInfo: null,
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 以上基础库');
      return;
    }
    wx.cloud.init({ env: this.globalData.env, traceUser: true });
  },
});
