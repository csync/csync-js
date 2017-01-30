## Coding guidelines

Contributions to the CSync JS SDK should use the good JavaScript coding style.
The project is set up so that developers can use [jshint][jshint] to check for common
violations of proper JavaScript coding style.

[jshint]: http://jshint.com

## Documentation

All code changes should include comments describing the design, assumptions, dependencies,
and non-obvious aspects of the implementation.
Hopefully the existing code provides a good example of appropriate code comments.
If necessary, make the appropriate updates in the README.md and other documentation files.

We use [jsdoc][jsdoc] to build documentation from comments in the source code.
All external interfaces should be fully documented.

[jsdoc]: http://usejsdoc.org

Use `grunt jsdoc` to build the docs.

## Contributing your changes

1. If one does not exist already, open an issue that your contribution is going to resolve or fix.
    1. Make sure to give the issue a clear title and a very focused description.
2. On the issue page, set the appropriate Pipeline, Label(s), Milestone, and assign the issue to
yourself.
    1. We use Zenhub to organize our issues and plan our releases. Giving as much information as to
    what your changes are help us organize PRs and streamline the committing process.
3. Make a branch from the develop branch using the following naming convention:
    1. `YOUR_INITIALS/ISSUE#-DESCRIPTIVE-NAME`
    2. For example, `kb/94-create-contributingmd` was the branch that had the commit containing this
    tutorial.
4. Commit your changes!
5. When you have completed making all your changes, create a Pull Request (PR) from your git manager
or our Github repo.
6. In the comment for the PR write `Resolves #___` and fill the blank with the issue number you
created earlier.
    1. For example, the comment we wrote for the PR with this tutorial was `Resolves #94`
7. That's it, thanks for the contribution!7. Contributions require sign-off. If you can certify the [Developer's Certificate of Origin 1.1 (DCO)](http://elinux.org/Developer_Certificate_Of_Origin) then you just add a Signed-off-by line to the PR description, which indicates that the you accept the DCO: `Signed-off-by: Jane Doe <jane.doe@domain.com>`
    1. When committing using the command line you can sign off using the --signoff or -s flag. This adds a Signed-off-by line by the committer at the end of the commit log message.`git commit -s -m "Commit message"`
8. That's it, thanks for the contribution!

## Setting up your environment

All packages needed to build the SDK and run the tests are pulled in using npm.

```
npm install
```

## Running the tests

The CSync JS SDK uses the Mocha/Expect test framework and includes both unit and integration tests.
To run the tests:

```
npm install
grunt test
```

There are a few environment variables you can use to target the integration tests to a particular CSync server.
 - **`CSYNC_HOST=<hostname|ip>`**: hostname or ip address of CSync server
 - **`CSYNC_PORT=nnn`**: port number for the CSync service

You can get debugging info logged to the console by setting the environment variable `DEBUG=1`

### Dependency Table 

| Module Name | Publisher | Date Published | Version | GitHub | License |
|:------------| ----------| ---------------| --------| -------| -------:|
| node-uuid | coolaj86 | 2015-11-13T20:31:28.475Z | 1.4.7 | [github.com/broofa/node-uuid](https://github.com/broofa/node-uuid) | [MIT](http://spdx.org/licenses/MIT) | 
| when | cujojs | 2015-12-24T15:49:23.009Z | 3.7.7 | [github.com/cujojs/when](https://github.com/cujojs/when) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-execute | bartvds | 2014-07-01T14:17:23.978Z | 0.2.2 | [github.com/Bartvds/grunt-execute](https://github.com/Bartvds/grunt-execute) | [MIT](http://spdx.org/licenses/MIT) | 
| ws | 3rdeden | 2016-06-24T12:22:40.082Z | 1.1.1 | [github.com/websockets/ws](https://github.com/websockets/ws) | [MIT](http://spdx.org/licenses/MIT) | 
| lodash | jdalton | 2016-10-31T06:49:14.797Z | 4.16.5 | [github.com/lodash/lodash](https://github.com/lodash/lodash) | [MIT](http://spdx.org/licenses/MIT) | 
| jshint-stylish | sindresorhus | 2016-08-13T00:26:16.546Z | 2.2.1 | [github.com/sindresorhus/jshint-stylish](https://github.com/sindresorhus/jshint-stylish) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-contrib-watch | shama | 2016-03-12T22:09:43.947Z | 1.0.0 | [github.com/gruntjs/grunt-contrib-watch](https://github.com/gruntjs/grunt-contrib-watch) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-browserify | tleunen | 2016-03-11T16:07:50.784Z | 5.0.0 | [github.com/jmreidy/grunt-browserify](https://github.com/jmreidy/grunt-browserify) | [MIT](http://spdx.org/licenses/MIT) | 
| karma-mocha-reporter | litixsoft | 2016-09-19T09:45:31.083Z | 2.2.0 | [github.com/litixsoft/karma-mocha-reporter](https://github.com/litixsoft/karma-mocha-reporter) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-contrib-jshint | shama | 2016-02-17T00:39:33.569Z | 1.0.0 | [github.com/gruntjs/grunt-contrib-jshint](https://github.com/gruntjs/grunt-contrib-jshint) | [MIT](http://spdx.org/licenses/MIT) | 
| chai | chaijs | 2016-01-28T12:05:41.615Z | 3.5.0 | [github.com/chaijs/chai](https://github.com/chaijs/chai) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-mocha-test | pghalliday | 2016-09-18T10:43:20.541Z | 0.13.2 | [github.com/pghalliday/grunt-mocha-test](https://github.com/pghalliday/grunt-mocha-test) | [MIT](http://spdx.org/licenses/MIT) | 
| karma-firefox-launcher | zzo | 2016-05-04T03:02:38.954Z | 1.0.0 | [github.com/karma-runner/karma-firefox-launcher](https://github.com/karma-runner/karma-firefox-launcher) | [MIT](http://spdx.org/licenses/MIT) | 
| mocha | boneskull | 2016-10-11T05:36:15.324Z | 3.1.2 | [github.com/mochajs/mocha](https://github.com/mochajs/mocha) | [MIT](http://spdx.org/licenses/MIT) | 
| karma-mocha | dignifiedquire | 2016-09-26T13:59:28.748Z | 1.2.0 | [github.com/karma-runner/karma-mocha](https://github.com/karma-runner/karma-mocha) | [MIT](http://spdx.org/licenses/MIT) | 
| karma-chrome-launcher | dignifiedquire | 2016-08-18T16:18:14.900Z | 2.0.0 | [github.com/karma-runner/karma-chrome-launcher](https://github.com/karma-runner/karma-chrome-launcher) | [MIT](http://spdx.org/licenses/MIT) | 
| babelify | zertosh | 2016-04-26T08:25:14.767Z | 7.3.0 | [github.com/babel/babelify](https://github.com/babel/babelify) | [MIT](http://spdx.org/licenses/MIT) | 
| envify | zertosh | 2016-06-21T14:07:26.379Z | 3.4.1 | [github.com/hughsk/envify](https://github.com/hughsk/envify) | [MIT](http://spdx.org/licenses/MIT) | 
| karma | dignifiedquire | 2016-09-09T18:31:21.187Z | 1.3.0 | [github.com/karma-runner/karma](https://github.com/karma-runner/karma) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-karma | dignifiedquire | 2016-05-26T09:28:52.580Z | 2.0.0 | [github.com/karma-runner/grunt-karma](https://github.com/karma-runner/grunt-karma) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt-jsdoc | krampstudio | 2016-05-27T11:49:28.509Z | 2.1.0 | [github.com/krampstudio/grunt-jsdoc](https://github.com/krampstudio/grunt-jsdoc) | [MIT](http://spdx.org/licenses/MIT) | 
| karma-safari-launcher | zzo | 2016-05-04T03:46:42.731Z | 1.0.0 | [github.com/karma-runner/karma-safari-launcher](https://github.com/karma-runner/karma-safari-launcher) | [MIT](http://spdx.org/licenses/MIT) | 
| grunt | shama | 2016-04-05T18:16:49.769Z | 1.0.1 | [github.com/gruntjs/grunt](https://github.com/gruntjs/grunt) | [MIT](http://spdx.org/licenses/MIT) | 
| time-grunt | sindresorhus | 2016-07-20T13:28:58.801Z | 1.4.0 | [github.com/sindresorhus/time-grunt](https://github.com/sindresorhus/time-grunt) | [MIT](http://spdx.org/licenses/MIT) | 
| jit-grunt | shootaroo | 2016-02-23T14:31:34.815Z | 0.10.0 | [github.com/shootaroo/jit-grunt](https://github.com/shootaroo/jit-grunt) | [MIT](http://spdx.org/licenses/MIT) | 

