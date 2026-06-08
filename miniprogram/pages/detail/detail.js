const app = getApp();
const { addItem, totalCount } = require('../../utils/cart');
const { formatRating, starString } = require('../../utils/format');

Page({
  data: { dish: null, reviews: [] },
  onLoad(q) { this.dishId = q.id; this.load(); },
  async load() {
    const db = wx.cloud.database();
    const dish = (await db.collection('dishes').doc(this.dishId).get()).data;
    dish.ratingText = formatRating(dish.avgRating, dish.ratingCount);
    const tagsRes = await db.collection('chefTags').get();
    const tagMap = {};
    tagsRes.data.forEach((t) => { tagMap[t._id] = `${t.emoji || ''} ${t.name}`.trim(); });
    dish.chefTagNames = (dish.chefTagIds || []).map((id) => tagMap[id]).filter(Boolean);
    const reviews = (await db.collection('ratings').where({ dishId: this.dishId })
      .orderBy('createdAt', 'desc').limit(20).get()).data
      .map((r) => ({ ...r, starText: starString(r.score), who: '家人' }));
    this.setData({ dish, reviews });
  },
  add() {
    app.globalData.cart = addItem(app.globalData.cart, this.data.dish);
    wx.showToast({ title: `已加入(${totalCount(app.globalData.cart)})`, icon: 'none' });
  },
  onShareAppMessage() {
    return { title: `家里有「${this.data.dish.name}」，来点！`, path: `/pages/detail/detail?id=${this.dishId}` };
  },
});
