/**
 * AuthServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2017, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../../../support/ServiceProvider');

var AuthServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
    this.__policies = {};
});

AuthServiceProvider.prototype.__resolvePolicyPath = function(provider) {
    if(provider.indexOf('app/') === 0) {
        provider = this.__app.path.base + '/' + provider;
    } else if(provider.indexOf('policies/') === 0) {
        provider = this.__app.path.app + '/' + provider;
    }

    return provider;
};

/**
 * Register the application's policies.
 */
AuthServiceProvider.prototype.registerPolicies = function () {
    Object.keys(this.__policies).forEach(function (pType) {
        this.__app.gate.policy(pType,  this.__resolvePolicyPath(this.__policies[pType]));
    }, this)
};

module.exports = AuthServiceProvider;