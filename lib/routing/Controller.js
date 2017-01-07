/**
 * controller.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var util = require("util");
var crypto = require('crypto');
var _ = require('lodash');
var uuid = require('uuid');

function Controller() {
    /**
     * The "before" filters registered on the controller.
     *
     * @var array
     * @protected
     */
    this.__beforeFilters = [];
}

/**
 * Set the route filterer implementation.
 *
 * @param  filterer
 * @return void
 * @static
 */
Controller.setFilterer = function (filterer) {
    Controller.filterer = filterer;
};

/**
 * Get the route filterer implementation.
 */
Controller.getFilterer = function () {
    return Controller.filterer;
};

/**
 *
 * @param Child
 * @returns {function}
 * @static
 */
Controller.extend = function (Child) {


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
 * Execute an action on the controller.
 *
 * @param method
 * @param args
 */
Controller.prototype.callAction = function (method, args) {

    this[method].apply(this, args)
};

/**
 * Get the registered "before" filters.
 *
 * @return array
 */
Controller.prototype.getBeforeFilters = function () {
    return this.__beforeFilters.slice(0);
};

/**
 * Register a "before" filter on the controller.
 *
 * @param  filter
 * @param  options
 * @return void
 */
Controller.prototype.beforeFilter = function (filter, options) {
    if (!isset(options)) {
        options = {};
    }

    this.__beforeFilters.push(this.__parseFilter(filter, options));
};

/**
 * Parse the given filter and options.
 *
 * @param  filter
 * @param  options
 * @return Object
 * @protected
 */
Controller.prototype.__parseFilter = function (filter, options) {
    var original = filter;

    if (typeof filter === "function") {
        filter = this.__registerClosureFilter(filter);
    } else if (this.__isInstanceFilter(filter)) {
        filter = this.__registerInstanceFilter(filter);
    } else {
        filter = Controller.filterer.parseFilter(filter);
    }

    return {
        original: original,
        filter: Object.keys(filter)[0],
        parameters: filter[Object.keys(filter)[0]],
        options: options
    };
};

/**
 * Register an anonymous controller filter Closure.
 *
 * @param  filter
 * @return string
 * @protected
 * @note: name generation when same closure used multiple times(don't re reg existing)
 */
Controller.prototype.__registerClosureFilter = function (filter) {
    var name = uuid.v4();
    Controller.getFilterer().register('router.filter: ' + name, filter);

    var obj = {};
    obj[name] = [];

    return obj;
};

/**
 * Determine if a filter is a local method on the controller.
 *
 * @param  filter
 * @return boolean
 *
 * @throws Error
 * @protected
 */
Controller.prototype.__isInstanceFilter = function (filter) {
    if (_.isString(filter) && _.startsWith(filter, '@')) {
        if (typeof this[filter.substr(1)] === 'function') return true;

        throw new Error("Filter method " + filter + " does not exist.");
    }

    return false;
};

/**
 * Register a controller instance method as a filter.
 *
 * @param  filter
 * @return string
 */
Controller.prototype.__registerInstanceFilter = function (filter) {
    var name = uuid.v4();
    Controller.getFilterer().register('router.filter: ' + name/*filter*/, this[filter.substr(1)].bind(this));

    var obj = {};
    obj[name] = [];
    return obj/*filter*/;
};

/**
 * Handle calls to missing methods on the controller.
 *
 *
 */
Controller.prototype.missingMethod = function (request, response) {
    var notFoundError = new Error("Controller method not found.");
    notFoundError.status = 404;
    response.abort(notFoundError);
};

module.exports = Controller;
