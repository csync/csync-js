/*
 * Copyright IBM Corporation 2016
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var _ = require('lodash');
var when = require('when');

var constants = require('./constants');
var Key = require('./key');
var Operation = require('./operation');
var Transport = require('./transport');

// dev setup
var logger  = require('./logger')('facade');
logger.enableDebug = (process.env.DEBUG || process.env.DEBUG_FACADE) ? true : false;
logger.enableWarning = (process.env.DEBUG || process.env.DEBUG_FACADE) ? true : false;


/**
 @class AuthData
 @classdesc
 An AuthData object contains the authentication context for a user that has been
 authenticated to the CSync service.

 @property {string} uid The uid for this user. It is unique across all auth providers.
 @property {string} provider The OAuth indentity provider that provided the token that identifies the user
 @property {string} token The token used to authenticate the user with the CSync Service
 @property {int} expires The expiration timestamp (seconds since epoch) for the OAuth token
 @memberof AuthData
 @instance
 */

/**
 @class App
 @classdesc CSync application

 A CSync App object represents an application with a persistent connection to a CSync service.
 Applications use the CSync App object to authenticate app users and to generate references
 to specific entries in a CSync data store.

 @description CSync application

 @param options - A JSON object with attribute host as a string(required),
                   port as a number (required), and token as a string (optional).

 @return {Object} A new CSync application instance
 */
function App(options) {
    if (!(this instanceof App)) {
        return new App(options);
    }

    if (options.host === undefined || options.port === undefined) {
        var err = new Error('host and port are required to connect');
        err.code = constants.InvalidRequest;
        throw err;
    }
    /**
     @property {string} sdkVersion The CSync SDK version (read-only)
     @memberof App
     @instance
     @name sdkVersion
     */
    this.sdkVersion = '1.0.1';
    Object.defineProperty(this, "sdkVersion", { writable: false });

    /**
     @property {string} host The DNS name or IP address of the CSync service (read-only)
     @memberof App
     @instance
     @name host
     */
    this.host = options.host;
    Object.defineProperty(this, "host", { writable: false });

    /**
     @property {int} port The port for the CSync service (read-only)
     @memberof App
     @instance
     @name port
     */
    this.port = options.port;
    Object.defineProperty(this, "port", { writable: false });

    /**
     @property {object} an object that contains the authentication context for a user that has been
                        authenticated to the CSync service. (read-only)
     @memberof App
     @instance
     @name authData
     */

    this.authData = null;

    this.acls = null;

    this.lastCts = 0;

    // Queue of inflight operations
    this.operationQueue = [];
    this.queueDraining = false;

    // Array of key objects with active listeners
    this.listeners = [];

    // Map from acl+key to boolean indicating if advance job is scheduled
    this.advanceScheduled = {};

    this.rvtsDict = {};   // Map from aclid+key to rvts

    this.memoryDB = {};   // Map from (concrete) keystring to data
    this.vtsIndex = {};   // Map from vts to keystring (concrete)

    this.transport = new Transport(this, this.host, this.port);
    this.transport.token = options.token || null;
    if (options.useSSL === false) {
        this.transport.useSSL = false;
    }
}

module.exports = App;

/**
 @description Authenticate to the CSync service with an OAuth token from a provider.
 @memberof App

 @param {string} oauthProvider    The provider, all lower case with no spaces.
 @param {string} token            The OAuth Token to authenticate with the provider.

 @return A promise that is fulfilled when the server has authenicated the user.
 */
App.prototype.authenticate = function(oauthProvider, token) {

    var deferred = when.defer();

    this.transport.authProvider = oauthProvider || null;
    this.transport.token = token || null;

    var self = this;  // capture this for use in closures

    this.transport.startSession(function (error, sessionInfo) {
        if (error) {
            deferred.reject(error);
        } else {
            self.authData = Object.freeze({
                uid: sessionInfo.uid,
                provider: oauthProvider,
                token: token,
                expires: sessionInfo.expires
            });
            deferred.resolve(self.authData);
        }
    });

    return deferred.promise;
};

/**
 @description Clears any credentials associated with this CSync App.
 @memberof App
 */
App.prototype.unauth = function() {

    var deferred = when.defer();

    this.removeAllListeners();

    this.drainOperationQueue(function (error) {

        this.transport.token = null;
        this.acls = null;
        this.authData = null;

        this.transport.endSession();

        deferred.resolve("ok");
    });

    return deferred.promise;
};

/**
 @description Create a Key for an entry in the CSync service.
 @memberof App

 @param {string | array} key    The key for the entry expressed as a string containing components separated by periods (’.’), or as an array of string components.

 @return A Key for an entry with the specified keystring.
 */
App.prototype.key = function(key) {

    return new Key(this, key);
};

// MARK: - Internal methods

App.prototype.nextCts = function() {

    this.lastCts = Math.max(this.lastCts+1, Date.now());
    return this.lastCts;
};

App.prototype.addOperation = function(op) {

    if (this.queueDraining) {
        throw new Error('request for new operation when queue is draining');
    }

    this.operationQueue.push(op);

    // Check for conflicting ops before starting
    var next = _.find(this.operationQueue, op.query());
    if (next === op) {
        op.start();
    }
};

App.prototype.removeOperation = function(op) {

    _.pull(this.operationQueue, op);

    // Check for conflicting ops that can now be started
    var next = _.find(this.operationQueue, op.query());
    if (next !== undefined) {
        next.start();
    }

    if (this.queueDraining && this.operationQueue.length === 0) {
        this.queueIsDrainedCallback(null);
        this.queueDraining = false;
    }
};

App.prototype.drainOperationQueue = function(callback) {

    this.queueDraining = true;
    this.queueIsDrainedCallback = callback;

    if (this.operationQueue.length === 0) {
        this.queueIsDrainedCallback(null);
        this.queueDraining = false;
    }
};

App.prototype.handleConnect = function() {

    logger.debug("Entry to app.handleConnect");

    _.filter(this.operationQueue, 'started').forEach(function (op) {
        op.handleConnect();
    });
};

App.prototype.addListener = function(keyObj) {

    if (_.includes(this.listeners, keyObj)) {
        return;
    }

    var newListener = !this.hasListener(keyObj.key);

    this.listeners.push(keyObj);

    // Clear latest vts map so all latest data is delivered to the new listener
    keyObj.latest = {};

    for (var keyString in this.memoryDB) {
        if (this.memoryDB.hasOwnProperty(keyString)) {
            if (keyObj.matches(keyString)) {
                var value = this.memoryDB[keyString];
                //Only return the value if it is not deleted
                if (value.exists){
                    keyObj.deliver(value);
                }
            }
        }
    }

    // Only schedule one sub per key pattern, regardless of
    // how many listens are outstanding for this key pattern
    if (newListener) {
        var op = Operation.sub(keyObj);
        this.addOperation(op);
    }

    this.startAdvance(keyObj);
};

App.prototype.removeListener = function(keyObj) {

    _.remove(this.listeners, function(listener) {
        return _.isEqual(listener.uuid, keyObj.uuid);
    });

    if (!this.hasListener(keyObj.key)) {
        var op = Operation.sub(keyObj);
        op.unsub = true;
        this.addOperation(op);
    }
};

App.prototype.removeAllListeners = function() {

    var self = this;

    _.forEach(this.listeners, function(listener) {
        self.removeListener(listener);
    });
};

App.prototype.hasListener = function(key) {
    var aListener = _.find(this.listeners, function(keyObj) {
        return keyObj.key === key && keyObj.listener !== null;
    });
    return aListener !== undefined;
};

App.prototype.deliverToListeners = function(value) {
    logger.debug("Entry to deliverToListeners for value "+JSON.stringify(value));

    // Update the memoryDB if this value is newer than the value it contains
    var latestValue = this.memoryDB[value.key] || { vts: 0};
    if (value.vts <= latestValue.vts) {
        return;
    }
    this.memoryDB[value.key] = value;
    this.vtsIndex[value.vts] = value.key;

    _.forEach(this.listeners, function(listener) {
        if (listener.matches(value.key)) {
            listener.deliver(value);
        }
    });
};

App.prototype.startAdvance = function(keyObj) {
    logger.debug("Starting advance for "+keyObj.key);

    var self = this;

    var aclKey = '*.' + keyObj.key;
    var advanceAlreadyScheduled = self.advanceScheduled[aclKey] || false;
    if (!advanceAlreadyScheduled) {
        var op = Operation.advance(keyObj);
        self.addOperation(op);
        self.advanceScheduled[aclKey] = true;
    }
};
