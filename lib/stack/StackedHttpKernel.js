/**
 * StackedHttpKernel.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

function StackedHttpKernel(app, middlewares) {

    this.__app = app;
    this.__middlewares = middlewares;
}

StackedHttpKernel.prototype.handle = function(request, response) {
    this.__app.handle(request, response);
};

module.exports = StackedHttpKernel;