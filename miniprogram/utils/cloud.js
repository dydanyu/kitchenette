function call(name, data = {}) {
  return wx.cloud.callFunction({ name, data })
    .then((res) => res.result)
    .catch((err) => { console.error(name, err); return { ok: false, msg: '网络错误' }; });
}

// 把菜品里 cloud:// 的 image 换成临时 https 链接（免费方案，无需开存储公共读权限）
async function resolveImages(dishes) {
  const ids = dishes
    .map((d) => d.image)
    .filter((s) => s && s.indexOf('cloud://') === 0);
  if (ids.length === 0) return dishes;
  const r = await call('resolveImages', { fileIds: ids });
  if (r && r.ok && r.urls) {
    dishes.forEach((d) => { if (r.urls[d.image]) d.image = r.urls[d.image]; });
  }
  return dishes;
}

module.exports = { call, resolveImages };
