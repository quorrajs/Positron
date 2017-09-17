/**
 * GateManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var util = require('util');

var Gate = require('./Gate');

function GateManager(app) {
    /**
     * The App object.
     *
     * @type {{}}
     */
    this.__app = app;
    /**
     * All of the defined abilities.
     *
     * @var {Array}
     */
    this.__abilities = [];

    /**
     * All of the defined policies.
     *
     * @type {{}}
     */

    this.__policies = {};

    /**
     * The policy instances.
     *
     * @type {{}}
     */
    this.__policyInstances = {};


    /**
     * All of the registered before callbacks.
     *
     * @type {Array}
     */
    this.__beforeCallbacks = [];

    /**
     * All of the registered after callbacks.
     *
     * @type {Array}
     */
    this.__afterCallbacks = [];
}

/**
 * Determine if a given ability has been defined.
 *
 * @param  {String}  ability
 * @return {Boolean}
 */
GateManager.prototype.has = function (ability) {
    return isset(this.__abilities[ability]);
};

/**
 * Define a new ability.
 *
 * @param  {String} ability
 * @param  {function} callback
 * @return {GateManager}
 *
 * @throws Error
 */
GateManager.prototype.define = function (ability, callback) {
    if (_.isFunction(callback)) {
        this.__abilities[ability] = callback;
    } else {
        throw new Error("Callback must be a callable.");
    }

    return this;
};

/**
 * Define a policy class for a given policy type.
 *
 * @param  {String} pType
 * @param  {Function} policy
 * @return {GateManager}
 */
GateManager.prototype.policy = function (pType, policy) {
    if (_.isFunction(require(policy))) {
        this.__policies[pType] = policy;
    } else {
        throw new Error("Policy must be a constructor.");
    }

    return this;
};

/**
 * Register a callback to run before all Gate checks.
 *
 * @param  {function} callback
 * @return {GateManager}
 */
GateManager.prototype.before = function (callback) {
    this.__beforeCallbacks.push(callback);

    return this;
};

/**
 * Register a callback to run after all Gate checks.
 *
 * @param  {function} callback
 * @return {GateManager}
 */
GateManager.prototype.after = function (callback) {
    this.__afterCallbacks.push(callback);

    return this;
};

/**
 * Determine if the argument corresponds to a policy.
 *
 * @param  {Array} methodArguments
 * @return {Boolean}
 */
GateManager.prototype.firstArgumentCorrespondsToPolicy = function (methodArguments) {
    if (!isset(methodArguments[0])) {
        return false;
    }

    if (isObject(methodArguments[0])) {
        if(isset(methodArguments[0].pType)) {
            return isset(this.__policies[methodArguments[0].pType]);
        } else {
            return isset(this.__policies[this.__getModelIdByRecord(methodArguments[0])]);
        }
    }

    return _.isString(methodArguments[0]) && isset(this.__policies[methodArguments[0]]);
};

/**
 * Return model global id of a db query response record.
 *
 * @param record
 * @returns {*}
 * @private
 */
GateManager.prototype.__getModelIdByRecord = function (record) {
    var modelId;

    if(this.__app.models) {
        for (var key in this.__app.models) {
            if ( record instanceof this.__app.models[key]._model ) {
                modelId = this.__app.models[key].globalId;

                break;
            }
        }
    }

    return modelId;
};

/**
 * Get ability callback for given ability.
 *
 * @param  {String} ability
 * @return {Function}
 *
 * @throws Error
 */
GateManager.prototype.getAbility = function (ability) {

    if (!isset(this.__abilities[ability])) {
        throw new Error("Ability not defined for " + ability + ".");
    }

    return this.__abilities[ability];
};

/**
 * Get a policy instance for a given class.
 *
 * @param  {Object|String} policyHandle
 * @return {Object}
 *
 * @throws Error
 */
GateManager.prototype.getPolicyFor = function (policyHandle) {
    var pType;

    if (isObject(policyHandle)) {
        pType = policyHandle.pType;

        if(!pType) {
            pType = this.__getModelIdByRecord(policyHandle);
        }
    } else {
        pType = policyHandle;
    }

    if (!isset(this.__policies[pType])) {
        throw new Error("Policy not defined for " + policyHandle + ".");
    }

    return this.__getPolicyInstance(pType);
};

/**
 * Return already created policy instance for a
 * policy type or create and return.
 *
 * @param {String} pType
 * @returns {*}
 * @protected
 */
GateManager.prototype.__getPolicyInstance = function (pType) {
    if (!isset(this.__policyInstances[pType])) {
        this.__policyInstances[pType] = new (require(this.__policies[pType]))();
    }

    return this.__policyInstances[pType];
};

/**
 * Return Gate instance for a http request.
 *
 * @param {Object} request
 * @param {Object} response
 * @returns {Gate}
 */
GateManager.prototype.getAccessGate = function (request, response) {
    return new Gate(function (callback) {
        return request.auth.user(callback);
    }, this)
};

/**
 * Return Gate instance for a user model.
 *
 * @param {Object} user
 * @returns {Gate}
 */
GateManager.prototype.getAccessGateForUser = function (user) {
    var callback = function (cb) {
        return cb(user);
    };

    return new Gate(
        callback, this
    );
};

/**
 * Execute before callbacks in sequence. Break the
 * execution and return if any callback return any
 * response.
 *
 * @param {Object} user
 * @param {String} ability
 * @param {Array} methodArguments
 * @param {Function} callback
 */
GateManager.prototype.executeBeforeCallbacks = function (user, ability, methodArguments, callback) {
    var beforeCallbacks = this.__beforeCallbacks.slice(0);

    function next(response) {
        if (beforeCallbacks.length && !isset(response)) {
            var beforeCallback = beforeCallbacks.shift();

            beforeCallback(user, ability, methodArguments, next);
        } else {
            callback(response);
        }
    }

    next();
};

/**
 * Execute after callbacks in sequence.
 *
 * @param {Object} user
 * @param {String} ability
 * @param {Array} methodArguments
 * @param {Object} authorizationResponse
 * @param {Function} callback
 */
GateManager.prototype.executeAfterCallbacks
    = function (user, ability, methodArguments, authorizationResponse, callback) {
    var afterCallbacks = this.__afterCallbacks.slice(0);

    function next() {
        if (afterCallbacks.length) {
            var afterCallback = afterCallbacks.shift();

            afterCallback(user, ability, authorizationResponse, methodArguments, next);
        } else {
            callback();
        }
    }

    next();
};

module.exports = GateManager;