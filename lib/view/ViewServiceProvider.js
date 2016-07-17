/**
 * ViewServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var ServiceProvider = require('../support/ServiceProvider');
var ViewFactory = require('./ViewFactory');

var ViewServiceProvider = ServiceProvider.extend(function (app) {
    this.__app = app;
});

/**
 * Register the view service.
 *
 * Used to render views in the application.
 *
 * @param {function} done
 */
ViewServiceProvider.prototype.register = function (done) {
    this.__app.view = new ViewFactory(this.__app, this.__app.config.get('view'));

    done();
};

/**
 * Expose global template helpers
 *
 * @param {function} done
 */

ViewServiceProvider.prototype.boot = function (done) {
    if (this.__app.config.get('view').helpers === true) {
        _.merge(this.__app.locals, require('./helpers')(this.__app));
    }

    done();
};

module.exports = ViewServiceProvider;