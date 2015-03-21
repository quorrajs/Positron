/**
 * Handler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */
//@todo: manage test environment

var domain = require('domain');
var stackTrace = require('stack-trace');
var Ouch = require("ouch");
var PlainDisplayer = require('./PlainDisplayer');

function Handler(debug) {
    /**
     * All of the register exception handlers.
     *
     * @var array
     * @protected
     */
    this.__handlers = [];

    this.__debug = debug === undefined ? true : debug;
}

/**
 * Handle an exception for the application.
 *
 * @param {*} error
 * @param {Object} request
 * @param {Object} response
 */
Handler.prototype.handle = function (error, request, response) {
    this.__callCustomHandlers(error, request, response, function () {
        // If no response was sent by custom exception handlers, we will call the
        // default exception displayer for the current application context and let
        // it show the exception to the user / developer based on the situation.
        return this.__displayException(error, request, response);
    }.bind(this));
};

/**
 * Handle the given exception.
 *
 * @param  {*} error
 * @param {Object} request
 * @param {Object} response
 * @param {function} CB
 */
Handler.prototype.__callCustomHandlers = function (error, request, response, CB) {
    var code = (!error.status || error.status < 400) ? 500 : error.status;
    (function (self, handlers) {
        function next() {
            if (!handlers.length) {
                if (CB) {
                    CB();
                }
            } else {
                var handler = handlers.shift();

                handler(code, error, code);
            }
        }

        try {
            next();
        } catch (e) {
            response.setHeader("Content-Type", "text/html");
            response.writeHead(code);
            response.end(self.__formatException(e));
        }
    })(this, this.__handlers.slice(0));
};

/**
 * Display the given exception to the user.
 *
 * @param  {*} error
 * @param {Object} request
 * @param {Object} response
 */
Handler.prototype.__displayException = function (error, request, response) {
    var handler;
    if (this.__debug) {
        handler = new Ouch([
            new Ouch.handlers.JsonResponseHandler(true),
            new Ouch.handlers.PrettyPageHandler(null, null, 'sublime')
        ]);
    } else {
        handler = new PlainDisplayer();
    }

    handler.handleException(error, request, response);
};

/**
 * Format an exception thrown by a handler.
 *
 * @param  {*} error
 * @return {String}
 */
Handler.prototype.__formatException = function (error) {
    if (this.__debug) {
        var callSite = stackTrace.parse(error);
        var location = error.message || "" + ' in ' + callSite.getFileName() + ':' + callSite.getLineNumber;

        return 'Error in exception handler: ' + location;
    }

    return 'Error in exception handler.';
};

module.exports = Handler;