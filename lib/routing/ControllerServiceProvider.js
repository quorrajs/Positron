/**
 * ControllerServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var Controller = require('./Controller');

var ControllerServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Load controller class to application
 *
 * Used for controller based routing.
 *
 * @param {function} done
 */
ControllerServiceProvider.prototype.register = function (done) {
    this.__app.Controller = Controller;

    done();
};

/**
 * Set filterer.
 *
 * @param {function} done
 */
ControllerServiceProvider.prototype.boot = function (done) {
    this.__app.Controller.setFilterer(this.__app.filter);

    done();
};

module.exports = ControllerServiceProvider;