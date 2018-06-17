const utils = require('oauth2orize/lib/utils');
const AuthorizationError = require('oauth2orize/lib/errors/authorizationerror');
const BadRequestError = require('oauth2orize/lib/errors/badrequesterror');
const ForbiddenError = require('oauth2orize/lib/errors/forbiddenerror');

const toPairs = obj => Object.keys(obj)
  // iterate over them and generate the array
  .reduce(function(m, k) {
    // generate the array element
    const v = obj[k];
    m.push(k);
    m.push(v ? (v.constructor === Array ? JSON.stringify(v) : v) : '');
    return m;
  }, []);

function RedisStore(opts) {
  this.legacy = true;
  this.redis = opts.redis;
  this.prefix = opts.prefix || 'txn:';
  if (!this.redis) {
    throw new Error('RedisStore requires redis connection. Did you forget to pass `redis` option?');
  }
}

/**
 * @details Basically Redis Get
 * 
 * @param  [description]
 * @return [description]
 */
RedisStore.prototype.find = function (id) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.get(id, function (err, results) {  
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });  
};

/**
 * @details Basically Redis Set
 * 
 * @param id [description]
 * @param val [description]
 * @return [Promise]
 */
RedisStore.prototype.save = function (id, val) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.set(id, val, function (err, results) {  
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });  
};

/**
 * @details Basically Redis HGETALL
 * 
 * Find entire hashset by id.
 * @param  {[type]}   id [description]
 * @return {[type]}   [Promise]
 */
RedisStore.prototype.findHash = function (id) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.hgetall(id, function (err, results) {  
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });  
};

/**
 * @details Basically Redis HGET
 * 
 * Find hashset value by id and key.
 * @param  {[type]}   id [description]
 * @param  {Function} key  [description]
 * @return {[type]}   [Promise]
 */
RedisStore.prototype.findValueInHash = function (id, key) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.hget(id, key, function (err, results) {  
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

/**
 * @details Basically Redis HMSET
 * 
 * Save JSON as hashset of pairs.
 * @param  {[Object]}   obj [A JSON object.  It must contain the attribute "id".]
 * @return {[Promise]}   [Promise]
 */
RedisStore.prototype.saveHash = function (obj) {
  if (typeof obj.id === 'undefined') throw new Error(obj);
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.hmset(obj.id, toPairs(obj), function (err, results) {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

/**
 * @details Basically Redis DEL
 * 
 * Delete entire key.
 * @param  {[String]}   id [description]
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
RedisStore.prototype.delete = function (id) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.del(id, function (err, results) {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

/**
 * @details Basically Redis SADD
 * 
 * Delete entire key.
 * @param  {[String]} set [description]
 * @param  {[String]} val [description]
 * @return {[Promise]}    [description]
 */
RedisStore.prototype.addToSet = function (set, val) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.sadd(set, val, function (err, results) {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

/**
 * @details Basically Redis SREM
 * 
 * Delete entire key.
 * @param  {[String]} set [description]
 * @param  {[String]} val [description]
 * @return {[Promise]}    [description]
 */
RedisStore.prototype.removeFromSet = function (set, val) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.srem(set, val, function (err, results) {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

/**
 * @details Basically Redis SMEMBERS
 * 
 * Delete entire key.
 * @param  {[String]} set [description]
 * @return {[Promise]}    [description]
 */
RedisStore.prototype.findAllInSet = function (set) {
  const redis = this.redis;
  return new Promise((resolve, reject) => {
    redis.smembers(set, function (err, results) {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

/** 
 * @details OAuth2Orize Store.load 
*/
RedisStore.prototype.load = function (server, options, req, cb) {
  const self = this;
  const redis = this.redis;
  const field = options.transactionField || 'transaction_id';
  const key = options.sessionKey || 'authorize';

  const query = req.query || {};
  const body = req.body || {};
  const tid = query[field] || body[field];

  if (!tid) { return cb(new BadRequestError('Missing required parameter: ' + field)) }
  redis.get(getKey(this.prefix, key, tid), (err, res) => {
    if (err) return cb(err);
    const txn = JSON.parse(res);
    if (!txn) { return cb(new ForbiddenError('Unable to load OAuth 2.0 transaction: ' + tid)); }

    server.deserializeClient(txn.client, (err, client) => {
      if (err) { return cb(err); }
      if (!client) {
        self.remove(options, req, tid, function (err) {
          if (err) { return cb(err) }
          return cb(new AuthorizationError('Unauthorized client', 'unauthorized_client'));
        })
        return;
      }

      txn.transactionID = tid;
      txn.client = client;
      cb(null, txn);
    })
  })
};

/** 
 * @details OAuth2Orize Store.store 
*/
RedisStore.prototype.store = function (server, options, req, txn, cb) {
  const redis = this.redis;
  const lenTxnID = options.idLength || 8;
  const key = options.sessionKey || 'authorize';
  server.serializeClient(txn.client, (err, obj) => {
    if (err) { return cb(err); }

    const tid = utils.uid(lenTxnID);
    txn.client = obj;

    const rk = getKey(this.prefix, key, tid)
    redis.multi([
      [ 'SET', rk, JSON.stringify(txn) ],
      [ 'EXPIRE', rk, 300 ]
    ]).exec(err => {
      cb(err, tid);
    })
  })
};

/** 
 * @details OAuth2Orize Store.update 
*/
RedisStore.prototype.update = function (server, options, req, tid, txn, cb) {
  const redis = this.redis;
  const key = options.sessionKey || 'authorize';

  server.serializeClient(txn.client, (err, obj) => {
    if (err) { return cb(err); }

    txn.client = obj;
    redis.set(getKey(this.prefix, key, tid), JSON.stringify(txn), err => cb(err));
  })
};

/** 
 * @details OAuth2Orize Store.remove 
*/
RedisStore.prototype.remove = function (options, req, tid, cb) {
  const redis = this.redis;
  const key = options.sessionKey || 'authorize';
  redis.del(getKey(this.prefix, key, tid), () => cb());
}

/** 
 * @details OAuth2Orize Store.getKey 
*/
function getKey(prefix, key, tid) {
  return `${prefix}${key}:${tid}`;
};

module.exports = RedisStore;
