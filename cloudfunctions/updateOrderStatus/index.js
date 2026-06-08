const cloud = require('wx-server-sdk');
const { isAdmin } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function getAdmins() {
  const r = await db.collection('config').doc('admins').get().catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: '无权限' };

  const status = event.status === 'served' ? 'served' : 'pending';
  await db.collection('orders').doc(event.orderId).update({ data: { status } });
  return { ok: true };
};
