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

module.exports = function(grunt) {
  // load plugins in a just in time fashion
  require('jit-grunt')(grunt, {
    execute: 'grunt-execute',
    jshint: 'grunt-contrib-jshint',
    mochaTest: 'grunt-mocha-test',
    mocha_istanbul: 'grunt-mocha-istanbul',
    karma: 'grunt-karma',
    watch: 'grunt-contrib-watch',
    jsdoc: 'grunt-jsdoc',
    browserify:'grunt-browserify'
  });

  // Time recording for tasks ran
  require('time-grunt')(grunt);

  var projectFiles = ['lib/*.js', './*.js'];   
  var testFiles = ['test/*/*.js','!test/browser/bundle.js'];

  // project configuration
  grunt.initConfig({
    execute: {
      target: {
        src: ['index.js']
      }
    },

    mochaTest: {
      all: {
        options: {
          reporter: 'spec'
        },
        src: testFiles
      }
    },

    mocha_istanbul: {
      coverage: {
        src: testFiles,
        options: {
          reporter: 'spec'
        }
      }
    },

    jsdoc: {
      dist: {
        src: projectFiles.concat(['./README.md']),
        dest: 'docs',
        options: {
            configure: './conf.json'
        }
      }
    },

    browserify: {
         dist: {
            options: {
                transform: [
                    ["envify", { }],
                    ["babelify", { loose: "all" }]
                ]
            },
            files: {
               // if the source file has an extension of es6 then
               // we change the name of the source file accordingly.
               // The result file's extension is always .js
               "./test/browser/bundle.js": ["./test/unit/*.js","./test/integration/*.js"]
            }
         }
      },

    karma: {
        options: {
            frameworks: ['mocha'],
            files: [ "./test/browser/bundle.js"],
            reporters: ['mocha'],
            plugins: ['karma-mocha','karma-mocha-reporter','karma-safari-launcher','karma-chrome-launcher','karma-firefox-launcher'],
            colors: true,
            logLevel: 'ERROR',
            singleRun: true,
            retryLimit: 0,
            concurrency: 1
        },
        Safari: {
            browsers: ['Safari']
        },
        Chrome: {
            browsers: ['Chrome']
        },
        Firefox: {
            browsers: ['Firefox']
        }
    },

    jshint: {
      dev: {
        options: {
          jshintrc: './.jshintrc',
          reporter: require('jshint-stylish')
        },
        src: projectFiles
      },
      tests: {
        options: {
          jshintrc: './.jshintrc',
          reporter: require('jshint-stylish')
        },
        src: testFiles
      }
    },

    watch: {
      express: {
        files: projectFiles,
        tasks:  [ 'run' ],
        options: {
          spawn: false 
        }
      }
    }
  });

  // TODO: make this task watch watch files while executing
  grunt.registerTask('run', ['jshint:dev', 'execute']);

  grunt.registerTask('test', ['jshint:dev', 'jshint:tests', 'mochaTest:all']);

  grunt.registerTask('coverage', ['mocha_istanbul:coverage']);

  grunt.registerTask('karmaTest', ['browserify:dist', 'karma:Chrome']);

  grunt.registerTask('dist', ['test', 'jsdoc']);
};
