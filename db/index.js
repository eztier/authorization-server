'use strict';

function dbfunc(server) {
  return {
    accessTokens       : require('./accesstokens')(server),
    authorizationCodes : require('./authorizationcodes')(server),
    clients            : require('./clients')(server),
    refreshTokens      : require('./refreshtokens')(server),
    users              : require('./users')(server),
    RedisStore         : require('./redisstore')
  }
}

const self = module.exports = dbfunc
