function validateRating({ order, openid, dishId, score, existing }) {
  if (!order) return { ok: false, msg: '订单不存在' };
  if (order.userOpenid !== openid) return { ok: false, msg: '只能评价自己的订单' };
  if (order.status !== 'served') return { ok: false, msg: '订单出餐后才能评分' };
  if (!order.items.some((i) => i.dishId === dishId)) return { ok: false, msg: '该菜不在订单内' };
  if (existing) return { ok: false, msg: '已经评过分啦' };
  if (!Number.isInteger(score) || score < 1 || score > 5) return { ok: false, msg: '评分需为1-5' };
  return { ok: true };
}

function recalcDish(dish, score) {
  const count = (dish.ratingCount || 0) + 1;
  const total = (dish.avgRating || 0) * (dish.ratingCount || 0) + score;
  return { avgRating: Math.round((total / count) * 100) / 100, ratingCount: count };
}

module.exports = { validateRating, recalcDish };
