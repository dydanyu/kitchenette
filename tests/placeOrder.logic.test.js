const { buildOrder } = require('../cloudfunctions/placeOrder/logic');

const onDish = { _id: 'd1', name: '红烧肉', status: 'on' };
const offDish = { _id: 'd2', name: '鱼香茄子', status: 'off' };

test('buildOrder: 过滤下架菜品，组装订单', () => {
  const res = buildOrder({
    openid: 'u1',
    userName: '小妹',
    userAvatar: 'a',
    items: [{ dishId: 'd1', qty: 2 }, { dishId: 'd2', qty: 1 }],
    remark: '少糖',
    mealTime: '今晚19:00',
    dishMap: { d1: onDish, d2: offDish },
    now: 1000,
  });

  expect(res.order.items).toEqual([{ dishId: 'd1', name: '红烧肉', qty: 2 }]);
  expect(res.order.userOpenid).toBe('u1');
  expect(res.order.status).toBe('pending');
  expect(res.order.rated).toBe(false);
  expect(res.order.createdAt).toBe(1000);
  expect(res.incDishIds).toEqual(['d1']);
});

test('buildOrder: 全部无效时抛错', () => {
  expect(() =>
    buildOrder({
      openid: 'u1',
      items: [{ dishId: 'd2', qty: 1 }],
      dishMap: { d2: offDish },
      now: 1,
    })
  ).toThrow('没有可下单的菜品');
});

test('buildOrder: 数量<=0被忽略', () => {
  const res = buildOrder({
    openid: 'u1',
    items: [{ dishId: 'd1', qty: 0 }, { dishId: 'd1', qty: 2 }],
    dishMap: { d1: onDish },
    now: 1,
  });

  expect(res.order.items).toEqual([{ dishId: 'd1', name: '红烧肉', qty: 2 }]);
});
