function formatRating(avg, count) {
  if (!count || count <= 0) return '暂无评分';
  return '★ ' + (Math.round(avg * 10) / 10).toFixed(1);
}

function starString(score) {
  const full = Math.max(0, Math.min(5, Math.round(score)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

module.exports = { formatRating, starString };
