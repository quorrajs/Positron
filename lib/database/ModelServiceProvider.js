/**
 * ModelServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var ModelFactory = require('../database/ModelFactory');
var path = require('path');

var ModelServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Load waterline models to the application.
 *
 * @param {function} done
 */
ModelServiceProvider.prototype.register = function (done) {
    var modelDirPath = path.join(this.__app.path.app, 'models');

    this.__app.modelFactory = new ModelFactory(this.__app, modelDirPath);

    this.__app.models = this.__app.modelFactory.load(function () {
        done();
    });
};

module.exports = ModelServiceProvider;