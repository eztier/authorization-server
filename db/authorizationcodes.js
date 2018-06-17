'use strict';

const jwt = require('jsonwebtoken');

// The authorization codes.
// You will use these to get the access codes to get to the data in your endpoints as outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

/**
 * Authorization codes in-memory data structure which stores all of the authorization codes
 */

/**
 * Returns an authorization code if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the authorization token to find.
 * @returns {Promise} resolved with the authorization code if found, otherwise undefined
 */
exports.find = (token, server) => {
  try {
    const id = jwt.decode(token).jti;
    return server.store.findHash(id)
      .then(authCode => Promise.resolve(authCode))
      .catch(reason => Promise.resolve(undefined));
  } catch (error) {
    return Promise.resolve(undefined);
  }
};

/**
 * Saves a authorization code, client id, redirect uri, user id, and scope. Note: The actual full
 * authorization token is never saved.  Instead just the ID of the token is saved.  In case of a
 * database breach this prevents anyone from stealing the live tokens.
 * @param   {String}  code        - The authorization code (required)
 * @param   {String}  clientID    - The client ID (required)
 * @param   {String}  redirectURI - The redirect URI of where to send access tokens once exchanged
 * @param   {String}  userID      - The user ID (required)
 * @param   {String}  scope       - The scope (optional)
 * @returns {Promise} resolved with the saved token
 */
exports.save = (code, clientID, redirectURI, userID, scope = 'offline-access', server) => {
  try {
    const id = jwt.decode(code).jti;
    const newToken = { id, clientID, redirectURI, userID, scope };

    return server.store.addToSet('codes', id)
      .then(d => server.store.saveHash(newToken))
      .then(b => server.store.findHash(id))
      .then(c => Promise.resolve(c))
      .catch(a => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Deletes an authorization code
 * @param   {String}  token - The authorization code to delete
 * @returns {Promise} resolved with the deleted value
 */
exports.delete = (token, server) => {
  try {
    const id = jwt.decode(token).jti;
    let authCode;

    return server.store.findHash(id)
      .then(result => {
        authCode = result;
        return server.store.removeFromSet('codes', id); 
      })
      .then(a => server.store.delete(id))
      .then(a => Promise.resolve(authCode))
      .catch(a => Promise.resolve(undefined));
  } catch (e) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes all authorization codes.
 * @returns {Promise} resolved with all removed authorization codes returned
 */
exports.removeAll = server => {
  return server.store.findAllInSet('codes')
    .then(codes => {
      const fn = authCode => {
        return server.store.removeFromSet('codes', authCode)
          .then(a => server.store.delete(authCode))
          .then(a => Promise.resolve(token))
          .catch(reason => Promise.resolve(undefined));
      };

      return Promise.all(codes.map(fn));
    });
};
