const redis = require('redis');
const config      = require('./config');
const db          = require('./db');
const oauth2orize = require('oauth2orize');

// Override in-memory SessionStore
const redisClient = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
const store = new db.RedisStore({ redis: redisClient });

// create OAuth 2.0 server
const server = oauth2orize.createServer({ store });
server.store = store;

const self = module.exports = server
