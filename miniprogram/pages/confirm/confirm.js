const app = getApp();
const { setQty, toOrderItems, totalCount } = require('../../utils/cart');
const { call } = require('../../utils/cloud');

Page({
  data: { items: [], remark: '', mealTime: '今晚 19:00', total: 0 },
  onShow() { this.refresh(); },
  refresh() {
    const cart = app.globalData.cart;
    this.setData({ items: Object.values(cart), total: totalCount(cart) });
  },
  changeQty(e) {
    const { id, delta } = e.currentTarget.dataset;
    const cur = app.globalData.cart[id];
    if (!cur) return;
    app.globalData.cart = setQty(app.globalData.cart, id, cur.qty + Number(delta));
    this.refresh();
  },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  onMealTime(e) { this.setData({ mealTime: e.detail.value }); },
  async submit() {
    if (this.data.total === 0) return wx.showToast({ title: '清单空空', icon: 'none' });
    wx.showLoading({ title: '提交中' });
    const r = await call('placeOrder', {
      items: toOrderItems(app.globalData.cart),
      remark: this.data.remark,
      mealTime: this.data.mealTime,
      userName: (app.globalData.userInfo && app.globalData.userInfo.nickName) || '家人',
      userAvatar: (app.globalData.userInfo && app.globalData.userInfo.avatarUrl) || '',
    });
    wx.hideLoading();
    if (!r.ok) return wx.showToast({ title: r.msg || '下单失败', icon: 'none' });
    app.globalData.cart = {};
    wx.showToast({ title: '已通知厨师！' });
    setTimeout(() => wx.switchTab({ url: '/pages/orders/orders' }), 800);
  },
});
