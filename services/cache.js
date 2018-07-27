const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util"); // Standard library in node that has a bunch of utility functions
// we use to promisify the get function
const keys = require("../config/keys");
const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget); // to change callback to Promises

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "default");
  return this; // to make it chainable
};

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }
  // Object.assign - safely copy properties from one object to another
  // We dont want to modify the getQuery() object as it will affect the actual query
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );
  // See if we have a value for 'key' in redis
  const cacheValue = await client.hget(this.hashKey, key);
  // If we do, return that
  if (cacheValue) {
    // we need to return a mongoose model
    const doc = JSON.parse(cacheValue);
    // If its an array of blog posts , we need to return a model for each item
    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }
  // Otherwise, issue the query and store the result in redis
  const result = await exec.apply(this, arguments);
  client.hset(this.hashKey, key, JSON.stringify(result));
  client.expire(this.hashKey, 10);

  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};
