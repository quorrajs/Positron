/**
 * CookieParserMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
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