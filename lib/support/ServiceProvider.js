/**
 * ServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var util = require("util");

function ServiceProvider() {
    /**
     * The application instance.
     *
     * @var {object}
     * @protected
     */
    this.__app;


}

/**
 * Inherit constructor from ServiceProvider
 *
 * @param Child
 * @returns {function}
 * @static
 */
ServiceProvider.extend = function (Child) {
    function ChildProxy() {
        ChildProxy.super_.call(this);
        Child.apply(this, arguments);
    }

    util.inherits(ChildProxy, this);
    ChildProxy.prototype = util._extend(ChildProxy.prototype, Child.prototype);
    ChildProxy.extend = this.extend;

    return ChildProxy;
};

/**
 * Register the service provider.
 *
 * @param {function} done
 */
ServiceProvider.prototype.register = function (done) {
    done();
};


/**
 * Boot the service provided by the service provider.
 *
 * @param {function} done
 */
ServiceProvider.prototype.boot = function (done) {
    done();
};

module.exports = ServiceProvider;