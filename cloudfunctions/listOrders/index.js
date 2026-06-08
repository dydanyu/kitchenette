const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function isAdmin(openid, list) { return Array.isArray(list) && list.includes(openid); }

async function getAdmins() {
  const r = await db.collection('config').doc('admins').get().catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: '无权限' };
  const res = await db.collection('orders').orderBy('createdAt', 'desc').get();
  return { ok: true, data: res.data };
};
