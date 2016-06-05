/**
 * SessionMiddleware.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function StartSession(app, next) {
    this.__app = app;
    this.__next = next;

    /**
     * Session config
     */
    this.__config = this.__app.config.get('session');

    this.sessionHandler = app.sessionHandler;
}

StartSession.prototype.handle = function (request, response) {
    var self = this;
    // If a session driver has been configured, we will need to start the session here
    // so that the data is ready for an application.
    if (this.__sessionConfigured()) {
        this.sessionHandler.startSession(request, response, function () {
            self.__next.handle(request, response);
        })
    } else {
        this.__next.handle(request, response);
    }


};
/**
 * Determine if a session driver has been configured.
 *
 * @return {Boolean}
 * @protected
 */
StartSession.prototype.__sessionConfigured = function () {
    return this.__sessionConfigured ||
        (this.__sessionConfigured = isset(this.__config.driver));
};

module.exports = StartSession;