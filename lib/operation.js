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

var Request = require('./request');
var _ = require('lodash');

var logger = require('./logger')('operation');

// Development flags setup
logger.enableDebug = (process.env.DEBUG || process.env.DEBUG_OPERATION) ? true : false;
logger.enableWarning = (process.env.DEBUG || process.env.DEBUG_OPERATION) ? true : false;

function Operation(app) {

    this.app = app;
    this.timer = null;
    this.timeout = 60*1000;  // 60 seconds in millis
    this.callback = null;
    this.started = false;
}

exports = module.exports = Operation;

exports.pub = function(keyObj) {

    var op = new Operation(keyObj.app);

    op.kind = "pub";
    op.keyObj = keyObj;
    op.cts = keyObj.app.nextCts();

    return op;
};

exports.sub = function(keyObj) {

    var op = new Operation(keyObj.app);

    op.kind = "sub";
    op.unsub = false;
    op.keyObj = keyObj;

    return op;
};

exports.getAcls = function(app) {

    var op = new Operation(app);

    op.kind = "getAcls";

    return op;
};

exports.advance = function(keyObj) {

    var op = new Operation(keyObj.app);

    op.kind = "advance";
    op.keyObj = keyObj;

    return op;
};

exports.fetch = function(keyObj, vts, rvtsPrime) {

    var op = new Operation(keyObj.app);

    op.kind = "fetch";
    op.keyObj = keyObj;
    op.vts = vts;
    op.rvtsPrime = rvtsPrime;

    return op;
};

Operation.prototype.toString = function() {
    if (this.kind === 'pub') {
        return "pub with CTS "+this.cts+" for key \'"+this.keyObj.key+"\'";

    } else if (this.kind === 'sub') {
        return "sub for key \'"+this.keyObj.key+"\'";

    } else if (this.kind === 'getAcls') {
        return "getAcls";

    } else if (this.kind === 'advance') {
        return "advance for key \'"+this.keyObj.key+"\' with rvts \'"+(this.rvts || "??")+"\'";

    } else if (this.kind === 'fetch') {
        return "fetch for key \'"+this.keyObj.key+"\' with vts " + JSON.stringify(this.vts);

    } else {
        return "unknown";

    }
};

Operation.prototype.query = function() {

    // TODO: might need different query for advance -- to include aclid 
    var query = {kind: this.kind};
    if (this.keyObj !== undefined) {
        query.keyObj = this.keyObj;
    }
    return query;
};

Operation.prototype.start = function() {

    this.started = true;

    logger.debug("Started "+this.kind+" operation");

    this.request = this.createRequest();

    this.send();
};

Operation.prototype.createRequest = function() {

    var request = null;
    if (this.kind === 'pub') {
        request = Request.pub(this.keyObj, this.data, this.deletePath, this.aclid, this.cts);

    } else if (this.kind === 'sub') {
        request = this.unsub ? Request.unsub(this.keyObj) : request = Request.sub(this.keyObj);

    } else if (this.kind === 'getAcls') {
        request = Request.getAcls();

    } else if (this.kind === 'advance') {
        this.rvts = this.app.rvtsDict['*.'+this.keyObj.key] || 0;
        request = Request.advance(this.keyObj, this.rvts);

    } else if (this.kind === 'fetch') {
        request = Request.fetch(this.vts);

    }
    return request;

};

Operation.prototype.send = function() {

    if (this.timer !== null) {
        clearTimeout(this.timer);
    }
    this.timer = setTimeout(this.handleTimeout.bind(this), this.timeout);

    var self = this;  // capture this for use in closures

    this.app.transport.send(this.request, function(response, error) {
        clearTimeout(self.timer);
        self.processResponse(response, error);
        self.finish();
    });
};

Operation.prototype.handleTimeout = function() {
    logger.debug("handleTimeout for operation " + this.toString() + " request " + this.request.closure);
    this.send();
};

Operation.prototype.handleConnect = function() {
    logger.debug("handleConnect for operation " + this.toString() + " request " + this.request.closure);
    this.send();
};

Operation.prototype.processResponse = function(response, error) {

    logger.debug("processResponse for operation " + this.toString() + " request " + this.request.closure);

    this.error = error || response.error;

    if (this.error) {
        logger.error(this.toString() + " failed: " + this.error);
        return;
    }

    var self = this;  // capture this for use in closures

    if (this.kind === 'pub') {
        /* Should be just happy or error - no special processing needed */

    } else if (this.kind === 'sub') {
        /* Should be just happy or error - no special processing needed */

    } else if (this.kind === 'getAcls') {
        this.app.acls = response.acls;

    } else if (this.kind === 'advance') {

        try {
            var vtsToFetch = [];
            _.forEach(response.vts, function(vts) {
                var keyForVts = self.app.vtsIndex[vts];
                if (keyForVts === undefined) {
                    vtsToFetch.push(vts);
                } else {
                    var value = self.app.memoryDB[keyForVts];
                    if (value.vts < vts) {
                        vtsToFetch.push(vts);
                    } else {
                        self.app.deliverToListeners(value);
                    }
                }
            });

            // Compute rvtsPrime
            var rvtsPrime = response.maxvts || _.reduce(response.vts, function (max, val) { return (val>max) ? val : max; }, this.rvts );

            if (vtsToFetch.length > 0) {
                // Fetch missing vts's
                this.app.addOperation(Operation.fetch(this.keyObj, vtsToFetch, rvtsPrime));
            } else {
                this.app.rvtsDict['*.'+this.keyObj.key] = rvtsPrime;
                var delay = 5;    // TODO: make this dynamic
                setTimeout(function () {
                    // If any listener is still listening, schedule the fetch or next advance
                    if (self.app.hasListener(self.keyObj.key)) {
                        self.app.addOperation(Operation.advance(self.keyObj));
                    } else {
                        self.app.advanceScheduled['*.'+self.keyObj.key] = false;
                    }
                }, delay*1000);
            }

        } catch (err) {
            logger.error("Error processing advance response: " + err + "\n" + err.stack);
        }

    } else if (this.kind === 'fetch') {

        try {
            // Deliver the updates
            response.values.forEach(function(value) {
                self.app.deliverToListeners(value);
            });

            // Set rvts to rvtsPrime
            this.app.rvtsDict['*.'+this.keyObj.key] = this.rvtsPrime;

            // If any listener is still listening, schedule the next advance
            if (this.app.hasListener(this.keyObj.key)) {
                this.app.addOperation(Operation.advance(this.keyObj));
            } else {
                this.app.advanceScheduled['*.'+this.keyObj.key] = false;
            }

        } catch (err) {
            logger.error("Error processing fetch response: " + err + "\n" + err.stack);
        }

    }
};


Operation.prototype.finish = function() {

    logger.debug("Operation.finish for " + this.toString());

    if (this.callback !== null) {
        this.callback(this.error);
    }

    this.app.removeOperation(this);
};
