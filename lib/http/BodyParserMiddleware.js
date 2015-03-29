/**
 * BodyParserMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var bodyParser = require('body-parser');

function BodyParser(app, next){
    this.__app = app;
    this.__next = next;
}

BodyParser.prototype.handle = function(request, response) {
    function next(err){
        if(err){
            throw err;
        }

        // parse application/json
        (bodyParser.json())(request, response, function(err){
            if(err){
                throw err;
            }

            this.__next.handle(request, response)
        }.bind(this));
    }

    // parse application/x-www-form-urlencoded
    (bodyParser.urlencoded({ extended: false }))(request, response, next.bind(this));
};


module.exports = BodyParser;