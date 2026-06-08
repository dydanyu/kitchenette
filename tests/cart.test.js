const { addItem, setQty, totalCount, toOrderItems } = require('../miniprogram/utils/cart');

const dish = { _id: 'd1', name: '红烧肉' };

test('addItem: 新增菜品数量为1', () => {
  const cart = addItem({}, dish);
  expect(cart.d1).toEqual({ dishId: 'd1', name: '红烧肉', qty: 1 });
});

test('addItem: 已有菜品数量+1', () => {
  let cart = addItem({}, dish);
  cart = addItem(cart, dish);
  expect(cart.d1.qty).toBe(2);
});

test('setQty: 设为0则移除该项', () => {
  let cart = addItem({}, dish);
  cart = setQty(cart, 'd1', 0);
  expect(cart.d1).toBeUndefined();
});

test('totalCount: 累计所有数量', () => {
  let cart = addItem({}, dish);
  cart = setQty(cart, 'd1', 3);
  cart = addItem(cart, { _id: 'd2', name: '西兰花' });
  expect(totalCount(cart)).toBe(4);
});

test('toOrderItems: 转成订单 items 数组', () => {
  let cart = setQty(addItem({}, dish), 'd1', 2);
  expect(toOrderItems(cart)).toEqual([{ dishId: 'd1', name: '红烧肉', qty: 2 }]);
});
