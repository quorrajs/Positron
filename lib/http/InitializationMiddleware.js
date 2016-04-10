/**
 * InitializationMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

/**
 * Initialization middleware, exposing the
 * request and response to each other, as well
 * as defaulting the X-Powered-By header field.
 *
 * @param {Function} app
 * @return {Function}
 */

var req = require('./request');
var res = require('./response');

function Init(app, next) {
    this.__app = app;
    this.__next = next;
}

Init.prototype.handle = function (request, response) {
    if (this.__app.config.get('app').attributionText) {
        response.setHeader('X-Powered-By', 'Quorra');
    }

    request.app = this.__app;

    request.res = response;
    response.req = request;

    request.__proto__ = req;
    response.__proto__ = res;

    response.locals = response.locals || Object.create(null);

    this.__next.handle(request, response);
};


module.exports = Init;
