/**
 * start.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var fs = require('fs');
var EnvironmentVariables = require('../config/EnvironmentVariables');
var Config = require('../config/Repository');
var utils = require('../support/utils');
var async = require('async');
var _ = require('lodash');

/**
 * Application.prototype.start
 *
 * @param CB
 * @param env
 */
function start(CB, env) {

    var app = this;

    /*
     |--------------------------------------------------------------------------
     | Register The Environment Variables
     |--------------------------------------------------------------------------
     |
     | Here we will register all of the ENV variables into the
     | process so that they're globally available configuration options so
     | sensitive configuration information can be swept out of the code.
     |
     */
    (new EnvironmentVariables(app.getEnvironmentVariablesLoader())).load(env);

    /*
     |--------------------------------------------------------------------------
     | Register The Configuration Repository
     |--------------------------------------------------------------------------
     |
     | The configuration repository is used to lazily load in the options for
     | this application from the configuration files. The files are easily
     | separated by their concerns so they do not become really crowded.
     |
     */
    app.config = new Config(
        app.getConfigLoader(), env
    );

    // Set additional configurations
    app.config.set('cache.etagFn', utils.compileETag(app.config.get('cache').etag));
    app.config.set('middleware.queryParserFn', utils.compileQueryParser(app.config.get('middleware').queryParser));
    app.config.set('request.trustProxyFn', utils.compileTrust(app.config.get('request').trustProxy));

    // Expose use method globally
    global.use = app.use.bind(app);

    // Register user aliases for Positron modules
    app.alias(app.config.get('app.aliases', {}));

    /*
     |--------------------------------------------------------------------------
     | Register Booted Start Files & Expose Globals
     |--------------------------------------------------------------------------
     |
     | Once the application has been booted we will expose app globals as per
     | user configuration. Also there are several "start" files
     | we will want to include. We'll register our "booted" handler here
     | so the files are included after the application gets booted up.
     |
     */
    app.booted(function() {
        // expose app globals
        app.exposeGlobals();

        /*
         |--------------------------------------------------------------------------
         | Load The Application Start Script
         |--------------------------------------------------------------------------
         |
         | The start scripts gives this application the opportunity to do things
         | that should be done right after application has booted like configure
         | application logger, load filters etc. We'll load it here.
         |
         */
        var appStartScript = app.path.app + "/start/global.js";


        /*
         |--------------------------------------------------------------------------
         | Load The Environment Start Script
         |--------------------------------------------------------------------------
         |
         | The environment start script is only loaded if it exists for the app
         | environment currently active, which allows some actions to happen
         | in one environment while not in the other, keeping things clean.
         |
         */
        var envStartScript = app.path.app + "/start/" + env + ".js";


        /*
         |--------------------------------------------------------------------------
         | Load The Application Routes
         |--------------------------------------------------------------------------
         |
         | The Application routes are kept separate from the application starting
         | just to keep the file a little cleaner. We'll go ahead and load in
         | all of the routes now and return the application to the callers.
         |
         */
        var routes = app.path.app + "/routes.js";

        async.filter([appStartScript, envStartScript, routes], fs.exists, function (results) {
            results.forEach(function (path) {
                require(path);
            });

            CB(app);
        });
    });

    /*
     |--------------------------------------------------------------------------
     | Register The Core Service Providers
     |--------------------------------------------------------------------------
     |
     | The Positron core service providers register all of the core pieces
     | of the Positron framework including session, auth, encryption
     | and more. It's simply a convenient wrapper for the registration.
     |
     */
    var providers = app.config.get('app').providers;

    app.getProviderRepository().load(providers, function() {

        /*
         |--------------------------------------------------------------------------
         | Boot The Application
         |--------------------------------------------------------------------------
         |
         | Once all service providers are loaded we will  call the boot method on
         | application which will boot all service provider's and eventually boot the
         | positron application.
         |
         */
        app.boot();
    });

}

module.exports = start;