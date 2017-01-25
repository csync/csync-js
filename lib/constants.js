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

/**
 @enum CSync Error Codes
 @type {Int}
 */

var ErrorCodes = {
    /** CSync encountered an error. This is a non-recoverable error. */
    InternalError : 1,
    /** The key for this request is not valid. */
    InvalidKey : 2,
    /** The request specified invalid parameters. */
    InvalidRequest : 3,
    /** The request failed at the CSync server. */
    RequestError : 4
};

ErrorCodes.setup = function(obj) {

    obj.InternalError = ErrorCodes.InternalError;
    Object.defineProperty(obj, "InternalError", { writable: false });

    obj.InvalidKey = ErrorCodes.InvalidKey;
    Object.defineProperty(obj, "InvalidKey", { writable: false });

    obj.InvalidRequest = ErrorCodes.InvalidRequest;
    Object.defineProperty(obj, "InvalidRequest", { writable: false });

    obj.RequestError = ErrorCodes.RequestError;
    Object.defineProperty(obj, "RequestError", { writable: false });
};

module.exports = ErrorCodes;
