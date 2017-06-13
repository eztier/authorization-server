'use strict';

const jwt = require('jsonwebtoken');

// The refresh tokens.
// You will use these to get access tokens to access your end point data through the means outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

/**
 * Tokens in-memory data structure which stores all of the refresh tokens
 */
// let tokens = Object.create(null);

/**
 * Returns a refresh token if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the refresh token to find.
 * @returns {Promise} resolved with the token
 */
exports.find = (token, server) => {
  /*
  try {
    const id = jwt.decode(token).jti;
    return Promise.resolve(tokens[id]);
  } catch (error) {
    return Promise.resolve(undefined);
  }
  */
  try {
    const id = jwt.decode(token).jti;
    return server.store.findHash(id)
      .then(o => Promise.resolve(o))
      .catch(reason => Promise.resolve(undefined));
  } catch (error) {
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
exports.save = (token, userID, clientID, scope, server) => {
  const id = jwt.decode(token).jti;
  // tokens[id] = { userID, clientID, scope };
  // return Promise.resolve(tokens[id]);
  return server.store.addToSet('tokens', id)
    .then(server.store.saveHash({ id, userID, clientID, scope }))
    .catch(Promise.resolve(undefined));
};

/**
 * Deletes a refresh token
 * @param   {String}  token - The token to decode to get the id of the refresh token to delete.
 * @returns {Promise} resolved with the deleted token
 */
exports.delete = (token, server) => {
  try {
    const id = jwt.decode(token).jti;
    // const deletedToken = tokens[id];
    // delete tokens[id];
    // return Promise.resolve(deletedToken);
    return server.store.removeFromSet('tokens', id)
      .then(server.store.delete(id));
  } catch (error) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes all refresh tokens.
 * @returns {Promise} resolved with all removed tokens returned
 */
exports.removeAll = server => {
  // const deletedTokens = tokens;
  // tokens              = Object.create(null);
  // return Promise.resolve(deletedTokens);
  server.store.findAllInSet('tokens')
    .then(tokens => {
      const fn = token => {
        return server.store.removeFromSet('tokens', token)
          .then(server.store.delete(token))
          .catch(reason => Promise.resolve(undefined));
      };

      return Promise.all(tokens.map(fn));
    });
};
