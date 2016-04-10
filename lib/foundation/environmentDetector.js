/**
 * environmentDetector.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var os = require('os');
var str = require('../support/str');

module.exports = {
    detect: detect
};

/**
 * Detect the application's current environment.
 *
 * @param {Array|string} environments
 * @return string
 */
function detect(environments) {
    return getIfOverriden() || detectWebEnvironment(environments);
}

/**
 * Check whether node environment is already set manually or requested to set
 * by `--env` commandline flag, then return that environment string.
 *
 * return {*}
 */
function getIfOverriden() {
    var args = process.argv.slice(2);
    var envFlagIndex = args.indexOf('--env');

    // check if environment string passed as argument
    if (!!~envFlagIndex) {
        return args[++envFlagIndex];
    }
    // check if environment is already set
    else if (isset(process.env.NODE_ENV)) {
        return process.env.NODE_ENV;
    } else {
        return false;
    }


}

/**
 * Set the application environment for a web request.
 *
 * @param {Array|string} environments
 * @return string
 */
function detectWebEnvironment(environments) {
//        // If the given environment is just a Closure, we will defer the environment check
//        // to the Closure the developer has provided, which allows them to totally swap
//        // the webs environment detection logic with their own custom Closure's code.
    if (typeof environments === 'function') {
        return environments()
    }

    var hosts;
    for (var environment in environments) {
        if (environments.hasOwnProperty(environment)) {
            hosts = environments[environment];

            // To determine the current environment, we'll simply iterate through the possible
            // environments and look for the host that matches the host for this request we
            // are currently processing here, then return back these environment's names.
            hosts = parseObject(hosts);
            var k, host;
            for (k in hosts) {
                host = hosts[k];
                if (isMachine(host)) return environment;
            }
        }
    }

    return 'production';
}

/**
 * Determine if the name matches the machine name.
 *
 * @param {string} name
 * @return bool
 */
function isMachine(name) {
    return str.is(name, os.hostname());
}
