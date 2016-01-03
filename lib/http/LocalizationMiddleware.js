/**
 * LocalizationMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2016, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var i18n = require("i18n");

//@todo: consider adding cookie based locale settings

function LocalizationMiddleware(app, next){
    this.__app = app;
    this.__next = next;
}

LocalizationMiddleware.prototype.handle = function(request, response) {
    i18n.init(request, response);

    this.__next.handle(request, response);
};


module.exports = LocalizationMiddleware;