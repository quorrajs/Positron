/**
 * CookieParserMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function CookieParser(app, next) {
    this.__app = app;
    this.__next = next;
}

CookieParser.prototype.handle = function (request, response) {
    this.__app.cookieParser(request, response, function () {
        this.__next.handle(request, response);
    }.bind(this))
};

module.exports = CookieParser;