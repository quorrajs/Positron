/**
 * ExceptionServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var ExceptionHandler = require('./Handler');
var PlainDisplayer = require('./PlainDisplayer');
var DebugDisplayer = require('ouch');

var ExceptionServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Exception handler manages the error display and logging of errors based
 * on the application environment
 *
 * @param {function} done
 */
ExceptionServiceProvider.prototype.register = function (done) {
    this.__app.exception = new ExceptionHandler(
        new PlainDisplayer(),
        new DebugDisplayer(
            [
                new DebugDisplayer.handlers.JsonResponseHandler(true),
                new DebugDisplayer.handlers.PrettyPageHandler(null, null, 'sublime')
            ]
        ),
        this.__app.config.get('app').debug
    );

    // require longjohn if long stack trace is enabled
    if(this.__app.config.get('app').longStackTrace && !this.__app.environment('production')) {
        var longjohn  = require('longjohn');
        longjohn.empty_frame = '';
        longjohn.async_trace_limit = this.__app.config.get('app.asyncTraceLimit', 10);
    }

    done();
};

module.exports = ExceptionServiceProvider;