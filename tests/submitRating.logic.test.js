const { validateRating, recalcDish } = require('../cloudfunctions/submitRating/logic');

const order = {
  _id: 'o1',
  userOpenid: 'u1',
  status: 'served',
  items: [{ dishId: 'd1', qty: 1 }],
};

test('validateRating: 正常通过', () => {
  expect(
    validateRating({ order, openid: 'u1', dishId: 'd1', score: 5, existing: null })
  ).toEqual({ ok: true });
});

test('validateRating: 非本人拒绝', () => {
  expect(
    validateRating({ order, openid: 'uX', dishId: 'd1', score: 5, existing: null }).ok
  ).toBe(false);
});

test('validateRating: 订单未出餐拒绝', () => {
  const pending = { ...order, status: 'pending' };
  expect(
    validateRating({ order: pending, openid: 'u1', dishId: 'd1', score: 5, existing: null }).ok
  ).toBe(false);
});

test('validateRating: 菜品不在订单内拒绝', () => {
  expect(
    validateRating({ order, openid: 'u1', dishId: 'dX', score: 5, existing: null }).ok
  ).toBe(false);
});

test('validateRating: 重复评分拒绝', () => {
  expect(
    validateRating({ order, openid: 'u1', dishId: 'd1', score: 5, existing: { _id: 'r1' } }).ok
  ).toBe(false);
});

test('validateRating: 分数越界拒绝', () => {
  expect(
    validateRating({ order, openid: 'u1', dishId: 'd1', score: 6, existing: null }).ok
  ).toBe(false);
});

test('recalcDish: 增量计算平均分', () => {
  expect(recalcDish({ avgRating: 4, ratingCount: 1 }, 5)).toEqual({
    avgRating: 4.5,
    ratingCount: 2,
  });
  expect(recalcDish({ avgRating: 0, ratingCount: 0 }, 3)).toEqual({
    avgRating: 3,
    ratingCount: 1,
  });
});
