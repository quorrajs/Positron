/**
 * Router.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var RouteCollection = require('./RouteCollection');
var Route = require('./Route');
var str = require('../support/str');
var ControllerDispatcher = require('./ControllerDispatcher');
var ControllerInspector = require('./ControllerInspector');

var path = require('path');
var http = require('http');
const HTTP_METHODS = require('methods');
var _ = require('lodash');

function Router(app, filter) {

    this.__app = app;

    /**
     * The route collection instance.
     *
     * @var {'./RouteCollection'}
     * @protected
     */
    this.__routes = new RouteCollection;


    /**
     * The globally available parameter patterns.
     *
     * @var Array
     * @protected
     */
    this.__patterns = [];

    /**
     * Indicates if the router is running filters.
     *
     * @var bool
     */
    this.__filtering = true;

    /**
     * The filter instance
     */
    this.__filter = filter;

    /**
     * The registered route value binders.
     *
     * @var array
     * @protected
     */
    this.__binders = [];

    /**
     * The reigstered route groups.
     *
     * @var array
     * @protected
     */
    this.__groupStack = [];

    /**
     * The controller dispatcher instance.
     */
    this.__controllerDispatcher;

    /**
     * The controller instances.
     */
    this.__controllerInstances = {};

    /**
     * The controller inspector instance.
     */
    this.__inspector;

    /**
     * The default actions for a resourceful controller.
     *
     * @var array
     */
    this.__resourceDefaults = ['index', 'create', 'store', 'show', 'edit', 'update', 'destroy'];

    this.bindParam('_missing', function (value, route, request, CB) {
        CB(value.split('/'));
    });

}

/**
 * Add a new route parameter binder.
 *
 * @param  {string} key
 * @param  binder
 * @return void
 */
Router.prototype.bindParam = function (key, binder) {
    this.__binders[key.replace(new RegExp('-', 'g'), '_')] = binder;

};

/**
 * Iterates through all the http methods supported by the Node and adds a 'route handler register' prototype to Router
 * for each of the method.
 */
HTTP_METHODS.forEach(function (method) {
    switch (method) {
    /**
     * Register a new GET route with the router.
     *
     * @param  {string} uri
     * @param  {function|Array|string} action
     * @return {Route}
     */
        case 'get':
            Router.prototype[method] = function (uri, action) {
                return this.__addRoute(['GET', 'HEAD'], uri, action);
            };
            break;

    /**
     * Register a new route with the router with HTTP method specified by HTTP.
     *
     * @param  {string} uri
     * @param  {function|Array|string} action
     * @return {Route}
     */
        default   :
            Router.prototype[method] = function (uri, action) {
                return this.__addRoute(method.toUpperCase(), uri, action);
            };
    }
});

/**
 * Register a new route responding to all verbs.
 *
 * @param  {string} uri
 * @param  {function|Array|string} action
 * @return {Route}
 */
Router.prototype.any = function (uri, action) {
    var verbs = _.difference(HTTP_METHODS, ['options']).map(function (method) {
        return method.toUpperCase();
    });

    return this.__addRoute(verbs, uri, action);
};

/**
 * Register a new route with the given verbs.
 *
 * @param  {array|string} methods
 * @param  {string} uri
 * @param  {function|Array|string} action
 * @return {Route}
 */

Router.prototype.match = function (methods, uri, action) {
    return this.__addRoute(methods.map(function (method) {
        return method.toUpperCase();
    }), uri, action);
};

/**
 * Add a route to the underlying route collection.
 *
 * @param  {Array|string} methods
 * @param  {string} uri
 * @param  {function|Array|string} action
 * @return {'./Route'}
 * @protected
 */
Router.prototype.__addRoute = function (methods, uri, action) {
    return this.__routes.add(this.__createRoute(methods, uri, action));
};

/**
 * Create a new route instance.
 *
 * @param  {Array|string} methods
 * @param  {string} uri
 * @param  {*} action
 * @return {'./Route'}
 * @protected
 */
Router.prototype.__createRoute = function (methods, uri, action) {
    // If the route is routing to a controller we will parse the route action into
    // an acceptable object format before registering it and creating this route
    // instance itself. We need to build the Closure that will call this out.
    if (this.__routingToController(action)) {
        action = this.__getControllerAction(action);
    }

    var route = this.__newRoute(
        methods, uri = this.__prefix(uri), action
    );

    route.where(this.__patterns);

    // If we have groups that need to be merged, we will merge them now after this
    // route has already been created and is ready to go. After we're done with
    // the merge we will be ready to return the route back out to the caller.
    if (this.__groupStack.length > 0) {
        this.__mergeAction(route);
    }

    return route;
};

/**
 * Add a controller based route action to the action array.
 *
 * @param  action
 * @return Object
 */
Router.prototype.__getControllerAction = function (action) {
    if (_.isString(action)) action = (obj = {}, obj.uses = action, obj);


    action['uses'] = this.__prependNamespaceUses(action['uses']);

    action['controller'] = action['uses'];

    action.uses = this.__getControllerClosure(action['uses']);

    return action;
};

/**
 * Get the Closure for a controller based action.
 *
 * @param  controller
 * @return function
 */
Router.prototype.__getControllerClosure = function (controller) {
    // Here we'll get an instance of controller dispatcher and hand it off to
    // the Closure so it will be used to resolve the controller instance
    // and call the appropriate methods on the controller.
    var d = this.getControllerDispatcher();

    return function () {
        var args = arguments;

        // Now we can split the controller and method out of the action string.
        // This controller and method are in the Class@method format and we need
        // to split them out then use them.
        var temp = controller.split('@');

        return d.dispatch(args, temp[0], temp[1]);
    };
};

/**
 * Get the controller dispatcher instance.
 */
Router.prototype.getControllerDispatcher = function () {
    if (!isset(this.__controllerDispatcher)) {
        this.__controllerDispatcher = new ControllerDispatcher(this.__app, this.__filter);
    }

    return this.__controllerDispatcher;
};

/**
 * Prepend the last group uses or default controller path onto the use clause.
 *
 * @param  uses
 * @return string
 */
Router.prototype.__prependNamespaceUses = function (uses) {
    var group = [];
    // Here we'll get an instance of controller dispatcher and hand it off to
    // the Closure so it will be used to resolve the controller instance
    // and call the appropriate methods on the controller.
    if (this.__groupStack.length > 0) {
        group = this.__groupStack[this.__groupStack.length - 1];
    }

    if (isset(group['namespace'])) {
        return path.join(group['namespace'], uses)
    } else if (uses.indexOf('/') === -1) {
        return path.join('controllers', uses);
    } else {
        return path.normalize(uses);
    }
};

/**
 * Determine if the action is routing to a controller.
 *
 * @param  action
 * @return bool
 */
Router.prototype.__routingToController = function (action) {
    if (typeof action === 'function') return false;

    return _.isString(action) || _.isString(action['uses']);
};

/**
 * Create a new Route object.
 *
 * @param  {Array|string} methods
 * @param  {string} uri
 * @param  {*} action
 * @return {'./Route'}
 * @protected
 */
Router.prototype.__newRoute = function (methods, uri, action) {
    return new Route(methods, uri, action, this.__filter);
};

/**
 * Prefix the given URI with the last prefix.
 *
 * @param  {string} uri
 * @return string
 * @protected
 */
Router.prototype.__prefix = function (uri) {
    uri = str.trim(str.trim(this.__getLastGroupPrefix(), '/') + '/' + str.trim(uri, '/'), '/');
    return uri ? uri : '/';
};

/**
 * Merge the group stack with the route action.
 *
 * @param  route
 * @return void
 */
Router.prototype.__mergeAction = function (route) {
    var action = this.__mergeWithLastGroup(route.getAction());

    route.setAction(action);
};

/**
 * Merge the given object with the last group stack.
 *
 * @param  newValue
 * @return array
 * @protected
 */
Router.prototype.__mergeWithLastGroup = function (newValue) {
    return this.mergeGroup(newValue, this.__groupStack[this.__groupStack.length - 1]);
};

/**
 * Get the prefix from the last group on the stack.
 *
 * @return {string}
 * @protected
 */
Router.prototype.__getLastGroupPrefix = function () {
    if (this.__groupStack.length > 0) {
        return this.__groupStack[this.__groupStack.length - 1].prefix ?
            this.__groupStack[this.__groupStack.length - 1].prefix : '';
    }

    return '';
};

/**
 * Dispatch the request to the application.
 *
 * @param  request
 * @param  response
 */
Router.prototype.dispatch = function (request, response) {
    var self = this;

    this.callFilter('before', request, response, function () {
        self.dispatchToRoute(request, response);
    });
};

/**
 * Dispatch the request to a route and return the response.
 *
 * @param  request
 * @param  response
 */
Router.prototype.dispatchToRoute = function (request, response) {
    this.findRoute(request, function (route) {
        if (route) {
            request.route = route;
            //note: fire router.matched event

            // Once we have successfully matched the incoming request to a given route we
            // can call the before filters on that route.
            this.callRouteBefore(route, request, response, function () {
                route.run(request, response);
            });
        }
    }.bind(this));
};


/**
 * Find the route matching a given request.
 *
 * @param {object} request
 * @param {function} CB
 * @return void
 */
Router.prototype.findRoute = function (request, CB) {
    var route = this.__routes.match(request);

    if (route) {
        this.__substituteBindings(request, route, CB);
    }
};

//@todo: check whether route is needed

Router.prototype.__substituteBindings = function (request, route, CB) {
    var next = function (keys) {
        if (keys.length) {
            var key = keys.shift();
            if (isset(this.__binders[key])) {
                this.__performBinding(key, request.routeParameters[key], route, request, function (value) {
                    request.params[key] = value;

                    next(keys);
                });
            } else {
                next(keys);
            }
        } else {
            CB(route)
        }
    }.bind(this);

    next(Object.keys(request.routeParameters));
};

/**
 * Call the binding callback for the given key.
 *
 * @param  {String}  key
 * @param  {String}  value
 * @param  {object} request
 * @param  {object} route
 * @param  {function} CB
 * @return {*}
 */
Router.prototype.__performBinding = function (key, value, route, request, CB) {
    return this.__binders[key](value, route, request, CB);
};

/**
 * Set a global where pattern on all routes
 *
 * @param  {string}  key
 * @param  {string}  pattern
 * @return {void}
 */
Router.prototype.pattern = function (key, pattern) {
    this.__patterns[key] = pattern;
};

/**
 * Call the given filter.
 *
 * @param  {string}  filter
 * @param  request
 * @param  response
 * @param  CB
 */
Router.prototype.callFilter = function (filter, request, response, CB) {
    if (!this.__filtering) CB();

    return this.__filter.callFilter('router.' + filter, request, response, CB);
};


/**
 * Call the pattern based filters for the request.
 * @param  route
 * @param  request
 * @param  response
 * @param  CB
 */
//@todo: imp - disabled chek, function para's like route, private?
Router.prototype.__callPatternFilters = function (route, request, response, CB) {
    this.__filter.callPatternFilters(request, response, CB);
};

/**
 * Call the given route's before filters.
 *
 * @param  route
 * @param  request
 * @param  response
 * @param  CB
 */
Router.prototype.callRouteBefore = function (route, request, response, CB) {
    var self = this;
    this.__callPatternFilters(route, request, response, function () {
        self.__callAttachedBefores(route, request, response, CB);
    });
};

/**
 * Call the given route's before (non-pattern) filters.
 *
 * @param  route
 * @param  request
 * @param  response
 * @param  CB
 */
Router.prototype.__callAttachedBefores = function (route, request, response, CB) {
    this.__filter.callAttachedBefores(route, request, response, CB);
};

/**
 * Register a new "before" filter with the router.
 *
 * @param  callback
 * @return void
 */
Router.prototype.before = function (callback) {
    this.addGlobalFilter('before', callback);
};

/**
 * Register a new global filter with the router.
 *
 * @param  filter
 * @param  callback
 * @return void
 */
Router.prototype.addGlobalFilter = function (filter, callback) {
    this.__filter.register('router.' + filter, callback);
};

/**
 * Register a new filter with the router.
 *
 * @param  name
 * @param  callback
 * @return void
 */
Router.prototype.filter = function (name, callback) {
    this.__filter.register('router.filter: ' + name, callback)
};

/**
 * Register a pattern-based filter with the router.
 *
 */
Router.prototype.when = function (pattern, name, methods) {
    this.__filter.registerPatternFilter(pattern, name, methods);

};

/**
 * Create a route group with shared attributes.
 *
 * @param  attributes
 * @param  callback
 * @return void
 */
Router.prototype.group = function (attributes, callback) {
    this.__updateGroupStack(attributes);

    // Once we have updated the group stack, we will execute the user Closure and
    // merge in the groups attributes when the route is created. After we have
    // run the callback, we will pop the attributes off of this group stack.
    callback.call(this);
    //@todo note async issue

    this.__groupStack.pop();
};

/**
 * Update the group stack with the given attributes.
 *
 * @param  attributes
 * @return void
 * @protected
 */
Router.prototype.__updateGroupStack = function (attributes) {
    if (this.__groupStack.length > 0) {
        attributes = this.mergeGroup(attributes, this.__groupStack[this.__groupStack.length - 1]);
    }

    this.__groupStack.push(attributes);
};

/**
 * Merge the given group attributes.
 *
 * @param  newValue
 * @param  oldValue
 * @return Object
 */
Router.prototype.mergeGroup = function (newValue, oldValue) {
    newValue.namespace = this.__formatUsesPrefix(newValue, oldValue);

    newValue.prefix = this.__formatGroupPrefix(newValue, oldValue);

    oldValue = _.clone(oldValue);

    if (isset(newValue['domain'])) delete(oldValue['domain']);
    delete oldValue['namespace'];
    delete oldValue['prefix'];

    return _.merge(oldValue, newValue, function customizer(a, b) {
        if (_.isArray(a) || _.isString(a)) {
            return parseArray(a).concat(b);
        }
    });
};

/**
 * Format the uses prefix for the new group attributes.
 *
 * @param  newValue
 * @param  oldValue
 * @return string
 */
Router.prototype.__formatUsesPrefix = function (newValue, oldValue) {
    if (isset(oldValue['namespace']) && isset(newValue['namespace'])) {
        return path.join(oldValue.namespace, newValue.namespace);
    }
    else {
        return oldValue.namespace || newValue.namespace;
    }
};

/**
 * Format the prefix for the new group attributes.
 *
 * @param  newValue
 * @param  oldValue
 * @return string
 */
Router.prototype.__formatGroupPrefix = function (newValue, oldValue) {
    if (isset(oldValue['prefix']) && isset(newValue['prefix'])) {
        return str.trim(oldValue.prefix, '/') + '/' + str.trim(newValue.prefix, '/');
    }
    else {
        return oldValue.prefix || newValue.prefix;
    }
};

/**
 * Route a controller to a URI with wildcard routing.
 *
 * @param  uri
 * @param  controller
 * @param  names
 * @return void
 */
Router.prototype.controller = function (uri, controller, names) {
    if (!isset(names)) {
        names = [];
    }

    var prepended = this.__prependNamespaceUses(controller);

    var routable = this.getInspector().getRoutable(prepended, uri);

    // When a controller is routed using this method, we use Reflection to parse
    // out all of the routable methods for the controller, then register each
    // route explicitly for the developers, so reverse routing is possible.
    for (var method in routable) {
        if (routable.hasOwnProperty(method)) {
            routable[method].forEach(function (route) {
                this.__registerInspected(route, controller, method, names);
            }.bind(this));
        }
    }

    this.__addFallthroughRoute(controller, uri);
};

/**
 * Get a controller inspector instance.
 *
 * @returns {ControllerInspector}
 */
Router.prototype.getInspector = function () {
    return this.__inspector || (this.__inspector = new ControllerInspector(this.__app, HTTP_METHODS));
};

/**
 * Register an inspected controller route.
 *
 * @param  route
 * @param  controller
 * @param  method
 * @param  names
 * @return void
 *
 * @protected
 */
Router.prototype.__registerInspected = function (route, controller, method, names) {
    var action = {uses: controller + '@' + method};

    // If a given controller method has been named, we will assign the name to the
    // controller action array, which provides for a short-cut to method naming
    // so you don't have to define an individual route for these controllers.
    action.as = names.method || null;

    this[route.verb](route.uri, action);
};

/**
 * Add a fallthrough route for a controller.
 *
 * @param  {string}  controller
 * @param  {string}  uri
 * @return void
 *
 * @protected
 */
Router.prototype.__addFallthroughRoute = function (controller, uri) {
    var missing = this.any(uri + '/{_missing}', controller + '@missingMethod');

    missing.where('_missing', '(.*)');
};

/**
 * Route a resource to a controller.
 *
 * @param  {string}  name
 * @param  {string}  controller
 * @param  {Object}  options
 * @return void
 */
Router.prototype.resource = function (name, controller, options) {
    options = options || {};
    // If the resource name contains a slash, we will assume the developer wishes to
    // register these resource routes with a prefix so we will set that up out of
    // the box so they don't have to mess with it. Otherwise, we will continue.
    if (!!~name.indexOf('/')) {
        this.__prefixedResource(name, controller, options);

        return;
    }

    // We need to extract the base resource from the resource name. Nested resources
    // are supported in the framework, but we need to know what name to use for a
    // place-holder on the route wildcards, which should be the base resources.
    var base = this.getResourceWildcard(name.match(/[\.]*([^\.]*$)/)[1]);

    var defaults = this.__resourceDefaults;

    this.__getResourceMethods(defaults, options).forEach(function (m) {
        this['__addResource' + m.charAt(0).toUpperCase() + m.substr(1)](name, base, controller, options);
    }.bind(this));

    //@todo:check
    this.__addFallthroughRoute(controller, this.getResourceUri(name));
};

/**
 * Build a set of prefixed resource routes.
 *
 * @param  {string}  name
 * @param  {string}  controller
 * @param  {Object}  options
 * @return void
 */
Router.prototype.__prefixedResource = function (name, controller, options) {
    var nameAndPrefix = this.__getResourcePrefix(name);

    // We need to extract the base resource from the resource name. Nested resources
    // are supported in the framework, but we need to know what name to use for a
    // place-holder on the route wildcards, which should be the base resources.
    var CB = function (me) {
        me.resource(nameAndPrefix.name, controller, options);
    };

    return this.group({prefix: nameAndPrefix.prefix}, CB);
};

/**
 * Extract the resource and prefix from a resource name.
 *
 * @param  {string}  name
 * @return {Object}
 *
 * @protected
 */
Router.prototype.__getResourcePrefix = function (name) {
    var segments = name.split('/');

    // To get the prefix, we will take all of the name segments and implode them on
    // a slash. This will generate a proper URI prefix for us. Then we take this
    // last segment, which will be considered the final resources name we use.
    var prefix = segments.slice(0, -1).join('/');

    return {name: _.last(segments), prefix: prefix};
};

/**
 * Format a resource wildcard for usage.
 *
 * @param  {string}  value
 * @return {string}
 */
Router.prototype.getResourceWildcard = function (value) {
    return value.replace(/-/g, '_');
};

/**
 * Get the applicable resource methods.
 *
 * @param  {Array}  defaults
 * @param  {Object}  options
 * @return {Array}
 */
Router.prototype.__getResourceMethods = function (defaults, options) {
    if (isset(options['only'])) {
        return _.intersection(defaults, parseArray(options['only'] || []));
    } else if (isset(options['except'])) {
        return _.difference(defaults, parseArray(options['except'] || []));
    }

    return defaults;
};

/**
 * Add the index method for a resourceful route.
 *
 * @param  {string}   name
 * @param  {string}   base
 * @param  {string}   controller
 * @param  {Object}   options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceIndex = function (name, base, controller, options) {
    var uri = this.getResourceUri(name);

    var action = this.__getResourceAction(name, controller, 'index', options);

    return this.get(uri, action);
};

/**
 * Add the create method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceCreate = function (name, base, controller, options) {
    var uri = this.getResourceUri(name) + '/create';

    var action = this.__getResourceAction(name, controller, 'create', options);

    return this.get(uri, action);
};

/**
 * Add the store method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceStore = function (name, base, controller, options) {
    var uri = this.getResourceUri(name);

    var action = this.__getResourceAction(name, controller, 'store', options);

    return this.post(uri, action);
};

/**
 * Add the show method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceShow = function (name, base, controller, options) {
    var uri = this.getResourceUri(name) + '/{' + base + '}';

    var action = this.__getResourceAction(name, controller, 'show', options);

    return this.get(uri, action);
};

/**
 * Add the edit method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceEdit = function (name, base, controller, options) {
    var uri = this.getResourceUri(name) + '/{' + base + '}/edit';

    var action = this.__getResourceAction(name, controller, 'edit', options);

    return this.get(uri, action);
};

/**
 * Add the update method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceUpdate = function (name, base, controller, options) {
    this.__addPutResourceUpdate(name, base, controller, options);

    return this.__addPatchResourceUpdate(name, base, controller);
};

/**
 * Add the update method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addPutResourceUpdate = function (name, base, controller, options) {
    var uri = this.getResourceUri(name) + '/{' + base + '}';

    var action = this.__getResourceAction(name, controller, 'update', options);

    return this.put(uri, action);
};

/**
 * Add the update method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @return undefined
 *
 * @protected
 */
Router.prototype.__addPatchResourceUpdate = function (name, base, controller) {
    var uri = this.getResourceUri(name) + '/{' + base + '}';

    this.patch(uri, controller + '@update');
};

/**
 * Add the destroy method for a resourceful route.
 *
 * @param  {string} name
 * @param  {string} base
 * @param  {string} controller
 * @param  {Object} options
 * @return {Route}
 *
 * @protected
 */
Router.prototype.__addResourceDestroy = function (name, base, controller, options) {
    var uri = this.getResourceUri(name) + '/{' + base + '}';

    var action = this.__getResourceAction(name, controller, 'destroy', options);

    return this.delete(uri, action);
};

/**
 * Get the base resource URI for a given resource.
 *
 * @param  {string}  resource
 * @return {string}
 */
Router.prototype.getResourceUri = function (resource) {
    if (!~resource.indexOf('.')) return resource;

    // Once we have built the base URI, we'll remove the wildcard holder for this
    // base resource name so that the individual route adders can suffix these
    // paths however they need to, as some do not have any wildcards at all.
    var segments = resource.split('.');

    var uri = this.__getNestedResourceUri(segments);

    return uri.replace('/{' + this.getResourceWildcard(_.last(segments)) + '}', '');
};

/**
 * Get the URI for a nested resource segment array.
 *
 * @param  {Array}   segments
 * @return {string}
 *
 * @protected
 */
Router.prototype.__getNestedResourceUri = function (segments) {
    // We will spin through the segments and create a place-holder for each of the
    // resource segments, as well as the resource itself. Then we should get an
    // entire string for the resource URI that contains all nested resources.
    return segments.map(function (s) {
        return s + '/{' + this.getResourceWildcard(s) + '}';
    }.bind(this)).join('/');
};

/**
 * Format a resource wildcard for usage.
 *
 * @param  {string}  value
 * @return {string}
 */
Router.prototype.getResourceWildcard = function (value) {
    return value.replace(/-/g, '_');
};

/**
 * Get the action array for a resource route.
 *
 * @param  {string}  resource
 * @param  {string}  controller
 * @param  {string}  method
 * @param  {Object}   options
 * @return {Object}
 *
 * @protected
 */
Router.prototype.__getResourceAction = function (resource, controller, method, options) {
    var name = this.__getResourceName(resource, method, options);

    return {'as': name, 'uses': controller + '@' + method};
};

/**
 * Get the name for a given resource.
 *
 * @param  {string} resource
 * @param  {string} method
 * @param  {Object} options
 * @return {string}
 *
 * @protected
 */
Router.prototype.__getResourceName = function (resource, method, options) {
    if (options['names'] && isset(options['names'][method])) return options['names'][method];

    // If a global prefix has been assigned to all names for this resource, we will
    // grab that so we can prepend it onto the name when we create this name for
    // the resource action. Otherwise we'll just use an empty string for here.
    var prefix = isset(options['as']) ? options['as'] + '.' : '';

    if (this.__groupStack.length == 0) {
        return prefix + resource + '.' + method;
    }

    return this.__getGroupResourceName(prefix, resource, method);
};

/**
 * Get the resource name for a grouped resource.
 *
 * @param  {string} prefix
 * @param  {string} resource
 * @param  {string} method
 * @return {string}
 */
Router.prototype.__getGroupResourceName = function (prefix, resource, method) {
    var group = this.__getLastGroupPrefix().replace(/\//g, '.');

    return _.trim(prefix + group + resource + method, '.');
};

/**
 * Get the underlying route collection.
 *
 * @return RouteCollection
 */
Router.prototype.getRoutes = function () {
    return this.__routes;
};

Router.prototype.getControllerInstance = function (path, arguments) {
    var Controller;
    if (isset(this.__controllerInstances[path])) {
        return this.__controllerInstances[path];
    } else if (Controller = require(path)) {
        if (!isset(arguments)) {
            arguments = {};
        }

        return this.__controllerInstances[path]
            = new (Function.prototype.bind.apply(Controller, [null].concat(Array.prototype.slice.call(arguments))));
    }
};

/**
 * Register a model binder for a wildcard.
 *
 * @param  {String}  key
 * @param  {String}  modelName
 * @param  {function}  CB
 * @return void
 *
 * @throws Error
 */
Router.prototype.model = function (key, modelName, CB) {
    this.bindParam(key, function (value, route, request, bindExeCallback) {
        if (isNull(value)) return null;

        // For model binders, we will attempt to retrieve the models using the findOne
        // method on the model instance. If we cannot retrieve the models we'll
        // throw a not found exception otherwise we will return the instance.
        this.__app.models[modelName].findOne(value, function (err, model) {
            if (!err && model) {
                bindExeCallback(model);
            }

            // If a callback was supplied to the method we will call that to determine
            // what we should do when the model is not found. This just gives these
            // developer a little greater flexibility to decide what will happen.
            else if (CB) {
                return CB(request, request.res, bindExeCallback);
            } else {
                var notFoundError = new Error("Not found");

                notFoundError.status = 404;
                request.res.abort((notFoundError));
            }
        });
    }.bind(this));
};


module.exports = Router;
