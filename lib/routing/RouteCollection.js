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

//    this.addLookups(route);

    return route;
};

/**
 * Add the given route to the arrays of routes.
 *
 * @param  {'./Route'} route
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
 * Get all of the routes in the collection.
 *
 * @return array
 */
RouteCollection.prototype.getRoutes = function()
{
    return _.values(this.__allRoutes);
};

/**
 * Get all of the routes in the collection.
 *
 * @param  {String|null}  method
 * @return {Array}
 * @protected
 */
RouteCollection.prototype.__get = function(method)
{
    method = method.toUpperCase();
    if (!isset(method)) return this.getRoutes();

    return this.__routes[method]?this.__routes[method]:[];
};


/**
 * Determine if a route in the array matches the request.
 *
 * @param  {Array}  routes
 * @param  request
 * @param  {bool}  includingMethod
 * @return {Route|null}
 * @protected
 */
RouteCollection.prototype.__check = function(routes, request, includingMethod)
{
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
RouteCollection.prototype.match = function(request){
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

module.exports = RouteCollection;