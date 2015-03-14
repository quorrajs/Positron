/**
 * environmentDetector.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
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
    return detectWebEnvironment(environments);
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
        if(environments.hasOwnProperty(environment)) {
            hosts = environments[environment];

            // To determine the current environment, we'll simply iterate through the possible
            // environments and look for the host that matches the host for this request we
            // are currently processing here, then return back these environment's names.
            hosts = parseObject(hosts);
            var k, host;
            for(k in hosts){
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
