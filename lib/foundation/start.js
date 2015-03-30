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
var Router = require('../routing/Router');
var Controller = require('../routing/Controller');
var Filter = require('../routing/Filter');
var utils = require('../support/utils');
var ViewFactory = require('../view/ViewFactory');

var async = require('async');

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
    this.config = new Config(
        app.getConfigLoader(), env
    );

    //@todo: documentation
    this.exception = new ExceptionHandler(this.config.get('app').debug);
    this.__filter = new Filter();
    this.router = new Router(this, this.__filter);
    this.Controller = Controller;
    this.Controller.setFilterer(this.__filter);
    this.view = new ViewFactory(this, this.config.get('view').defaultEngine, this.config.get('view').engines);
    this.config.set('cache.etagFn', utils.compileETag(this.config.get('cache').etag));
    this.config.set('middleware.queryParserFn', utils.compileQueryParser(this.config.get('middleware').queryParser));

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