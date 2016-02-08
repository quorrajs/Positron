/**
 * StackedHttpKernel.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function StackedHttpKernel(app, middlewares) {

    this.__app = app;
    this.__middlewares = middlewares;
}

StackedHttpKernel.prototype.handle = function(request, response) {
    this.__app.handle(request, response);
};

module.exports = StackedHttpKernel;