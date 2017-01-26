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

describe('Special cases', function() {
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

    this.timeout(10000);

    it('should handle concurrent conflicting pubs', function(done) {

        var app = csync(config);
        app.authenticate(provider, token);

        var base = uuid.v4();
        var listenKey = app.key(base+".#");

        var writeKeys = [ base+".1.2.3.4.5.6.7.8.9.a.b.c.d.e.f", base+".a", base ];

        var count = 0;
        var listener = function(error, value) {
            //console.log(">>>>>> Got write for key: "+value.key);
            count = count+1;
            if (count === writeKeys.length) {
                // Success!

                // Clean up
                cleanUp(listenKey, [app.key(writeKeys[0]), app.key(writeKeys[1]), app.key(writeKeys[2])]);
                done();
            }
        };

       listenKey.listen(listener);

        // Do some writes
        writeKeys.forEach(function (keyStr) {
            var msg = {value: "value for key "+keyStr};
            app.key(keyStr).write(msg);
        });
    });

    it('should handle Adams pqsl failure', function(done) {

        var app = csync(config);
        app.authenticate(provider, token);

        var testKey = app.key(jsKey+".adambrokeit."+uuid.v4());

        // write then delete and then write again
        testKey.write("before").
            then(function(result) {return testKey.delete();}).
            then(function(result) {return testKey.write("after");}).
            then(function(result) {done(); testKey.delete();});

    });

});
