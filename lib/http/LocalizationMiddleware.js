/**
 * LocalizationMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2016, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

//@todo: consider adding cookie based locale settings

function LocalizationMiddleware(app, next){
    this.__app = app;
    this.__next = next;
}

LocalizationMiddleware.prototype.handle = function(request, response) {
    this.__app.lang.init(request, response);

    this.__next.handle(request, response);
};


module.exports = LocalizationMiddleware;