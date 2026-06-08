function call(name, data = {}) {
  return wx.cloud.callFunction({ name, data })
    .then((res) => res.result)
    .catch((err) => { console.error(name, err); return { ok: false, msg: '网络错误' }; });
}
module.exports = { call };
