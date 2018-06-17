'use strict';

const jwt = require('jsonwebtoken');

// The access tokens.
// You will use these to access your end point data through the means outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

/**
 * Returns an access token if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the access token to find.
 * @returns {Promise} resolved with the token if found, otherwise resolved with undefined
 */
exports.find = (token, server) => {
  try {
    const id = jwt.decode(token).jti;

    return server.store.findHash(id)
      .then(sessionToken => Promise.resolve(sessionToken))
      .catch(reason => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Saves a access token, expiration date, user id, client id, and scope. Note: The actual full
 * access token is never saved.  Instead just the ID of the token is saved.  In case of a database
 * breach this prevents anyone from stealing the live tokens.
 * @param   {Object}  token          - The access token (required)
 * @param   {Date}    expirationDate - The expiration of the access token (required)
 * @param   {String}  userID         - The user ID (required)
 * @param   {String}  clientID       - The client ID (required)
 * @param   {String}  scope          - The scope (optional)
 * @returns {Promise} resolved with the saved token
 */
exports.save = (token, expirationDate, userID, clientID, scope = 'offline_access', server) => {
  try {
    const id = jwt.decode(token).jti;
    const expirationDateVal = expirationDate.getTime();
    const newToken = { id, userID, expirationDate: expirationDateVal, clientID, scope }

    return server.store.addToSet('tokens', id)
      .then(a => server.store.saveHash(newToken))
      .then(b => server.store.findHash(id))
      .then(c => Promise.resolve(c))
      .catch(reason => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Deletes/Revokes an access token by getting the ID and removing it from the storage.
 * @param   {String}  token - The token to decode to get the id of the access token to delete.
 * @returns {Promise} resolved with the deleted token
 */
exports.delete = (token, server) => {
  try {
    const id = jwt.decode(token).jti;
    let deletedToken;
    
    return server.store.findHash(id)
      .then(result => {
        deletedToken = result;
        return server.store.removeFromSet('tokens', id); 
      })
      .then(server.store.delete(id))
      .then(a => Promise.resolve(deletedToken))
      .catch(a => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes expired access tokens. It does this by looping through them all and then removing the
 * expired ones it finds.
 * @returns {Promise} resolved with an associative of tokens that were expired
 */
exports.removeExpired = server => {
  return server.store.findAllInSet('tokens')
    .then(tokens => {
      const fn = function removeIfNeeded(token) {
        return server.store.findValueInHash(token, 'expirationDate')
          .then(expirationDate => {
            if (new Date() > new Date(expirationDate)) {
              return server.store.removeFromSet('tokens', token)
                .then(a => server.store.delete(token))
                .then(a => Promise.resolve(token))
                .catch(e => Promise.resolve(undefined));
            } else {
              return Promise.resolve(undefined);
            }
          }) 
      };
      return Promise.all(tokens.map(fn));
    });
};

/**
 * Removes all access tokens.
 * @returns {Promise} resolved with all removed tokens returned
 */
exports.removeAll = server => {
  return server.store.findAllInSet('tokens')
    .then(tokens => {
      const fn = token => {
        return server.store.removeFromSet('tokens', token)
          .then(a => server.store.delete(token))
          .then(a => Promise.resolve(token))
          .catch(e => Promise.resolve(undefined));
      };

      return Promise.all(tokens.map(fn));
    });
};
