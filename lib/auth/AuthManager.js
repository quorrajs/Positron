/**
 * AuthManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var Guard = require('./Guard');

function AuthManager(app) {
    this.__config = app.config.get('auth');
}

/**
 * Set user provider for auth service
 *
 * @param {object} userProvider
 */
AuthManager.prototype.setUserProvider = function(userProvider) {
    this.__waterlineUserProvider = userProvider;
};

AuthManager.prototype.getDriver = function (request, response) {
    return new Guard(this.__waterlineUserProvider, request.session, this.__config, request, response);
};

module.exports = AuthManager;