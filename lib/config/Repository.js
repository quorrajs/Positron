/**
 * Repository.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
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
     * All of the registered packages.
     *
     * @var {Array}
     * @protected
     */
    this.__packages = [];

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
Repository.prototype.has = function(key)
{
    var defaultVal = microtime(true);

    return this.get(key, defaultVal) !== defaultVal;
};

/**
 * Determine if a configuration group exists.
 *
 * @param  {string} key
 * @return bool
 */
Repository.prototype.hasGroup = function(key)
{
    var output = this.parseKey(key);

    return this.__loader.__exists(output['group'], output['namespace']);
};

/**
 * Get the specified configuration value.
 *
 * @param  {string} key
 * @param  {*}      defaultVal
 * @return {*}
 */
Repository.prototype.get = function(key, defaultVal)
{
    if(!isset(defaultVal)) {
        defaultVal = null;
    }
    var output = this.parseKey(key);

    // Configuration items are actually keyed by "collection", which is simply a
    // combination of each namespace and groups, which allows a unique way to
    // identify the arrays of configuration items for the particular files.
    var collection = this.__getCollection(output['group'], output['namespace']);

    this.__load(output['group'], output['namespace'], collection);
    // @todo: note
    return isset(output['item'])?(isset(this.__items[collection][output['item']])?this.__items[collection][output['item']]:defaultVal):this.__items[collection];
};

/**
 * Set a given configuration value.
 *
 * @param  {string}  key
 * @param  {*}       value
 * @return {void}
 */
Repository.prototype.set = function(key, value)
{
    var output = this.parseKey(key);

    var collection = this.__getCollection(output['group'], output['namespace']);

    // We'll need to go ahead and lazy load each configuration groups even when
    // we're just setting a configuration item so that the set item does not
    // get overwritten if a different item in the group is requested later.
    this.__load(output['group'], output['namespace'], collection);

    if (isNull(output['item']))
    {
        this.__items[collection] = value;
    }
    else
    {
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
Repository.prototype.__load = function(group, namespace, collection)
{
    var env = this.__environment;

    // If we've already loaded this collection, we will just bail out since we do
    // not want to load it again. Once items are loaded a first time they will
    // stay kept in memory within this class and not loaded from disk again.
    if (isset(this.__items[collection]))
    {
        return;
    }

    var items = this.__loader.load(env, group, namespace);

    // If we've already loaded this collection, we will just bail out since we do
    // not want to load it again. Once items are loaded a first time they will
    // stay kept in memory within this class and not loaded from disk again.
    if (isset(this.__afterLoad[namespace]))
    {
        items = this.__callAfterLoad(namespace, group, items);
    }

    this.__items[collection] = items;
};

/**
 * Call the after load callback for a namespace.
 *
 * @param  {string}  namespace
 * @param  {string}  group
 * @param  {Array}   items
 * @return {Array}
 * @protected
 */
Repository.prototype.__callAfterLoad = function(namespace, group, items)
{
    var callback = this.__afterLoad[namespace];

    return callback.call(this, group, items);
};

/**
 * Parse an array of namespaced segments.
 *
 * @param  {string}  key
 * @return {Array}
 * @protected
 */
Repository.prototype.__parseNamespacedSegments = function(key)
{
    var output = key.split('::');

    // If the namespace is registered as a package, we will just assume the group
    // is equal to the namespace since all packages cascade in this way having
    // a single file per package, otherwise we'll just parse them as normal.
    if (!!~namespace.indexOf(this.__packages))
    {
        return this.__parsePackageSegments(key, output[0], output[1]);
    }
// @todo: important
    return Repository.super_.__parseNamespacedSegments(key);
};

/**
 * Parse the segments of a package namespace.
 *
 * @param  {string}  key
 * @param  {string}  namespace
 * @param  {string}  item
 * @return {Array}
 * @protected
 */
Repository.prototype.__parsePackageSegments = function(key, namespace, item)
{
    var itemSegments = item.split('.');

    // If the configuration file doesn't exist for the given package group we can
    // assume that we should implicitly use the config file matching the name
    // of the namespace. Generally packages should use one type or another.
    if ( ! this.__loader.exists(itemSegments[0], namespace))
    {
        return {
            namespace:namespace,
            group:'config',
            item:item
        };
    }
// @todo: important
    return Repository.super_.__parseNamespacedSegments(key);
};

/**
 * Register a package for cascading configuration.
 *
 * @param  {string}  modulePackage
 * @param  {string}  hint
 * @param  {string}  namespace
 * @return {void}
 */
Repository.prototype.modulePackage = function(modulePackage, hint, namespace)
{
    this.__packages.push(namespace);

    // First we will simply register the namespace with the repository so that it
    // can be loaded. Once we have done that we'll register an after namespace
    // callback so that we can cascade an application package configuration.
    this.addNamespace(namespace, hint);

    this.afterLoading(namespace, function(me, group, items)
    {
        var env = me.getEnvironment();

        var loader = me.getLoader();

        return loader.cascadePackage(env, modulePackage, group, items);
    });
};

/**
 * Register an after load callback for a given namespace.
 *
 * @param  {string}   namespace
 * @param  {function}  callback
 * @return {void}
 */
Repository.prototype.afterLoading = function(namespace, callback)
{
    this.__afterLoad[namespace] = callback;
};

/**
 * Get the collection identifier.
 *
 * @param  {string}  group
 * @param  {string}  namespace
 * @return {string}
 * @protected
 */
Repository.prototype.__getCollection = function(group, namespace)
{
    if(!isset(namespace)) { namespace = '*'; }

    return namespace+'::'+group;
};

/**
 * Add a new namespace to the loader.
 *
 * @param  {string}  namespace
 * @param  {string}  hint
 * @return {void}
 */
Repository.prototype.addNamespace = function(namespace, hint)
{
    this.__loader.addNamespace(namespace, hint);
};

/**
 * Returns all registered namespaces with the config
 * loader.
 *
 * @return {Array}
 */
Repository.prototype.getNamespaces = function()
{
    return this.__loader.getNamespaces();
};

/**
 * Get the loader implementation.
 *
 * @return {FileLoader}
 */
Repository.prototype.getLoader = function()
{
    return this.__loader;
};

/**
 * Set the loader implementation.
 *
 * @param  {FileLoader}  loader
 * @return {void}
 */
Repository.prototype.setLoader = function(loader)
{
    this.__loader = loader;
};

/**
 * Get the current configuration environment.
 *
 * @return {string}
 */
Repository.prototype.getEnvironment = function()
{
    return this.__environment;
};

/**
 * Get the after load callback array.
 *
 * @return {Array}
 */
Repository.prototype.getAfterLoadCallbacks = function()
{
    return this.__afterLoad;
};

/**
 * Get all of the configuration items.
 *
 * @return {Array}
 */
Repository.prototype.getItems = function()
{
    return this.__items;
};

// ************************* find alternatives for following array access methods ******************* //

/**
 * Determine if the given configuration option exists.
 *
 * @param  {string}  key
 * @return {boolean}
 */
Repository.prototype.offsetExists = function(key)
{
    return this.has(key);
};

/**
 * Get a configuration option.
 *
 * @param  {string}  key
 * @return mixed
 */
Repository.prototype.offsetGet = function(key)
{
    return this.get(key);
};

/**
 * Set a configuration option.
 *
 * @param  {string}  key
 * @param  {*}  value
 * @return {void}
 */
Repository.prototype.offsetSet = function(key, value)
{
    this.set(key, value);
};

/**
 * Unset a configuration option.
 *
 * @param  {string}  key
 * @return {void}
 */
Repository.prototype.offsetUnset = function(key)
{
    this.set(key, null);
};


module.exports = Repository;