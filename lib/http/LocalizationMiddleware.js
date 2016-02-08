/**
 * LocalizationMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
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