const cloud = require('wx-server-sdk');
const { buildOrder } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const ids = (event.items || []).map((i) => i.dishId);
  const dishRes = await db.collection('dishes').where({ _id: _.in(ids) }).get();
  const dishMap = {};

  dishRes.data.forEach((d) => {
    dishMap[d._id] = d;
  });

  let built;

  try {
    built = buildOrder({
      openid: OPENID,
      userName: event.userName,
      userAvatar: event.userAvatar,
      items: event.items,
      remark: event.remark,
      mealTime: event.mealTime,
      dishMap,
      now: Date.now(),
    });
  } catch (e) {
    return { ok: false, msg: e.message };
  }

  const add = await db.collection('orders').add({ data: built.order });

  for (const dishId of built.incDishIds) {
    await db.collection('dishes').doc(dishId).update({ data: { orderCount: _.inc(1) } });
  }

  return { ok: true, orderId: add._id };
};
