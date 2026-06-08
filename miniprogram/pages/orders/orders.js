const { call } = require('../../utils/cloud');
const STATUS_TEXT = { pending: '待出餐', served: '已出餐' };
Page({
  data: { orders: [] },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
      this.getTabBar().refresh();
    }
    this.load();
  },
  onPullDownRefresh() { this.load().then(() => wx.stopPullDownRefresh()); },
  async load() {
    const res = await call('listOrders', { mine: true });
    const orders = ((res && res.data) || []).map((o) => ({
      ...o,
      statusText: o.rated ? '已评价' : (STATUS_TEXT[o.status] || ''),
      canRate: o.status === 'served' && !o.rated,
    }));
    this.setData({ orders });
  },
  goRate(e) { wx.navigateTo({ url: `/pages/rating/rating?orderId=${e.currentTarget.dataset.id}` }); },
});
