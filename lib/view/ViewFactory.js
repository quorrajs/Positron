/**
 * ViewFactory.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var merge = require('utils-merge');
var View = require('./View');
var path = require('path');

function ViewFactory(app, config) {
    this.__app = app;
    this.__config = config;

    /**
     * @param view cache
     * @protected
     */
    this.__cache = {};
}

ViewFactory.prototype.render = function (viewName, options, fn) {
    var opts = {};

    // merge app.locals
    merge(opts, this.__app.locals || {});

    // merge options.__locals
    if (options.__locals) {
        merge(opts, options.__locals);
    }

    // merge options
    merge(opts, options);

    // set .cache unless explicitly provided
    opts.cache = null == opts.cache
        ? this.__config.cache
        : opts.cache;

    try {
        this.make(viewName, opts.cache).render(opts, fn);
    } catch (e) {
        fn(e);
    }
};

ViewFactory.prototype.make = function (viewName, cache) {
    var view;

    // primed cache
    if (cache) view = this.__cache[viewName];

    // view
    if (!view) {
        var engineAndFile = this.__getEngineAndFile(viewName);
        view = new View(engineAndFile.file, {
            engine: engineAndFile.engine,
            root: this.__config.paths
        });

        // prime the cache
        if (cache) this.__cache[viewName] = view;
    }

    // render
    return view;
};

ViewFactory.prototype.__getEngineAndFile = function (viewName) {
    var ext = path.extname(viewName);
    if (!ext && !this.__config.defaultEngine) throw new Error('No default engine was specified and no extension was provided.');
    if (!ext) viewName += (ext = '.' + this.__config.defaultEngine);
    return {
        engine: this.__config.engines[ext.slice(1)] || (this.__config.engines[ext.slice(1)] = require('consolidate')[ext.slice(1)]),
        file: viewName
    }
};

module.exports = ViewFactory;

