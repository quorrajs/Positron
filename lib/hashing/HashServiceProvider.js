/**
 * HashServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var hasher = require('../hashing/bcryptHasher');

var HashServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the hash service with the application.
 *
 * @param {function} done
 */
HashServiceProvider.prototype.register = function (done) {
    this.__app.hash = hasher;

    done();
};

module.exports = HashServiceProvider;