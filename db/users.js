'use strict';

const users = {};

/**
 * This is the configuration of the users that are allowed to connected to your authorization
 * server. These represent users of different client applications that can connect to the
 * authorization server. At a minimum you need the required properties of
 *
 * id       : A unique numeric id of your user
 * username : The user name of the user
 * password : The password of your user
 * name     : The name of your user
 */
const userset = [{
  id       : 'user:1',
  username : 'bob',
  password : 'secret',
  name     : 'Bob Smith',
}, {
  id       : 'user:2',
  username : 'joe',
  password : 'password',
  name     : 'Joe Davis',
}];

users.saveUser = (user) => {
  const server = users.server;

  return server.store.addToSet('users', user.id)
    .then(resp => server.store.saveHash(user))
    .then(resp => { const { username, id } = user; return server.store.save(`user:${username}`, id);}) // For findByUsername() lookup.
    .catch(Promise.resolve(undefined));
};

users.createTestUsers = () => {
  const server = users.server 
  
  return Promise.all(userset.map(u => users.saveUser(u, server)))
    .then(() => console.log('All users added.'))
    .catch(e => Promise.reject(e));
}

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   id - The unique id of the user to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
users.find = (id) => {
  const server = users.server;

  return server.store.findHash(id)
    .then(user => Promise.resolve(user))
    .catch(reason => Promise.resolve(undefined));
}

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   username - The unique user name to find
 * @param   {Function} done     - The user if found, otherwise returns undefined
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */

users.findByUsername = (username) => {
  const server = users.server;

  return server.store.find(`user:${username}`)
    .then(id => server.store.findHash(id))
    .then(user => Promise.resolve(user))
    .catch(reason => Promise.resolve(undefined));
}

const self = module.exports = function (server) {
  users.server = server;
  return users;
}