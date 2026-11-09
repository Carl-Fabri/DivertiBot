let cachedHandler;

module.exports = async function handler(req, res) {
  if (!cachedHandler) {
    const mod = await import('../dist/animospace/server/server.mjs');
    cachedHandler = mod.reqHandler || mod.default;
  }
  return cachedHandler(req, res);
};
