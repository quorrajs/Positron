/**
 * EnvironmentVariables.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

/**
 * Node process.env loader for protecting sensitive configuration options.
 * @param  {FileEnvironmentVariablesLoader} loader
 * @return void
 */
function EnvironmentVariables(loader) {
    /**
     * The environment loader implementation.
     *
     * @var {FileEnvironmentVariablesLoader} __loader
     * @protected
     */
    this.__loader = loader;
}

/**
 * Load the server variables for a given environment.
 *
 * @param  {string} environment
 */
EnvironmentVariables.prototype.load = function (environment) {
    if (!isset(environment)) {
        environment = null;
    }

    var environmentVars = this.__loader.load(environment);
    var k;
    for (k in environmentVars) {
        if (environmentVars.hasOwnProperty(k)) {
            process.env[k] = environmentVars[k];
        }
    }
};

module.exports = EnvironmentVariables;