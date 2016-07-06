/**
 * AuthServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var AuthManager = require('./AuthManager');
var WaterlineUserProvider = require('./WaterlineUserProvider');

var AuthServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register  the auth manager with the application
 *
 * @param {function} done
 */
AuthServiceProvider.prototype.register = function (done) {
    this.__app.authManager = new AuthManager(this.__app);

    done();
};

/**
 * Set user provider for auth service
 * @param {function} done
 */
AuthServiceProvider.prototype.boot = function (done) {
    var providerModelName = this.__app.config.get('auth.model');
    var userProvider = new WaterlineUserProvider(this.__app.models[providerModelName], this.__app.hash);

    this.__app.authManager.setUserProvider(userProvider);

    done();
};

module.exports = AuthServiceProvider;