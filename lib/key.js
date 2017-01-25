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

var _    = require('lodash');
var uuid = require('node-uuid');
var when = require('when');

var constants = require('./constants');

var Operation = require('./operation');

// dev setup
var logger  = require('./logger')('facade');
logger.enableDebug = (process.env.DEBUG || process.env.DEBUG_FACADE) ? true : false;
logger.enableWarning = (process.env.DEBUG || process.env.DEBUG_FACADE) ? true : false;

/**
 @class Key
 @classdesc

 A CSync Key object represents a key identifying a data value stored in a CSync data store.
 A CSync Key object may also represent a key pattern containing wildcards that describes a set of keys.
 CSync Key objects can be created using the Key method of App or with the Parent or Child method of Key.

 CSync Keys are composed from a sequence of components.
 Key components may contain uppercase and lowercase alphabetic, numeric, "_", and "-".
 Key components must contain at least one character; an empty string is not a valid component.
 Keys may contain a maximum of 16 components.

 CSync Keys also have a string representation in which the components are joined together
 with a separator, a period ('.') between components.
 The total length of the key string may not exceed 200 characters.

 CSync Keys with a first component of "sys" are reserved for use by CSync.

 A CSync Key may specify a key pattern which has one or more components containing
 one of the following wildcard characters:

 - '*': matches any value of the specified component
 - '#': matches any value for this and all subsequent components, including an empty value

 Wildcard characters must appear alone; wildcard characters cannot be combined with regular key
 characters or which each other.
 Furthermore, only the final component of a CSKey may contain the '#' wildcard.

 @see App

 @description

 Use the Key method of App to construct new CSync Keys.

 */
function Key(app, key) {
    if (app === undefined || key === undefined) {
        throw new Error('app and key are required');
    }

    /**
     @property {string} app The CSync application associated with this entry (read-only).
     @memberof Key
     @instance
     @name app
     */
    this.app = app;

    if (Array.isArray(key)) {
        this.components = key;
        this.key = key.join(".");
    } else {
        /**
         @property {string} key The string representation of the Key (read-only).
         @memberof Key
         @instance
         @name key
         */
        this.key = key;

        /**
         @property {array} components The components of the Key (read-only).
         @memberof Key
         @instance
         @name components
         */
        this.components = (key.length === 0) ? [] : key.split(".");
    }

    // Generate a uuid to use as a reference to this key
    this.uuid = uuid.v4();

    // Map from (concrete) keystring to highest vts of value delivered to the listener
    this.latest = {};
}

module.exports = Key;

/**
 @property {string} lastComponent The last component of the Key (read-only).
 @memberof Key
 @instance
 @name lastComponent
 @description
 
 If the original key is the root key (has no components), this function returns null.

 */
Key.prototype.lastComponent = function() {
    return (this.components.length === 0) ? null : this.components[this.components.length-1];
};

/**
 @property {boolean} isPattern A boolean value that indicates if the Key is a key pattern (read-only).
 @memberof Key
 @instance
 @name isPattern
 */
Key.prototype.isKeyPattern = function() {
    return ((this.components.indexOf("*") !== -1) || (this.components.indexOf("#") !== -1));
};

/**
 @property {object} error If the key is invalid, an error value specifying the problem (read-only).
 @memberof Key
 @instance
 @name error
 */
Key.prototype.error = function() {

    var keyCharsRegex = /[a-z0-9_\-]/gi;
    var err = null;

    // Check number of components is <= 16
    if (this.components.length > 16) {
        err = new Error("Key contains more than 16 components");
        err.code = constants.InvalidKey;
        return err;
    }

    var keyLength = this.components.length-1;    // Init with the number of separators

    // Check each component for valid structure
    var index;
    for (index = 0; index < this.components.length; index++) {
        var part = this.components[index];

        // Each component must be non-empty
        if (part === "") {
            err = new Error("Key contains empty component");
            err.code = constants.InvalidKey;
            return err;
        }

        // Each component must be a wildard or contain only valid key characters
        if ((part === "*") ||           // Asterisk can appear anywhere
            (part === "#" && index == (this.components.length-1)) ||  // Pound must be last component
            ((part.match(keyCharsRegex) || []).length === part.length)) {
                // null then path
            } else {
                err = new Error("Key contains invalid character");
                err.code = constants.InvalidKey;
                return err;
            }

            keyLength += part.length;
    }

    // Check keyString length <= 200
    if (keyLength > 200) {
        err = new Error("Key exceeds maximum length of 200 characters");
        err.code = constants.InvalidKey;
        return err;
    }
    
    return null;
};

/**
 @function parent
 @memberof Key
 @instance
 @description

 Returns a new CSync Key made by removing the last component from the original key.

 If the original key is the root key (has no components), this function returns a copy of the root key.

 @return A Key object made by removing the last component from the original key.
 */
Key.prototype.parent = function() {
    var len = this.components.length-1;
    return new Key(this.app, this.components.slice(0,len).join("."));
};

/**
 @function child
 @memberof Key
 @instance
 @description

 Returns a new CSync Key made by appending a component to the original key.

 The child name parameter is optional and when not specified, a unique id is used as the child name.

 @param {string} child [Optional] The component to append to the receiving key.
                       This component must conform to rules for CSync Key strings described above.

 @return A Key object made by appending the `child` component to the original key.
 */
Key.prototype.child = function(child) {

    child = child || uuid.v4();
    var keyStr = this.components.concat(child).join(".");
    return new Key(this.app, keyStr);
};

/**
 @function write
 @memberof Key
 @instance
 @description

 Writes the specified data to the persistent key/value store for the given key.

 The key specified for the write may not contain wildcards.
 The user must have write permisson to the entry for this key or the write is rejected.

 @param {object} data - an object that can be serialized to a string with JSON.stringify 
                        or a primitive piece of data.
 @param options - options for the write.  May contain acl, later to support schema

 @return a promise that is fulfilled with the response from the service when it
    has accepted or rejected the write
 */
Key.prototype.write = function(data, options) {
    var deferred = when.defer();

    options = options || {};

    var op = Operation.pub(this);

    if (_.isString(data)) {
        op.data = data;
    } else if (typeof(data) === "object") {
        op.data = JSON.stringify(data);
    } else if (data !== undefined) {
        // All other data types are an error
        var error = new Error("Value for data is not string or object type.");
        error.code = constants.RequestError;
        deferred.reject(error);
        return deferred.promise;
    }

    if (options.acl !== undefined && options.acl.id !== undefined) {
        op.aclid = options.acl.id;
    }

    op.callback = function(error) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve("ok");
        }
    };

    this.app.addOperation(op);

    return deferred.promise;
};

/**
 @function delete
 @memberof Key
 @instance
 @description

 Deletes the key and its data from the CSync store.

 The key specified on delete may contain wildcards, which specifies that all keys in the
 CSync store matching the key patterns are deleted.  Only keys for which the user has delete
 permission are deleted.

 @return a promise that is fulfilled with the response from the service when it
         has accepted or rejected the delete
 */
Key.prototype.delete = function() {
    var deferred = when.defer();

    var op = Operation.pub(this);
    op.deletePath = true;

    op.callback = function(error) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve("ok");
        }
    };

    this.app.addOperation(op);

    return deferred.promise;
};

/**
 @function listen
 @memberof Key
 @instance
 @description

 Register a listener callback for the specified key/key pattern.

 Registers a callback to receive the current value and value updates for a specified key
 or keys matching a pattern. Values are delivered to the specified listener along with the
 associated key, ACL, and a flag that indicates if the key has been deleted. Only keys/values
 for which the user has at least read access are delivered.

 A Key object may have at most one listener.  If listen is called for a Key that already
 has a registered listener, the prior listener is removed and replaced with the one specified
 on this call.

 @param {function} listener - callback to receive values for the specified key(s). The values
                              will be either a string representation of the data or Object if 
                              the data stored is in JSON format.

 @return void
 */
Key.prototype.listen = function(listener) {

    logger.debug("listen for key "+this.key);

    var self = this;  // capture this for use in closures

    if (this.error() !== null) {
        process.nextTick(function() {
            if (listener.listener !== null) {
                listener.listener(self.error, null);
            }
        });

        return;
    }

    this.listener = listener;

    // add listener to the app
    this.app.addListener(this);
};

/**
 @function unlisten
 @memberof Key
 @instance
 @description

 Unregister listener from receiving value updates for a specified key or keys matching a pattern.

 @return void
 */
Key.prototype.unlisten = function() {
    logger.debug("unlisten for key "+this.key);

    // remove listener from the app
    this.listener = null;

    // Remove listener from the app
    this.app.removeListener(this);
};

/* Return true if the concrete key `other` matches this key (which may be a key pattern) */
Key.prototype.matches = function(/*{String}*/other) {
    if (!this.isKeyPattern()) {
        return (this.key === other);
    }

    var components = other.split(".");
    for (var i = 0; i < this.components.length; ++i) {
        // # matches zero or more parts.
        if (this.components[i] === '#') {
            return true;
        }

        // Other key is shorter than key pattern, so no match
        if (components.length-1 < i) {
            return false;
        }

        if ((components[i] !== this.components[i]) && (this.components[i] !== "*")) {
            return false;
        }
    }
    
    return (this.components.length === components.length);
};

/* Deliver a value to the listener on a new stack, if still listening and the most recent value  */
Key.prototype.deliver = function(/*{Value}*/value) {

    var self = this;  // capture this for use in closures

    process.nextTick(function() {
        if (self.listener !== null) {
            var lastvts = self.latest[value.key] || 0;
            if (lastvts < value.vts) {
                self.latest[value.key] = value.vts;
                self.listener(null, value);
            }
        }
    });

};
