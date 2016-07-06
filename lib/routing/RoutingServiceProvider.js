/**
 * RoutingServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var Filter = require('./Filter');
var Router = require('./Router');
var urlGenerator = require('./UrlGenerator');

var RoutingServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the routing service provider.
 *
 * @param {function} done
 */
RoutingServiceProvider.prototype.register = function (done) {
    this.__registerFilterer();
    this.__registerRouter();
    this.__registerUrlGenerator();

    done();
};

/**
 * Register filter interface.
 *
 * Filter interface is used to register and execute various request filters
 * during request processing.
 *
 * @protected
 */
RoutingServiceProvider.prototype.__registerFilterer = function () {
    this.__app.filter = new Filter();
};

/**
 * Register the router instance.
 *
 * @protected
 */
RoutingServiceProvider.prototype.__registerRouter = function () {
    this.__app.router = new Router(this.__app, this.__app.filter);
};

/**
 * Register the url generator instance.
 *
 * @protected
 */
RoutingServiceProvider.prototype.__registerUrlGenerator = function () {
    // The URL generator needs the route collection that exists on the router.
    // Keep in mind this is an object, so we're passing by references here
    // and all the registered routes will be available to the generator.
    this.__app.url = new urlGenerator(this.__app.router.getRoutes(), this.__app);
};

module.exports = RoutingServiceProvider;