/**
 * CookieServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var cookieParser = require('cookie-parser');

var CookieServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the cookieParser module.
 *
 * Session will be initialized for each request from the
 * session middleware.
 *
 * @param {function} done
 */
CookieServiceProvider.prototype.register = function (done) {
    this.__app.cookieParser = cookieParser(this.__app.config.get('app').key);

    done();
};

module.exports = CookieServiceProvider;