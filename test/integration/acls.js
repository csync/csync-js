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

var expect = require('chai').expect;

var uuid = require('node-uuid');
var when = require('when');
var conf = require('config');

describe('Access Control Tests', function() {
    var host          = (process.env.CSYNC_HOST !== undefined) ? process.env.CSYNC_HOST : conf.CSYNC_HOST;  
    var port          = (process.env.CSYNC_PORT !== undefined) ? process.env.CSYNC_PORT : conf.CSYNC_PORT; 
    var ssl           = (process.env.CSYNC_SSL === "1") ? true : false;
    var config        = { host: host, port: port, useSSL: ssl};
    var provider      = process.env.CSYNC_DEMO_PROVIDER ? process.env.CSYNC_DEMO_PROVIDER : "demo";
    var token         = process.env.CSYNC_DEMO_TOKEN ? process.env.CSYNC_DEMO_TOKEN : "demoToken";

    var csync = require('../../index');
    var logger  = require('../../lib/logger')('test');

    var jsKey = "tests.javascript";

    function makeToken(forUser) {
        return token+'('+forUser+')';
    }

    // Unlisten and delete key used by test
    function cleanUp(key) {
        key.unlisten();
        key.delete();
    }

    this.timeout(10000);

    it('should set ACL from parent when no explict ACL given', function(done) {

        var app = csync(config);
        app.authenticate(provider, token);

        var testKey = app.key(jsKey+".default-acl."+uuid.v4());

        var expectedValue = "This is some TestContentData";

        testKey.listen(function(error, value) {
            expect(error).to.be.a('null');
            // Assert
            expect(value.data).to.be.equal(expectedValue);
            expect(value.acl).to.be.equal(csync.acl.PublicCreate.id);
            // Clean up
            cleanUp(testKey);
            done();
        });

        // write to the path we are listening on
        testKey.write(expectedValue);
    });

    it('should set specified ACL on write', function(done) {

        // The only guarantee given by CSync is that the listener *eventually* gets the most recent write.
        // Usually the listener also sees intermediate writes, but it is not "wrong" to only get the last write.
        var app = csync(config);
        app.authenticate(provider, token);

        var testKey = app.key(jsKey+".simple-write-with-acl."+uuid.v4());

        testKey.listen(function(error, value) {
            expect(error).to.be.a('null');
            expect(value.exists).to.be.equal(true);
            expect(value.data).to.be.equal("before");
            expect(value.acl).to.be.equal(csync.acl.PublicReadWrite.id);
            // Success!
            done();
            // Cleanup
            cleanUp(testKey);
        });

        // write to the path we are listening on
        testKey.write("before", {acl: csync.acl.PublicReadWrite});
    });

    it('should delete and add on ACL change', function(done) {

        // The only guarantee given by CSync is that the listener *eventually* gets the most recent write.
        // Usually the listener also sees intermediate writes, but it is not "wrong" to only get the last write.
        var app = csync(config);
        app.authenticate(provider, token);

        var testKey = app.key(jsKey+".switch-acl."+uuid.v4());

        testKey.listen(function(error, value) {
            expect(error).to.be.a('null');
            if (value.exists) {
                if (value.data === "after") {
                    expect(value.acl).to.be.equal(csync.acl.PublicRead.id);
                    // Success!
                    done();
                    // Cleanup
                    cleanUp(testKey);
                } else {
                    logger.debug("Got first pub.");
                    expect(value.acl).to.be.equal(csync.acl.PublicCreate.id);
                }
            } else {
                logger.debug("Got delete for first pub.");
                // Removed acl check on delete because data/acl may not be provided
            }
        });

        // write to the path we are listening on
        testKey.write("before",{acl: csync.acl.PublicCreate}).
            then(function (result) { return testKey.write("after",{acl: csync.acl.PublicRead}); });
    });

    it('should delete and add on multiple ACL change', function(done) {

        // The only guarantee given by CSync is that the listener *eventually* gets the most recent write.
        // Usually the listener also sees intermediate writes, but it is not "wrong" to only get the last write.
        var app = csync(config);
        app.authenticate(provider, token);

        var testKey = app.key(jsKey+".multiple-switch-acl."+uuid.v4());

        testKey.listen(function (error, value) {
            expect(error).to.be.a('null');
            if (value.exists) {
                if (value.data === "final") {
                    logger.debug("Got final pub with acl: " + value.acl);
                    expect(value.acl).to.be.equal(csync.acl.Private.id);
                    // Success!
                    done();
                    // Cleanup
                    cleanUp(testKey);
                } else {
                    logger.debug("Got intermediate pub: " + value.data + " with acl: " + value.acl);
                    if (value.data === "before") {
                        expect(value.acl).to.be.equal(csync.acl.PublicCreate.id);
                    } else {
                        expect(value.acl).to.be.equal(csync.acl.PublicRead.id);
                    }
                }
            } else {
                logger.info("Got delete for intermediate pub");
                // Removed acl check on delete because data/acl may not be provided
            }
        });

        // write to the path we are listening on
        testKey.write("before", {acl: csync.acl.PublicCreate}).
            then(function (result) { return testKey.write("after", {acl: csync.acl.PublicRead}); }).
            then(function (result) { return testKey.write("final", {acl: csync.acl.Private}); });
    });

    it('should not change creator on write', function(done) {
        this.timeout(10000);

        var uid1, uid2;

        // The only guarantee given by CSync is that the listener *eventually* gets the most recent write.
        // Usually the listener also sees intermediate writes, but it is not "wrong" to only get the last write.
        var app = csync(config);

        var testKey = app.key(jsKey+".write-does-not-change-creator."+uuid.v4());

        var listener = function(error, value) {
            expect(error).to.be.a('null');
            if (value.exists) {
                if (value.data === "after") {
                    expect(value.creator).to.be.equal(uid1);  // Creator should not change
                    // Success!
                    done();
                    // Cleanup
                    cleanUp(testKey);
                } else {
                    logger.debug("Got first pub.");
                    expect(value.creator).to.be.equal(uid1);
                }
            } else {
                logger.debug("Got delete for first pub.");
                // Removed acl check on delete because data/acl may not be provided
            }
        };

        app.authenticate(provider, makeToken("user1")).
            then(function (result) {
                uid1 = result.uid;
                testKey.listen(listener);
                return testKey.write("before",{acl: csync.acl.PublicReadWrite});
            }).delay(500).then(function (result) {
                return app.unauth();
            }).then(function (result) {
                return app.authenticate("demo", makeToken("user2"));
            }).then(function (result) {
                uid2 = result.uid;
                expect(uid2).to.not.be.equal(uid1);
                testKey.listen(listener);
                return testKey.write("after"); }).
            catch(function(error) {
                done(error);
            });

    });

    it('should reject writes when user does not have write access', function(done) {
        var app = csync(config);

        var testKey = app.key("tests.reject-write-no-access." + uuid.v4());

        app.authenticate("demo", makeToken("user1")).
            then(function (result) {
                return testKey.write("my stuff",{acl: csync.acl.PublicRead});
            }).delay(500).then(function (result) {
                app.unauth();
                return app.authenticate("demo", makeToken("user2"));
            }).then(function (result) {
                return testKey.write("let me in");
            }).then(function(result) {
                done("write succeeded but should have failed");
            }).catch(function(error) {
                expect(error.code).to.be.equal(csync.RequestError);
                done();
                app.unauth();
                return app.authenticate("demo", makeToken("user1"));
            }).then(function(result) {
                testKey.delete();
            });
    });

});
