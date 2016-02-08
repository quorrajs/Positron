/**
 * Filter.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var util = require('util');
var _ = require('lodash');
var str = require('../support/str');

function Filter() {
    /**
     * The sorted event listeners.
     *
     * @var object
     * @protected
     */
    this.__sorted = {};

    /**
     * Wildcard filters
     *
     * @type Object
     * @protected
     */
    this.__wildcards = {};

    /**
     * The registered filter callbacks.
     *
     * @var object
     */
    this.__filters = {};


    /**
     * The registered pattern fileters.
     *
     * @var object
     */
    this.__patternFilters = {};

    /**
     * The registered regular expression based filters.
     *
     * @var object
     */
    this.__regexFilters = {};
}

Filter.prototype.callFilter = function(filterString, request, response, CB, parameters) {
    if(!isset(parameters)) {
        parameters = [];
    }

    var filters = this.getFilters(filterString);
    this.run(filters, request, response, CB, parameters)
};

Filter.prototype.callPatternFilters = function(request, response, CB) {
    var patternFilters = this.findPatternFilters(request);
    this.callRouteFilters(patternFilters, request, response, CB)
};

/**
 * Call the given route's before (non-pattern) filters.
 *
 * @param  route
 * @param  request
 * @param  response
 * @param  CB
 */
Filter.prototype.callAttachedBefores = function(route, request, response, CB)
{
    var beforeFilters = route.beforeFilters();
    this.callRouteFilters(beforeFilters, request, response, CB)
};

/**
 * Call the given array of filters.
 *
 * @param  filters
 * @param  request
 * @param  response
 * @param  CB
 */
Filter.prototype.callRouteFilters = function(filters, request, response, CB) {
    var self = this;

    function next(){
        if(Object.keys(filters).length) {
            var filter = Object.keys(filters).shift();
            var params = filters[filter];
            delete filters[filter];

            self.callFilter('router.filter: ' + filter, request, response, next, params);
        } else {
            CB();
        }
    }
    next();
};

Filter.prototype.run = function(filters, request, response, CB, parameters) {
    if(!isset(parameters)) {
        parameters = [];
    }

    function next(){
        if(filters.length) {
            var filter = filters.shift();
            filter.apply(null, [request, response, next].concat(parameters));
        } else {
            CB();
        }
    }
    next();
};

Filter.prototype.getFilters = function(filterString) {
    var wildcards = this.__getWildcardFilters(filterString);

    if ( ! isset(this.__sorted[filterString]))
    {
        this.__sortFilters(filterString);
    }

    return this.__sorted[filterString].concat(wildcards);
};

Filter.prototype.__getWildcardFilters = function(filterString) {
    var wildcards = [];

    for(var key in this.__wildcards) {
        if(str.is(key, filterString)) {
            wildcards = _.merge(wildcards, this.__wildcards[key]);
        }
    }

    return wildcards;
};

Filter.prototype.__sortFilters = function(filterString) {
    this.__sorted[filterString] = [];

    // If registered filters exist for the given filter string, we will sort them by the priority
    // so that we can call them in the correct order. We will cache off these
    // sorted filters so we do not have to re-sort on every filter execution.
    if (isset(this.__filters[filterString]))
    {
        this.__filters[filterString] = (this.__filters[filterString]).reverse();

        this.__sorted[filterString] = _.flatten(this.__filters[filterString], true)
    }
};

/**
 * Register an event listener with the dispatcher.
 *
 * @param  filterStrings
 * @param  CB
 * @param  priority
 * @return void
 */
//@note: filter class support
Filter.prototype.register = function(filterStrings, CB, priority) {
    if(!isset(priority)) {
        priority = 0;
    }

    parseArray(filterStrings).forEach(function(filterString) {
        if(filterString.indexOf('*') > -1) {
            this.__wildcards[filterString] = this.__wildcards[filterString] || [];
            this.__wildcards[filterString].push(CB);
        } else {
            this.__filters[filterString] = this.__filters[filterString] || [];
            this.__filters[filterString][priority] = this.__filters[filterString][priority] || [];
            this.__filters[filterString][priority].push(CB);
            delete this.__sorted[filterString];
        }

    }.bind(this));
};

Filter.prototype.registerPatternFilter = function(pattern, name, methods) {
    if(!isset(methods)) {
        methods = null;
    }
    if (!isNull(methods)) {
        methods = parseArray(methods).map(function(method){
            return method.toUpperCase();
        });
    }

    this.__patternFilters[pattern] = this.__patternFilters[pattern] || [];
    this.__patternFilters[pattern].push({name: name, methods: methods});
};

/**
 * Find the patterned filters matching a request.
 *
 * @param  request
 * @return array
 */
Filter.prototype.findPatternFilters = function(request)
{
    var results = {};

    var path = request.path;
    var method = request.method;
    var filters;
    var pattern;
    var merge;
    for(pattern in this.__patternFilters){
        if(this.__patternFilters.hasOwnProperty(pattern)) {
            filters = this.__patternFilters[pattern];

            // To find the patterned middlewares for a request, we just need to check these
            // registered patterns against the path info for the current request to this
            // applications, and when it matches we will merge into these middlewares.
            if(str.is(pattern, path)) {
                merge = this.__patternsByMethod(method, filters);
                results = util._extend(results, merge);
            }
        }
    }

    for(pattern in this.__regexFilters){
        if(this.__regexFilters.hasOwnProperty(pattern)) {
            filters = this.__regexFilters[pattern];

            // To find the patterned middlewares for a request, we just need to check these
            // registered patterns against the path info for the current request to this
            // applications, and when it matches we will merge into these middlewares.
            if(pattern.match(path)) {
                merge = this.__patternsByMethod(method, filters);
                results = util._extend(results, merge);
            }
        }
    }

    return results;
};

/**
 * Filter pattern filters that don't apply to the request verb.
 *
 * @param method
 * @param filters
 * @return array
 */
Filter.prototype.__patternsByMethod = function(method, filters)
{
    var results = [];
    var parsed;

    filters.forEach(function(filter){
        // The idea here is to check and see if the pattern filter applies to this HTTP
        // request based on the request methods. Pattern filters might be limited by
        // the request verb to make it simply to assign to the given verb at once.
        if (this.__filterSupportsMethod(filter, method))
        {
            parsed = this.parseFilters(filter['name']);

            results = util._extend(results, parsed);
        }
    }.bind(this));

    return results;
};

/**
 * Determine if the given pattern filters applies to a given method.
 *
 * @param  filter
 * @param  method
 * @return bool
 */
Filter.prototype.__filterSupportsMethod = function(filter, method)
{
    var methods = filter['methods'];

    return (isNull(methods) || _.contains(methods, method));
};

/**
 * Parse the given filter string.
 *
 * @param  filters
 * @return array
 */
Filter.prototype.parseFilters = function(filters)
{
    var results = {};
    this.explodeFilters(filters).forEach(function(value){
        util._extend(results, this.parseFilter(value));
    }.bind(this));

    return results;
};

/**
 * Parse the given filter into name and parameters.
 *
 * @param  filter
 * @return array
 */
Filter.prototype.parseFilter = function(filter)
{
    if ( !_.contains(filter, ':')) {
        return (obj = {}, obj[filter]=[], obj);
    }

    return this.__parseParameterFilter(filter);
};

/**
 * Parse a filter with parameters.
 *
 * @param  filter
 * @return array
 */
Filter.prototype.__parseParameterFilter = function(filter)
{
    var result = filter.split(':', 2);

    return (obj = {}, obj[result[0]] = result[1].split(','), obj);
};

/**
 * Turn the filters into an array if they aren't already.
 *
 * @param  filters
 * @return array
 */
Filter.prototype.explodeFilters = function(filters)
{
    if (Array.isArray(filters)) return this.explodeArrayFilters(filters);

    return filters.split('|');
};

/**
 * Flatten out an array of filter declarations.
 *
 * @param  filters
 * @return array
 */
Filter.prototype.explodeArrayFilters = function(filters)
{
    var results = [];

    filters.forEach (function(filter){
        results = results.concat(filter.split('|'));
    });

    return results;
};

module.exports = Filter;