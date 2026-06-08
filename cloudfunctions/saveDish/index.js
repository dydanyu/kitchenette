const cloud = require('wx-server-sdk');
const { sanitizeDish, isAdmin } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function getAdmins() {
  const r = await db.collection('config').doc('admins').get().catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: '无权限' };

  let data;

  try {
    data = sanitizeDish(event.dish || {}, Date.now());
  } catch (e) {
    return { ok: false, msg: e.message };
  }

  if (event.dishId) {
    const { createdAt, avgRating, ratingCount, orderCount, ...rest } = data;
    await db.collection('dishes').doc(event.dishId).update({ data: rest });
    return { ok: true, dishId: event.dishId };
  }

  const add = await db.collection('dishes').add({ data });
  return { ok: true, dishId: add._id };
};
