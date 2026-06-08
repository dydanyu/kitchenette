function isAdmin(openid, adminOpenids) {
  return Array.isArray(adminOpenids) && adminOpenids.includes(openid);
}

module.exports = { isAdmin };
