/**
 * AuthServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2016-2017, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('./ServiceProvider');

var AuthServiceProvider = ServiceProvider.extend(function() {
    /**
     * The policy mappings for the application.
     *
     * @type {{}}
     * @protected
     */
    this.__policies = {};
});

/**
 * Register the application's policies.
 */
AuthServiceProvider.prototype.registerPolicies = function (){
    var self = this;

    Object.keys(self.__policies).forEach(function(key) {
        self.__app.gate.policy(key, self.__policies[key]);
    });
};

module.exports = AuthServiceProvider;