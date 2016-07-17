/**
 * Application.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var fs = require('fs');
var http = require('http');
var path = require('path');
var util = require('util');

var _ = require('lodash');

// load global helper methods
require('../support/helpers');

var load = require('./start');
var Builder = require('../stack/Builder');
var InitializationMiddleware = require('../http/InitializationMiddleware');
var FaviconMiddleware = require('../http/FaviconMiddleware');
var ServeStaticMiddleware = require('../http/ServeStaticMiddleware');
var QueryParserMiddleware = require('../http/QueryParserMiddleware');
var BodyParserMiddleware = require('../http/BodyParserMiddleware');
var AuthMiddleware = require('../http/AuthMiddleware');
var CookieParserMiddleware = require('../http/CookieParserMiddleware');
var SessionMiddleware = require('../http/SessionMiddleware');
var HttpMethodOverrideMiddleware = require('../http/HttpMethodOverrideMiddleware');
var TranslationMiddleware = require('../http/TranslationMiddleware');
var environmentDetector = require('./environmentDetector');
var FileEnvironmentVariablesLoader = require('../config/FileEnvironmentVariablesLoader');
var FileLoader = require('../config/FileLoader');
var ServiceProvider = require('../support/ServiceProvider');
var ProviderRepository = require('./ProviderRepository');
var async = require('async');

var domain = require('domain');

/**
 * Create a Quorra application.
 *
 * @extend Container
 * @return {Function}
 * @api public
 */
function App() {
    require('colors');

    /**
     * All of the developer defined middlewares.
     *
     * @var {Array}
     * @protected
     */
    this.__middlewares = [];

    /**
     * The filter instance
     * @var {Object}
     */
    this.filter;

    /**
     * The list of loaded service providers.
     *
     * @var {Object}
     * @protected
     */
    this.__loadedProviders = {};

    /**
     * Indicates if the application has "booted".
     *
     * @var {Boolean}
     * @protected
     */
    this.__booted = false;

    /**
     * The array of booting callbacks.
     *
     * @var {Array}
     * @protected
     */
    this.__bootingCallbacks = [];

    /**
     * The array of booted callbacks.
     *
     * @var {Array}
     * @protected
     */
    this.__bootedCallbacks = [];

    /**
     * Node HTTP server reference.
     *
     * @var {Object}
     * @protected
     */
    this.__server;

    /**
     * The application locals object.
     *
     * @var {Object}
     */
    this.locals = {};

    /**
     * Aliases for internal Positron module
     *
     * @type {Object}
     * @protected
     */
    this.__aliases = {};

    var self = this;

    /**
     * Run the application and send the response.
     *
     * @param  request
     * @param  response
     * @return {void}
     */
    this.run = function (request, response) {
        var reqDomain = domain.create();

        reqDomain
            .on('error', self.handleError.bind(self, request, response))
            .run(function () {
                self.__getStackedClient().handle(request, response);
            });
    };

}

/**
 * Handle Application errors
 *
 * @param {Object} request
 * @param {Object} response
 * @param {*} error
 */
App.prototype.handleError = function (request, response, error) {
    if (this.runningTests()) {
        console.log(error);
    }

    this.exception.handle(error, request, response);
};

/**
 * Register a "before" application filter.
 *
 * @param  callback
 * @return void
 */
App.prototype.before = function (callback) {
    return this.router.before(callback);
};

/**
 * Handle a http request.
 * @param request
 * @param response
 */
App.prototype.handle = function (request, response) {
    this.dispatch(request, response);
};

/**
 * Handle the given request.
 *
 * @param  request
 * @param  response
 * @return
 */

App.prototype.dispatch = function (request, response) {
    var self = this;

    this.isDownForMaintenance(function (down) {
        function CB() {
            self.router.dispatch(request, response);
        }

        if (down) {
            self.filter.callFilter('positron.app.down', request, response, CB);
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
App.prototype.getLocale = function () {
    return this.translator.getLocale();
};

/**
 * Set the current application locale.
 *
 * @param  {String}  locale
 * @return {void}
 */
App.prototype.setLocale = function (locale) {
    this.config.set('app.defaultLocale', locale);

    this.translator.setLocale(locale);
};

/**
 * Determine if the application is currently down for maintenance.
 *
 * @return bool
 */
App.prototype.isDownForMaintenance = function (CB) {
    fs.exists(this.path.storage + '/meta/down', function (exists) {
        if (exists)
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
App.prototype.down = function (CB) {
    this.filter.register('positron.app.down', CB)
};

/**
 * Register a 404 error handler.
 *
 * @param  {function} CB
 * @return void
 */
App.prototype.missing = function (CB) {
    this.error(function (error, code, request, response, next) {
        if (error.status && error.status == 404) {
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
App.prototype.error = function (callback) {
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
 * Provide global access (if allowed in config)
 *
 * @return {void}
 */
App.prototype.exposeGlobals = function () {
    if (this.config.get('globals').App) {
        global['App'] = this;
    }

    if (this.config.get('globals').models) {
        for (var key in this.models) {
            if (this.models.hasOwnProperty(key)) {
                var globalName = this.models[key].globalId || this.models[key].identity;
                global[globalName] = this.models[key];
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
App.prototype.detectEnvironment = function (envs) {
    this.env = process.env.NODE_ENV = environmentDetector.detect(envs);

    return this.env;
};

/**
 * Get or check the current application environment.
 *
 * @return {boolean|string}
 */
App.prototype.environment = function () {
    if (arguments.length > 0) {
        return !!~(Array.prototype.slice.call(arguments)).indexOf(this.env);
    }
    else {
        return this.env;
    }
};

/**
 * Determine if we are running unit tests.
 *
 * @return {boolean}
 */
App.prototype.runningTests = function () {
    return this.env == 'testing';
};

/**
 * Register alias for internal Positron module
 *
 * @param {Object|String} alias
 * @param {String} [namespace]
 */
App.prototype.alias = function (alias, namespace) {
    if(!_.isObject(alias)) {
        alias = arguments;
    }

    _.merge(this.__aliases, alias);
};

/**
 * Resolve internal Positron module by namespace
 *
 * @param namespace
 * @return {*}
 */
App.prototype.use = function (namespace) {
    if(this.__aliases[namespace]) {
        namespace = this.__aliases[namespace];
    }

    return require(namespace.replace(/positron/, '..'));
};

/**
 * Get the service provider repository instance.
 *
 * @return {Object}
 */
App.prototype.getProviderRepository = function() {
    return new ProviderRepository(this);
};

/**
 * Get the registered service provider instance if it exists.
 *
 * @param  {string} provider
 * @return {Object|null}
 */
App.prototype.getRegistered = function(provider) {
    return this.__loadedProviders[provider] || null;
};

/**
 * Resolve a service provider instance from the class name.
 *
 * @param  {string} provider
 */
App.prototype.resolveProvider = function(provider) {
    if(provider.indexOf('positron/') === 0) {
        provider = provider.replace(/positron/, '..');
    }

    return new (require(provider))(this);
};

/**
 * Mark the given provider as registered.
 *
 * @param  {string} provider
 * @param  {object} providerInstance
 */
App.prototype.markAsRegistered = function(provider, providerInstance) {
    //note: fire event

    this.__loadedProviders[provider] = providerInstance;
};

/**
 * Register a service provider with the application.
 *
 * @param  {string} provider
 * @param  {boolean} force
 * @param  {function} callback
 */
App.prototype.register = function (provider, force, callback) {
    var self = this;
    var registered = self.getRegistered(provider);

    if (registered  && ! force) {
        return callback(registered);
    }

    var providerInstance = self.resolveProvider(provider);

    if(!(providerInstance instanceof ServiceProvider)) {
        throw Error('Provider: '+ provider + ' is not an instance of ServiceProvider class');
    }

    providerInstance.register(function () {
        self.markAsRegistered(provider, providerInstance);

        // If the application has already booted, we will call this boot method on
        // the provider class so it has an opportunity to do its boot logic
        if (self.__booted) {
            providerInstance.boot(callback.bind(null, providerInstance));
        } else {
            callback(providerInstance);
        }
    });
};

/**
 * Call the booting callbacks for the application.
 *
 * @param  {Array} callbacks
 * @param  {function} callback
 * @protected
 */
App.prototype.__fireAppCallbacks = function(callbacks, callback) {
    async.parallel(callbacks, function (err, results) {
        if(err) {
            throw err;
        } else {
            if(callback) {
                callback();
            }
        }
    })
};

/**
 * Determine if the application has booted.
 *
 * @return {boolean}
 */
App.prototype.isBooted = function () {
    return this.__booted;
};

/**
 * Register a new boot listener.
 *
 * @param  {function} callback
 */
App.prototype.booting = function (callback)
{
    this.__bootingCallbacks.push(callback.bind(null, this));
};

/**
 * Reset the application for reboot.
 */
App.prototype.resetForReboot = function() {
    this.__bootedCallbacks = [];
    this.__bootingCallbacks = [];
    this.__loadedProviders = {};
    this.__middlewares = [];
    this.locals = {};
    this.__booted = false;
};

/**
 * Register a new "booted" listener.
 *
 * @param  {function} callback
 */
App.prototype.booted = function (callback)
{
    this.__bootedCallbacks.push(callback.bind(null, this));

    if (this.isBooted()) this.__fireAppCallbacks(parseArray(callback));
};

/**
 * Boot the application's service providers.
 *
 * @param {function} callback
 */
App.prototype.boot = function(callback) {
    if (this.__booted) return;

    var self = this;
    var providersCount = Object.keys(self.__loadedProviders).length;
    var callbackReturnedProviders = {};
    var callbackCounter = 0;
    var providers = Object.keys(this.__loadedProviders);

    if(providers.length) {
        providers.forEach(function (providerKey) {
            self.__loadedProviders[providerKey].boot(function () {
                // Make sure that callback is retuned only once
                if (!callbackReturnedProviders[providerKey]) {
                    callbackReturnedProviders[providerKey] = true;
                    callbackCounter++;

                    if (providersCount === callbackCounter) {
                        self.__bootApplication(callback);
                    }
                }
            });
        });
    } else {
        self.__bootApplication(callback);
    }
};

/**
 * Boot the application and fire app callbacks.
 *
 * @var {function} callback
 */
App.prototype.__bootApplication = function (callback) {
    var self = this;
    // Once the application has booted we will also fire some "booted" callbacks
    // for any listeners that need to do work after this initial booting gets
    // finished. This is useful when ordering the boot-up processes we run.
    self.__fireAppCallbacks(self.__bootingCallbacks, function () {
        self.__booted = true;

        self.__fireAppCallbacks(self.__bootedCallbacks, callback);
    });
};

/**
 * Get the configuration loader instance.
 *
 * @return {Object}
 */
App.prototype.getConfigLoader = function () {
    return new FileLoader(this.path.app + '/config');
};

/**
 * Get the environment variables loader instance.
 *
 * @return {function(new:FileEnvironmentVariablesLoader, object, string)}
 */
App.prototype.getEnvironmentVariablesLoader = function () {
    return new FileEnvironmentVariablesLoader(this.path.base);
};

/**
 * Bind the installation paths to the application.
 *
 * @param  {Object} paths
 * @return {void}
 */
App.prototype.bindInstallPaths = function (paths) {
    // normalize all paths.
    paths = _.mapValues(paths, function (p) {
        return path.normalize(p);
    });
    this.path = paths;
};

/**
 * Prepare the stacked HTTP kernel for the application
 *
 * @returns {*}
 * @protected
 */
App.prototype.__getStackedClient = function () {
    // Create new stack builder
    var client = (new Builder());

    // Add default middlewares
    if (this.config.get('middleware').favicon) {
        client.push(FaviconMiddleware);
    }

    if (this.config.get('middleware').serveStatic) {
        client.push(ServeStaticMiddleware);
    }

    client.push(InitializationMiddleware);

    if (this.config.get('middleware').cookieParser) {
        client.push(CookieParserMiddleware);
    }

    if (this.config.get('middleware').session) {
        client.push(SessionMiddleware);
    }

    if (this.config.get('middleware').queryParser) {
        client.push(QueryParserMiddleware);
    }

    if (this.config.get('middleware').bodyParser) {
        client.push(BodyParserMiddleware);
    }

    if (this.config.get('middleware').auth) {
        client.push(AuthMiddleware);
    }

    if (this.config.get('middleware').httpMethodOverride) {
        client.push(HttpMethodOverrideMiddleware);
    }

    if (this.config.get('middleware').translation) {
        client.push(TranslationMiddleware);
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
App.prototype.middleware = function (constructor) {
    this.__middlewares.push(constructor);

    return this;
};

/**
 * Return application filterer reference
 *
 * @return {object}
 */
App.prototype.getFilterer = function () {
    return this.filter;
};

/**
 * Merge the developer defined middlewares onto the stack.
 *
 * @param stack
 * @return {void}
 */
App.prototype.__mergeCustomMiddlewares = function (stack) {
    var key, middleware;
    for (key in this.__middlewares) {
        middleware = this.__middlewares[key];
        stack.push(middleware);
    }
};

/**
 * Create a node server and listen for requests.
 */
App.prototype.listen = function (callback) {
    var self = this;
    var port;
    var args = process.argv.slice(2);
    var portOptionIndex = args.indexOf('--port');

    self.__server = http.createServer(self.run);

    // check if port string passed as argument
    if (!!~portOptionIndex) {
        port = args[++portOptionIndex];
    } else {
        port = self.config.get('app').port || 3000;
    }

    self.__server.listen(port, function () {
        console.log('\r\n');

        console.log((" ██████╗ ██╗   ██╗ ██████╗ ██████╗ ██████╗  █████╗ ").blue);
        console.log(("██╔═══██╗██║   ██║██╔═══██╗██╔══██╗██╔══██╗██╔══██╗").blue);
        console.log(("██║   ██║██║   ██║██║   ██║██████╔╝██████╔╝███████║").blue);
        console.log(("██║▄▄ ██║██║   ██║██║   ██║██╔══██╗██╔══██╗██╔══██║").blue);
        console.log(("╚██████╔╝╚██████╔╝╚██████╔╝██║  ██║██║  ██║██║  ██║").blue);
        console.log((" ╚══▀▀═╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝").blue);

        console.log(('\r\nQuorra server listening for requests').green);
        console.log(('Env: ' + self.environment()).blue);
        console.log(('Port: ' + port).blue);

        if(callback) {
            callback(self.__server);
        }
    });
};

/**
 * Stops the server from accepting new connections
 *
 * @param callback
 */
App.prototype.close = function (callback) {
    if(this.__server) {
        this.__server.close(callback);
    } else {
        callback()
    }
};

// Expose Quorra constructor
module.exports = App;
