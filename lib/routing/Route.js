/**
 * Route.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var routeCompiler = require('./routeCompiler');
var str = require('../support/str');
var MethodValidator = require('./matching/MethodValidator');
var HostValidator = require('./matching/HostValidator');
var SchemeValidator = require('./matching/SchemeValidator');
var UriValidator = require('./matching/UriValidator');
var xregexp = require('xregexp');

function Route(methods, uri, action, filter) {

    /**
     * The URI pattern the route responds to.
     *
     * @var {string}
     * @protected
     */
    this.__uri = uri;


    /**
     * The array of matched parameters.
     *
     * @var {Array}
     * @protected
     */
    this.__parameters;

    /**
     * The parameter names for the route.
     *
     * @var {Array|null}
     */
    this.__parameterNames;

    /**
     * The route action object.
     *
     * @var {Object}
     * @protected
     */
    this.__action = this.__parseAction(action);

    /**
     * The HTTP methods the route responds to.
     *
     * @var{Array}
     * @protected
     */
    this.__methods = parseArray(methods);

    if (isset(this.__action['prefix'])) {
        this.prefix(this.__action['prefix']);
    }

    /**
     * The regular expression requirements.
     *
     * @var {Object}
     * @protected
     */
    this.__wheres = {};

    /**
     * @type {null}
     * @protected
     */
    this.__compiled = null;

    /**
     * Filter service instance.
     *
     * @var {object}
     * @protected
     */
    this.__filter = filter;

    /**
     * @type {Array}
     * @private
     */
    this.__requirements = [];

    /**
     * @type {Array}
     * @private
     */
    this.__defaults = [];
}

/**
 * The validators used by the routes.
 *
 * @var {function[]}
 * @static
 */
Route.validators;

/**
 * Parse the route action into a standard array.
 *
 * @param  {function|Array}  action
 * @return {Array}
 * @protected
 */
Route.prototype.__parseAction = function (action) {
    // If the action is already a Closure instance, we will just set that instance
    // as the "uses" property, because there is nothing else we need to do when
    // it is available. Otherwise we will need to find it in the action list.
    if (typeof action === 'function') {
        var temp = {};
        temp['uses'] = action;
        return temp;
    }

    // If no "uses" property has been set, we will dig through the array to find a
    // Closure instance within this list. We will set the first Closure we come
    // across into the "uses" property that will get fired off by this route.
    else if (!isset(action['uses'])) {
        action['uses'] = this.__findClosure(action);
    }

    return action;
};

/**
 * Find the Closure in an action array.
 *
 * @param  {Array} action
 * @return {function}
 * @protected
 */
Route.prototype.__findClosure = function (action) {
    action = parseArray(action);
    return _.find(action, function (value) {
        return typeof value === 'function';
    });
};

/**
 * Add a prefix to the route URI.
 *
 * @param  {string} prefix
 * @return Route
 */
Route.prototype.prefix = function (prefix) {
    this.__uri = str.rtrim(prefix, '/') + '/' + str.ltrim(this.__uri, '/');

    return this;
};

/**
 * Get the domain defined for the route.
 *
 * @return string|null
 */
Route.prototype.domain = function () {
    return isset(this.__action['domain']) ? this.__action['domain'] : '';
};

/**
 * Get the URI that the route responds to.
 *
 * @return {string}
 */
Route.prototype.getUri =
    Route.prototype.uri =
        function () {
            return this.__uri;
        };

/**
 * Run the route action and return the response.
 *
 * @param {object} request
 * @param {object} response
 */
Route.prototype.run = function (request, response) {
    var parameters = _.filter(request.routeParameters, function (p) {
        return isset(p);
    });
    parameters.unshift(request, response);
    this.__action['uses'].apply(this, parameters);
};

/**
 * Parse arguments to the where method into an array.
 *
 * @param  {Object}  name
 * @param  {String}  expression
 * @return {object}
 * @protected
 */
Route.prototype.__parseWhere = function (name, expression) {
    if (isObject(name)) {
        return name;
    }
    else {
        var temp = {};
        temp[name] = expression;
        return temp;
    }
};

/**
 * Set a regular expression requirement on the route.
 *
 * @param  {Array|String}  name
 * @param  {String}  expression
 * @return Route
 */
Route.prototype.where = function (name, expression) {
    if (!isset(expression)) expression = null;
    var whereObject = this.__parseWhere(name, expression);
    for (name in whereObject) {
        if (whereObject.hasOwnProperty(name)) {
            this.__wheres[name] = whereObject[name];
        }
    }
    return this;
};

/**
 * Get the HTTP verbs the route responds to.
 *
 * @return {Array}
 */
Route.prototype.methods = function () {
    return this.__methods;
};

/**
 * Get the optional parameters for the route.
 *
 * @return {Array}
 * @protected
 */
Route.prototype.__extractOptionalParameters = function () {
    var matchRegex = /\{(\w+?)\?\}/g;
    var match;
    var matches = [];
    while ((match = matchRegex.exec(this.__uri)) && matches.push(match[1])) {
    }

    return matches.length ? arrayFillKeys(matches, null) : [];
};

/**
 * Compile the route into a CompiledRoute instance.
 *
 * @return {void}
 * @protected
 */
Route.prototype.__compileRoute = function () {
    if (this.__compiled == null) {
        var optionals = this.__extractOptionalParameters();

        this.__setDefaults(optionals);
        this.__setRequirements(this.__wheres);

        this.__compiled = routeCompiler.compile(this);
    }
};


/**
 * Get the name of the route instance.
 *
 * @return string
 */
Route.prototype.getName = function () {
    return isset(this.__action['as']) ? this.__action['as'] : null;
};

/**
 * Get the action name for the route.
 *
 * @return {String}
 */
Route.prototype.getActionName = function () {
    return isset(this.__action['controller']) ? this.__action['controller'] : 'Closure';
};

/**
 * Get the action object for the route.
 *
 * @return Object
 */
Route.prototype.getAction = function () {
    return this.__action;
};

/**
 * Set the action object for the route.
 *
 * @param  action
 * @return Route
 */
Route.prototype.setAction = function (action) {
    this.__action = action;

    return this;
};

/**
 * Get the HTTP verbs the route responds to.
 *
 * @return {Array}
 */
Route.prototype.methods = function () {
    if (this.__methods.indexOf('GET') !== -1 && this.__methods.indexOf('HEAD') === -1) {
        this.__methods.push('HEAD');
    }

    return this.__methods;
};

/**
 * Determine if the route only responds to HTTP requests.
 *
 * @return {boolean}
 */
Route.prototype.httpOnly = function () {
    return !!(this.__action['http'] && this.__action['http'] === true);
};

/**
 * Determine if the route only responds to HTTPS requests.
 *
 * @return {boolean}
 */
Route.prototype.secure = function () {
    return !!(this.__action['https'] && this.__action['https'] === true);
};

/**
 * Get the route validators for the instance.
 *
 * @return {Array}
 */
Route.prototype.getValidators = function () {
    if (isset(Route.validators)) return Route.validators;

    // To match the route, we will use a chain of responsibility pattern with the
    // validator implementations. We will spin through each one making sure it
    // passes and then we will know if the route as a whole matches request.
    return Route.validators = [
        new MethodValidator, new SchemeValidator,
        new HostValidator, new UriValidator
    ];
};

/**
 * Determine if the route matches given request.
 *
 * @param  request
 * @param  {boolean}  includingMethod
 * @return {boolean}
 */
Route.prototype.matches = function (request, includingMethod) {
    if (!isset(includingMethod)) includingMethod = true;

    this.__compileRoute();

    var validators = this.getValidators();
    var validator;
    var k;
    for (k in validators) {
        if (validators.hasOwnProperty(k)) {
            validator = validators[k];
            if (!includingMethod && validator instanceof MethodValidator) continue;

            if (!validator.matches(this, request)) return false;
        }
    }

    return true;
};

/**
 * Bind the route to a given request for execution.
 *
 * @param request
 * @returns {Route}
 */

Route.prototype.bind = function (request) {
    this.__compileRoute();

    this.bindParameters(request);

    return this;
};

/**
 * Extract the parameter list from the request.
 *
 * @param  request
 * @return {Array}
 */
Route.prototype.bindParameters = function (request) {
    // If the route has a regular expression for the path part of the URI, we will
    // compile that and get the parameter matches for this path.

    var pathParameters = this.__bindPathParameters(request);

    pathParameters.shift();
    delete pathParameters['index'];
    delete pathParameters['input'];

    var params = this.matchToKeys(
        pathParameters
    );

    // If the route has a regular expression for the host part of the URI, we will
    // compile that and get the parameter matches for this domain. We will then
    // merge them into this parameters object so that this object is completed.
    if (!isNull(this.__compiled.getHostRegex())) {
        params = this.__bindHostParameters(
            request, params
        );
    }

    return request.params = this.__replaceDefaults(params);
};

/**
 * Get the parameter matches for the path portion of the URI.
 *
 * @param  request
 * @return {Array}
 */
Route.prototype.__bindPathParameters = function (request) {
    var uriPath = ('/' + str.trim(request.path, '/') == "" ? "/" : '/' + str.trim(request.path, '/'));

    return xregexp.exec(uriPath, this.__compiled.getRegex());
};

/**
 * Extract the parameter list from the host part of the request.
 *
 * @param  request
 * @param  parameters
 * @return {Array}
 */
Route.prototype.__bindHostParameters = function (request, parameters) {
    var matches = xregexp.exec(request.host, this.__compiled.getHostRegex());

    matches.shift();
    delete matches['index'];
    delete matches['input'];

    return _.merge(this.matchToKeys(matches), parameters);
};

/**
 * Combine a set of parameter matches with the route's keys.
 *
 * @param  {Array}  matches
 * @return {Object}
 */
Route.prototype.matchToKeys = function (matches) {
    var parameterNames = this.parameterNames();
    if (parameterNames.length == 0) return [];

    var key, parameters = {};
    for (key in parameterNames) {
        if (isset(matches[parameterNames[key]]))
            parameters[parameterNames[key]] = matches[parameterNames[key]];
    }

    Object.keys(parameters).filter(function (value) {
        return !(_.isString(value) && value.length > 0);
    }).forEach(function (v) {
        delete parameters[v];
    });

    return parameters;
};

/**
 * Get all of the parameter names for the route.
 *
 * @return array
 */
Route.prototype.parameterNames = function () {
    if (isset(this.__parameterNames)) return this.__parameterNames;

    return this.__parameterNames = this.__compileParameterNames();
};

/**
 * Get the parameter names for the route.
 *
 * @return {Array}
 */
Route.prototype.__compileParameterNames = function () {
    var matches = [], pattern = /\{(.*?)\}/g;
    var match;
    while ((match = pattern.exec(this.domain() + this.__uri)) && matches.push(match[1])) {
    }

    return matches.map(function (m) {
        return str.trim(m, '?');
    });
};

/**
 * Replace null parameters with their defaults.
 *
 * @param  {Array} parameters
 * @return {Array}
 */
Route.prototype.__replaceDefaults = function (parameters) {
    var key, value;
    for (key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            value = isset(parameters[key]) ? parameters[key] : objectGet(this.__defaults, key);
        }
    }

    return parameters;
};

/**
 * Get the compiled version of the route.
 *
 * @return {CompiledRoute}
 */
Route.prototype.getCompiled = function () {
    return this.__compiled;
};

/**
 * Get the "before" filters for the route.
 *
 * @return {Object}
 */
Route.prototype.beforeFilters = function () {
    if (!isset(this.__action['before'])) return {};

    return this.__filter.parseFilters(this.__action['before']);
};

/**
 * Checks if a default value is set for the given variable.
 *
 * @param {String} name A variable name
 *
 * @return {boolean} true if the default value is set, false otherwise
 */
Route.prototype.hasDefault = function (name) {
    return name in this.__defaults;
};

/**
 * Returns the pattern for the path without optional symbol(?).
 *
 * @return {String} The path pattern
 */
Route.prototype.getPath = function () {
    return '/' + str.ltrim(this.__uri.replace(/\{(\w*?)\?\}/g, '{$1}').trim(), '/');
};

/**
 * Sets the defaults.
 *
 * @param {Array} defaults The defaults
 *
 * @return Route The current Route instance
 */
Route.prototype.__setDefaults = function (defaults) {
    if (!isset(defaults))
        defaults = [];
    this.__defaults = [];

    return this.__addDefaults(defaults);
};

/**
 * Adds defaults.
 *
 * This method implements a fluent interface.
 *
 * @param {Array} defaults The defaults
 *
 * @return Route The current Route instance
 */
Route.prototype.__addDefaults = function (defaults) {
    var name, defaultVal;
    for (name in defaults) {
        defaultVal = defaults[name];
        this.__defaults[name] = defaultVal;
    }
    this.__compiled = null;

    return this;
};

/**
 * Sets the requirements.
 *
 * This method implements a fluent interface.
 *
 * @param {Array} requirements The requirements
 *
 * @return Route The current Route instance
 */
Route.prototype.__setRequirements = function (requirements) {
    this.__requirements = [];

    return this.__addRequirements(requirements);
};

/**
 * Adds requirements.
 *
 * This method implements a fluent interface.
 *
 * @param {Array} requirements The requirements
 *
 * @return Route The current Route instance
 */
Route.prototype.__addRequirements = function (requirements) {
    var key, regex;
    for (key in requirements) {
        if (requirements.hasOwnProperty(key)) {
            regex = requirements[key];
            this.__requirements[key] = this.__sanitizeRequirement(key, regex);
        }
    }
    this.__compiled = null;

    return this;
};

/**
 * @param key
 * @param regex
 * @returns {*}
 * @private
 */
Route.prototype.__sanitizeRequirement = function (key, regex) {
    if (!_.isString(regex)) {
        throw new Error('Routing requirement for ' + key + ' must be a string.');
    }

    if ('' !== regex && '^' === regex[0]) {
        regex = regex.substr(1); // returns false for a single character

        if (regex === "")
            regex = false;
    }

    if ('$' === regex.substr(-1)) {
        regex = regex.slice(0, -1);
    }

    if ('' === regex) {
        throw new Error('Routing requirement for ' + key + ' cannot be empty.');
    }

    return regex;
};

/**
 * Returns the requirement for the given key.
 *
 * @param {String} key The key
 *
 * @return {String | null} The regex or null when not given
 */
Route.prototype.getRequirement = function (key) {
    return isset(this.__requirements[key]) ? this.__requirements[key] : null;
};

module.exports = Route;
