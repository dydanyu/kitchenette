const { sanitizeDish } = require('../cloudfunctions/saveDish/logic');

test('sanitizeDish: 补全默认字段', () => {
  const d = sanitizeDish({ name: '红烧肉', categoryId: 'c1' }, 2000);
  expect(d).toMatchObject({
    name: '红烧肉',
    desc: '',
    image: '',
    categoryId: 'c1',
    chefTagIds: [],
    status: 'on',
    avgRating: 0,
    ratingCount: 0,
    orderCount: 0,
    createdAt: 2000,
    updatedAt: 2000,
  });
});

test('sanitizeDish: 去掉首尾空格的菜名为空时抛错', () => {
  expect(() => sanitizeDish({ name: '  ' }, 1)).toThrow('菜名不能为空');
});

test('sanitizeDish: status 只接受 on/off', () => {
  expect(sanitizeDish({ name: 'x', status: 'weird' }, 1).status).toBe('on');
  expect(sanitizeDish({ name: 'x', status: 'off' }, 1).status).toBe('off');
});
