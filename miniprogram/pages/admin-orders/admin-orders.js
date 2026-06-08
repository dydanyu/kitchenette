const { call } = require('../../utils/cloud');
Page({
  data: { orders: [] },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().then(() => wx.stopPullDownRefresh()); },
  async load() {
    const r = await call('listOrders');
    if (!r.ok) { wx.showToast({ title: r.msg || '加载失败', icon: 'none' }); return; }
    const orders = (r.data || []).map((o) => ({ ...o, isNew: o.status === 'pending' }));
    this.setData({ orders });
  },
  async markServed(e) {
    const id = e.currentTarget.dataset.id;
    const r = await call('updateOrderStatus', { orderId: id, status: 'served' });
    if (!r.ok) return wx.showToast({ title: r.msg || '失败', icon: 'none' });
    this.load();
  },
});
