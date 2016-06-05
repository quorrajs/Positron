/**
 * AuthMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function Auth(app, next) {
    this.__app = app;
    this.__next = next;
}

Auth.prototype.handle = function (request, response) {
    request.auth = this.__app.authManager.getDriver(request, response);

    this.__next.handle(request, response);
};

module.exports = Auth;
