const { clearHash } = require("../services/cache");

module.exports = async (req, res, next) => {
  await next(); // allow the function to execute and then clear cache
  clearHash(req.user.id);
};
