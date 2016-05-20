/**
 * request.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var accepts = require('accepts');
var net = require('net');
var typeis = require('type-is');
var http = require('http');
var fresh = require('fresh');
var parseRange = require('range-parser');
var parse = require('parseurl');
var str = require('../support/str');
var extend = require('util')._extend;
var proxyaddr = require('proxy-addr');
var _ = require('lodash');

/**
 * Request prototype.
 */

var req = exports = module.exports = {
    __proto__: http.IncomingMessage.prototype
};

/**
 * Return request header.
 *
 * The `Referrer` header field is special-cased,
 * both `Referrer` and `Referer` are interchangeable.
 *
 * Examples:
 *
 *     req.get('Content-Type');
 *     // => "text/plain"
 *
 *     req.get('content-type');
 *     // => "text/plain"
 *
 *     req.get('Something');
 *     // => undefined
 *
 * Aliased as `req.header()`.
 *
 * @param {String} name
 * @return {String}
 */

req.get =
    req.header = function (name) {
        switch (name = name.toLowerCase()) {
            case 'referer':
            case 'referrer':
                return this.headers.referrer
                    || this.headers.referer;
            default:
                return this.headers[name];
        }
    };

/**
 * @todo: update docs.
 *
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single mime type string
 * such as "application/json", the extension name
 * such as "json", a comma-delimted list such as "json, html, text/plain",
 * an argument list such as `"json", "html", "text/plain"`,
 * or an array `["json", "html", "text/plain"]`. When a list
 * or array is given the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     req.accepts('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('html');
 *     // => "html"
 *     req.accepts('text/html');
 *     // => "text/html"
 *     req.accepts('json, text');
 *     // => "json"
 *     req.accepts('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('image/png');
 *     req.accepts('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     req.accepts(['html', 'json']);
 *     req.accepts('html', 'json');
 *     req.accepts('html, json');
 *     // => "json"
 *
 * @param {String|Array} type(s)
 * @return {String}
 */

req.accepts = function () {
    var accept = accepts(this);
    return accept.types.apply(accept, arguments);
};

/**
 * Check if the given `encoding` is accepted.
 *
 * @param {String} encoding
 * @return {Boolean}
 */

req.acceptsEncodings = function () {
    var accept = accepts(this);
    return accept.encodings.apply(accept, arguments);
};

/**
 * To do: update docs.
 *
 * Check if the given `charset` is acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} charset
 * @return {Boolean}
 */

req.acceptsCharsets = function () {
    var accept = accepts(this);
    return accept.charsets.apply(accept, arguments);
};

/**
 * To do: update docs.
 *
 * Check if the given `lang` is acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} lang
 * @return {Boolean}
 */

req.acceptsLanguages = function () {
    var accept = accepts(this);
    return accept.languages.apply(accept, arguments);
};

/**
 * Parse Range header field,
 * capping to the given `size`.
 *
 * Unspecified ranges such as "0-" require
 * knowledge of your resource length. In
 * the case of a byte range this is of course
 * the total number of bytes. If the Range
 * header field is not given `null` is returned,
 * `-1` when unsatisfiable, `-2` when syntactically invalid.
 *
 * NOTE: remember that ranges are inclusive, so
 * for example "Range: users=0-3" should respond
 * with 4 users when available, not 3.
 *
 * @param {Number} size
 * @return {Array}
 */

req.range = function (size) {
    var range = this.get('Range');
    if (!range) return;
    return parseRange(size, range);
};

/**
 * Return the value of param `name` when present or `defaultValue`.
 *
 *  - Checks route placeholders, ex: _/user/:id_
 *  - Checks body params, ex: id=12, {"id":12}
 *  - Checks query string params, ex: ?id=12
 *
 * To utilize request bodies, `req.body`
 * should be an object. This can be done by enabling
 * the `bodyParser` middleware.
 *
 * @param {String} name
 * @param {*} defaultValue
 * @return {String}
 */

req.param = function (name, defaultValue) {
    var params = this.params || {};
    var body = this.body || {};
    var query = this.query || {};
    if (null != params[name] && params.hasOwnProperty(name)) return params[name];
    if (null != body[name]) return body[name];
    if (null != query[name]) return query[name];
    return defaultValue;
};

req.__defineGetter__('input', function () {

    var self = this;

    return {

        /**
         * Return the value of a request input param `name` when present or `defaultValue`.
         *
         *  - Checks body params, ex: id=12, {"id":12}
         *  - Checks query string params, ex: ?id=12
         *
         * To utilize request bodies, `req.body`
         * should be an object. This can be done by enabling
         * the `bodyParser` middleware.
         *
         * @param {String} key
         * @param {*} defaultValue
         * @return {String}
         */
        get: function (key, defaultValue) {
            var body = self.body || {};
            var query = self.query || {};
            if (null != body[key]) return body[key];
            if (null != query[key]) return query[key];
            return defaultValue;
        },

        /**
         * Determine if the request contains a non-empty value for an input item.
         *
         * @param  {String|Array}  key
         * @return bool
         */
        has: function (key) {
            var keys = Array.isArray(key) ? key : arguments;

            for (var i = 0; i < keys.length; i++) {
                if (isEmptyString(keys[i])) return false;
            }

            return true;
        },

        /**
         * Return all input values for a request
         * @return {*}
         */
        all: function () {
            return extend(self.query, self.body);
        },

        /**
         * Get a subset of the items from the input data.
         *
         * @param  {Array|String}  key
         * @return {Array}
         */
        only: function (key) {
            var keys = Array.isArray(key) ? key : arguments;

            var input = self.input.all();
            var results = {};

            for (var i = 0; i < keys.length; i++) {
                results[keys[i]] = input[keys[i]];
            }

            return results;
        },
        /**
         * Flash the input for the current request to the session.
         *
         * @param  {String} filter
         * @param  {Object}  keys
         */
        flash: function (filter, keys) {
            if (self.session) {
                var flash = isset(filter) ? self.input[filter](keys) : self.input.all();

                self.session.flash('_old_input', flash);
            }
        },

        /**
         * Get all of the input except for a specified array of items.
         *
         * @param  {Array|String} key
         * @return {Object}
         */
        except: function (key) {
            var keys = Array.isArray(key) ? key : arguments;

            var results = self.input.all();

            for (var i = 0; i < keys.length; i++) {
                delete results[keys[i]];
            }

            return results;
        },

        /**
         * Flash only some of the input to the session.
         *
         * @param  {Array|String} key
         */
        flashOnly: function (key) {
            var keys = Array.isArray(key) ? key : arguments;

            return self.input.flash('only', keys);
        },

        /**
         * Flash only some of the input to the session.
         *
         * @param  {*} keys
         */
        flashExcept: function (keys) {
            keys = Array.isArray(keys) ? keys : {};

            return self.input.flash('except', keys);
        },

        /**
         * Retrieve an old input item.
         *
         * @param  {String} key
         * @param  {*} defaultValue
         * @return {*}
         */
        old: function (key, defaultValue) {
            var input = self.session.get('_old_input', []);

            // Input that is flashed to the session can be easily retrieved by the
            // developer, making repopulating old forms and the like much more
            // convenient, since the request's previous input is available.
            if (key) {
                return isset(input[key]) ? input[key] : defaultValue;
            } else {
                return input;
            }
        },

        /**
         * Retrieve a file from the request.
         * @param {String} key
         * @return {*}
         */
        file: function (key) {
            if (self.files) {
                return self.files[key] ? self.files[key] : null;
            }
        },

        hasFile: function (key) {
            if (self.files) {
                var keys = Array.isArray(key) ? key : arguments;

                for (var i = 0; i < keys.length; i++) {
                    if (!self.files[keys[i]]) return false;
                }

                return true;
            }
        }
    };

    function isEmptyString(key) {
        var value = self.input.get(key);
        var boolOrArray = typeof value === "boolean" || Array.isArray(value);

        return !boolOrArray && ((typeof value === 'string' && value.trim() === '') || typeof value !== 'string');
    }
});

/**
 * Return the route parameters object.
 *
 * @return Array
 *
 * @throws Error
 */

req.__defineGetter__('routeParameters', function () {
    if (isset(this.params)) {
        Object.keys(this.params).map(function (value) {
            if (_.isString(this.params['value'])) {
                this.params['value'] = decodeURIComponent(this.params['value']);
            }
        }.bind(this));

        return this.params;
    }

    throw new Error("Route is not bound.");
});

/**
 * Return the route parameter for the specified key.
 *
 * @param  {string}  name
 * @param  {*}  defaultValue
 * @return string
 */

req.routeParameter = function (name, defaultValue) {
    var parameters = this.routeParameters;
    return parameters[name] ? parameters[name] : defaultValue;
};

/**
 * Check if the incoming request contains the "Content-Type"
 * header field, and it contains the give mime `type`.
 *
 * Examples:
 *
 *      // With Content-Type: text/html; charset=utf-8
 *      req.is('html');
 *      req.is('text/html');
 *      req.is('text/*');
 *      // => true
 *
 *      // When Content-Type is application/json
 *      req.is('json');
 *      req.is('application/json');
 *      req.is('application/*');
 *      // => true
 *
 *      req.is('html');
 *      // => false
 *
 * @param {String} types
 * @return {Boolean}
 */

req.is = function (types) {
    if (!Array.isArray(types)) types = [].slice.call(arguments);
    return typeis(this, types);
};

/**
 * Get the CSRF token value.
 *
 * @return string
 *
 * @throws RuntimeException
 */

req.csrfToken = function () {
    if(this.session) {
        return this.session.getToken()
    } else {
        throw new Error("Application session store not set.");
    }
};

/**
 * Return the protocol string "http" or "https"
 * when requested with TLS. When the "trust proxy"
 * setting trusts the socket address, the
 * "X-Forwarded-Proto" header field will be trusted
 * and used if present.
 *
 * If you're running behind a reverse proxy that
 * supplies https for you this may be enabled.
 *
 * @return {String}
 */
req.__defineGetter__('protocol', function () {
    var proto = this.connection.encrypted
        ? 'https'
        : 'http';
    var trust = this.app.config.get('request').trustProxyFn;

    if (!trust(this.connection.remoteAddress, 0)) {
        return proto;
    }

    // Note: X-Forwarded-Proto is normally only ever a
    //       single value, but this is to be safe.
    proto = this.get('X-Forwarded-Proto') || proto;
    return proto.split(/\s*,\s*/)[0];
});

/**
 * Short-hand for:
 *
 *    req.protocol == 'https'
 *
 * @return {Boolean}
 */

req.__defineGetter__('secure', function () {
    return 'https' == this.protocol;
});

/**
 * Return the remote address from the trusted proxy.
 *
 * The is the remote address on the socket unless
 * "trust proxy" is set.
 *
 * @return {String}
 */

req.__defineGetter__('ip', function () {
    var trust = this.app.config.get('request').trustProxyFn;
    return proxyaddr(this, trust);
});

/**
 * When "trust proxy" is set, trusted proxy addresses + client.
 *
 * For example if the value were "client, proxy1, proxy2"
 * you would receive the array `["client", "proxy1", "proxy2"]`
 * where "proxy2" is the furthest down-stream and "proxy1" and
 * "proxy2" were trusted.
 *
 * @return {Array}
 */

req.__defineGetter__('ips', function () {
    var trust = this.app.config.get('request').trustProxyFn;
    var addrs = proxyaddr.all(this, trust);
    return addrs.slice(1).reverse();
});

/**
 * Return subdomains as an array.
 *
 * Subdomains are the dot-separated parts of the host before the main domain of
 * the app. By default, the domain of the app is assumed to be the last two
 * parts of the host. This can be changed by setting "subdomain offset".
 *
 * For example, if the domain is "tobi.ferrets.example.com":
 * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
 * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
 *
 * @return {Array}
 */

req.__defineGetter__('subdomains', function subdomains() {
    var hostname = this.hostname;

    if (!hostname) return [];

    var offset = this.app.config.get('request').subdomainOffset;
    var subdomains = !net.isIP(hostname)
        ? hostname.split('.').reverse()
        : [hostname];

    return subdomains.slice(offset);
});

/**
 * Short-hand for `url.parse(req.url).pathname`.
 *
 * @return {String}
 */
req.__defineGetter__('path', function () {
    return parse(this).pathname;
});

/**
 * Parse the "Host" header field hostname.
 *
 * When the "trust proxy" setting trusts the socket
 * address, the "X-Forwarded-Host" header field will
 * be trusted.
 *
 * @return {String}
 */

req.__defineGetter__('host', function () {
    var trust = this.app.config.get('request').trustProxyFn;
    var host = this.get('X-Forwarded-Host');

    if (!host || !trust(this.connection.remoteAddress, 0)) {
        host = this.get('Host');
    }

    if (!host) return;

    // IPv6 literal support
    var offset = host[0] === '['
        ? host.indexOf(']') + 1
        : 0;
    var index = host.indexOf(':', offset);

    return ~index
        ? host.substring(0, index)
        : host;
});

/**
 * Check if the request is fresh, aka
 * Last-Modified and/or the ETag
 * still match.
 *
 * @return {Boolean}
 */

req.__defineGetter__('fresh', function () {
    var method = this.method;
    var s = this.res.statusCode;

    // GET or HEAD for weak freshness validation only
    if ('GET' != method && 'HEAD' != method) return false;

    // 2xx or 304 as per rfc2616 14.26
    if ((s >= 200 && s < 300) || 304 == s) {
        return fresh(this.headers, this.res._headers);
    }

    return false;
});

/**
 * Check if the request is stale, aka
 * "Last-Modified" and / or the "ETag" for the
 * resource has changed.
 *
 * @return {Boolean}
 */

req.__defineGetter__('stale', function () {
    return !this.fresh;
});

/**
 * Check if the request was an _XMLHttpRequest_.
 *
 * @return {Boolean}
 */

req.__defineGetter__('xhr', function () {
    var val = this.get('X-Requested-With') || '';
    return 'xmlhttprequest' == val.toLowerCase();
});