const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const fileList = (event.fileIds || []).filter((f) => f && f.indexOf('cloud://') === 0);
  if (fileList.length === 0) return { ok: true, urls: {} };
  const res = await cloud.getTempFileURL({ fileList });
  const urls = {};
  (res.fileList || []).forEach((f) => { if (f.tempFileURL) urls[f.fileID] = f.tempFileURL; });
  return { ok: true, urls };
};
