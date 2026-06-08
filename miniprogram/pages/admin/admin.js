const app = getApp();
const { call } = require('../../utils/cloud');
Page({
  data: { tab: 'dishes', dishes: [], cats: [], tags: [] },
  onShow() {
    if (!app.globalData.isAdmin) { wx.showToast({ title: '无权限', icon: 'none' }); wx.switchTab({ url: '/pages/menu/menu' }); return; }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
      this.getTabBar().refresh();
    }
    this.load();
  },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  async load() {
    const db = wx.cloud.database();
    const dishes = (await db.collection('dishes').orderBy('updatedAt', 'desc').get()).data;
    const cats = (await db.collection('categories').orderBy('sort', 'asc').get()).data;
    const tags = (await db.collection('chefTags').get()).data;
    this.setData({ dishes, cats, tags });
  },
  addDish() { wx.navigateTo({ url: '/pages/dish-edit/dish-edit' }); },
  editDish(e) { wx.navigateTo({ url: `/pages/dish-edit/dish-edit?id=${e.currentTarget.dataset.id}` }); },
  goOrders() { wx.navigateTo({ url: '/pages/admin-orders/admin-orders' }); },
  async addTag() {
    const that = this;
    wx.showModal({ title: '新建厨师', editable: true, placeholderText: '如：老王私房', success: async (res) => {
      if (res.confirm && res.content) {
        await call('manageMeta', { collection: 'chefTags', action: 'add', data: { name: res.content, emoji: '👨‍🍳' } });
        that.load();
      }
    }});
  },
});
