/*
 * Copyright IBM Corporation 2016-2017
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

var constants = require('./constants');
var Value = require('./value');

var logger = require('./logger')('response');

/*
* Response  -- contains the details of the response
*      example: { "code" : 4, "msg" : "path not found" }
* Response.ResponseEnvelope -- contains the response and some data about it
*     example:
*         { "kind" : "sad",
*           "closure" : { "id" : 100 },
*           "payload" : { "code" : 4, "msg" : "path not found" }
*         }
*/

var MESSAGE_VERSION = 15;

function Response(app, data) {

    this.app = app;
    this.error = null;

    try {
        var message = JSON.parse(data);

        this.version = message.version;
        if (this.version != MESSAGE_VERSION) {
            throw "Invalid message version";
        }

        this.kind = message.kind;
        this.payload = message.payload;
        this.closure = message.closure || null;

        this.parsePayload();

    } catch (err) {
        logger.error("Error parsing inbound message: ", err);
        return null;
    }

}

Response.prototype.parsePayload = function() {

    if (this.kind === 'happy') {
        var code = this.payload.code;
        if (code !== 0) {
            var msg = this.payload.msg + ". Code(" + code +")";
            this.error = new Error(msg);
            this.error.code = constants.RequestError;
        }

    } else if (this.kind === 'error') {
        this.error = new Error(this.payload.msg);
        this.error.code = constants.InternalError;

    } else if (this.kind === 'data') {
        this.values = [ new Value(this.payload) ];

    } else if (this.kind === 'getAclsResponse') {
        this.acls = this.payload.acls;

    } else if (this.kind === 'advanceResponse') {
        this.vts = this.payload.vts || [];
        this.maxvts = this.payload.maxvts;

    } else if (this.kind === 'fetchResponse') {
        this.values = _.map(this.payload.response, function(response) { return new Value(response); });

    }

};

module.exports = Response;
