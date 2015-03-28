/**
 * ViewFactory.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var merge = require('utils-merge');
var View = require('./View');
var path = require('path');

function ViewFactory(app, defaultEngine, engines){
    this.__app = app;
    this.__engines = engines;
    this.__defaultEngine = defaultEngine;

    /**
     * @param view cache
     * @protected
     */
    this.__cache;
}

ViewFactory.prototype.render = function(viewName, options, fn){
    var opts = {};

    // merge app.locals
    merge(opts, this.__app.config.get('app'));

    // merge options.__locals
    if (options.__locals) {
        merge(opts, options._locals);
    }

    // merge options
    merge(opts, options);

    // set .cache unless explicitly provided
    opts.cache = null == opts.cache
        ? this.__app.config.get('view').cache
        : opts.cache;

  this.make(viewName, opts.cache).render(options, fn);
};

ViewFactory.prototype.make = function(viewName, cache){
    var view;

    // primed cache
    if (cache) view = this.__cache[viewName];

    // view
    if (!view) {
        var engineAndFile = this.__getEngineAndFile(viewName);
        view = new View(engineAndFile.file, {
            engine: engineAndFile.engine,
            root: this.__app.config.get('view').paths
        });

        // prime the cache
        if (cache) cache[viewName] = view;
    }

    // render
    return view;
};

ViewFactory.prototype.__getEngineAndFile = function(viewName) {
    var ext = path.extname(viewName);
    if (!ext && !this.__defaultEngine) throw new Error('No default engine was specified and no extension was provided.');
    if (!ext) viewName += (ext = '.' + this.__defaultEngine);
    return {
        engine: this.__engines[ext.slice(1)] || (this.__engines[ext] = require('consolidate')[ext.slice(1)]),
        file: viewName
    }
};

module.exports = ViewFactory;

