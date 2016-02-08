/**
 * CookieParserMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var cookieParser = require('cookie-parser');

function CookieParser(app, next){
    this.__app = app;
    this.__next = next;
    this.__cookieParser = cookieParser(app.config.get('app').key)
}

CookieParser.prototype.handle = function(request, response) {
    this.__cookieParser(request, response, function(){
        this.__next.handle(request, response);
    }.bind(this))
};

module.exports = CookieParser;