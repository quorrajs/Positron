/**
 * SessionServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var NodeSession = require('node-session');
var _ = require('lodash');

var SessionServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the session handler.
 *
 * Session will be initialized for each request from the
 * session middleware.
 *
 * @param {function} done
 */
SessionServiceProvider.prototype.register = function (done) {
    var sessionConfig = _.clone(this.__app.config.get('session'));
    sessionConfig.trustProxy = this.__app.config.get('request').trustProxy;
    sessionConfig.trustProxyFn = this.__app.config.get('request').trustProxyFn;
    sessionConfig.secret = this.__app.config.get('app').key;

    if (sessionConfig.connection !== null) {
        sessionConfig.connection = this.__app.config.get('database').connections[sessionConfig.connection]
    }

    this.__app.sessionHandler = new NodeSession(sessionConfig);

    done();
};

/**
 * Update session handler encrypter service
 *
 * @param {function} done
 */
SessionServiceProvider.prototype.boot = function (done) {
    this.__app.sessionHandler.setEncrypter(this.__app.encrypter);

    done();
};

module.exports = SessionServiceProvider;