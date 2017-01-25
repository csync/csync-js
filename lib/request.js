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

var uuid = require('node-uuid');

var MESSAGE_VERSION = 15;

function Request(kind) {

    this.version = MESSAGE_VERSION;
    this.kind = kind;
    this.closure = uuid.v4();
}

function pub(keyObj, data, deletePath, aclid, cts) {

    var req = new Request("pub");

    req.payload = {
        path: keyObj.components,
        deletePath: deletePath || false,
        cts: cts
    };

    if (data !== undefined) {
        req.payload.data = data;
    }

    if (aclid !== undefined) {
        req.payload.assumeACL = aclid;
    }

    return req;
}

function unsub(keyObj) {

    var req = new Request("unsub");

    req.payload = {
        path: keyObj.components
    };

    return req;
}

function sub(keyObj) {

    var req = new Request("sub");

    req.payload = {
        path: keyObj.components
    };

    return req;
}

function getAcls() {

    var req = new Request("getAcls");

    req.payload = {};

    return req;
}

function advance(keyObj, rvts) {

    var req = new Request("advance");

    req.payload = {
        pattern: keyObj.components,
        rvts: rvts,
    };

    return req;
}

function fetch(vts) {

    var req = new Request("fetch");

    req.payload = {
        vts: vts,
    };

    return req;
}

module.exports = {
    pub: pub,
    sub: sub,
    unsub: unsub,
    getAcls: getAcls,
    advance: advance,
    fetch: fetch
};

Request.prototype.message = function() {
    return JSON.stringify(this);
};
