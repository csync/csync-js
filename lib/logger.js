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

// Levels

function Debug(chan) {

    if (!(this instanceof Debug)) {
        return new Debug(chan);
    }

    var self = this;
    self.enableDebug = false;
    self.enableTrace = false;
    self.enableInfo = true;
    self.enableWarning = false;
    self.enableError = true;

    function doit(flag,what,args,func) {
        if (flag) {
            if (args.length == 1) {
                func('[%s:%s] %s',chan,what,args[0]);
            } else {
                args[0] = '[' + chan + ':' + what + '] ';
                func.apply(null,args);
            }
        }
    }            

    self.trace = function() {
        doit(self.enableTrace,'trace',arguments,console.log);
    };

    self.debug = function() {
        doit(self.enableDebug,'debug',arguments,console.log);
    };
 
    self.info = function() {
        doit(self.enableInfo,'info',arguments,console.log);
    };

    self.error = function() {
        doit(self.enableError,'error',arguments,console.log);
    };

    self.warning = function() {
        doit(self.enableWarning,'warning',arguments,console.log);
    };

}

var channels = {};

function get(chan) {
    var x = channels[chan];
    if (!x) {
        x = new Debug(chan);
        channels[chan] = x;
    }
    return x;
}

module.exports = get;