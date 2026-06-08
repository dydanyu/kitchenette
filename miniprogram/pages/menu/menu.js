const app = getApp();
const { addItem, setQty, totalCount } = require("../../utils/cart");
const { formatRating } = require("../../utils/format");
const { call, resolveImages } = require("../../utils/cloud");

Page({
  data: { categories: [], dishes: [], activeCat: "all", keyword: "", cartCount: 0, cartMap: {} },

  onLoad() {
    this.loadData();
    this.refreshContext();
  },
  onShow() {
    this.syncCart();
    this.syncTabBar();
    this.loadPending();
  },

  syncCart() {
    const cart = app.globalData.cart;
    const cartMap = {};
    Object.values(cart).forEach((it) => { cartMap[it.dishId] = it.qty; });
    this.setData({ cartCount: totalCount(cart), cartMap });
  },
  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  syncTabBar() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
      this.getTabBar().refresh();
    }
  },

  async refreshContext() {
    const r = await call("getMyContext");
    if (r.ok) {
      app.globalData.isAdmin = r.isAdmin;
      app.globalData.openid = r.openid;
      this.syncTabBar();
      this.loadPending();
    }
  },

  async loadPending() {
    if (!app.globalData.isAdmin) return;
    const r = await call("listOrders");
    app.globalData.pendingCount = ((r && r.data) || []).filter(
      (o) => o.status === "pending",
    ).length;
    this.syncTabBar();
  },

  async loadData() {
    const db = wx.cloud.database();
    const cats = await db.collection("categories").orderBy("sort", "asc").get();
    const tagsRes = await db.collection("chefTags").get();
    const tagMap = {};
    tagsRes.data.forEach((t) => {
      tagMap[t._id] = `${t.emoji || ""} ${t.name}`.trim();
    });
    const dishesRes = await db
      .collection("dishes")
      .where({ status: "on" })
      .get();
    const dishes = dishesRes.data.map((d) => ({
      ...d,
      ratingText: formatRating(d.avgRating, d.ratingCount),
      chefTagNames: (d.chefTagIds || [])
        .map((id) => tagMap[id])
        .filter(Boolean),
    }));
    await resolveImages(dishes);
    this.allDishes = dishes;
    this.setData({
      categories: [{ _id: "all", name: "我全都要", emoji: "🍽️" }, ...cats.data],
    });
    this.applyFilter();
  },

  applyFilter() {
    const kw = this.data.keyword.trim().toLowerCase();
    const cat = this.data.activeCat;
    const dishes = (this.allDishes || []).filter((d) => {
      if (cat !== "all" && d.categoryId !== cat) return false;
      if (!kw) return true;
      const hay = [d.name, d.desc, ...(d.chefTagNames || [])]
        .join(" ").toLowerCase();
      return hay.indexOf(kw) >= 0;
    });
    this.setData({ dishes });
  },

  pickCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.id });
    this.applyFilter();
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  clearSearch() {
    this.setData({ keyword: "" });
    this.applyFilter();
  },

  addToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    app.globalData.cart = addItem(app.globalData.cart, dish);
    this.syncCart();
  },

  incQty(e) {
    const dish = e.currentTarget.dataset.dish;
    app.globalData.cart = addItem(app.globalData.cart, dish);
    this.syncCart();
  },

  decQty(e) {
    const id = e.currentTarget.dataset.id;
    const cur = app.globalData.cart[id];
    if (!cur) return;
    app.globalData.cart = setQty(app.globalData.cart, id, cur.qty - 1);
    this.syncCart();
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}`,
    });
  },
  goConfirm() {
    if (this.data.cartCount === 0)
      return wx.showToast({ title: "先选点菜吧", icon: "none" });
    wx.navigateTo({ url: "/pages/confirm/confirm" });
  },

  onShareAppMessage() {
    return { title: "快来家里点菜！鱼鳞の厨房 🍳", path: "/pages/menu/menu" };
  },
});
