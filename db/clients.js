'use strict';

const clients = {};

/**
 * This is the configuration of the clients that are allowed to connected to your authorization
 * server. These represent client applications that can connect. At a minimum you need the required
 * properties of
 *
 * id:           A unique numeric id of your client application
 * name:         The name of your client application
 * clientId:     A unique id of your client application
 * clientSecret: A unique password(ish) secret that is _best not_ shared with anyone but your
 *               client application and the authorization server.
 * scope:        inform the client of the scope of the access token issued
 * redirectUri:  This value must be enabled on authorization code grant
 *
 * Optionally you can set these properties which are
 *
 * trustedClient: default if missing is false. If this is set to true then the client is regarded
 * as a trusted client and not a 3rd party application. That means that the user will not be
 * presented with a decision dialog with the trusted application and that the trusted application
 * gets full scope access without the user having to make a decision to allow or disallow the scope
 * access.
 */
const clientset = [{
  id            : 'client:1',
  name          : 'Samplr',
  clientId      : 'abc123',
  clientSecret  : 'ssh-secret',
  trustedClient : true,
  scope         : 'offline_access',
  redirectUri   : 'https://localhost:4444'
}, {
  id            : 'client:2',
  name          : 'Samplr2',
  clientId      : 'xyz123',
  clientSecret  : 'ssh-password',
  scope         : '',
  redirectUri   : 'http://localhost:8080/graphql'
}, {
  id            : 'client:3',
  name          : 'Samplr3',
  clientId      : 'axelrod',
  clientSecret  : '9876543210',
  trustedClient : true,
  scope         : 'offline_access',
  redirectUri   : 'http://localhost:8080/graphql'
}, {
  id            : 'client:4',
  name          : 'Samplr4',
  clientId      : 'android',
  clientSecret  : '9876543210',
  trustedClient : true,
  scope         : 'offline_access',
  redirectUri   : 'com.eztier.client1234://redirect'
}];

clients.saveClient = (client) => {
  const server = clients.server;

  return server.store.addToSet('clients', client.id)
    .then(resp => server.store.saveHash(client))
    .then(resp => { const { clientId, id } = client; return server.store.save(`client:${clientId}`, id);}) // For findByClientId() lookup.
    .catch(Promise.resolve(undefined));
};

clients.createTestClients = () => {
  const server = clients.server; 
  
  return Promise.all(clientset.map(c => clients.saveClient(c, server)))
    .then(()=> console.log('All clients added.'))
    .catch(e => Promise.reject(e));
}

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   id   - The unique id of the client to find
 * @returns {Promise}  resolved promise with the client if found, otherwise undefined
 */
clients.find = (id) => {
  const server = clients.server;

  return server.store.findHash(id)
    .then(client => Promise.resolve(client))
    .catch(reason => Promise.resolve(undefined));
}

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   clientId - The unique client id of the client to find
 * @param   {Function} done     - The client if found, otherwise returns undefined
 * @returns {Promise} resolved promise with the client if found, otherwise undefined
 */
clients.findByClientId = (clientId) => {
  const server = clients.server;

  return server.store.find(`client:${clientId}`)
    .then(id => server.store.findHash(id))
    .then(client => Promise.resolve(client))
    .catch(reason => Promise.resolve(undefined));
}

const self = module.exports = function (server) {
  clients.server = server;
  return clients;
}
