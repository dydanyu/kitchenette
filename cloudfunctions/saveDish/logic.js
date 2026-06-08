function sanitizeDish(input, now) {
  const name = (input.name || '').trim();
  if (!name) throw new Error('菜名不能为空');

  return {
    name,
    desc: input.desc || '',
    image: input.image || '',
    categoryId: input.categoryId || '',
    chefTagIds: Array.isArray(input.chefTagIds) ? input.chefTagIds : [],
    status: input.status === 'off' ? 'off' : 'on',
    avgRating: input.avgRating || 0,
    ratingCount: input.ratingCount || 0,
    orderCount: input.orderCount || 0,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

function isAdmin(openid, adminOpenids) {
  return Array.isArray(adminOpenids) && adminOpenids.includes(openid);
}

module.exports = { sanitizeDish, isAdmin };
