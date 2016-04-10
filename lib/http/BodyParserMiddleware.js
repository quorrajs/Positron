/**
 * BodyParserMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var bodyParser = require('body-parser');
var util = require('util');

function BodyParser(app, next) {
    this.__app = app;
    this.__next = next;
}

BodyParser.prototype.handle = function (request, response) {
    this.parseJson(request, response);
};

// parse application/json
BodyParser.prototype.parseJson = function (request, response) {
    var options = this.__app.config.get('middleware').bodyParser.json;

    if (options) {
        if (!util.isObject(options)) {
            options = '';
        }
        (bodyParser.json(options))(request, response, function (err) {
            if (err) {
                throw err;
            }

            this.parseRaw(request, response);
        }.bind(this));
    } else {
        this.parseRaw(request, response);
    }

};

// application/octet-stream
BodyParser.prototype.parseRaw = function (request, response) {
    var options = this.__app.config.get('middleware').bodyParser.raw;

    if (options) {
        if (!util.isObject(options)) {
            options = '';
        }
        (bodyParser.raw(options))(request, response, function (err) {
            if (err) {
                throw err;
            }

            this.parseText(request, response);
        }.bind(this));
    } else {
        this.parseText(request, response);
    }

};

// parse text/plain
BodyParser.prototype.parseText = function (request, response) {
    var options = this.__app.config.get('middleware').bodyParser.text;

    if (options) {
        if (!util.isObject(options)) {
            options = '';
        }
        (bodyParser.text(options))(request, response, function (err) {
            if (err) {
                throw err;
            }

            this.parseUrlencoded(request, response);
        }.bind(this));
    } else {
        this.parseUrlencoded(request, response);
    }

};

// parse application/x-www-form-urlencoded
BodyParser.prototype.parseUrlencoded = function (request, response) {
    var options = this.__app.config.get('middleware').bodyParser.urlencoded;

    if (options) {
        if (!util.isObject(options)) {
            options = '';
        }
        (bodyParser.urlencoded(options))(request, response, function (err) {
            if (err) {
                throw err;
            }

            this.__next.handle(request, response);
        }.bind(this));
    } else {
        this.__next.handle(request, response);
    }

};

module.exports = BodyParser;