function addItem(cart, dish) {
  const next = { ...cart };
  const cur = next[dish._id];
  next[dish._id] = {
    dishId: dish._id,
    name: dish.name,
    qty: cur ? cur.qty + 1 : 1,
  };
  return next;
}

function setQty(cart, dishId, qty) {
  const next = { ...cart };
  if (qty <= 0) {
    delete next[dishId];
  } else if (next[dishId]) {
    next[dishId] = { ...next[dishId], qty };
  }
  return next;
}

function totalCount(cart) {
  return Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
}

function toOrderItems(cart) {
  return Object.values(cart).map((it) => ({
    dishId: it.dishId, name: it.name, qty: it.qty,
  }));
}

module.exports = { addItem, setQty, totalCount, toOrderItems };
