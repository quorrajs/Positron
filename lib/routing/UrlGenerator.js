/**
 * UrlGenerator.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var str = require('../support/str');
var url = require('url');

function UrlGenerator(routes, app) {
    /**
     * The route collection.
     */
    this.__routes = routes;

    /**
     * The application instance.
     */
    this.__app = app;

    /**
     * A cached copy of the URL schema for the current request.
     *
     * @var string|null
     */
    this.__cachedSchema;

    /**
     * The forced schema for URLs.
     *
     * @var string
     */
    this.__forceSchema;

    /**
     * A cached copy of the URL root.
     *
     * @var string|null
     */
    this.__cachedRoot = null;

    /**
     * The forced URL root.
     *
     * @var string
     */
    this.__forcedRoot;

    /**
     * Characters that should not be URL encoded.
     *
     * @var {Array}
     */
    this.__dontEncode = {
        '%2F': '/',
        '%40': '@',
        '%3A': ':',
        '%3B': ';',
        '%2C': ',',
        '%3D': '=',
        '%2B': '+',
        '%21': '!',
        '%2A': '*',
        '%7C': '|',
        '%3F': '?',
        '%26': '&',
        '%23': '#',
        '%25': '%'
    };

    /**
     * The root namespace being applied to controller actions.
     *
     * @var {String}
     */
    this.__rootNamespace = 'controllers';
}

/**
 * Generate a absolute URL to the given path.
 *
 * @param  {String}  path
 * @param  {*}  extra
 * @param  {boolean|null}  secure
 * @return {String}
 */
UrlGenerator.prototype.to = function (path, extra, secure) {
    extra = this.__formatParameters(extra);

    // First we will check if the URL is already a valid URL. If it is we will not
    // try to generate a new one but will simply return the URL as is, which is
    // convenient since developers do not always have to check if it's valid.
    if (this.isValidUrl(path)) {
        return path;
    }

    var scheme = this.__getScheme(secure);

    // Once we have the scheme we will compile the "tail" by collapsing the values
    // into a single string delimited by slashes. This just makes it convenient
    // for passing the array of parameters to this URL as a list of segments.
    var tail = _.map(extra, encodeURIComponent).join('/');

    var root = this.__getRootUrl(scheme);

    return this.__formUrl(root, path, tail);
};

/**
 * Format URL parameters.
 *
 * @param  {Array|Object} params
 * @return {Array|Object}
 */
UrlGenerator.prototype.__formatParameters = function(params) {
    if(!_.isObject(params)) {
        return params !== undefined? parseArray(params) : [];
    } else {
        return params
    }
};

/**
 * Generate a secure, absolute URL to the given path.
 *
 * @param  {String} path
 * @param  {Array}  parameters
 * @return {String}
 */
UrlGenerator.prototype.secure = function (path, parameters) {
    return this.to(path, parameters, true);
};

/**
 * Generate a URL to an application asset.
 *
 * @param  {String}  path
 * @param  {Boolean|null} secure
 * @return {string}
 */
UrlGenerator.prototype.asset = function (path, secure) {
    if (this.isValidUrl(path)) {
        return path;
    }

    var root = this.__getRootUrl(this.__getScheme(secure));

    return root + '/' + str.trim(path, '/');
};

/**
 * Determine if the given path is a valid URL.
 *
 * @param  {string}  path
 * @return {Boolean}
 */
UrlGenerator.prototype.isValidUrl = function (path) {
    return ['#', '//', 'mailto:', 'tel:', 'http://', 'https://'].some(function (val) {
            if (path.indexOf(val) === 0) {
                return true;
            }
        }) || isValidUrl(path);
};

/**
 * Get the scheme for a raw URL.
 *
 * @param  {boolean|null}  secure
 * @return {string}
 */
UrlGenerator.prototype.__getScheme = function (secure) {
    if (secure === undefined) {
        if (this.__cachedSchema === null) {
            this.__cachedSchema = this.__forceSchema ? this.__forceSchema :
                _.startsWith(this.__app.config.get('app').url, 'http://') ? 'http://' : 'https://';
        }

        return this.__cachedSchema;
    }

    return secure ? 'https://' : 'http://';
};

/**
 * Get the base URL for the request.
 *
 * @param  {string}  scheme
 * @param  {string}  [root]
 * @return string
 */
UrlGenerator.prototype.__getRootUrl = function (scheme, root) {
    if (this.__cachedRoot === null) {
        this.__cachedRoot = this.__forcedRoot ? this.__forcedRoot : this.__app.config.get('app').url;
    }

    if (!root) {
        root = this.__cachedRoot;
    }

    if (scheme === undefined) {
        return root;
    } else {
        var start = _.startsWith(root, 'http://') ? 'http://' : 'https://';

        return root.replace(start, scheme);
    }
};

/**
 * Format the given URL segments into a single URL.
 *
 * @param  {string}  root
 * @param  {string}  path
 * @param  {string}  tail
 * @return {string}
 */
UrlGenerator.prototype.__formUrl = function (root, path, tail) {
    if (tail === undefined) {
        tail = '';
    }

    return str.trim(root + '/' + str.trim(path + '/' + tail, '/'), '/');
};

/**
 * Force the schema for URLs.
 *
 * @param  {string}  schema
 */
UrlGenerator.prototype.forceSchema = function (schema) {
    this.__cachedSchema = null;

    this.__forceSchema = schema + '://';
};

/**
 * Set the forced root URL.
 *
 * @param  {string}  root
 */
UrlGenerator.prototype.forceRootUrl = function (root) {
    this.__forcedRoot = str.rtrim(root, '/');
    this.__cachedRoot = null;
};

/**
 * Get the URL to a named route.
 *
 * @param  {string}  name
 * @param  {*}   parameters
 * @param  {boolean}  absolute
 * @return {string}
 *
 * @throws Error
 */
UrlGenerator.prototype.route = function (name, parameters, absolute) {
    parameters = this.__formatParameters(parameters);

    if (absolute === undefined) {
        absolute = true;
    }

    var route = this.__routes.getByName(name);

    if (route !== null) {
        return this.__toRoute(route, parameters, absolute);
    }

    throw new Error("Route " + name + " not defined");
};

/**
 * Get the URL for a given route instance.
 *
 * @param  {object}  route
 * @param  {*}  parameters
 * @param  {boolean}  absolute
 * @return {string}
 */
UrlGenerator.prototype.__toRoute = function (route, parameters, absolute) {
    var domain = this.__getRouteDomain(route);
    var root;
    var key, re;

    var uri = encodeURIComponent(this.__addQueryString(
            this.__formUrl(
                root = this.__replaceRoot(route, domain, parameters),
                this.__replaceRouteParameters(route.uri(), parameters)
            ),
            parameters
        )
    );

    for (key in this.__dontEncode) {
        if (this.__dontEncode.hasOwnProperty(key)) {
            re = new RegExp(key, "g");
            uri = uri.replace(re, this.__dontEncode[key]);
        }
    }

    return absolute ? uri : '/' + str.ltrim(uri.replace(root, ''), '/');
};

/**
 * Replace the parameters on the root path.
 *
 * @param {object} route
 * @param {string} domain
 * @param {array} parameters
 * @return {string}
 */
UrlGenerator.prototype.__replaceRoot = function (route, domain, parameters) {
    return this.__replaceRouteParameters(this.__getRouteRoot(route, domain), parameters);
};

/**
 * Get the root of the route URL.
 *
 * @param {object} route
 * @param {string} domain
 * @return {string}
 */
UrlGenerator.prototype.__getRouteRoot = function (route, domain) {
    return this.__getRootUrl(this.__getRouteScheme(route), domain);
};

/**
 * Get the formatted domain for a given route.
 *
 * @param  {object} route
 * @return string
 */
UrlGenerator.prototype.__getRouteDomain = function (route) {
    return route.domain() ? this.__getDomainAndScheme(route) : null;
};

/**
 * Get the domain and scheme for the route.
 *
 * @param {object} route
 * @return {string}
 */
UrlGenerator.prototype.__getDomainAndScheme = function (route) {
    return this.__getRouteScheme(route) + route.domain();
};

/**
 * Get the scheme for the given route.
 *
 * @param {object} route
 * @return {string}
 */
UrlGenerator.prototype.__getRouteScheme = function (route) {
    if (route.httpOnly()) {
        return this.__getScheme(false);
    } else if (route.secure()) {
        return this.__getScheme(true);
    }

    return this.__getScheme(null);
};

/**
 * Replace all of the wildcard parameters for a route path.
 *
 * @param  {String} path
 * @param  {Array}  parameters
 * @return {String}
 * @todo: replace named para
 */
UrlGenerator.prototype.__replaceRouteParameters = function (path, parameters) {
    var value;

    if (!_.isEmpty(parameters)) {
        path = this.__replaceNamedParameters(path, parameters).replace(/\{.*?\}/g, function (match) {
            value = pullAt(parameters, 0);

            return isset(value)? value: match;
        });
    }

    return str.trim(path.replace(/\{.*?\?\}/g, ''), '/');
};

/**
 * Replace all of the named parameters in the path.
 *
 * @param {String} path
 * @param {Array|Object} parameters
 * @return {string}
 */
UrlGenerator.prototype.__replaceNamedParameters = function(path, parameters) {
    var value;

    path = path.replace(/\{(.*?)\??\}/g, function (match, parameter) {
        value = pullAt(parameters, parameter);

        return isset(value)? value: match;
    });

    return path;
};

/**
 * Add a query string to the URI.
 *
 * @param  {String}  uri
 * @param  {Array}  parameters
 * @return {*|String}
 */
UrlGenerator.prototype.__addQueryString = function (uri, parameters) {
    // If the URI has a fragment, we will move it to the end of the URI since it will
    // need to come after any query string that may be added to the URL else it is
    // not going to be available. We will remove it then append it back on here.
    var parsed = url.parse(uri, true);

    // Add all remaining values in parameters object to query string
    parsed.query = _.merge(parsed.query, parameters);

    return url.format(parsed)
};

/**
 * Get the URL to a controller action.
 *
 * @param  {String}  action
 * @param  {*}  parameters
 * @param  {boolean}  absolute
 * @return {String}
 *
 * @throws Error
 */
UrlGenerator.prototype.action = function (action, parameters, absolute) {
    parameters = this.__formatParameters(parameters);

    if (absolute === undefined) {
        absolute = true;
    }

    if (this.__rootNamespace && !(action.indexOf('/') === 0)) {
        action = this.__rootNamespace + '/' + action;
    }
    else {
        action = str.trim(action, '/');
    }

    var route = this.__routes.getByAction(action);

    if (!isNull(route)) {
        return this.__toRoute(route, parameters, absolute);
    }

    throw new Error("Invalid argument: Action " + action + " not defined.");
};

/**
 * Set the root controller namespace.
 *
 * @param  {string}  rootNamespace
 * @return $this
 */
UrlGenerator.prototype.setRootControllerNamespace = function (rootNamespace) {
    this.__rootNamespace = rootNamespace;

    return this;
};

module.exports = UrlGenerator;