/**
 * Route.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */
var _ = require('lodash');
var path = require('path');
var routeCompiler = require('./routeCompiler');
var str = require('../support/str');
var MethodValidator = require('./matching/MethodValidator');
var HostValidator = require('./matching/HostValidator');
var SchemeValidator = require('./matching/SchemeValidator');
var UriValidator = require('./matching/UriValidator');
var xregexp = require('xregexp');

function Route(methods, uri, action, filter){

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
    this.__action  = this.__parseAction(action);

    /**
     * The HTTP methods the route responds to.
     *
     * @var{Array}
     * @protected
     */
    this.__methods = parseArray(methods);

    if (isset(this.__action['prefix']))
    {
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
     * The validators used by the routes.
     *
     * @var {Array}
     * @static
     */
    arguments.callee.validators;

    this.__filter = filter;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @type {string}
     * @private
     */
    this.__host = '';

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

    /**
     * @type {string}
     * @private
     */
    this.__path = '/';

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


}

/**
 * Parse the route action into a standard array.
 *
 * @param  {function|Array}  action
 * @return {Array}
 * @protected
 */
Route.prototype.__parseAction = function(action)
{
    // If the action is already a Closure instance, we will just set that instance
    // as the "uses" property, because there is nothing else we need to do when
    // it is available. Otherwise we will need to find it in the action list.
    if (typeof action === 'function')
    {
        var temp = {};
        temp['uses'] = action;
        return temp;
    }

    // If no "uses" property has been set, we will dig through the array to find a
    // Closure instance within this list. We will set the first Closure we come
    // across into the "uses" property that will get fired off by this route.
    else if ( ! isset(action['uses']))
    {
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
Route.prototype.__findClosure = function(action)
{
    action = parseArray(action);
    return _.find(action, function(value) {
        return typeof value === 'function';
    });
};

/**
 * Add a prefix to the route URI.
 *
 * @param  {string} prefix
 * @return Route
 */
Route.prototype.prefix = function(prefix)
{
    this.__uri = path.join(prefix, this.__uri);

    return this;
};

/**
 * Get the domain defined for the route.
 *
 * @return string|null
 */
Route.prototype.domain = function()
{
    return isset(this.__action['domain'])?this.__action['domain']:'';
};

/**
 * Get the URI that the route responds to.
 *
 * @return {string}
 */
Route.prototype.getUri = function()
{
    return this.__uri;
};

/**
 * Run the route action and return the response.
 *
 */
Route.prototype.run = function(request, response, CB)
{
    var parameters = _.filter(request.routeParameters, function(p) { return isset(p); });
    parameters.unshift(request, response);
    this.__action['uses'].apply(this, parameters);
};

/**
 * Parse arguments to the where method into an array.
 *
 * @param  {Object}  name
 * @param  {String}  expression
 * @return {Route}
 * @protected
 */
Route.prototype.__parseWhere = function(name, expression)
{
    if(isObject(name)) {
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
Route.prototype.where = function(name, expression)
{
    if(!isset(expression)) expression = null;
    var whereObject = this.__parseWhere(name, expression);
    for(name in whereObject){
        this.__wheres[name] = whereObject[name];
    }
    return this;
};

/**
 * Get the HTTP verbs the route responds to.
 *
 * @return {Array}
 */
Route.prototype.methods = function()
{
    return this.__methods;
};

/**
 * Get the optional parameters for the route.
 *
 * @return {Array}
 * @protected
 */
Route.prototype.__extractOptionalParameters = function()
{
    var matchRegex = /\{(\w+?)\?\}/g;
    var match;
    var matches = [];
    while ((match = matchRegex.exec(this.__uri)) && matches.push(match[1])) {}

    return matches.length ? arrayFillKeys(matches, null) : [];
};

/**
 * Compile the route into a CompiledRoute instance.
 *
 * @return {void}
 * @protected
 */
Route.prototype.__compileRoute = function()
{
    if(this.__compiled == null) {
        var optionals = this.__extractOptionalParameters();

        var uri = this.__uri.replace(/\{(\w*?)\?\}/g, '{$1}');

        this.setPath(uri);
        this.setDefaults(optionals);
        this.setRequirements(this.__wheres);
        this.setHost(this.domain() ? this.domain() : '');

        this.__compiled = routeCompiler.compile(this);
    }
};


/**
 * Get the action object for the route.
 *
 * @return Object
 */
Route.prototype.getAction = function()
{
    return this.__action;
};

/**
 * Set the action object for the route.
 *
 * @param  action
 * @return Route
 */
Route.prototype.setAction = function(action)
{
    this.__action = action;

    return this;
};

/**
 * Get the HTTP verbs the route responds to.
 *
 * @return {Array}
 */
Route.prototype.methods = function()
{
    if (this.__methods.indexOf('GET') !== -1 && this.__methods.indexOf('HEAD') === -1)
    {
        this.__methods.push('HEAD');
    }

    return this.__methods;
};

/**
 * Determine if the route only responds to HTTP requests.
 *
 * @return {boolean}
 */
Route.prototype.httpOnly = function()
{
    return _.findKey(this.__action, function(property){
        return 'http' === property;
    }) !== undefined;
};

/**
 * Determine if the route only responds to HTTPS requests.
 *
 * @return {boolean}
 */
Route.prototype.secure = function()
{
    return _.findKey(this.__action, function(property){
        return 'https' === property;
    }) !== undefined;
};

/**
 * Get the route validators for the instance.
 *
 * @return {Array}
 */
Route.prototype.getValidators = function()
{
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
Route.prototype.matches = function(request, includingMethod)
{
    if(!isset(includingMethod)) includingMethod = true;

    this.__compileRoute();

    var validators = this.getValidators();
    var validator;
    var k;
    for (k in validators)
    {
        validator = validators[k];
        if ( ! includingMethod && validator instanceof MethodValidator) continue;

        if ( ! validator.matches(this, request)) return false;
    }

    return true;
};

/**
 * Bind the route to a given request for execution.
 *
 * @param request
 * @returns {Route}
 */
//@todo: bind the route to request instead
Route.prototype.bind = function(request)
{
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
Route.prototype.bindParameters = function(request)
{
    // If the route has a regular expression for the host part of the URI, we will
    // compile that and get the parameter matches for this domain. We will then
    // merge them into this parameters array so that this array is completed.

    var pathParameters = this.__bindPathParameters(request);

    pathParameters.shift();
    delete pathParameters['index'];
    delete pathParameters['input'];

    var params = this.matchToKeys(
        pathParameters
    );

//@todo: check host param working imp
    // If the route has a regular expression for the host part of the URI, we will
    // compile that and get the parameter matches for this domain. We will then
    // merge them into this parameters array so that this array is completed.
    if ( ! isNull(this.__compiled.getHostRegex()))
    {
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
Route.prototype.__bindPathParameters = function(request)
{
    //@todo:note path imp
    var uriPath = ('/'+ str.trim(request.path, '/')==""?"/": '/'+ str.trim(request.path, '/'));

    return xregexp.exec(uriPath, this.__compiled.getRegex());
};

/**
 * Extract the parameter list from the host part of the request.
 *
 * @param  request
 * @param  parameters
 * @return {Array}
 */
// @todo: check integrity imp
Route.prototype.__bindHostParameters = function(request, parameters)
{
     var matches = xregexp.exec(request.getHost(), this.__compiled.getHostRegex());

    return _.merge(this.matchToKeys(matches.slice(1)), parameters);
};

/**
 * Combine a set of parameter matches with the route's keys.
 *
 * @param  {Array}  matches
 * @return {Array}
 */
Route.prototype.matchToKeys = function(matches)
{
    var parameterNames = this.parameterNames();
    if (parameterNames.length == 0) return [];

    var key, parameters = {};
    for(key in parameterNames)
    {
        if(isset(matches[parameterNames[key]]))
            parameters[parameterNames[key]] = matches[parameterNames[key]];
    }

    Object.keys(parameters).filter(function (value) {
        return !(str.isString(value) && value.length > 0);
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
Route.prototype.parameterNames = function()
{
    // @todo: note imp
    /*if (isset(this.__parameterNames)) return this.__parameterNames;*/

    return /*this.__parameterNames =*/ this.__compileParameterNames();
};

/**
 * Get the parameter names for the route.
 *
 * @return {Array}
 */
Route.prototype.__compileParameterNames = function()
{
    var matches = [], pattern = /\{(.*?)\}/g;
    var match;
    while ((match = pattern.exec(this.domain() + this.__uri)) && matches.push(match[1])){}

    return matches.map(function(m) { return str.trim(m, '?'); });
};

/**
 * Replace null parameters with their defaults.
 *
 * @param  {Array} parameters
 * @return {Array}
 */
Route.prototype.__replaceDefaults = function(parameters)
{
    var key, value;
    for(key in parameters)
    {
        if(parameters.hasOwnProperty(key)) {
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
Route.prototype.getCompiled = function() {
    return this.__compiled;
};

/**
 * Get the "before" filters for the route.
 *
 * @return array
 */
Route.prototype.beforeFilters = function()
{
    if ( ! isset(this.__action['before'])) return [];

    return this.__filter.parseFilters(this.__action['before']);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Returns the pattern for the host.
 *
 * @return string The host pattern
 */
Route.prototype.getHost = function()
{
    return this.__host;
};

/**
 * Sets the pattern for the host.
 *
 * This method implements a fluent interface.
 *
 * @param {string} pattern The host pattern
 *
 * @return Route The current Route instance
 */
Route.prototype.setHost = function(pattern)
{
    this.__host = pattern.toString();
    this.__compiled = null;
    return this;
};

/**
 * Returns the requirements.
 *
 * @return array The requirements
 */
Route.prototype.getRequirements = function()
{
    return this.__requirements;
};

/**
 * Checks if a default value is set for the given variable.
 *
 * @param {String} name A variable name
 *
 * @return {boolean} true if the default value is set, false otherwise
 */
Route.prototype.hasDefault = function(name)
{
    return name in this.__defaults;
};

/**
 * Returns the pattern for the path.
 *
 * @return {String} The path pattern
 */
Route.prototype.getPath = function()
{
    return this.__path;
};

/**
 * Sets the pattern for the path.
 *
 * This method implements a fluent interface.
 *
 * @param {string} pattern The path pattern
 *
 * @return Route The current Route instance
 */
Route.prototype.setPath = function(pattern)
{
    // A pattern must start with a slash and must not have multiple slashes at the beginning because the
    // generated path for this route would be confused with a network path, e.g. '//domain.com/path'.
    this.__path = '/' + str.ltrim(pattern.trim(), '/');
    this.__compiled = null;

    return this;
};

/**
 * Sets the defaults.
 *
 * @param {Array} defaults The defaults
 *
 * @return Route The current Route instance
 */
Route.prototype.setDefaults = function(defaults)
{
    if(!isset(defaults))
        defaults = [];
    this.__defaults = [];

    return this.addDefaults(defaults);
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
Route.prototype.addDefaults = function(defaults)
{
    var name, defaultVal;
    for(name in defaults) {
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
Route.prototype.setRequirements = function(requirements)
{
    this.__requirements = [];

    return this.addRequirements(requirements);
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
Route.prototype.addRequirements = function(requirements)
{
    var key, regex;
    for(key in requirements) {
        regex = requirements[key];
        this.__requirements[key] = this.__sanitizeRequirement(key, regex);
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
Route.prototype.__sanitizeRequirement = function(key, regex)
{
    if (!str.isString(regex)) {
        throw new Error('Routing requirement for '+key+' must be a string.');
    }

    if ('' !== regex && '^' === regex[0]) {
        regex = regex.substr(1); // returns false for a single character

        if(regex === "")
            regex = false;
    }

    if ('$' === regex.substr(-1)) {
        regex = regex.slice(0, -1);
    }

    if ('' === regex) {
        throw new Error('Routing requirement for '+key+' cannot be empty.');
    }
    //todo: note

    return regex;
};

/**
 * Returns the requirement for the given key.
 *
 * @param {String} key The key
 *
 * @return {String | null} The regex or null when not given
 */
Route.prototype.getRequirement = function(key)
{
    return isset(this.__requirements[key]) ? this.__requirements[key] : null;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////







module.exports = Route;
