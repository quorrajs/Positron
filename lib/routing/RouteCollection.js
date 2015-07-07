/**
 * RouteCollection.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var _ = require('lodash');

function RouteCollection(){

    /**
     * An array of the routes keyed by method.
     *
     * @var {Array}
     * @protected
     */
    this.__routes = [];

    /**
     * An flattened array of all of the routes.
     *
     * @var {Array}
     * @protected
     */
    this.__allRoutes = [];

    /**
     * A look-up table of routes by their names.
     *
     * @var {Array}
     */
    this.__nameList = [];

    /**
     * A look-up table of routes by controller action.
     *
     * @var {Array}
     */
    this.__actionList = [];

}

/**
 * Add a Route instance to the collection.
 *
 * @param  {'./Route'} route
 * @return {'./Route'}
 */
RouteCollection.prototype.add = function(route)
{
    this.__addToCollections(route);

    this.__addLookups(route);

    return route;
};

/**
 * Add the given route to the arrays of routes.
 *
 * @param  {object} route
 * @return {void}
 * @protected
 */
RouteCollection.prototype.__addToCollections = function(route)
{
    var methods = route.methods();
    var domainAndUri = route.domain()+route.getUri();
    for(var i=0; i<methods.length; i++)
    {
        this.__routes[methods[i]] = this.__routes[methods[i]] || [];
        this.__routes[methods[i]][domainAndUri] = route;
    }

    this.__allRoutes[methods[i-1]+domainAndUri] = route;
};

/**
 * Add the route to any look-up tables if necessary.
 *
 * @param  {object}  route
 * @protected
 */
RouteCollection.prototype.__addLookups = function(route) {
    // If the route has a name, we will add it to the name look-up table so that we
    // will quickly be able to find any route associate with a name and not have
    // to iterate through every route every time we need to perform a look-up.
    var action = route.getAction();

    if (isset(action['as']))
    {
        this.__nameList[action['as']] = route;
    }

    // When the route is routing to a controller we will also store the action that
    // is used by the route. This will let us reverse route to controllers while
    // processing a request and easily generate URLs to the given controllers.
    if (isset(action['controller']))
    {
        this.__addToActionList(action, route);
    }
};

/**
 * Add a route to the controller action dictionary.
 *
 * @param  {Array}  action
 * @param  {object} route
 * @protected
 */
RouteCollection.prototype.__addToActionList = function(action, route) {
    this.__actionList[action['controller']] = route;
};

/**
 * Get all of the routes in the collection.
 *
 * @return array
 */
RouteCollection.prototype.getRoutes = function() {
    return _.values(this.__allRoutes);
};

/**
 * Get all of the routes in the collection.
 *
 * @param  {String|null}  method
 * @return {Array}
 * @protected
 */
RouteCollection.prototype.__get = function(method) {
    method = method.toUpperCase();
    if (!isset(method)) return this.getRoutes();

    return this.__routes[method]?this.__routes[method]:[];
};


/**
 * Determine if a route in the array matches the request.
 *
 * @param  {Array}  routes
 * @param  request
 * @param  {boolean}  includingMethod
 * @return {Route|null}
 * @protected
 */
RouteCollection.prototype.__check = function(routes, request, includingMethod) {
    if(!isset(includingMethod)) includingMethod = true;

    var key, matchingRoutes = null;

    for(key in routes) {
        if(routes[key].matches(request, includingMethod))
        {
            matchingRoutes = routes[key];
            break;
        }
    }

    return matchingRoutes;
};

/**
 * Find the first route matching a given request.
 *
 * @param request
 */
RouteCollection.prototype.match = function(request) {
    var routes = this.__get(request.method);

    // First, we will see if we can find a matching route for this current request
    // method. If we can, great, we can just return it so that it can be called
    // by the consumer. Otherwise we will check for routes with another verb.
    var route = this.__check(routes, request);

    if ( ! isNull(route))
    {
        return route.bind(request);
    }

    //@todo: check route in another http verbs

    return false;

};

/**
 * Get a route instance by its name.
 *
 * @param  {string}  name
 * @return {object|null}
 */
RouteCollection.prototype.getByName = function(name) {
    return isset(this.__nameList[name]) ? this.__nameList[name] : null;
};


/**
 * Get a route instance by its controller action.
 *
 * @param  {String} action
 * @return {Object|null}
 */
RouteCollection.prototype.getByAction = function(action) {
    return isset(this.__actionList[action]) ? this.__actionList[action] : null;
};

module.exports = RouteCollection;