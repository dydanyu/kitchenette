const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function isAdmin(openid, list) { return Array.isArray(list) && list.includes(openid); }

async function getAdmins() {
  const r = await db.collection('config').doc('admins').get().catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  // 只看自己的订单：任意登录用户都可，按 userOpenid 过滤（绕开 _openid 权限限制）
  if (event.mine) {
    const res = await db.collection('orders')
      .where({ userOpenid: OPENID })
      .orderBy('createdAt', 'desc')
      .get();
    return { ok: true, data: res.data };
  }
  // 查看全部订单：仅管理员
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: '无权限' };
  const res = await db.collection('orders').orderBy('createdAt', 'desc').get();
  return { ok: true, data: res.data };
};
