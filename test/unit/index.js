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
var conf = require('config');

describe('CSync Unit Tests', function() {
    var host          = (process.env.CSYNC_HOST !== undefined) ? process.env.CSYNC_HOST : conf.CSYNC_HOST;  
    var port          = (process.env.CSYNC_PORT !== undefined) ? process.env.CSYNC_PORT : conf.CSYNC_PORT;
    var ssl           = (process.env.CSYNC_SSL === "1") ? true : false;
    var config        = { host: host, port: port, useSSL: ssl};

    var csync = require('../../index');

    describe('Acl Object Unit Tests', function() {
        it('should define static ACLs', function() {
            expect(csync.acl.Private.id).to.be.equal("$private");
            expect(csync.acl.PublicRead.id).to.be.equal("$publicRead");
            expect(csync.acl.PublicWrite.id).to.be.equal("$publicWrite");
            expect(csync.acl.PublicCreate.id).to.be.equal("$publicCreate");
            expect(csync.acl.PublicReadWrite.id).to.be.equal("$publicReadWrite");
            expect(csync.acl.PublicReadCreate.id).to.be.equal("$publicReadCreate");
            expect(csync.acl.PublicWriteCreate.id).to.be.equal("$publicWriteCreate");
            expect(csync.acl.PublicReadWriteCreate.id).to.be.equal("$publicReadWriteCreate");
        });
    });

    describe('App Object Unit Tests', function() {
        it('should return correct values for all its properties', function() {
            // Assert
            var app = csync(config);

            var versionRegex = new RegExp("^\\d+\.\\d+\.\\d+$");
            expect(versionRegex.test(app.sdkVersion)).to.be.equal(true);
            expect(app.host).to.be.equal(config.host);
            expect(app.port).to.be.equal(config.port);
        });
    });

    describe('Error Object Unit Tests', function() {
        it('should expose the public constants', function() {
            // Assert
            expect(csync.InternalError).to.be.equal(1);
            expect(csync.InvalidKey).to.be.equal(2);
            expect(csync.InvalidRequest).to.be.equal(3);
            expect(csync.RequestError).to.be.equal(4);
        });
    });


    describe('Key Object Unit Tests', function() {
        it('should handle valid keys', function() {

            var app = csync(config);

            var k1 = app.key("foo.bar.baz");
            expect(k1.key).to.be.equal("foo.bar.baz");
            expect(k1.app).to.be.equal(app);
            expect(k1.lastComponent()).to.be.equal("baz");
            expect(k1.isKeyPattern()).to.be.equal(false);
            expect(k1.error()).to.be.equal(null);

            // root key
            var k2 = app.key("");
            expect(k2.key).to.be.equal("");
            expect(k2.app).to.be.equal(app);
            expect(k2.lastComponent()).to.be.equal(null);
            expect(k2.isKeyPattern()).to.be.equal(false);
            expect(k2.error()).to.be.equal(null);

            // Key with max (16) components
            var k3 = app.key("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p");
            expect(k3.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p");
            expect(k3.lastComponent()).to.be.equal("p");
            expect(k3.app).to.be.equal(app);
            expect(k3.isKeyPattern()).to.be.equal(false);
            expect(k3.error()).to.be.equal(null);

            // Key with max length
            var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx." + // 50 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx." + // 50 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx." + // 50 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwxy"; // 50 chars
            expect(keyString.length).to.be.equal(200);
            var k4 = app.key(keyString);
            expect(k4.key).to.be.equal(keyString);
            expect(k4.app).to.be.equal(app);
            expect(k4.isKeyPattern()).to.be.equal(false);
            expect(k4.error()).to.be.equal(null);

            // Use constructor with array argument
            var k5 = app.key(["foo","bar","baz"]);
            expect(k5.key).to.be.equal("foo.bar.baz");
            expect(k5.app).to.be.equal(app);
            expect(k5.lastComponent()).to.be.equal("baz");
            expect(k5.isKeyPattern()).to.be.equal(false);
            expect(k5.error()).to.be.equal(null);

            // root key
            var k6 = app.key([]);
            expect(k6.key).to.be.equal("");
            expect(k6.app).to.be.equal(app);
            expect(k6.lastComponent()).to.be.equal(null);
            expect(k6.isKeyPattern()).to.be.equal(false);
            expect(k6.error()).to.be.equal(null);

            // Key with max (16) components
            var k7 = app.key(["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p"]);
            expect(k7.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p");
            expect(k7.lastComponent()).to.be.equal("p");
            expect(k7.app).to.be.equal(app);
            expect(k7.isKeyPattern()).to.be.equal(false);
            expect(k7.error()).to.be.equal(null);

            // Key with max length
            var keyArr = ["ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx", // 49 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx", // 49 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx", // 49 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwxy"]; // 50 chars
            var k8 = app.key(keyArr);
            expect(k8.key).to.be.equal(keyArr.join("."));
            expect(k8.key.length).to.be.equal(200);
            expect(k8.app).to.be.equal(app);
            expect(k8.isKeyPattern()).to.be.equal(false);
            expect(k8.error()).to.be.equal(null);

        });

        it('should handle keys with wildcards', function() {

            var app = csync(config);

            // asterisk
            var k1 = app.key("foo.*.baz");
            expect(k1.key).to.be.equal("foo.*.baz");
            expect(k1.app).to.be.equal(app);
            expect(k1.isKeyPattern()).to.be.equal(true);
            expect(k1.error()).to.be.equal(null);

            // pound
            var k2 = app.key("foo.bar.#");
            expect(k2.key).to.be.equal("foo.bar.#");
            expect(k2.app).to.be.equal(app);
            expect(k2.isKeyPattern()).to.be.equal(true);
            expect(k2.error()).to.be.equal(null);

            // multiple asterisk
            var k3 = app.key("foo.*.*");
            expect(k3.key).to.be.equal("foo.*.*");
            expect(k3.app).to.be.equal(app);
            expect(k3.isKeyPattern()).to.be.equal(true);
            expect(k3.error()).to.be.equal(null);

            // max asterisk
            var k4 = app.key("*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*");
            expect(k4.key).to.be.equal("*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*");
            expect(k4.app).to.be.equal(app);
            expect(k4.isKeyPattern()).to.be.equal(true);
            expect(k4.error()).to.be.equal(null);

            // max components with #
            var k5 = app.key("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.#");
            expect(k5.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.#");
            expect(k5.app).to.be.equal(app);
            expect(k5.isKeyPattern()).to.be.equal(true);
            expect(k5.error()).to.be.equal(null);

            // max compoents with * and #
            var k6 = app.key("a.b.c.*.e.f.g.*.i.j.k.*.m.n.o.#");
            expect(k6.key).to.be.equal("a.b.c.*.e.f.g.*.i.j.k.*.m.n.o.#");
            expect(k6.app).to.be.equal(app);
            expect(k6.isKeyPattern()).to.be.equal(true);
            expect(k6.error()).to.be.equal(null);
        });

        it('should detect invalid key errors', function() {

            var app = csync(config);

            // too many components
            var k1 = app.key("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q");
            expect(k1.error()).to.be.not.equal(null);

            // empty string component
            var k2 = app.key("a..c");
            expect(k2.error()).to.be.not.equal(null);

            // pound not final component
            var k3 = app.key("a.#.c");
            expect(k3.error()).to.be.not.equal(null);

            // wildcard does not appear alone
            var k4 = app.key("a.b*.c");
            expect(k4.error()).to.be.not.equal(null);

            // key exceeds maximum size (200 chars)
            var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx." + // 50 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx." + // 50 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwx." + // 50 chars
                "ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwxyz"; // 51 chars
            expect(keyString.length).to.be.equal(201);
            var k5 = app.key(keyString);
            expect(k5.error()).to.be.not.equal(null);

            // component contains illegal character (.)
            var k6 = app.key(".");
            expect(k6.error()).to.be.not.equal(null);

            // component contains illegal character (:)
            var k7 = app.key("abcdefghijklm:nopqrstuvwxyz");
            expect(k7.error()).to.be.not.equal(null);

            // component contains sll illegal characters
            var k7a = app.key("[]()$@!?");
            expect(k7a.error()).to.be.not.equal(null);

            // too many components
            var k8 = app.key("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p");
            var k9 = k8.child("q");
            expect(k9.error()).to.be.not.equal(null);
        });

        it('should give correct results for parent API', function() {

            var app = csync(config);

            var k16 = app.key("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p");

            var k15 = k16.parent();
            expect(k15.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o");

            var k14 = k15.parent();
            expect(k14.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n");

            var k13 = k14.parent();
            expect(k13.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m");

            var k2 = k13.parent().parent().parent().parent().parent().parent().parent().parent().parent().parent().parent();
            expect(k2.key).to.be.equal("a.b");

            var k1 = k2.parent();
            expect(k1.key).to.be.equal("a");

            var k0 = k1.parent();
            expect(k0.key).to.be.equal("");

            var k = k0.parent();
            expect(k.key).to.be.equal("");
        });

        it('should give correct results for child API', function() {

            var app = csync(config);

            var k0 = app.key("");

            var k1 = k0.child("a");
            expect(k1.key).to.be.equal("a");

            var k2 = k1.child("b");
            expect(k2.key).to.be.equal("a.b");

            var k3 = k1.child();
            expect(k3.parent().key).to.be.equal(k1.key);

            var k13 = k2.child("c").child("d").child("e").child("f").child("g").child("h").child("i").child("j").child("k").child("l").child("m");
            expect(k13.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m");

            var k14 = k13.child("n");
            expect(k14.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n");

            var k15 = k14.child("o");
            expect(k15.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o");

            var k16 = k15.child("p");
            expect(k16.key).to.be.equal("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p");
        });

        it('should give correct results for matches API', function() {

            var app = csync(config);

            // Test concrete keys
            var k1 = app.key("foo.bar.baz");

            // Matches
            expect(k1.matches("foo.bar.baz")).to.be.equal(true);

            // Non-matches
            expect(k1.matches("foo.bar")).to.be.equal(false);
            expect(k1.matches("foo.bar.baz.qux")).to.be.equal(false);
            expect(k1.matches("foo.#")).to.be.equal(false);
            expect(k1.matches("foo.*.baz")).to.be.equal(false);
            expect(k1.matches("")).to.be.equal(false);

            var k2 = app.key("");

            // Matches
            expect(k2.matches("")).to.be.equal(true);

            // Non-matches
            expect(k2.matches("foo")).to.be.equal(false);
            expect(k2.matches("foo.bar")).to.be.equal(false);

            // Test keys with "*"

            var k3 = app.key("foo.*.baz");

            // Matches
            expect(k3.matches("foo.bar.baz")).to.be.equal(true);
            expect(k3.matches("foo.foo.baz")).to.be.equal(true);
            expect(k3.matches("foo.foo-foo-foo-foo-foo-foo-foo-foo-foo.baz")).to.be.equal(true);

            // Non-matches
            expect(k3.matches("foo.bar")).to.be.equal(false);
            expect(k3.matches("foo.bar.baz.qux")).to.be.equal(false);
            expect(k3.matches("foo.#")).to.be.equal(false);
            //expect(k.matches("foo.*.baz"))    // Invalid test since other is not valid concrete key

            // Test keys with "#"

            var k4 = app.key("foo.bar.#");

            // Matches
            expect(k4.matches("foo.bar.baz")).to.be.equal(true);
            expect(k4.matches("foo.bar")).to.be.equal(true);
            expect(k4.matches("foo.bar.2.3.4.5.6.7.8.9.a.b.c.d.e.f")).to.be.equal(true);

            // Non-matches
            expect(k4.matches("foo")).to.be.equal(false);
            expect(k4.matches("foo.baz")).to.be.equal(false);
            expect(k4.matches("foo.baz.bar")).to.be.equal(false);

            // Test keys with multiple "*"

            var k5 = app.key("foo.*.baz.*");

            // Matches
            expect(k5.matches("foo.bar.baz.qux")).to.be.equal(true);
            expect(k5.matches("foo.a.baz.b")).to.be.equal(true);

            // Non-matches
            expect(k5.matches("foo.bar")).to.be.equal(false);
            expect(k5.matches("foo.bar.baz")).to.be.equal(false);
            expect(k5.matches("foo.bar.bar.bar")).to.be.equal(false);
            expect(k5.matches("foo.bar.baz.bar.baz")).to.be.equal(false);

            // Test keys with "*" and "#"

            var k6 = app.key("foo.*.baz.#");

            // Matches
            expect(k6.matches("foo.bar.baz.qux")).to.be.equal(true);
            expect(k6.matches("foo.a.baz.b")).to.be.equal(true);
            expect(k6.matches("foo.bar.baz")).to.be.equal(true);
            expect(k6.matches("foo.bar.baz.3.4.5.6.7.8.9.a.b.c.d.e.f")).to.be.equal(true);

            // Non-matches
            expect(k6.matches("foo.bar")).to.be.equal(false);
            expect(k6.matches("foo.bar.bar.bar")).to.be.equal(false);
        });

    });
});
