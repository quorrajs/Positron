/**
 * ModelFactory.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var Waterline = require('waterline');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var pluralize = require('pluralize');
var async = require('async');

function ModelFactory(app, path) {
    this.__config = app.config.get('database');
    this.__env = app.environment();
    this.__path = path;
    this.__adapters = {};
    this.__waterline = new Waterline();
}

ModelFactory.prototype.__loadAllModelDefs = function () {
    var modelConfig = {};
    if (fs.existsSync(path.join(this.__path, '/'))) {
        fs.readdirSync(path.join(this.__path, '/')).forEach(function (file) {
            if (file.match(/.+\.js/g) !== null) {
                var name = file.replace('.js', '').toLowerCase();
                modelConfig[name] = this.__normalizeModelDef(name, require(path.join(this.__path, file)));

                // Generate `globalId` using the value of model.identity
                if (!modelConfig[name].globalId) {
                    modelConfig[name].globalId =
                        modelConfig[name].identity[0].toUpperCase() + modelConfig[name].identity.slice(1);
                }
            }
        }.bind(this));
    }

    return modelConfig;
};

ModelFactory.prototype.__normalizeModelDef = function (modelId, modelDef) {
    var newModelDef = _.merge({
        identity: modelId,
        tableName: pluralize(modelId, 2)
    }, this.__config.model);

    newModelDef = _.merge(newModelDef, modelDef);

    // If this is production, force `migrate: safe`!!
    if (this.__env === 'production' && newModelDef.migrate !== 'safe') {
        newModelDef.migrate = 'safe';
    }

    var adapter = this.__config.connections[newModelDef.connection].adapter;

    if (!this.__adapters[adapter]) {
        this.__adapters[adapter] = require(adapter);
    }

    return newModelDef;
};

ModelFactory.prototype.__getConnectionsInPlay = function () {
    return _.reduce(this.__adapters, function (connections, adapter, adapterKey) {
        _.each(this.__config.connections, function (connection, connectionKey) {
            if (adapterKey === connection.adapter) {
                connections[connectionKey] = connection;
            }
        }.bind(this));
        return connections;
    }.bind(this), {});
};

ModelFactory.prototype.__initializeWaterlineModels = function (callback) {

    // Find all the connections used
    var connections = this.__getConnectionsInPlay();

    var appDefaults = this.__config.model;

    var waterlineModels = {};
    // -> "Initialize" ORM
    //    : This performs tasks like managing the schema across associations,
    //    : hooking up models to their connections, and auto-migrations.
    this.__waterline.initialize({
        adapters: this.__adapters,
        connections: connections,
        defaults: appDefaults
    }, function (err, orm) {
        if (err) throw err;

        var models = orm.collections || [];

        _.each(models, function eachInstantiatedModel(thisModel, modelID) {

            // Derive information about this model's associations from its schema
            // and attach/expose the metadata as `SomeModel.associations` (an array)
            thisModel.associations = _.reduce(thisModel.attributes, function (associatedWith, attrDef, attrName) {
                if (typeof attrDef === 'object' && (attrDef.model || attrDef.collection)) {
                    var assoc = {
                        alias: attrName,
                        type: attrDef.model ? 'model' : 'collection'
                    };
                    if (attrDef.model) {
                        assoc.model = attrDef.model;
                    }
                    if (attrDef.collection) {
                        assoc.collection = attrDef.collection;
                    }
                    if (attrDef.via) {
                        assoc.via = attrDef.via;
                    }

                    associatedWith.push(assoc);
                }
                return associatedWith;
            }, []);

            waterlineModels[modelID] = thisModel;
        });

        callback();
    });

    return waterlineModels;
};

ModelFactory.prototype.load = function (callback) {
    var modelDefs = this.__loadAllModelDefs();

    _.each(modelDefs, function loadModelsIntoWaterline(modelDef, modelID) {
        this.__waterline.loadCollection(Waterline.Collection.extend(modelDef));
    }.bind(this));

    return this.__initializeWaterlineModels(callback);
};

ModelFactory.prototype.teardown = function (cb) {
    var self = this;

    async.forEach(Object.keys(self.__adapters || {}), function(name, next) {
        var adapter = self.__adapters[name];
        if (adapter.teardown) {
            adapter.teardown(null, next);
        } else {
            next();
        }
    }, cb);
};

module.exports = ModelFactory;
