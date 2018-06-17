'use strict';

const jwt = require('jsonwebtoken');

// The refresh tokens.
// You will use these to get access tokens to access your end point data through the means outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

/**
 * Tokens in-memory data structure which stores all of the refresh tokens
 */

/**
 * Returns a refresh token if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the refresh token to find.
 * @returns {Promise} resolved with the token
 */
exports.find = (token, server) => {
  try {
    const id = jwt.decode(token).jti;
    return server.store.findHash(id)
      .then(o => Promise.resolve(o))
      .catch(reason => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Saves a refresh token, user id, client id, and scope. Note: The actual full refresh token is
 * never saved.  Instead just the ID of the token is saved.  In case of a database breach this
 * prevents anyone from stealing the live tokens.
 * @param   {Object}  token    - The refresh token (required)
 * @param   {String}  userID   - The user ID (required)
 * @param   {String}  clientID - The client ID (required)
 * @param   {String}  scope    - The scope (optional)
 * @returns {Promise} resolved with the saved token
 */
exports.save = (token, userID, clientID, scope = 'offline-access', server) => {
  try {
    const id = jwt.decode(token).jti;
    const newToken = { id, userID, clientID, scope };

    return server.store.addToSet('refresh:tokens', id)
      .then(a => server.store.saveHash(newToken))
      .then(b => server.store.findHash(id))
      .then(c => Promise.resolve(c))
      .catch(Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Deletes a refresh token
 * @param   {String}  token - The token to decode to get the id of the refresh token to delete.
 * @returns {Promise} resolved with the deleted token
 */
exports.delete = (token, server) => {
  try {
    let deletedToken;
    const id = jwt.decode(token).jti;

    return server.store.findHash(id)
      .then(result => {
        deletedToken = result;
        return server.store.removeFromSet('refresh:tokens', id); 
      })
      .then(server.store.delete(id))
      .then(a => Promise.resolve(deletedToken))
      .catch(a => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes all refresh tokens.
 * @returns {Promise} resolved with all removed tokens returned
 */
exports.removeAll = server => {
  server.store.findAllInSet('refresh:tokens')
    .then(tokens => {
      const fn = token => {
        return server.store.removeFromSet('refresh:tokens', token)
          .then(a => server.store.delete(token))
          .then(a => Promise.resolve(token))
          .catch(e => Promise.resolve(undefined));
      };

      return Promise.all(tokens.map(fn));
    });
};
