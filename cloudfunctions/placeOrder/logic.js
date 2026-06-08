function buildOrder({ openid, userName, userAvatar, items, remark, mealTime, dishMap, now }) {
  const valid = [];

  for (const it of items || []) {
    const dish = dishMap[it.dishId];
    if (!dish || dish.status !== 'on') continue;
    if (!it.qty || it.qty <= 0) continue;
    valid.push({ dishId: dish._id, name: dish.name, qty: it.qty });
  }

  if (valid.length === 0) throw new Error('没有可下单的菜品');

  const order = {
    userOpenid: openid,
    userName: userName || '',
    userAvatar: userAvatar || '',
    items: valid,
    remark: remark || '',
    mealTime: mealTime || '',
    status: 'pending',
    rated: false,
    createdAt: now,
  };

  return { order, incDishIds: valid.map((v) => v.dishId) };
}

module.exports = { buildOrder };
