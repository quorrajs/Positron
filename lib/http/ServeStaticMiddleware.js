/**
 * ServeStaticMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var serveStatic = require('serve-static');
var util = require('util');
var merge = require('utils-merge');

function ServeStatic(app, next) {
    this.__app = app;
    this.__next = next;
}

ServeStatic.prototype.handle = function (request, response) {
    var options = this.__app.config.get('middleware').serveStatic;

    if (!util.isObject(options)) {
        options = {};
    }

    options = merge({
        'index': "index.html"
    }, options);

    var serve = serveStatic(this.__app.path.public, options);

    serve(request, response, function (err) {
        if (err) {
            throw err;
        }

        this.__next.handle(request, response);
    }.bind(this));
};


module.exports = ServeStatic;