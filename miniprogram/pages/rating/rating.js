const { call } = require('../../utils/cloud');
Page({
  data: { orderId: '', rows: [] },
  async onLoad(q) {
    this.setData({ orderId: q.orderId });
    const r = await call('listOrders', { mine: true });
    const order = ((r && r.data) || []).find((o) => o._id === q.orderId);
    if (!order) return wx.showToast({ title: '订单不存在', icon: 'none' });
    this.setData({ rows: order.items.map((it) => ({ dishId: it.dishId, name: it.name, score: 0, comment: '' })) });
  },
  setScore(e) {
    const { idx, score } = e.currentTarget.dataset;
    const rows = this.data.rows;
    rows[idx].score = Number(score);
    this.setData({ rows });
  },
  onComment(e) {
    const idx = e.currentTarget.dataset.idx;
    const rows = this.data.rows;
    rows[idx].comment = e.detail.value;
    this.setData({ rows });
  },
  async submit() {
    if (this.data.rows.some((x) => !x.score)) {
      return wx.showToast({ title: '请给每道菜打分', icon: 'none' });
    }
    wx.showLoading({ title: '提交中' });
    const r = await call('submitRating', {
      orderId: this.data.orderId,
      ratings: this.data.rows.map((x) => ({ dishId: x.dishId, score: x.score, comment: x.comment })),
    });
    wx.hideLoading();
    if (!r.ok) return wx.showToast({ title: r.msg || '提交失败', icon: 'none' });
    wx.showToast({ title: '感谢评分！' });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
