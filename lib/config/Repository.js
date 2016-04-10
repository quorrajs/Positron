/**
 * Repository.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var NamespacedItemResolver = require('../support/NamespacedItemResolver');
var util = require('util');

/**
 * Create a new configuration repository.
 *
 * @param  {FileLoader} loader
 * @param  {string}  environment
 * @inherits NamespacedItemResolver
 * @return void
 */
function Repository(loader, environment) {

    /**
     * The loader implementation.
     *
     * @var {FileLoader}
     * @protected
     */
    this.__loader = loader;

    /**
     * The current environment.
     *
     * @var {string}
     * @protected
     */
    this.__environment = environment;

    /**
     * All of the configuration items.
     *
     * @var {Array}
     * @protected
     */
    this.__items = [];

    /**
     * The after load callbacks for namespaces.
     *
     * @var {Array}
     * @protected
     */
    this.__afterLoad = [];

    // call super class constructor
    Repository.super_.call(this);

}

// Extend Container class
util.inherits(Repository, NamespacedItemResolver);


/**
 * Determine if the given configuration value exists.
 *
 * @param {string}  key
 * @return bool
 */
Repository.prototype.has = function (key) {
    var defaultVal = microtime(true);

    return this.get(key, defaultVal) !== defaultVal;
};

/**
 * Determine if a configuration group exists.
 *
 * @param  {string} key
 * @return bool
 */
Repository.prototype.hasGroup = function (key) {
    var output = this.parseKey(key);

    return this.__loader.exists(output['group'], output['namespace']);
};

/**
 * Get the specified configuration value.
 *
 * @param  {string} key
 * @param  {*}      defaultVal
 * @return {*}
 */
Repository.prototype.get = function (key, defaultVal) {
    if (!isset(defaultVal)) {
        defaultVal = null;
    }
    var output = this.parseKey(key);

    // Configuration items are actually keyed by "collection", which is simply a
    // combination of each namespace and groups, which allows a unique way to
    // identify the arrays of configuration items for the particular files.
    var collection = this.__getCollection(output['group'], output['namespace']);

    this.__load(output['group'], output['namespace'], collection);

    var response;

    if (isset(output['item'])) {
        if (isset(this.__items[collection][output['item']])) {
            response = this.__items[collection][output['item']];
        } else {
            response = defaultVal;
        }
    } else {
        if (isset(this.__items[collection])) {
            response = this.__items[collection];
        } else {
            response = defaultVal;
        }
    }

    return response;
};

/**
 * Set a given configuration value.
 *
 * @param  {string}  key
 * @param  {*}       value
 * @return {void}
 */
Repository.prototype.set = function (key, value) {
    var output = this.parseKey(key);

    var collection = this.__getCollection(output['group'], output['namespace']);

    // We'll need to go ahead and lazy load each configuration groups even when
    // we're just setting a configuration item so that the set item does not
    // get overwritten if a different item in the group is requested later.
    this.__load(output['group'], output['namespace'], collection);

    if (isNull(output['item'])) {
        this.__items[collection] = value;
    }
    else {
        this.__items[collection][output['item']] = value;
    }
};

/**
 * Load the configuration group for the key.
 *
 * @param  {string}  group
 * @param  {string}  namespace
 * @param  {string}  collection
 * @return {void}
 * @protected
 */
Repository.prototype.__load = function (group, namespace, collection) {
    var env = this.__environment;

    // If we've already loaded this collection, we will just bail out since we do
    // not want to load it again. Once items are loaded a first time they will
    // stay kept in memory within this class and not loaded from disk again.
    if (isset(this.__items[collection])) {
        return;
    }

    this.__items[collection] = this.__loader.load(env, group, namespace);
};

/**
 * Get the collection identifier.
 *
 * @param  {string}  group
 * @param  {string}  namespace
 * @return {string}
 * @protected
 */
Repository.prototype.__getCollection = function (group, namespace) {
    if (!isset(namespace)) {
        namespace = '*';
    }

    return namespace + '::' + group;
};

/**
 * Add a new namespace to the loader.
 *
 * @param  {string}  namespace
 * @param  {string}  hint
 * @return {void}
 */
Repository.prototype.addNamespace = function (namespace, hint) {
    this.__loader.addNamespace(namespace, hint);
};

/**
 * Returns all registered namespaces with the config
 * loader.
 *
 * @return {Array}
 */
Repository.prototype.getNamespaces = function () {
    return this.__loader.getNamespaces();
};

module.exports = Repository;