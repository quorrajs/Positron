/**
 * HttpMethodOverrideMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function HttpMethodOverride(app, next) {
    this.__app = app;
    this.__next = next;
}

/**
 * Modifies request.method to request "intended" method.
 *
 * If the X-HTTP-Method-Override header is set, and if the method is a POST,
 * then it is used to determine the "real" intended HTTP method.
 *
 * The _method request parameter can also be used to determine the HTTP method
 *
 * The method is always an uppercased string.
 *
 * The real request method is saved as realMethod attribute.
 *
 * @return void
 */

HttpMethodOverride.prototype.handle = function (request, response) {
    if ('POST' === request.method) {
        var method;

        request.realMethod = request.method;

        if (method = request.header('X-HTTP-METHOD-OVERRIDE') || request.input.get('_method')) {
            request.method = method.toUpperCase();
        }
    }

    this.__next.handle(request, response);
};

module.exports = HttpMethodOverride;