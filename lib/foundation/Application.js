/**
 * Application.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var fs = require('fs');
var http = require('http');
var path = require('path');
var util = require('util');

var _ = require('lodash');

// load global helper methods
require('../support/helpers');
//@todo: require longjohn in dev environment only
//https://github.com/mattinsler/longjohn/issues/19
//require('longjohn');

var load = require('./start');
var Builder = require('../stack/Builder');
var InitializationMiddleware = require('../http/InitializationMiddleware');
var FaviconMiddleware = require('../http/FaviconMiddleware');
var ServeStaticMiddleware = require('../http/ServeStaticMiddleware');
var QueryParserMiddleware = require('../http/QueryParserMiddleware');
var BodyParserMiddleware = require('../http/BodyParserMiddleware');
var CookieParserMiddleware = require('../http/CookieParserMiddleware');
var SessionMiddleware = require('../http/SessionMiddleware');
var environmentDetector = require('./environmentDetector');
var FileEnvironmentVariablesLoader = require('../config/FileEnvironmentVariablesLoader');
var FileLoader = require('../config/FileLoader');

var domain = require('domain');

/**
 * Create a Quorra application.
 *
 * @extend Container
 * @return {Function}
 * @api public
 */
function App(req, res, next)
{

    /**
     * All of the developer defined middlewares.
     *
     * @var {Array}
     */
    this.__middlewares = [];

    /**
     * The filter instance
     */
    this.__filter;

    var self = this;

    /**
     * Run the application and send the response.
     *
     * @param  request
     * @param  response
     * @return {void}
     */
    this.run = function(request, response)
    {
        var reqDomain = domain.create();

        reqDomain
            .on('error', function(error) {
                self.exception.handle(error, request, response);
            })
            .run(function() {
                self.__getStackedClient().handle(request, response);
            });
    };

}

/**
 * Register a "before" application filter.
 *
 * @param  callback
 * @return void
 */
App.prototype.before = function(callback)
{
    return this.router.before(callback);
};

/**
 * Handle a http request.
 * @param request
 * @param response
 */
App.prototype.handle = function(request, response) {
    this.dispatch(request, response);
};

/**
 * Handle the given request and get the response.
 *
 * @param  request
 * @param  response
 * @return
 */
//@todo: note
App.prototype.dispatch = function(request, response) {
    this.isDownForMaintenance(function(down){
        function CB(){
            this.router.dispatch(this.prepareRequest(request), response);
        }

        if(down) {
            this.__filter.callFilter('positron.app.down', request, response, CB.bind(this));
        } else {
            CB.call(this);
        }
    });
};

/**
 * Prepare the request by injecting any services.
 *
 * @param  request
 * @return
 */
App.prototype.prepareRequest = function(request)
{
//    @todo: note session driver

    return request;
};

/**
 * Determine if the application is currently down for maintenance.
 *
 * @return bool
 */
App.prototype.isDownForMaintenance = function(CB)
{
    var self = this;
    fs.exists(this.path.storage+'/meta/down',function(exists){
        if(exists)
            CB.call(self, true);
        else
            CB.call(self, false);
    });
};

/**
 * Register a maintenance mode event listener
 *
 * @param CB
 */
App.prototype.down = function(CB)
{
    //@todo: move to event class
    this.__filter.register('positron.app.down', CB)
};

/**
 * Register a 404 error handler.
 *
 * @param  {function} CB
 * @return void
 */
App.prototype.missing = function(CB)
{
    this.error(function(error, code, request, response, next) {
        if(error.status && error.status == 404) {
            CB(error, request, response, next);
        } else {
            next();
        }
    });
};

/**
 * Register an application error handler.
 *
 * @param  {function} callback
 */
App.prototype.error = function(callback)
{
    this.exception.error(callback);
};

/**
 * Load Positron application.
 *
 * @type {start|exports}
 */
App.prototype.load = load;

/**
 * Detect the application's current environment.
 *
 * @param {Array|string} envs
 * @return string
 */
App.prototype.detectEnvironment = function(envs)
{

    // @todo: add logic to include console arguments
    process.env.NODE_ENV = environmentDetector.detect(envs);
    this.env = process.env.NODE_ENV;

    return process.env.NODE_ENV;
};

/**
 * Get or check the current application environment.
 *
 * @return string
 */
App.prototype.environment = function()
{
    if (arguments.length > 0) {
        return !!~(Array.protocol.slice.call(arguments)).indexOf(this.env);
    }
    else
    {
        return this.env;
    }
};

/**
 * Get the configuration loader instance.
 *
 * @return
 */
App.prototype.getConfigLoader = function()
{
    return new FileLoader(this.path.app + '/config');
};

/**
 * Get the environment variables loader instance.
 *
 * @return {function(new:FileEnvironmentVariablesLoader, object, string)}
 */
App.prototype.getEnvironmentVariablesLoader = function()
{
    return new FileEnvironmentVariablesLoader(this.path.base);
};

/**
 * Bind the installation paths to the application.
 *
 * @param  {Object} paths
 * @return {void}
 */
App.prototype.bindInstallPaths = function(paths)
{
    // normalize all paths.
    paths = _.mapValues(paths, function(p) { return path.normalize(p); });
    this.path = paths;
};

/**
 * Prepare the stacked HTTP kernel for the application
 *
 * @returns {*}
 * @protected
 */
App.prototype.__getStackedClient = function() {
    // Create new stack builder
    var client = (new Builder());

    // Add default middleware
    client.push(FaviconMiddleware);

    if(this.config.get('middleware').serveStatic) {
        client.push(ServeStaticMiddleware);
    }

    client.push(InitializationMiddleware);

    if(this.config.get('middleware').cookieParser) {
        client.push(CookieParserMiddleware);
    }

    if(this.config.get('middleware').session) {
        client.push(SessionMiddleware);
    }

    if(this.config.get('middleware').queryParser) {
        client.push(QueryParserMiddleware);
    }

    if(this.config.get('middleware').bodyParser) {
        client.push(BodyParserMiddleware);
    }

    // add user defined custom middleware
    this.__mergeCustomMiddlewares(client);

    return client.resolve(this);
};

/**
 * Merge the developer defined middlewares onto the stack.
 *
 * @param stack
 * @return {void}
 */
App.prototype.__mergeCustomMiddlewares = function(stack) {
    var key, middleware;
    for(key in this.__middlewares)
    {
        middleware = this.__middlewares[key];
        stack.push(middleware);
    }
};

/**
 * Create a node server and listen for requests.
 */
App.prototype.listen = function(){
    var server = http.createServer(this.run);
    //@todo: boot application here
    server.listen(3000,  function() {
        console.log('Quorra server listening on port 3000');
    });
};

// Expose Quorra constructor
module.exports = App;
