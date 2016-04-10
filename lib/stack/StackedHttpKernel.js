/**
 * StackedHttpKernel.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function StackedHttpKernel(app) {

    this.__app = app;
}

/**
 * Start execution of first middleware
 *
 * @param request
 * @param response
 */
StackedHttpKernel.prototype.handle = function (request, response) {
    this.__app.handle(request, response);
};

module.exports = StackedHttpKernel;