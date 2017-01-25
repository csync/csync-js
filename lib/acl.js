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
 @class Acl
 @classdesc  CSync Access Control Lists

 Each key in the CSync store has an associated access control list (ACL) that specifies which users
 can access the key.  Currently, three specific forms of access are defined:

 *Read:* Users with read permission may read the data for the key.
 *Write:* Users with write permission may write the data for the key.
 *Create:* Users with create permission may create child keys of this key.

 The creator of a key in the CSync store has special permissions to the key.
 In particular, the creator always has Read, Write and Create permission.
 Permission to delete the key and change its ACL are currently reserved to the creator.

 An ACL specifies the set of users to be granted Read, Write anc Create access to the key.
 CSync provides eight "static" ACLs that can be used to provide any combination of
 Read, Write, and Create access to just the key's creator or all users.

 */
function Acl(id) {
    if (!(this instanceof Acl)) {
        return new Acl(id);
    }

    /**
     @property {string} id The string identifier (read-only).
     @memberof Acl
     @instance
     @name id
     */
    this.id = id;
}

exports = module.exports = Acl;

/**
 @memberof Acl
 @name Private

 A static ACL that permits only the creator read, write and create access.
 */
exports.Private = new Acl("$private");

/*
 @memberof Acl
 @name PublicRead

 A static ACL that permits all users read access, but only the creator has write and create access.
 */
exports.PublicRead = new Acl("$publicRead");

/*
 @memberof Acl
 @name PublicWrite

 A static ACL that permits all users write access, but only the creator has read and create access.
 */
exports.PublicWrite = new Acl("$publicWrite");

/*
 @memberof Acl
 @name PublicCreate

 A static ACL that permits all users create access, but only the creator has read and write access.
 */
exports.PublicCreate = new Acl("$publicCreate");

/*
 @memberof Acl
 @name PublicReadWrite

 A static ACL that permits all users read and write access, but only the creator has create access.
 */
exports.PublicReadWrite = new Acl("$publicReadWrite");

/*
 @memberof Acl
 @name PublicReadCreate

 A static ACL that permits all users read and create access, but only the creator has write access.
 */
exports.PublicReadCreate = new Acl("$publicReadCreate");

/*
 @memberof Acl
 @name PublicWriteCreate

 A static ACL that permits all users write and create access, but only the creator has read access.
 */
exports.PublicWriteCreate = new Acl("$publicWriteCreate");

/*
 @memberof Acl
 @name PublicReadWriteCreate

 A static ACL that permits all users read, write and create access.
 */
exports.PublicReadWriteCreate = new Acl("$publicReadWriteCreate");
