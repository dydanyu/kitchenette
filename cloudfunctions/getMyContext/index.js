const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const r = await db.collection('config').doc('admins').get().catch(() => null);
  const admins = (r && r.data && r.data.adminOpenids) || [];
  return { ok: true, openid: OPENID, isAdmin: admins.includes(OPENID) };
};
