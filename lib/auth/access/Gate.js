/**
 * Gate.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');

function Gate(userResolver, gateManager) {
    this.__resolveUser = userResolver;
    this.__gateManager = gateManager;

}


/**
 * Determine if the given ability should be granted for the current user.
 *
 * @param  {String} ability
 * @param  {Array|*} methodArguments
 * @param {function} callback
 */
Gate.prototype.allows = function (ability, methodArguments, callback) {
    return this.check(ability, methodArguments, callback);
};

/**
 * Determine if the given ability should be denied for the current user.
 *
 * @param  {String} ability
 * @param  {Array|*} methodArguments
 * @param  {Function} callback
 * @return {Boolean}
 */
Gate.prototype.denies = function (ability, methodArguments, callback) {
    return this.allows(ability, methodArguments, function (response) {
        callback(!response);
    });
};

/**
 * Determine if the given ability should be granted for the current user.
 *
 * @param  {String} ability
 * @param  {Array|*} methodArguments
 * @param {function} callback
 */
//@todo: note
Gate.prototype.check = function (ability, methodArguments, callback) {
    this.__raw(ability, methodArguments, function (response) {
        callback(!!response);
    });
};

/**
 * Get a guard instance for the given user.
 *
 * @param user
 * @returns {Gate}
 */
Gate.prototype.forUser = function (user) {
    var callback = function () {
        return user;
    };

    return new Gate(
        callback, this.__gateManager
    );
};


/**
 * Get the raw result for the given ability for the current user.
 *
 * @param {String} ability
 * @param {Array|*}  methodArguments
 * @param {function} callback
 * @protected
 */
Gate.prototype.__raw = function (ability, methodArguments, callback) {
    var self = this;

    self.__resolveUser(function (user) {
        if (!user) {
            callback(false);
        }

        methodArguments = parseArray(methodArguments);

        self.__executeCallbacks(user, ability, methodArguments, callback);
    });
};

/**
 * Execute before callbacks and execute authorization callback then after callbacks.
 * Return execution if any of the before callbacks return any response.
 *
 * @param user
 * @param ability
 * @param methodArguments
 * @param callback
 * @protected
 */
Gate.prototype.__executeCallbacks = function (user, ability, methodArguments, callback) {
    var self = this;

    self.__gateManager.executeBeforeCallbacks(user, ability, methodArguments, function (result) {
        if (!isset(result)) {
            self.__callAuthCallback(user, ability, methodArguments, function (result) {
                self.__gateManager.executeAfterCallbacks(user, ability, methodArguments, result, function () {
                    callback(result)
                })
            });
        } else {
            self.__gateManager.executeAfterCallbacks(user, ability, methodArguments, result, function () {
                callback(result)
            })
        }
    });
};

/**
 * Resolve and call the appropriate authorization callback.
 *
 * @param {Object} user
 * @param {String} ability
 * @param {Object} methodArguments
 * @param {Function} callback
 * @protected
 */
Gate.prototype.__callAuthCallback = function (user, ability, methodArguments, callback) {
    var authCallback = this.__resolveAuthCallback(
        user, ability, methodArguments
    );

    return authCallback.apply(null, [user].concat(methodArguments, callback));
};

/**
 * Resolve the callable for the given ability and arguments.
 *
 * @param  {Object} user
 * @param  {String} ability
 * @param  {Array} methodArguments
 * @return {function}
 * @protected
 */
Gate.prototype.__resolveAuthCallback = function (user, ability, methodArguments) {
    if (this.__gateManager.firstArgumentCorrespondsToPolicy(methodArguments)) {
        return this.__resolvePolicyCallback(user, ability, methodArguments);
    } else if (this.__gateManager.has(ability)) {
        return this.__gateManager.getAbility(ability);
    } else {
        return function () {
            return false;
        };
    }
};

/**
 * Resolve the callback for a policy check.
 *
 * @param  {Object} user
 * @param  {String}  ability
 * @param  {Array}  methodArguments
 *
 * @return {function}
 */
Gate.prototype.__resolvePolicyCallback = function (user, ability, methodArguments) {
    var self = this;

    return function () {
        var callback = arguments[arguments.length - 1];
        var instance = self.__gateManager.getPolicyFor(methodArguments[0]);
        var next = function () {
            if (ability.indexOf('-') > -1) {
                ability = _.camelCase(ability);
            }

            if (!_.isFunction(instance[ability])) {
                callback(false);
            }

            return instance[ability].apply(instance, [user].concat(methodArguments, callback));

        };


        if (_.isFunction(instance.before)) {
            instance.before.apply(instance, [user, ability, methodArguments, function (response) {
                if (isset(response)) {
                    // If we received a non-null result from the before method, we will return it
                    // as the result of a check. This allows developers to override the checks
                    // in the policy and return a result for all rules defined in the class.
                    callback(response)
                }


                return next();
            }]);
        } else {
            next();
        }
    };
};

Gate.prototype.getGateManager = function () {
    return this.__gateManager;
};

Gate.prototype.getUserResolver = function () {
    return this.__resolveUser;
};

module.exports = Gate;
