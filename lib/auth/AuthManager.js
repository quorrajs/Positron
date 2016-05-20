/**
 * AuthManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */
var WaterlineUserProvider = require('./WaterlineUserProvider');
var Guard = require('./Guard');

function AuthManager(app) {
    var providerModelName = app.config.get('auth.model');

    this.__config = app.config.get('auth');
    this.__waterlineUserProvider = new WaterlineUserProvider(app.models[providerModelName], app.hash);
}

AuthManager.prototype.getDriver = function (request, response) {
    return new Guard(this.__waterlineUserProvider, request.session, this.__config, request, response);
};

module.exports = AuthManager;