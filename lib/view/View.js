/**
 * View.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var debug = require('debug')('quorra:view');
var path = require('path');
var fs = require('fs');

function View(file, config) {
    config = config || {};
    this.__root = config.root;
    this.__engine = config.engine;
    this.__ext = path.extname(file);
    this.__path = this.__lookup(file);
}

/**
 * Render with the given `options` and callback `callback(err, str)`.
 *
 * @param {Object} options
 * @param {Function} callback
 */

View.prototype.render = function render(options, callback) {
    debug('render "%s"', this.__path);
    this.__engine(this.__path, options, callback);
};

/**
 * Lookup view by the given `name`
 *
 * @param {String} name
 * @return {String}
 * @protected
 */

View.prototype.__lookup = function lookup(name) {
    var filePath;
    var roots = [].concat(this.__root);

    debug('lookup "%s"', name);

    for (var i = 0; i < roots.length && !filePath; i++) {
        var root = roots[i];

        // resolve the path
        var loc = path.resolve(root, name);
        var dir = path.dirname(loc);
        var file = path.basename(loc);

        // resolve the file
        filePath = this.__resolve(dir, file);
    }

    if (!filePath) {
        var dirs = Array.isArray(this.__root) && this.__root.length > 1
            ? 'directories "' + this.__root.slice(0, -1).join('", "') + '" or "' + this.__root[this.__root.length - 1] + '"'
            : 'directory "' + this.__root + '"';
        throw new Error('Failed to lookup view "' + name + '" in views ' + dirs);
    }

    return filePath;
};

/**
 * Resolve the file within the given directory.
 *
 * @param {string} dir
 * @param {string} file
 * @protected
 */

View.prototype.__resolve = function resolve(dir, file) {
    var ext = this.__ext;
    var filePath;
    var stat;

    // <path>.<ext>
    filePath = path.join(dir, file);
    stat = tryStat(filePath);

    if (stat && stat.isFile()) {
        return filePath;
    }

    // <path>/index.<ext>
    filePath = path.join(dir, path.basename(file, ext), 'index' + ext);
    stat = tryStat(filePath);

    if (stat && stat.isFile()) {
        return filePath;
    }
};

/**
 * Return a stat, maybe.
 *
 * @param {string} path
 * @return {fs.Stats}
 * @private
 */

function tryStat(path) {
    debug('stat "%s"', path);

    try {
        return fs.statSync(path);
    } catch (e) {
        return undefined;
    }
}


module.exports = View;

