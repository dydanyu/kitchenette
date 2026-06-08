const { call } = require('../../utils/cloud');

// 菜品图压缩：长边 1280、质量 70%，失败则用原图
function compress(src) {
  return new Promise((resolve) => {
    wx.compressImage({
      src, quality: 70, compressedWidth: 1280,
      success: (r) => resolve(r.tempFilePath),
      fail: () => resolve(src),
    });
  });
}

Page({
  data: {
    dishId: '', image: '', name: '', desc: '',
    categoryId: '', categories: [], catIndex: 0,
    tags: [], selectedTagIds: [], status: 'on',
  },
  async onLoad(q) {
    const db = wx.cloud.database();
    const categories = (await db.collection('categories').orderBy('sort', 'asc').get()).data;
    const tags = (await db.collection('chefTags').get()).data;
    let selectedTagIds = [];
    let patch = {};
    if (q.id) {
      const d = (await db.collection('dishes').doc(q.id).get()).data;
      const catIndex = Math.max(0, categories.findIndex((c) => c._id === d.categoryId));
      selectedTagIds = d.chefTagIds || [];
      patch = { dishId: q.id, image: d.image, name: d.name, desc: d.desc,
        categoryId: d.categoryId, catIndex, status: d.status };
    } else if (categories.length) {
      patch.categoryId = categories[0]._id;
    }
    tags.forEach((t) => { t.selected = selectedTagIds.indexOf(t._id) >= 0; });
    this.setData({ categories, tags, selectedTagIds, ...patch });
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  onDesc(e) { this.setData({ desc: e.detail.value }); },
  pickCat(e) {
    const i = Number(e.detail.value);
    this.setData({ catIndex: i, categoryId: this.data.categories[i]._id });
  },
  toggleTag(e) {
    const id = e.currentTarget.dataset.id;
    const sel = this.data.selectedTagIds.slice();
    const at = sel.indexOf(id);
    at >= 0 ? sel.splice(at, 1) : sel.push(id);
    const tags = this.data.tags.map((t) =>
      t._id === id ? { ...t, selected: at < 0 } : t);
    this.setData({ selectedTagIds: sel, tags });
  },
  toggleStatus() { this.setData({ status: this.data.status === 'on' ? 'off' : 'on' }); },
  async chooseImage() {
    const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['compressed'] });
    let filePath = res.tempFiles[0].tempFilePath;
    filePath = await compress(filePath);
    wx.showLoading({ title: '上传中' });
    const up = await wx.cloud.uploadFile({ cloudPath: `dishes/${Date.now()}.jpg`, filePath });
    wx.hideLoading();
    this.setData({ image: up.fileID });
  },
  async save() {
    if (!this.data.name.trim()) return wx.showToast({ title: '请填菜名', icon: 'none' });
    wx.showLoading({ title: '保存中' });
    const r = await call('saveDish', {
      dishId: this.data.dishId || undefined,
      dish: {
        name: this.data.name, desc: this.data.desc, image: this.data.image,
        categoryId: this.data.categoryId, chefTagIds: this.data.selectedTagIds, status: this.data.status,
      },
    });
    wx.hideLoading();
    if (!r.ok) return wx.showToast({ title: r.msg || '保存失败', icon: 'none' });
    wx.showToast({ title: '已保存' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
