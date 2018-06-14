const redis = require('redis');
const config      = require('./config');
const db          = require('./db');
const oauth2orize = require('oauth2orize');

// Override in-memory SessionStore with the RedisStore
const redisClient = redis.createClient(config.redis.port, config.redis.host, { no_ready_check: true });
const store = new db.RedisStore({ redis: redisClient });

/* 
  Create the OAuth 2.0 server.
  Passing in RedisStore will override the use of the default SessionStore.
*/
const server = oauth2orize.createServer({ store });
// Add the store instance to the server so we can have access to the database API.
server.store = store;

// Create node style singleton.
const self = module.exports = server
