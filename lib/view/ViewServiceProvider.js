/**
 * ViewServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('@positron/support').ServiceProvider;
var ViewFactory = require('./ViewFactory');

var ViewServiceProvider = ServiceProvider.extend(function(app) {
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

module.exports = ViewServiceProvider;