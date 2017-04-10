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

var expect = require('chai').expect;
var assert = require('chai').assert;

var uuid = require('node-uuid');
var when = require('when');
var conf = require('config');

describe('Integration Tests', function() {
    var host          = (process.env.CSYNC_HOST !== undefined) ? process.env.CSYNC_HOST : conf.CSYNC_HOST;  
    var port          = (process.env.CSYNC_PORT !== undefined) ? process.env.CSYNC_PORT : conf.CSYNC_PORT; 
    var ssl           = (process.env.CSYNC_SSL === "1") ? true : false;
    var config        = { host: host, port: port, useSSL: ssl};
    var provider      = process.env.CSYNC_DEMO_PROVIDER ? process.env.CSYNC_DEMO_PROVIDER : "demo";
    var token         = process.env.CSYNC_DEMO_TOKEN ? process.env.CSYNC_DEMO_TOKEN : "demoToken";

    var csync = require('../../index');

    var keys = [];
    var jsKey = "tests.javascript";

    // Unlisten and delete key used by test
    function cleanUp(listenKey, keys) {
        listenKey.unlisten();
        for(var i=0; i<keys.length; i++) {
            keys[i].delete();
        }
    }

    this.timeout(20000);

    // MARK: - App tests

    describe('App tests', function() {

        it('authenticate CSync users', function(done) {

            var app = csync(config);
            app.authenticate(provider, token).then(function(authData) {
                expect(authData.uid).to.not.be.a('null');
                expect(authData.expires).to.be.above(Date.now()/1000);
                done();
            }).catch(function(error) {
                done(error);
            });

        });

        it('gracefully report authentication failures', function(done) {

            var app = csync(config);
            app.authenticate(provider, "This is a bad token").then(function(authData) {
                done(new Error("authenticate succeeded when it should have failed"));
            }).catch(function(error) {
                done();
            });

        });

        it('gracefully report unsupported auth providers', function(done) {

            var app = csync(config);
            app.authenticate("facebook", token).then(function(authData) {
                done(new Error("authenticate succeeded when it should have failed"));
            }).catch(function(error) {
                done();
            });

        });

    });

    // MARK: - Basic functions

    describe('Basic functions', function() {

        it('should listen and write appropriately', function(done) {

            var app = csync(config);
            var uid;
            app.authenticate(provider, token).then(function(authData) {
                uid = authData.uid;
            }).catch(function(error) {
                done(error);
            });

            var expectedValue = "This is some TestContentData";
            var expectedTime = Date.now();

            var writeKey = app.key(jsKey+".listen-and-write."+uuid.v4());
            var listenKey = app.key(jsKey+".listen-and-write.*");

            listenKey.listen(function(error, value) {
                expect(error).to.be.a('null');
                // Only assert for the test message. If it doesn't come the test will fail with a timeout
                if (value.key === writeKey.key) {
                    var data = value.data; // NOTE: clients are expected to parse JSON if they are using it.
                    // Assert
                    expect(data.value).to.be.equal(expectedValue);
                    expect(data.time).to.be.equal(expectedTime);
                    expect(value.creator).to.be.equal(uid);
                    // Clean up
                    cleanUp(listenKey, [writeKey]);
                    done();
                }
            });

            // write to the path we are listening
            var value = {value: expectedValue, time: expectedTime};
            writeKey.write(value);
        });

        it('should advance properly', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".advance."+uuid.v4());
            var numWrites = 5;

            // Do some writes
            var doWrite = function(i) {
                var msg = {value: i};
                testKey.write(msg);
            };
            for (var i=0; i<=numWrites; i++) {
                setTimeout(doWrite, i*100, i);
            }

            var listener = function(error, value) {
                expect(error).to.be.a('null');
                // Only assert for the test message. If it doesn't come the test will fail with a timeout
                if (value.key === testKey.key) {
                    var data = value.data; // NOTE: clients are expected to parse JSON if they are using it.

                    if (data.value < numWrites) {
                        console.log("Got intermediate write to key: "+data);
                        return;
                    } else {
                        // Clean up
                        cleanUp(testKey, [testKey]);
                        done();
                    }
                }
            };

            setTimeout(function() {
                testKey.listen(listener);
            }, 2000+numWrites*100);
        });

        it('should advance for listens with wildcards', function(done) {
            this.timeout(20000);

            var app = csync(config);
            app.authenticate(provider, token);


            var listenKey = app.key("foo.#");
            var writeKeys = [ "foo", "foo."+uuid.v4(), "foo.bar."+uuid.v4(), "foo."+uuid.v4()+".bar.baz" ];

            var count = 0;
            var listener = function(error, value) {
                expect(error).to.be.a('null');
                if (writeKeys.indexOf(value.key) != -1) {
                    //console.log(">>>>>> Got write for key: "+value.key);
                    count = count+1;
                    if (count === writeKeys.length) {
                        // Success!

                        // Clean up
                        cleanUp(listenKey, [app.key(writeKeys[3]), app.key(writeKeys[2]), app.key(writeKeys[1]), app.key(writeKeys[0])]);
                        done();
                    }
                }
            };

            // Do some writes
            writeKeys.forEach(function (keyStr) {
                var msg = {value: "value for key "+keyStr};
                app.key(keyStr).write(msg);
            });

            setTimeout(function() {
               listenKey.listen(listener);
            }, 2000);
        });

        it('should properly handle multiple listens on the same key', function(done) {
            this.timeout(10000);

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey1 = app.key(jsKey+".unlisten."+uuid.v4());
            var testKey2 = app.key(testKey1.key);

            var count = 0;
            var listener = function(error, value) {
                expect(error).to.be.a('null');
                var data = value.data;
                count += 1;
                if (count === 2) {
                    testKey1.unlisten();
                    setTimeout(function() {
                        var msg1 = {when: "after"};
                        testKey1.write(msg1);
                    }, 1000);

                } else if (count === 3) {
                    expect(data.when).to.be.equal("after");
                    // Success!

                    // Clean up
                    cleanUp(testKey2, [testKey1]);
                    done();
                }
            };

            testKey1.listen(listener);
            testKey2.listen(listener);

            setTimeout(function() {
                var msg1 = {when: "before"};
                testKey1.write(msg1);
            }, 1000);

        });

        it('should properly handle repeated listens on the same key', function(done) {
            this.timeout(10000);

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".repeatListensOnKey."+uuid.v4());

            var count = 0;
            var vts = 0;
            var listener = function(error, value) {
                count += 1;
                if (count === 1) {
                    vts = value.vts;
                    testKey.unlisten();
                    setTimeout(function() {
                        testKey.listen(listener);
                    }, 1000);
                } else {
                    expect(value.vts).to.be.equal(vts);
                    // Clean up
                    cleanUp(testKey, [testKey]);
                    done();
                }
            };

            testKey.listen(listener);

            setTimeout(function() {
                var msg1 = {data: "data"};
                testKey.write(msg1);
            }, 1000);

        });

        it('should properly not return deleted values from db on listen', function(done) {
            this.timeout(10000);

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".shouldnotreturndeletesfromdb."+uuid.v4());

            var count = 0;
            var vts = 0;
            var listener = function(error, value) {
                count += 1;
                if (count === 1) {
                    console.log("got first");
                    testKey.delete();
                }
                else if (count === 2) {
                    console.log("got 2nd");
                    testKey.unlisten();
                    setTimeout(function() {
                        testKey.listen(listener);
                    }, 1000);
                    setTimeout(function() {
                        done();
                    }, 5000);
                } else {
                    console.log("got 3rd");
                    assert.fail();
                }
            };

            testKey.listen(listener);

            setTimeout(function() {
                var msg1 = {data: "data"};
                testKey.write(msg1);
            }, 1000);

        });

        it('should handle multiple listens on the same key object', function(done) {
            this.timeout(10000);

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".multilisten."+uuid.v4());

            var listener2 = function(error, value) {
                expect(error).to.be.a('null');
                var data = value.data;
                expect(data.when).to.be.equal("after");
                testKey.unlisten();
                expect(app.hasListener(testKey.key)).to.be.equal(false);
                // Success!
                done();
                testKey.delete();
            };

            var listener1 = function(error, value) {
                expect(error).to.be.a('null');
                var data = value.data;
                expect(data.when).to.be.equal("before");

                testKey.listen(listener2);

                setTimeout(function() {
                    var msg2 = {when: "after"};
                    testKey.write(msg2);
                }, 1000);
            };

            testKey.listen(listener1);

            setTimeout(function() {
                var msg1 = {when: "before"};
                testKey.write(msg1);
            }, 1000);

        });

        it('should fulfill promises for write operations', function(done) {
            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".promiseTest."+uuid.v4());

            var start = Date.now();
            var msg = {value: 42};
            testKey.write(msg).then(function(result) {
                //console.log("got write result "+result+" after "+(Date.now()-start)+" millis");
                done();
                testKey.delete();
            }).catch(function(error) {
                done(error);
            });
        });

        it('should handle write with null data', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".null-write." + uuid.v4());

            testKey.listen(function(error, value) {
                expect(error).to.be.a('null');
                var data = value.data;
                // Assert
                expect(data).to.be.equal(null);
                // Clean up
                cleanUp(testKey, [testKey]);
                done();
            });

            // write null to the path we are listening
            testKey.write(null);
        });

        it('should handle write with undefined data', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".write-with-undefined-data." + uuid.v4());

            testKey.listen(function(error, value) {
                expect(error).to.be.a('null');
                var data = value.data;
                // Assert
                expect(data).to.be.an('undefined');
                // Clean up
                cleanUp(testKey, [testKey]);
                done();
            });

            // write null to the path we are listening
            testKey.write(undefined);
        });

/*
        // This test passes but can't be run in automation

        it('should listen for keys with no data', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key("try.that");

            testKey.listen(function(error, value) {
                expect(error).to.be.a('null');
                var data = value.data;
                // Assert
                expect(data).to.be.undefined;
                // Clean up
                testKey.unlisten();
                done();
            });
        });
*/
        it('should delete and deliver deletes to listeners appropriately', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var expectedValue = "This is some TestContentData";
            var expectedTime = Date.now();

            var writeKey = app.key(jsKey+".listen-and-delete."+uuid.v4());
            var listenKey = app.key(jsKey+".listen-and-delete.*");

            listenKey.listen(function(error, value) {
                expect(error).to.be.a('null');
                // Only assert for the test message. If it doesn't come the test will fail with a timeout
                if (value.key === writeKey.key) {
                    if (value.exists) {
                        var data = value.data; // NOTE: clients are expected to parse JSON if they are using it.
                        // Assert
                        expect(data.value).to.be.equal(expectedValue);
                        expect(data.time).to.be.equal(expectedTime);
                    } else {
                        // Clean up
                        listenKey.unlisten();
                        done();
                    }
                }
            });

            // write to the path we are listening
            var value = {value: expectedValue, time: expectedTime};
            writeKey.write(value);

            setTimeout(function() {
                writeKey.delete();
            }, 1000);

        });

        it('should fulfill promises for delete operations', function(done) {
            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".promiseTest."+uuid.v4());

            var start = Date.now();
            var msg = {value: 42};
            testKey.write(msg).then(function(result) {
                //console.log("got write result "+result+" after "+(Date.now()-start)+" millis");
                return testKey.delete();
            }).then(function(result) {
                //console.log("got delete result "+result+" after "+(Date.now()-start)+" millis");
                done();
            }).catch(function(error) {
                done(error);
            });
        });

        it('should be able to delete on a wildcard', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);
            var uuidString = uuid.v4();
            var testKey = app.key(jsKey+".delete-asterisk-test."+uuidString+".a");
            var deleteKey = app.key(jsKey+".delete-asterisk-test."+uuidString+".*");
            var value = "testData";
            testKey.write(value).then(function(result){
                testKey.listen(function(error, value) {
                    if(value.exists === false && error === null){
                        done();
                    }
                });
                deleteKey.delete();
            });
        });

    });

    // MARK: - Error cases

    describe('Error cases', function() {

        it('should reject writes to root', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var rootKey = app.key("");      // Root is a special key with no data

            var value = {foo: "bar"};

            rootKey.write(value).then(function(result) {
                done("write succeeded but should have failed");
            }).catch(function(error) {
                expect(error.code).to.be.equal(csync.RequestError);
                done();
            });
        });

        it('should reject writes for primative types other than string', function(done) {

            var app = csync(config);
            app.authenticate(provider, token);

            var testKey = app.key(jsKey+".write-for-primative-value."+uuid.v4);

            var value = 3;

            testKey.write(value).then(function(result) {
                done("write succeeded but should have failed");
            }).catch(function(error) {
                expect(error.code).to.be.equal(csync.RequestError);
                done();
            });
        });

        it('should not be able to write on a wildcard', function(done) {

            var app = csync(config);
            app.authenticate(provider, token).then(function(authData){
                var writeKey = app.key(jsKey+".delete-asterisk-test."+uuid.v4()+".*");
                var value = "testData";
                writeKey.write(value).catch(function(error){
                    expect(error.code).to.be.equal(csync.RequestError);
                    done();
                });
            });
        });

    });

});
