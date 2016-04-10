/**
 * QueryParserMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var parseUrl = require('parseurl');

function QueryParser(app, next) {
    this.__app = app;
    this.__next = next;
}

QueryParser.prototype.handle = function (request, response) {
    if (!request.query) {
        var val = parseUrl(request).query;
        var queryParse = this.__app.config.get('middleware').queryParserFn;
        request.query = queryParse(val);
    }

    this.__next.handle(request, response);
};

module.exports = QueryParser;
