const app = getApp();
const { addItem, totalCount } = require('../../utils/cart');
const { formatRating } = require('../../utils/format');
const { call } = require('../../utils/cloud');

Page({
  data: { categories: [], dishes: [], activeCat: 'all', cartCount: 0, isAdmin: false, pendingCount: 0 },

  onLoad() { this.loadData(); this.refreshContext(); },
  onShow() {
    this.setData({ cartCount: totalCount(app.globalData.cart) });
    this.loadPending();
  },
  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()); },

  async refreshContext() {
    const r = await call('getMyContext');
    if (r.ok) {
      app.globalData.isAdmin = r.isAdmin;
      app.globalData.openid = r.openid;
      this.setData({ isAdmin: r.isAdmin });
      this.loadPending();
    }
  },

  async loadPending() {
    if (!app.globalData.isAdmin) return;
    const r = await call('listOrders');
    const pending = ((r && r.data) || []).filter((o) => o.status === 'pending').length;
    this.setData({ pendingCount: pending });
  },

  async loadData() {
    const db = wx.cloud.database();
    const cats = await db.collection('categories').orderBy('sort', 'asc').get();
    const tagsRes = await db.collection('chefTags').get();
    const tagMap = {};
    tagsRes.data.forEach((t) => { tagMap[t._id] = `${t.emoji || ''} ${t.name}`.trim(); });
    const dishesRes = await db.collection('dishes').where({ status: 'on' }).get();
    const dishes = dishesRes.data.map((d) => ({
      ...d,
      ratingText: formatRating(d.avgRating, d.ratingCount),
      chefTagNames: (d.chefTagIds || []).map((id) => tagMap[id]).filter(Boolean),
    }));
    this.setData({
      categories: [{ _id: 'all', name: '我全都要', emoji: '🍽️' }, ...cats.data],
      dishes,
    });
  },

  pickCat(e) { this.setData({ activeCat: e.currentTarget.dataset.id }); },

  addToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    app.globalData.cart = addItem(app.globalData.cart, dish);
    this.setData({ cartCount: totalCount(app.globalData.cart) });
    wx.showToast({ title: '已加入', icon: 'none' });
  },

  goDetail(e) { wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` }); },
  goConfirm() {
    if (this.data.cartCount === 0) return wx.showToast({ title: '先选点菜吧', icon: 'none' });
    wx.navigateTo({ url: '/pages/confirm/confirm' });
  },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }); },

  onShareAppMessage() {
    return { title: '快来家里点菜！干饭叫一声 🍳', path: '/pages/menu/menu' };
  },
});
