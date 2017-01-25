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
var qs = require('querystring');
var uuid = require('node-uuid');
var ws = require('ws');

var logger = require('./logger')('transport');
var Response = require('./response');

// Development flags setup
logger.enableDebug = (process.env.DEBUG || process.env.DEBUG_TRANSPORT) ? true : false;
logger.enableWarning = (process.env.DEBUG || process.env.DEBUG_TRANSPORT) ? true : false;

function Transport(app, host, port) {

    this.app = app;
    this.host = host;
    this.port = port;

    this.authProvider = null;
    this.token = null;

    this.sessionId = null;
    this.useSSL = true;
    this.ws = null;

    this.callbacks = {};
    this.connectCallback = null;
}

module.exports = Transport;

// MARK - Transport internal methods

/*
 Starts a session with the server.
 */
Transport.prototype.startSession = function(callback) {

    // For now, we simply return if a session is active
    if (this.sessionId !== null) {
        callback(null, null);
        return;
    }

    this.sessionId = uuid.v4();
    this.connectCallback = callback;
    this.connect();
};

/*
 Ends the currently open session with the server.
 */
Transport.prototype.endSession = function() {

    this.sessionId = null;

    if (this.ws !== null) {
        this.ws.close();
    }
    this.ws = null;
};

Transport.prototype.connected = function() {
    return (this.ws !== null && this.ws.readyState === ws.prototype.OPEN);
};

/*
 Sends a request to the server and registers a callback to receive a response.

 - request {Request} The request to send.
 - callback {function} callback accepting a Response and error

 The caller of this function is responsible for retry if a response is not received
 in a timely fashion.

 */
Transport.prototype.send = function(request, callback) {

    if (!this.connected()) {
        this.connect();
        return;
    }

    var message = request.message();
    if (message !== null) {
        if (callback !== undefined) {
            this.callbacks[request.closure] = callback;
        }
        logger.debug("sending " + message);
        this.ws.send(message);
    } else {
        if (callback !== undefined) {
            callback(request.error);
        }
    }
};

// MARK - Transport private methods

Transport.prototype.connect = function() {

    // For now, we simply return if a session is not active
    if (this.sessionId === null) {
        logger.warning("attempt to connect before session started silently ignorned");
        return;
    }

    // For now, we simply return if the ws is not in a state where we can reopen
    if (this.ws !== null && this.ws.readyState !== ws.prototype.CLOSED) {
        logger.warning("attempt to connect with active ws silently ignorned");
        return;
    }

    var args = { sessionId : this.sessionId };
    if (this.authProvider !== null && this.token !== null) {
        args.authProvider = this.authProvider;
        args.token = this.token;
    }

    var url = (this.useSSL ? "wss" : "ws") +'://' + this.host + ':' + this.port + '/connect?' + qs.stringify(args);
    logger.debug("open connection to: " + url);

    this.ws = new ws(url);

    var self = this;

    this.ws.onopen = function() {
        logger.debug("connection open to "+ws.url);
        self.app.handleConnect();
    };

    this.ws.onerror = function(err) {
        logger.error("encountered error: " + err);
    };

    this.ws.onclose = function() {
        logger.info("session closed by server");
    };

    this.ws.onmessage = function(event) {
        var data = event.data;
        logger.debug("handling incoming message: " + data);

        var response = new Response(self.app, data);
        if (response.closure !== null) {
            var callback = self.callbacks[response.closure];
            if (callback !== undefined) {
                callback(response, response.error);
                delete self.callbacks[response.closure];
            }
        } else if (response.kind === 'data') {
            response.values.forEach(function(value) {
                self.app.deliverToListeners(value);
            });
        } else if (response.kind === 'connectResponse') {
            if (self.connectCallback !== null) {
                var sessionInfo = _.pick(response.payload, ['uuid', 'uid', 'expires']);
                self.connectCallback(null, sessionInfo);
                self.connectCallback = null;
            }
        } else if (response.kind === 'error') {
            if (self.connectCallback !== null) {
                self.connectCallback(response.error);
                self.connectCallback = null;
            }
        } else {
            logger.error("Unhandled response: " + response.kind + " payload: " + JSON.stringify(response.payload));
        }
    };
};
