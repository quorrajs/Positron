/**
 * CacheServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2017, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var CacheManager = require('./CacheManager');

var CacheServiceProvider = ServiceProvider.extend(function() {
});

/**
 * Register the cache service with the application.
 *
 * @param {function} done
 */
CacheServiceProvider.prototype.register = function (done) {
    this.__app.cache = new CacheManager(this.__app);

    done();
};

module.exports = CacheServiceProvider;