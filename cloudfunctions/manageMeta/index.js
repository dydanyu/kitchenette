const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function isAdmin(openid, list) {
  return Array.isArray(list) && list.includes(openid);
}

async function getAdmins() {
  const r = await db.collection('config').doc('admins').get().catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: '无权限' };

  const { collection, action, id, data } = event;
  if (!['categories', 'chefTags'].includes(collection)) return { ok: false, msg: '非法集合' };

  if (action === 'add') {
    const add = await db.collection(collection).add({ data });
    return { ok: true, id: add._id };
  }

  if (action === 'update') {
    await db.collection(collection).doc(id).update({ data });
    return { ok: true };
  }

  if (action === 'remove') {
    await db.collection(collection).doc(id).remove();
    return { ok: true };
  }

  return { ok: false, msg: '未知操作' };
};
