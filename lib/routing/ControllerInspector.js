/**
 * ControllerInspector.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var reflection = require('reflectionjs');
var path = require('path');
var _ = require('lodash');

function ControllerInspector(app, HTTP_METHODS) {
    this.__app = app;

    /**
     * An array of HTTP verbs.
     *
     * @protected
     */
    this.__verbs = HTTP_METHODS;
}

/**
 * Get the routable methods for a controller.
 *
 * @param  {string}  controller
 * @param  {string}  prefix
 * @return Object
 */
ControllerInspector.prototype.getRoutable = function (controller, prefix) {
    var routable = {};
    var data;

    var instance = this.__app.router.getControllerInstance(path.join(this.__app.path.app, controller));

    //@note: reflection to get public methods only apart from mocked protected
    var methods = reflection(instance).methods();

    // To get the routable methods, we will simply spin through all methods on the
    // controller instance checking to see if it belongs to the given controller and
    // is a publicly routable method. If so, we will add it to this listings.
    methods.forEach(function (method) {
        if (this.isRoutable(method)) {
            data = this.getMethodData(method, prefix);

            routable[method] = routable[method] || [];
            routable[method].push(data);

            // If the routable method is an index method, we will create a special index
            // route which is simply the prefix and the verb and does not contain any
            // the wildcard place-holders that each "typical" routes would contain.
            if (data['plain'] == prefix + '/index') {
                routable[method].push(this.__getIndexData(data, prefix));
            }
        }
    }.bind(this));


    return routable;
};

/**
 * Determine if the given controller method is routable.
 *
 * @param  method
 * @return bool
 */
ControllerInspector.prototype.isRoutable = function (method) {
    //note: check whether method belongs to controller constructor

    for (var i = 0; i < this.__verbs.length; i++) {
        if (_.startsWith(method, this.__verbs[i]))
            return true;
    }

    return false;
};

/**
 * Get the method data for a given method.
 *
 * @param  method
 * @param  prefix
 * @return array
 */
ControllerInspector.prototype.getMethodData = function (method, prefix) {
    var plain = this.getPlainUri(method, prefix);

    return {
        verb: this.getVerb(method),
        plain: plain,
        uri: this.addUriWildcards(plain)
    };
};

/**
 * Determine the URI from the given method name.
 *
 * @param  {string} name
 * @param  {string} prefix
 * @return {string}
 */
ControllerInspector.prototype.getPlainUri = function (name, prefix) {
    return prefix + '/' + ((_.snakeCase(name).split('_')).slice(1)).join('-');
};

/**
 * Extract the verb from a controller action.
 *
 * @param  {string}  name
 * @return {string}
 */
ControllerInspector.prototype.getVerb = function (name) {
    return (_.snakeCase(name).split('_'))[0]
};

/**
 * Add wildcards to the given URI.
 *
 * @param  {string}  uri
 * @return {string}
 */
ControllerInspector.prototype.addUriWildcards = function (uri) {
    return uri + '/{one?}/{two?}/{three?}/{four?}/{five?}';
};

/**
 * Get the routable data for an index method.
 *
 * @param  {object}  data
 * @param  {string}  prefix
 * @return {object}
 */
ControllerInspector.prototype.__getIndexData = function (data, prefix) {
    return {
        verb: data.verb,
        plain: prefix,
        uri: prefix
    };
};

module.exports = ControllerInspector;