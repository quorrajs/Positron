/**
 * start.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var fs = require('fs');
var EnvironmentVariables = require('../config/EnvironmentVariables');
var Config = require('../config/Repository');
var ExceptionHandler = require('../exception/Handler');
var PlainDisplayer = require('../exception/PlainDisplayer');
var DebugDisplayer = require('ouch');
var Router = require('../routing/Router');
var Controller = require('../routing/Controller');
var Filter = require('../routing/Filter');
var utils = require('../support/utils');
var ViewFactory = require('../view/ViewFactory');
var ModelFactory = require('../database/ModelFactory');
var logger = require('../log/writer');
var NodeSession = require('node-session');
var Encrypter = require('encrypter');
var async = require('async');
var _ = require('lodash');
var urlGenerator = require('../routing/UrlGenerator');

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

    //@todo: documentation
    // logging and exception handling
    app.exception = new ExceptionHandler(
        new PlainDisplayer(),
        new DebugDisplayer(
            [
            new DebugDisplayer.handlers.JsonResponseHandler(true),
            new DebugDisplayer.handlers.PrettyPageHandler(null, null, 'sublime')
            ]
        ),
        app.config.get('app').debug
    );
    app.log = logger();

    // models
    app.models = (new ModelFactory(app, app.path.app + '/models')).load();

    // routing
    app.__filter = new Filter();
    app.router = new Router(app, app.__filter);
    app.Controller = Controller;
    app.Controller.setFilterer(app.__filter);
    app.url =   new urlGenerator(app.router.getRoutes(), app);

    // views
    app.view = new ViewFactory(app, app.config.get('view'));

    // encryption
    app.encrypter = new Encrypter(app.config.get('app').key);

    // Initialize session module
    if(app.config.get('middleware').session) {
        var sessionConfig = _.clone(app.config.get('session'));
        sessionConfig.trustProxy = app.config.get('app').trustProxy;
        sessionConfig.secret = app.config.get('app').key;

        if(sessionConfig.connection !== null) {
            sessionConfig.connection = app.config.get('database').connections[sessionConfig.connection]
        }

        app.__session = new NodeSession(sessionConfig, app.encrypter)
    }

    app.config.set('cache.etagFn', utils.compileETag(app.config.get('cache').etag));
    app.config.set('middleware.queryParserFn', utils.compileQueryParser(app.config.get('middleware').queryParser));

    /*
     |--------------------------------------------------------------------------
     | Load The Application Start Script
     |--------------------------------------------------------------------------
     |
     |
     */
    var appStartScript = app.path.app+"/start/global.js";


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
    var envStartScript = app.path.app+"/start/"+ env +".js";


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
    var routes = app.path.app+"/routes.js";

    async.filter([appStartScript, envStartScript,routes], fs.exists, function(results){
        results.forEach(function(path){
            require(path);
        });

        CB(app);
    });

}

module.exports = start;