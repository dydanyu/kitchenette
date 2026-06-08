const app = getApp();
const { setQty, toOrderItems, totalCount } = require('../../utils/cart');
const { call } = require('../../utils/cloud');

Page({
  data: { items: [], remark: '', mealTime: '', total: 0, userName: '' },
  onLoad() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    this.setData({
      userName: app.globalData.userName || '',
      mealTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    });
  },
  onShow() { this.refresh(); },
  refresh() {
    const cart = app.globalData.cart;
    this.setData({ items: Object.values(cart), total: totalCount(cart) });
  },
  onName(e) { this.setData({ userName: e.detail.value }); },
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
    const name = this.data.userName.trim();
    if (!name) return wx.showToast({ title: '填个名字吧', icon: 'none' });
    app.globalData.userName = name;
    wx.setStorageSync('userName', name);
    wx.showLoading({ title: '提交中' });
    const r = await call('placeOrder', {
      items: toOrderItems(app.globalData.cart),
      remark: this.data.remark,
      mealTime: this.data.mealTime,
      userName: name,
    });
    wx.hideLoading();
    if (!r.ok) return wx.showToast({ title: r.msg || '下单失败', icon: 'none' });
    app.globalData.cart = {};
    wx.showToast({ title: '已通知厨师！' });
    setTimeout(() => wx.switchTab({ url: '/pages/orders/orders' }), 800);
  },
});
