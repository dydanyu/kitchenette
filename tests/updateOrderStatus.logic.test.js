const { isAdmin } = require('../cloudfunctions/updateOrderStatus/logic');

test('isAdmin: 命中白名单', () => {
  expect(isAdmin('u1', ['u1', 'u2'])).toBe(true);
});

test('isAdmin: 不在白名单', () => {
  expect(isAdmin('uX', ['u1'])).toBe(false);
});

test('isAdmin: 空白名单返回false', () => {
  expect(isAdmin('u1', undefined)).toBe(false);
});
