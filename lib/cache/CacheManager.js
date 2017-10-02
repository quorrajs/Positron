/**
 * CacheManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2017, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var cacheManager = require('cache-manager');

function CacheManager (app) {
    /**
     * Quorra application instance.
     *
     * @type {object}
     */
    this.__app = app;

    /**
     * The array of resolved cache stores.
     *
     * @type {Array}
     */
    this.__stores = [];
}

CacheManager.prototype = {
    /**
     * Get a cache store instance by name.
     *
     * @param {string|null} name
     * @return {object} cache-instance
     */
    store: function (name) {
        name = name ? name: this.getDefaultDriver();

        if(!this.__stores[name]) {
            this.__stores[name] = this.__resolve(name);
        }

        return this.__stores[name];
    },

    /**
     * Get the default cache driver name.
     *
     * @return string
     */
    getDefaultDriver: function () {
        return this.__app.config.get('cache.service.default');
    },

    /**
     * Resolve the given store.
     *
     * @param {string} name
     * @return {object} cache-instance
     *
     * @throws \InvalidArgumentException
     */
    __resolve: function (name) {
        var config = this.__getStoreConfig(name);

        if (isNull(config)) {
            throw new Error("Cache store [" + name + "] is not defined.");
        }

        if(typeof config.store === "string" && config.store !== "memory") {
            config.store = require(name);
        }

        return cacheManager.caching(config);
    },

    /**
     * Get the cache connection configuration.
     *
     * @param {string} name
     * @return {object}
     */
    __getStoreConfig: function (name) {
        return this.__app.config.get('cache.service.stores.' + name);
    },

    set: function () {
        return this.applyMethodToStore('set', arguments)
    },

    get: function () {
        return this.applyMethodToStore('get', arguments)
    },

    del: function () {
        return this.applyMethodToStore('del', arguments)
    },

    wrap: function () {
        return this.applyMethodToStore('wrap', arguments)
    },

    applyMethodToStore: function (method, args, store) {
        store = store || this.store();

        return store[method].apply(store, args);
    }
};

module.exports = CacheManager;