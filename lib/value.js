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
 @class Value
 @classdesc

 A CSync Value object is an immutable image of the value and metadata for a CSync Key/Value pair
 stored by the CSync service.

 */
function Value(payload) {

    var path = payload.path;

    /**
     @property {string} key The string representation of the Key (read-only).
     @memberof Value
     @instance
     @name key
     */
    this.key = path.join(".");

    /**
     @property {boolean} exists A boolean value that indicates whether the entry exists (true) or has been deleted (false) (read-only).
     @memberof Value
     @instance
     @name exists
     */
    this.exists = payload.deletePath ? false : true;

    /**
     @property {boolean} stable A boolean value that indicates whether the entry has been accepted and stored on the server (YES)
	    or is a local write that is pending confirmation by the server (NO) (read-only).
     @memberof Value
     @instance
     @name stable
     */
    this.stable = true;

    /**
     @property {Object} data The data for this entry (read-only).
     @memberof Value
     @instance
     @name data
     */
    // Attempt to parse payload data to a JSON for convience to the client.
    // When unable to parse the data will be set to its primitive value.
    try {
        this.data = JSON.parse(payload.data);
    }
    catch(err) {
        this.data = payload.data;
    }   

    /**
     @property {string} acl The id of the access control list associated with this entry (read-only).
     @memberof Value
     @instance
     @name acl
     @description

     Values that are stable will always have an associated acl.  The acl for a local write may not be known
     until the write is accepted by the server, so the aclid may not be set for non-stable entries.

     */
    this.acl = payload.acl;

    /**
     @property {string} creator The uid of the creator of this entry (read-only).
     @memberof Value
     @instance
     @name creator
     */
    this.creator = payload.creator;

    this.cts = payload.cts;
    this.vts = payload.vts;
}

module.exports = Value;
