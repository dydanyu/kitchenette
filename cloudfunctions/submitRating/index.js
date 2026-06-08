const cloud = require('wx-server-sdk');
const { validateRating, recalcDish } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { orderId, ratings } = event;
  const orderRes = await db.collection('orders').doc(orderId).get().catch(() => null);
  const order = orderRes && orderRes.data;

  for (const r of ratings || []) {
    const existRes = await db
      .collection('ratings')
      .where({ orderId, dishId: r.dishId, userOpenid: OPENID })
      .get();
    const v = validateRating({
      order,
      openid: OPENID,
      dishId: r.dishId,
      score: r.score,
      existing: existRes.data[0] || null,
    });
    if (!v.ok) return { ok: false, msg: v.msg };
  }

  for (const r of ratings) {
    await db.collection('ratings').add({
      data: {
        orderId,
        dishId: r.dishId,
        userOpenid: OPENID,
        score: r.score,
        comment: r.comment || '',
        createdAt: Date.now(),
      },
    });

    const dishRes = await db.collection('dishes').doc(r.dishId).get();
    const next = recalcDish(dishRes.data, r.score);
    await db.collection('dishes').doc(r.dishId).update({ data: next });
  }

  await db.collection('orders').doc(orderId).update({ data: { rated: true } });
  return { ok: true };
};
