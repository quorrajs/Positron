/**
 * response.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

/**
 * Module dependencies.
 */

var http = require('http');
var path = require('path');
var mixin = require('utils-merge');
var escapeHtml = require('escape-html');
var sign = require('cookie-signature').sign;
var normalizeType = require('../support/utils').normalizeType;
var normalizeTypes = require('../support/utils').normalizeTypes;
var contentDisposition = require('../support/utils').contentDisposition;
var isAbsolute = require('../support/utils').isAbsolute;
var onFinished = require('on-finished');
var deprecate = require('../support/utils').deprecate;
var setCharset = require('../support/utils').setCharset;
var etag = require('../support/utils').etag;
var statusCodes = http.STATUS_CODES;
var cookie = require('cookie');
var send = require('send');
var extname = path.extname;
var mime = send.mime;
var vary = require('vary');

/**
 * Response prototype.
 */

var res = module.exports = {
  __proto__: http.ServerResponse.prototype
};

/**
 * Set status `code`.
 *
 * @param {Number} code
 * @return {ServerResponse}
 */

res.status = function(code){
  this.statusCode = code;
  return this;
};

/**
 * Set Link header field with the given `links`.
 *
 * Examples:
 *
 *    res.links({
 *      next: 'http://api.example.com/users?page=2',
 *      last: 'http://api.example.com/users?page=5'
 *    });
 *
 * @param {Object} links
 * @return {ServerResponse}
 */

res.links = function(links){
  var link = this.get('Link') || '';
  if (link) link += ', ';
  return this.set('Link', link + Object.keys(links).map(function(rel){
    return '<' + links[rel] + '>; rel="' + rel + '"';
  }).join(', '));
};

/**
 * Send a response.
 *
 * Examples:
 *
 *     res.send(new Buffer('wahoo'));
 *     res.send({ some: 'json' });
 *     res.send('<p>some html</p>');
 *     res.send(404, 'Sorry, cant find that');
 *     res.send(404);
 *
 * @param {*} body or status
 * @param {*} body
 * @return {ServerResponse}
 */

res.send = function(body){
  var req = this.req;
    var encoding;
    var type;
  var head = 'HEAD' == req.method;
  var len;

  // settings
  var config = req.app.config;

  switch (typeof body) {
    // string defaulting to html
    case 'string':
      if (!this.get('Content-Type')) this.type('html');
      break;
    case 'boolean':
    case 'object':
    case 'number':
      if (null === body) {
        body = '';
      } else if (Buffer.isBuffer(body)) {
        this.get('Content-Type') || this.type('bin');
      } else {
        return this.json(body);
      }
  }

    // write strings in utf-8
    if (typeof body === 'string') {
        encoding = 'utf8';
        type = this.get('Content-Type');

        // reflect this in content-type
        if (typeof type === 'string') {
            this.set('Content-Type', setCharset(type, 'utf-8'));
        }
    }

    // populate Content-Length
    if (body !== undefined) {
        if (!Buffer.isBuffer(body)) {
            // convert body to Buffer; saves later double conversions
            body = new Buffer(body, encoding);
            encoding = undefined;
        }

        len = body.length;
        this.set('Content-Length', len);
    }

    // populate ETag
    var etag;
    var generateETag = len !== undefined && config.get('cache').etagfn;
    if (typeof generateETag === 'function' && !this.get('ETag')) {
        if ((etag = generateETag(body, encoding))) {
            this.set('ETag', etag);
        }
    }

  // freshness
  if (req.fresh) this.statusCode = 304;

  // strip irrelevant headers
  if (204 == this.statusCode || 304 == this.statusCode) {
    this.removeHeader('Content-Type');
    this.removeHeader('Content-Length');
    this.removeHeader('Transfer-Encoding');
    body = '';
  }

  // respond
    if (req.method === 'HEAD') {
        // skip body for HEAD
        this.end();
    } else {
        // respond
        this.end(body, encoding);
    }

  return this;
};

/**
 * Send JSON response.
 *
 * Examples:
 *
 *     res.json(null);
 *     res.json({ user: 'anchu' });
 *
 * @param {*} obj
 * @param {*} obj
 * @return {ServerResponse}
 */

res.json = function(obj){

    // settings
    var config = this.req.app.config;
    var replacer = config.get('jsonReplacer');
    var spaces = config.get('jsonSpaces');
    var body = JSON.stringify(obj, replacer, spaces);

    // content-type
    if (!this.get('Content-Type')) {
        this.set('Content-Type', 'application/json');
    }

    return this.send(body);
};

/**
 * Send JSON response with JSONP callback support.
 *
 * Examples:
 *
 *     res.jsonp(null);
 *     res.jsonp({ user: 'anchu' });
 *
 * @param {*} obj
 * @param {*} obj
 * @return {ServerResponse}
 */

res.jsonp = function(obj){
    // settings
    var config = this.req.app.config;
    var replacer = config.get('jsonReplacer');
    var spaces = config.get('jsonSpaces');
    var body = JSON.stringify(obj, replacer, spaces);
    var callback = this.req.query[config.get('jsonpCallbackName')];

    // content-type
    if (!this.get('Content-Type')) {
        this.set('X-Content-Type-Options', 'nosniff');
        this.set('Content-Type', 'application/json');
    }

    // fixup callback
    if (Array.isArray(callback)) {
        callback = callback[0];
    }

    // jsonp
    if (typeof callback === 'string' && callback.length !== 0) {
        this.charset = 'utf-8';
        this.set('X-Content-Type-Options', 'nosniff');
        this.set('Content-Type', 'text/javascript');

        // restrict callback charset
        callback = callback.replace(/[^\[\]\w$.]/g, '');

        // replace chars not allowed in JavaScript that are in JSON
        body = body
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');

        // the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
        // the typeof check is just to reduce client error noise
        body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
    }

    return this.send(body);
};

/**
 * Transfer the file at the given `path`.
 *
 * Automatically sets the _Content-Type_ response header field.
 * The callback `fn(err)` is invoked when the transfer is complete
 * or when an error occurs. Be sure to check `res.sentHeader`
 * if you wish to attempt responding, as the header and some data
 * may have already been transferred.
 *
 * Options:
 *
 *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
 *   - `root`     root directory for relative filenames
 *   - `headers`  object of headers to serve with file
 *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
 *
 * Other options are passed along to `send`.
 *
 * Examples:
 *
 *  The following example illustrates how `res.sendfile()` may
 *  be used as an alternative for the `static()` middleware for
 *  dynamic situations. The code backing `res.sendfile()` is actually
 *  the same code, so HTTP cache support etc is identical.
 *
 *     router.get('/user/:uid/photos/:file', function(req, res){
 *       var uid = req.params.uid
 *         , file = req.params.file;
 *
 *          res.sendfile('/uploads/' + uid + '/' + file);
 *     });
 */

res.sendfile = function(path, options, fn){
    var req = this.req;
    var res = this;
    var next = res.abort;

    if (!path) {
        throw new TypeError('path argument is required to res.sendFile');
    }

    // support function as second arg
    if (typeof options === 'function') {
        fn = options;
        options = {};
    }

    options = options || {};

    if (!options.root && !isAbsolute(path)) {
        throw new TypeError('path must be absolute or specify root to res.sendFile');
    }

    // create file stream
    var pathname = encodeURI(path);
    var file = send(req, pathname, options);

    // transfer
    sendfile(res, file, options, function (err) {
        if (fn) return fn(err);
        if (err && err.code === 'EISDIR') return next();

        // next() all but write errors
        if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
            next(err);
        }
    });
};

/**
 * Transfer the file at the given `path` as an attachment.
 *
 * Optionally providing an alternate attachment `filename`,
 * and optional callback `fn(err)`. The callback is invoked
 * when the data transfer is complete, or when an error has
 * occurred. Be sure to check `res.headersSent` if you plan to respond.
 *
 * This method uses `res.sendfile()`.
 *
 * @param {String} path
 * @param {String|Function} filename or fn
 * @param {Function} fn
 */

res.download = function(path, filename, fn){
  // support function as second arg
  if ('function' == typeof filename) {
    fn = filename;
    filename = null;
  }

  filename = filename || path;
  this.set('Content-Disposition', contentDisposition(filename));
  return this.sendfile(path, fn);
};

/**
 * Set _Content-Type_ response header with `type` through `mime.lookup()`
 * when it does not contain "/", or set the Content-Type to `type` otherwise.
 *
 * Examples:
 *
 *     res.type('.html');
 *     res.type('html');
 *     res.type('json');
 *     res.type('application/json');
 *     res.type('png');
 *
 * @param {String} type
 * @return {ServerResponse} for chaining
 */

res.contentType =
res.type = function(type){
  return this.set('Content-Type', ~type.indexOf('/')
    ? type
    : mime.lookup(type));
};

/**
 * Respond to the Acceptable formats using an `obj`
 * of mime-type callbacks.
 *
 * This method uses `req.accepted`, an array of
 * acceptable types ordered by their quality values.
 * When "Accept" is not present the _first_ callback
 * is invoked, otherwise the first match is used. When
 * no match is performed the server responds with
 * 406 "Not Acceptable".
 *
 * Content-Type is set for you, however if you choose
 * you may alter this within the callback using `res.type()`
 * or `res.set('Content-Type', ...)`.
 *
 *    res.format({
 *      'text/plain': function(){
 *        res.send('hey');
 *      },
 *
 *      'text/html': function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      'appliation/json': function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * In addition to canonicalized MIME types you may
 * also use extnames mapped to these types:
 *
 *    res.format({
 *      text: function(){
 *        res.send('hey');
 *      },
 *
 *      html: function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      json: function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * @param {Object} obj
 * @return {ServerResponse} for chaining
 */

res.format = function(obj){
    var req = this.req;
    var next = this.abort;

    var fn = obj.default;
    if (fn) delete obj.default;
    var keys = Object.keys(obj);

    var key = req.accepts(keys);

    this.vary("Accept");

    if (key) {
        this.set('Content-Type', normalizeType(key).value);
        obj[key](req, this);
    } else if (fn) {
        fn();
    } else {
        var err = new Error('Not Acceptable');
        err.status = 406;
        err.types = normalizeTypes(keys).map(function(o){ return o.value });
        next(err);
    }

    return this;
};

/**
 * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
 *
 * @param {String} filename
 * @return {ServerResponse}
 */

res.attachment = function(filename){
    if (filename) {
        this.type(extname(filename));
    }

    this.set('Content-Disposition', contentDisposition(filename));

    return this;
};

/**
 * Append additional header `field` with value `val`.
 *
 * Example:
 *
 *    res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
 *    res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
 *    res.append('Warning', '199 Miscellaneous warning');
 *
 * @param {String} field
 * @param {String|Array} val
 * @return {ServerResponse} for chaining
 */

res.append = function append(field, val) {
    var prev = this.get(field);
    var value = val;

    if (prev) {
        // concat the new and prev vals
        value = Array.isArray(prev) ? prev.concat(val)
            : Array.isArray(val) ? [prev].concat(val)
            : [prev, val];
    }

    return this.set(field, value);
};

/**
 * Set header `field` to `val`, or pass
 * an object of header fields.
 *
 * Examples:
 *
 *    res.set('Foo', ['bar', 'baz']);
 *    res.set('Accept', 'application/json');
 *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
 *
 * Aliased as `res.header()`.
 *
 * @param {String|Object|Array} field
 * @param {String} val
 * @return {ServerResponse} for chaining
 */

res.set =
res.header = function header(field, val) {
    if (arguments.length === 2) {
        if (Array.isArray(val)) val = val.map(String);
        else val = String(val);
        if ('content-type' == field.toLowerCase() && !/;\s*charset\s*=/.test(val)) {
            var charset = mime.charsets.lookup(val.split(';')[0]);
            if (charset) val += '; charset=' + charset.toLowerCase();
        }
        this.setHeader(field, val);
    } else {
        for (var key in field) {
            this.set(key, field[key]);
        }
    }
    return this;
};

/**
 * Get value for header `field`.
 *
 * @param {String} field
 * @return {String}
 */

res.get = function(field){
  return this.getHeader(field);
};

/**
 * Clear cookie `name`.
 *
 * @param {String} name
 * @param {Object} options
 * @param {ServerResponse} for chaining
 */

res.clearCookie = function(name, options){
  var opts = { expires: new Date(1), path: '/' };
  return this.cookie(name, '', options
    ? mixin(opts, options)
    : opts);
};

/**
 * Set cookie `name` to `val`, with the given `options`.
 *
 * Options:
 *
 *    - `maxAge`   max-age in milliseconds, converted to `expires`
 *    - `signed`   sign the cookie
 *    - `path`     defaults to "/"
 *
 * Examples:
 *
 *    // "Remember Me" for 15 minutes
 *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
 *
 *    // save as above
 *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
 *
 * @param {String} name
 * @param {String|Object} val
 * @param {Options} options
 * @return {ServerResponse} for chaining
 */

res.cookie = function(name, val, options){
    options = merge({}, options);
    var secret = this.req.app.config.get('app').key;
    var signed = options.signed;
    if (signed && !secret) throw new Error('cookieParser("secret") required for signed cookies');
    if ('number' == typeof val) val = val.toString();
    if ('object' == typeof val) val = 'j:' + JSON.stringify(val);
    if (signed) val = 's:' + sign(val, secret);
    if ('maxAge' in options) {
        options.expires = new Date(Date.now() + options.maxAge);
        options.maxAge /= 1000;
    }
    if (null == options.path) options.path = '/';
    var headerVal = cookie.serialize(name, String(val), options);

    // supports multiple 'res.cookie' calls by getting previous value
    var prev = this.get('Set-Cookie');
    if (prev) {
        if (Array.isArray(prev)) {
            headerVal = prev.concat(headerVal);
        } else {
            headerVal = [prev, headerVal];
        }
    }
    this.set('Set-Cookie', headerVal);
    return this;
};


/**
 * Set the location header to `url`.
 *
 * The given `url` can also be "back", which redirects
 * to the _Referrer_ or _Referer_ headers or "/".
 *
 * Examples:
 *
 *    res.location('/foo/bar').;
 *    res.location('http://example.com');
 *    res.location('../login');
 *
 * @param {String} url
 */

res.location = function(url){
  var req = this.req;

  // "back" is an alias for the referrer
  if ('back' == url) url = req.get('Referrer') || '/';

  // Respond
  this.set('Location', url);
  return this;
};

/**
 * Redirect to the given `url` with optional response `status`
 * defaulting to 302.
 *
 * The resulting `url` is determined by `res.location()`, so
 * it will play nicely with mounted apps, relative paths,
 * `"back"` etc.
 *
 * Examples:
 *
 *    res.redirect('/foo/bar');
 *    res.redirect('http://example.com');
 *    res.redirect(301, 'http://example.com');
 *    res.redirect('../login'); // /blog/post/1 -> /blog/login
 *
 */

res.redirect = function redirect(url) {
    var address = url;
    var body;
    var status = 302;

    // allow status / url
    if (arguments.length === 2) {
        status = arguments[0];
        address = arguments[1];
    }

    // Set location header
    this.location(address);
    address = this.get('Location');

    // Support text/{plain,html} by default
    this.format({
        text: function(){
            body = statusCodes[status] + '. Redirecting to ' + encodeURI(address);
        },

        html: function(){
            var u = escapeHtml(address);
            body = '<p>' + statusCodes[status] + '. Redirecting to <a href="' + u + '">' + u + '</a></p>';
        },

        default: function(){
            body = '';
        }
    });

    // Respond
    this.statusCode = status;
    this.set('Content-Length', Buffer.byteLength(body));

    if (this.req.method === 'HEAD') {
        this.end();
    } else {
        this.end(body);
    }
};

/**
 * Add `field` to Vary. If already present in the Vary set, then
 * this call is simply ignored.
 *
 * @param {Array|String} field
 * @return {ServerResponse} for chaining
 */

res.vary = function(field){
    // checks for back-compat
    if (!field || (Array.isArray(field) && !field.length)) {
        deprecate('res.vary(): Provide a field name');
        return this;
    }

    vary(this, field);

    return this;
};

/**
 * Render `view` with the given `options` and optional callback `fn`.
 * When a callback function is given a response will _not_ be made
 * automatically, otherwise a response of _200_ and _text/html_ is given.
 *
 * Options:
 *
 *  - `cache`     boolean hinting to the engine it should cache
 *  - `filename`  filename of the view being rendered
 *
 */

res.view = function(view, options, fn){
    options = options || {};
    var self = this;
    var req = this.req;
    var app = this.req.app;

    // support callback function as second arg
    if ('function' == typeof options) {
        fn = options;
        options = {};
    }

    // merge res.locals
    options._locals = self.locals;

    // default callback to respond
    fn = fn || function(err, str){
        if (err) return self.abort(err);
        self.send(str);
    };

    // render
    app.view.make(view, options).render(fn);
};

res.abort = function(error){
    if(error)
        throw error;
    else
        throw new Error('Request error.');
};

// pipe the send file stream
function sendfile(res, file, options, callback) {
    var done = false;
    var streaming;

    // request aborted
    function onaborted() {
        if (done) return;
        done = true;

        var err = new Error('Request aborted');
        err.code = 'ECONNABORTED';
        callback(err);
    }

    // directory
    function ondirectory() {
        if (done) return;
        done = true;

        var err = new Error('EISDIR, read');
        err.code = 'EISDIR';
        callback(err);
    }

    // errors
    function onerror(err) {
        if (done) return;
        done = true;
        callback(err);
    }

    // ended
    function onend() {
        if (done) return;
        done = true;
        callback();
    }

    // file
    function onfile() {
        streaming = false;
    }

    // finished
    function onfinish(err) {
        if (err && err.code === 'ECONNRESET') return onaborted();
        if (err) return onerror(err);
        if (done) return;

        setImmediate(function () {
            if (streaming !== false && !done) {
                onaborted();
                return;
            }

            if (done) return;
            done = true;
            callback();
        });
    }

    // streaming
    function onstream() {
        streaming = true;
    }

    file.on('directory', ondirectory);
    file.on('end', onend);
    file.on('error', onerror);
    file.on('file', onfile);
    file.on('stream', onstream);
    onFinished(res, onfinish);

    if (options.headers) {
        // set headers on successful transfer
        file.on('headers', function headers(res) {
            var obj = options.headers;
            var keys = Object.keys(obj);

            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                res.setHeader(k, obj[k]);
            }
        });
    }

    // pipe
    file.pipe(res);
}