/**
 * FileEnvironmentVariablesLoader.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var fs = require('fs');

/**
 * Create a new file environment loader.
 *
 * @param  {string} path
 * @return void
 */
function FileEnvironmentVariablesLoader(path) {

    if (!isset(path)) {
        path = null;
    }
    /**
     * The path to the configuration files.
     *
     * @var {string}
     * @protected
     */
    this.__path = path;

}

/**
 * Load the environment variables for the given environment.
 *
 * @param  {string}  environment
 * @return {Array}
 */
//@todo: note
FileEnvironmentVariablesLoader.prototype.load = function (environment) {
    if (environment === 'production' || environment === 'prod') {
        environment = null;
    }
    var path;
    if (!fs.existsSync(path = this.__getFile(environment))) {
        return {};
    }
    else {
        return require(path);
    }
};

/**
 * Get the file for the given environment.
 *
 * @param  {string}  environment
 * @return string
 * @protected
 */
FileEnvironmentVariablesLoader.prototype.__getFile = function (environment) {
    if (environment) {
        return this.__path + '/.env.' + environment + '.js';
    }
    else {
        return this.__path + '/.env.js';
    }
};

module.exports = FileEnvironmentVariablesLoader;