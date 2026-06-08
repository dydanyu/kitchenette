const app = getApp();

const BASE = [
  { pagePath: '/pages/menu/menu', text: '菜单', icon: '🍽️' },
  { pagePath: '/pages/orders/orders', text: '我的订单', icon: '📋' },
];

Component({
  data: { selected: 0, list: BASE, pending: 0 },
  methods: {
    refresh() {
      const list = app.globalData.isAdmin
        ? [...BASE, { pagePath: '/pages/admin/admin', text: '厨房管理', icon: '👑' }]
        : BASE;
      this.setData({ list, pending: app.globalData.pendingCount || 0 });
    },
    switchTab(e) {
      wx.switchTab({ url: e.currentTarget.dataset.path });
    },
  },
});
