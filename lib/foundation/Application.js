/**
 * Application.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright (c) 2015-2016, QuorraJS.
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
var HttpMethodOverrideMiddleware = require('../http/HttpMethodOverrideMiddleware');
var LocalizationMiddleware = require('../http/LocalizationMiddleware');
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
function App()
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
                if (self.runningUnitTests()) {
                    console.log(error);
                }

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

App.prototype.dispatch = function(request, response) {
    var self = this;

    this.isDownForMaintenance(function(down){
        function CB(){
            self.router.dispatch(request, response);
        }

        if(down) {
            self.__filter.callFilter('positron.app.down', request, response, CB);
        } else {
            CB();
        }
    });
};

/**
 * Get the current application locale.
 *
 * @return {String}
 */
App.prototype.getLocale = function() {
    return this.config.get('app').defaultLocale;
};

/**
 * Set the current application locale.
 *
 * @param  {String}  locale
 * @return {void}
 */
App.prototype.setLocale = function(locale) {
    this.config.set('app.defaultLocale', locale);

    this.lang.setLocale(locale);
};

/**
 * Determine if the application is currently down for maintenance.
 *
 * @return bool
 */
App.prototype.isDownForMaintenance = function(CB)
{
    fs.exists(this.path.storage+'/meta/down',function(exists){
        if(exists)
            CB(true);
        else
            CB(false);
    });
};

/**
 * Register a maintenance mode event listener
 *
 * @param CB
 */
App.prototype.down = function(CB)
{
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
 * Expose app globals
 *
 * @return {void}
 */
App.prototype.exposeGlobals = function() {

    // Provide global access (if allowed in config)
    if(this.config.get('globals').App) {
        global['App'] = this;
    }

    if(this.config.get('globals').models) {
        for(var model in this.models) {
            if(this.models.hasOwnProperty(model)) {
                var globalName = model.globalId || model.identity;
                global[globalName] = model;
            }
        }
    }
};

/**
 * Detect the application's current environment.
 *
 * @param {Object|function} envs
 * @return string
 */
App.prototype.detectEnvironment = function(envs)
{
    this.env = process.env.NODE_ENV = environmentDetector.detect(envs);

    return this.env;
};

/**
 * Get or check the current application environment.
 *
 * @return {boolean|string}
 */
App.prototype.environment = function()
{
    if (arguments.length > 0) {
        return !!~(Array.prototype.slice.call(arguments)).indexOf(this.env);
    }
    else
    {
        return this.env;
    }
};

/**
 * Determine if we are running unit tests.
 *
 * @return {boolean}
 */
App.prototype.runningUnitTests = function() {
    return this.env == 'testing';
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

    // Add default middlewares
    if(this.config.get('middleware').favicon) {
        client.push(FaviconMiddleware);
    }

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

    if(this.config.get('middleware').httpMethodOverride) {
        client.push(HttpMethodOverrideMiddleware);
    }

    if(this.config.get('middleware').localization) {
        client.push(LocalizationMiddleware);
    }

    // add user defined custom middleware
    this.__mergeCustomMiddlewares(client);

    return client.resolve(this);
};

/**
 * Add a HttpKernel middleware onto the stack.
 *
 * @param  {function} constructor
 * @return this
 */
App.prototype.middleware = function(constructor)
{
    this.__middlewares.push(constructor);

    return this;
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

    var port = this.config.get('app').port || 3000;

    server.listen(port,  function() {
        console.log('Quorra server listening on port '+port);
    });
};

// Expose Quorra constructor
module.exports = App;
