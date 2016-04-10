/**
 * FileLoader.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var fs = require('fs');
var _ = require('lodash');
var util = require('util');

/**
 * Create a new file configuration loader.
 *
 * @param  {string}  defaultPath
 * @return void
 */
function FileLoader(defaultPath) {

    /**
     * The default configuration path.
     *
     * @var {string}
     * @protected
     */
    this.__defaultPath = defaultPath;

    /**
     * All of the named path hints.
     *
     * @var {Array}
     * @protected
     */
    this.__hints = [];

    /**
     * A cache of whether namespaces and groups exists.
     *
     * @var {Array}
     * @protected
     */
    this.__exists = [];

}

/**
 * Load the given configuration group.
 *
 * @param  {string}  environment
 * @param  {string}  group
 * @param  {string}  namespace
 * @return array
 */
FileLoader.prototype.load = function (environment, group, namespace) {
    var items = {};

    // First we'll get the root configuration path for the environment which is
    // where all of the configuration files live for that namespace, as well
    // as any environment folders with their specific configuration items.
    var path = this.__getPath(namespace);

    if (isNull(path)) {
        return items;
    }

    // First we'll get the main configuration file for the groups. Once we have
    // that we can check for any environment specific files, which will get
    // merged on top of the main arrays to make the environments cascade.
    var file = path + "/" + group + ".js";

    if (fs.existsSync(file)) {
        items = require(file);
    }

    // Finally we're ready to check for the environment specific configuration
    // file which will be merged on top of the main arrays so that they get
    // precedence over them if we are currently in an environments setup.
    file = path + "/" + environment + "/" + group + ".js";

    if (fs.existsSync(file)) {
        items = this.__mergeEnvironment(items, file);
    }

    return items;
};

/**
 * Merge the items in the given file into the items.
 *
 * @param  {Array}   items
 * @param  {string}  file
 * @return {Array}
 * @protected
 */
FileLoader.prototype.__mergeEnvironment = function (items, file) {
    return _.merge(items, require(file));
};

/**
 * Determine if the given group exists.
 *
 * @param  {string}  group
 * @param  {string}  namespace
 * @return {boolean}
 */
FileLoader.prototype.exists = function (group, namespace) {
    var key = group + (isset(namespace) ? namespace : '');

    // We'll first check to see if we have determined if this namespace and
    // group combination have been checked before. If they have, we will
    // just return the cached result so we don't have to hit the disk.
    if (isset(this.__exists[key])) {
        return this.__exists[key];
    }

    var path = this.__getPath(namespace);

    // To check if a group exists, we will simply get the path based on the
    // namespace, and then check to see if this files exists within that
    // namespace. False is returned if no path exists for a namespace.
    if (isNull(path)) {
        return this.__exists[key] = false;
    }

    var file = path + "/" + group + '.js';

    // Finally, we can simply check if this file exists. We will also cache
    // the value in an array so we don't have to go through this process
    // again on subsequent checks for the existing of the config file.
    var exists = fs.existsSync(file);

    return this.__exists[key] = exists;
};

/**
 * Get the configuration path for a namespace.
 *
 * @param  {string}  namespace
 * @return {string}
 */
FileLoader.prototype.__getPath = function (namespace) {
    if (!isset(namespace)) {
        return this.__defaultPath;
    }
    else if (isset(this.__hints[namespace])) {
        return this.__hints[namespace];
    }
};

/**
 * Add a new namespace to the loader.
 *
 * @param  {string} namespace
 * @param  {string} hint
 * @return {void}
 */
FileLoader.prototype.addNamespace = function (namespace, hint) {
    this.__hints[namespace] = hint;
};

/**
 * Returns all registered namespaces with the config
 * loader.
 *
 * @return {Array}
 */
FileLoader.prototype.getNamespaces = function () {
    return this.__hints;
};

module.exports = FileLoader;