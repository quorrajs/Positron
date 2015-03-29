/**
 * ServeStaticMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var serveStatic = require('serve-static');

function ServeStatic(app, next){
    this.__app = app;
    this.__next = next;
}

ServeStatic.prototype.handle = function(request, response) {
    var serve = serveStatic('public', {
        'index': "index.html"
    });

    serve(request, response, function(err){
        if(err){
            throw err;
        }

        this.__next.handle(request, response);
    }.bind(this));
};


module.exports = ServeStatic;