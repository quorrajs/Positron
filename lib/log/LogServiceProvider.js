/**
 * LogServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var logger = require('./writer');

var LogServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the logger implementation with the application.
 *
 * @param {function} done
 */
LogServiceProvider.prototype.register = function (done) {

    this.__app.log = logger();

    done();
};

module.exports = LogServiceProvider;