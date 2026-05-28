let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = import("../backend/src/server.js").then((module) => module.default);
  }
  const app = await appPromise;
  return app(req, res);
};
