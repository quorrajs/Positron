/**
 * FaviconMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */


/**
 * Module dependencies.
 */
    //@todo: consider using serve-favicon middleware

var fs = require('fs');
var crypto = require('crypto');

function md5(str, encoding){
    return crypto
        .createHash('md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex');
}

function Favicon(app) {
    this.__app = app;
    this.path = '../favicon.ico';
    this.maxAge = 86400000;
}

Favicon.prototype.handle = function(request, response){
    var self = this;
    if ('/favicon.ico' == request.url) {
        fs.readFile(self.path, function(err, buf){
            //@todo: manage error
            if(err) {
                response.writeHead(200, {'Content-Type': 'image/x-icon'} );
                response.end();
            }
            else {
                var icon = {
                    headers: {
                        'Content-Type': 'image/x-icon',
                        'Content-Length': buf.length,
                        'ETag': '"' + md5(buf) + '"',
                        'Cache-Control': 'public, max-age=' + (self.maxAge / 1000)
                    },
                    body: buf
                };
                response.writeHead(200, icon.headers);
                response.end(icon.body);
            }
        });
    } else {
        this.__app.handle(request, response);
    }

};

module.exports = Favicon;