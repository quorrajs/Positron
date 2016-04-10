/**
 * utils.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var etag = require('etag');
var mime = require('send').mime;
var crc32 = require('buffer-crc32');
var basename = require('path').basename;
var deprecate = require('util').deprecate;
var contentType = require('content-type');
var qs = require('qs');
var querystring = require('querystring');
var proxyaddr = require('proxy-addr');

/**
 * Deprecate function, like core `util.deprecate`
 *
 * @param {Function} fn
 * @param {String} msg
 * @return {Function}
 */

exports.deprecate = function (fn, msg) {
    return 'test' !== process.env.NODE_ENV
        ? deprecate(fn, 'quorra: ' + msg)
        : fn;
};


/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 */

exports.etag = function (body, encoding) {
    var buf = !Buffer.isBuffer(body)
        ? new Buffer(body, encoding)
        : body;

    return etag(buf, {weak: false});
};

/**
 * Return weak ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 */

exports.wetag = function wetag(body, encoding) {
    var buf = !Buffer.isBuffer(body)
        ? new Buffer(body, encoding)
        : body;

    return etag(buf, {weak: true});
};

/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 */

exports.compileETag = function (val) {
    var fn;

    if (typeof val === 'function') {
        return val;
    }

    switch (val) {
        case true:
            fn = exports.wetag;
            break;
        case false:
            break;
        case 'strong':
            fn = exports.etag;
            break;
        case 'weak':
            fn = exports.wetag;
            break;
        default:
            throw new TypeError('unknown value for etag function: ' + val);
    }

    return fn;
};

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 */

exports.isAbsolute = function (path) {
    if ('/' == path[0]) return true;
    if (':' == path[1] && '\\' == path[2]) return true;
    if ('\\\\' == path.substring(0, 2)) return true; // Microsoft Azure absolute path
};

/**
 * Flatten the given `arr`.
 *
 * @param {Array} arr
 * @return {Array}
 */

exports.flatten = function (arr, ret) {
    ret = ret || [];
    var len = arr.length;
    for (var i = 0; i < len; ++i) {
        if (Array.isArray(arr[i])) {
            exports.flatten(arr[i], ret);
        } else {
            ret.push(arr[i]);
        }
    }
    return ret;
};

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 */

exports.normalizeType = function (type) {
    return ~type.indexOf('/')
        ? acceptParams(type)
        : {value: mime.lookup(type), params: {}};
};

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 */

exports.normalizeTypes = function (types) {
    var ret = [];

    for (var i = 0; i < types.length; ++i) {
        ret.push(exports.normalizeType(types[i]));
    }

    return ret;
};

/**
 * Generate Content-Disposition header appropriate for the filename.
 * non-ascii filenames are urlencoded and a filename* parameter is added
 *
 * @param {String} filename
 * @return {String}
 */

exports.contentDisposition = function (filename) {
    var ret = 'attachment';
    if (filename) {
        filename = basename(filename);
        // if filename contains non-ascii characters, add a utf-8 version ala RFC 5987
        ret = /[^\040-\176]/.test(filename)
            ? 'attachment; filename=' + encodeURI(filename) + '; filename*=UTF-8\'\'' + encodeURI(filename)
            : 'attachment; filename="' + filename + '"';
    }

    return ret;
};

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 */

exports.setCharset = function setCharset(type, charset) {
    if (!type || !charset) {
        return type;
    }

    // parse type
    var parsed = contentType.parse(type);

    // set charset
    parsed.parameters.charset = charset;

    // format type
    return contentType.format(parsed);
};

/**
 * Compile "query parser" value to function.
 *
 * @param  {String|Function} val
 * @return {Function}
 */

exports.compileQueryParser = function compileQueryParser(val) {
    var fn;

    if (typeof val === 'function') {
        return val;
    }

    switch (val) {
        case true:
            fn = querystring.parse;
            break;
        case false:
            fn = false;
            break;
        case 'extended':
            fn = qs.parse;
            break;
        case 'simple':
            fn = querystring.parse;
            break;
        default:
            throw new TypeError('unknown value for query parser function: ' + val);
    }

    return fn;
};

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 */

exports.compileTrust = function (val) {
    if (typeof val === 'function') return val;

    if (val === true) {
        // Support plain true/false
        return function () {
            return true
        };
    }

    if (typeof val === 'number') {
        // Support trusting hop count
        return function (a, i) {
            return i < val
        };
    }

    if (typeof val === 'string') {
        // Support comma-separated values
        val = val.split(/ *, */);
    }

    return proxyaddr.compile(val || []);
};


/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 */

function acceptParams(str, index) {
    var parts = str.split(/ *; */);
    var ret = {value: parts[0], quality: 1, params: {}, originalIndex: index};

    for (var i = 1; i < parts.length; ++i) {
        var pms = parts[i].split(/ *= */);
        if ('q' == pms[0]) {
            ret.quality = parseFloat(pms[1]);
        } else {
            ret.params[pms[0]] = pms[1];
        }
    }

    return ret;
}


