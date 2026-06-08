const { formatRating, starString } = require('../miniprogram/utils/format');

test('formatRating: 无评分显示「暂无评分」', () => {
  expect(formatRating(0, 0)).toBe('暂无评分');
});

test('formatRating: 有评分保留一位小数', () => {
  expect(formatRating(4.567, 12)).toBe('★ 4.6');
});

test('starString: 四舍五入到整星，返回实心+空心共5个', () => {
  expect(starString(4)).toBe('★★★★☆');
  expect(starString(0)).toBe('☆☆☆☆☆');
  expect(starString(5)).toBe('★★★★★');
});
