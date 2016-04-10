/**
 * ControllerDispatcher.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var path = require('path');

function ControllerDispatcher(app, filterer) {

    this.__app = app;

    /**
     * The routing filterer implementation.
     **/
    this.__filterer = filterer;
}

/**
 * Dispatch a request to a given controller and method.
 *
 * @param args
 * @param controller
 * @param method
 */
ControllerDispatcher.prototype.dispatch = function (args, controller, method) {
    // First we will get an instance of this controller so that we can call the methods on it.

    var instance = this.__app.router.getControllerInstance(path.join(this.__app.path.app, controller));

    this.__before(instance, args[0], args[1], method, function () {
        this.__call(instance, method, args);
    }.bind(this));
};

/**
 * Call the given controller instance method.
 *
 * @param  instance
 * @param  method
 * @param  args
 * @return mixed
 */
ControllerDispatcher.prototype.__call = function (instance, method, args) {
    return instance.callAction(method, args);
};

/**
 * Call the "before" filters for the controller.
 *
 * @param  instance
 * @param  request
 * @param  response
 * @param  method
 * @param  CB
 * @protected
 */
ControllerDispatcher.prototype.__before = function (instance, request, response, method, CB) {
    var beforeFilters = instance.getBeforeFilters();
    var self = this;

    function next() {
        if (beforeFilters.length) {
            var filter = beforeFilters.shift();
            if (self.__filterApplies(filter, request, method)) {
                self.__callFilter(filter, request, response, next)
            }
            else {
                next();
            }
        } else {
            CB();
        }
    }

    next();
};

/**
 * Call the given controller filter method.
 *
 * @param  filter
 * @param  request
 * @param  response
 * @param  CB
 * @protected
 */
ControllerDispatcher.prototype.__callFilter = function (filter, request, response, CB) {
    var temp = {};
    temp[filter.filter] = filter.parameters;

    return this.__filterer.callRouteFilters(temp, request, response, CB);
};

/**
 * Determine if the given filter applies to the request.
 *
 * @param  filter
 * @param  request
 * @param  method
 * @return bool
 * @protected
 */
ControllerDispatcher.prototype.__filterApplies = function (filter, request, method) {
    var types = ['Only', 'Except', 'On'];
    for (var i = 0; i < types.length; i++) {
        if (this['__filterFails' + types[i]](filter, request, method)) {
            return false;
        }
    }

    return true;
};

/**
 * Determine if the filter fails the "only" constraint.
 *
 * @param  filter
 * @param  request
 * @param  method
 * @return bool
 * @protected
 */
ControllerDispatcher.prototype.__filterFailsOnly = function (filter, request, method) {
    if (!isset(filter['options']['only'])) return false;

    filter['options']['only'] = parseArray(filter['options']['only']);
    return !~filter['options']['only'].indexOf(method)
};

/**
 * Determine if the filter fails the "except" constraint.
 *
 * @param  filter
 * @param  request
 * @param  method
 * @return bool
 * @protected
 */
ControllerDispatcher.prototype.__filterFailsExcept = function (filter, request, method) {
    if (!isset(filter['options']['except'])) return false;

    filter['options']['options'] = parseArray(filter['options']['options']);
    return !!~filter['options']['except'].indexOf(method)
};

/**
 * Determine if the filter fails the "on" constraint.
 *
 * @param  filter
 * @param  request
 * @param  method
 * @return bool
 * @protected
 */
ControllerDispatcher.prototype.__filterFailsOn = function (filter, request, method) {
    var on = filter.options.on || null;

    if (isNull(on)) return false;

    // If the "on" is a string, we will explode it on the pipe so you can set any
    // amount of methods on the filter constraints and it will still work like
    // you specified an array. Then we will check if the method is in array.
    if (_.isString(on)) on = on.split('|');

    return !~on.indexOf(request.method.toLowerCase());
};

module.exports = ControllerDispatcher;