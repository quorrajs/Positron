/**
 * WaterlineUserProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

function WaterlineUserProvider(model, hasher) {
    /**
     * The Waterline user model.
     *
     * @var {string}
     */
    this.__model = model;

    /**
     * The hasher
     *
     * @var {object}
     */
    this.__hasher = hasher;
}

/**
 * Retrieve a user by their unique identifier.
 *
 * @param {*} identifier
 * @param {function} callback
 */
WaterlineUserProvider.prototype.retrieveByID = function (identifier, callback) {
    this.__model.findOne(identifier, function (err, user) {
        if (err) {
            throw err;
        }

        callback(user);
    });
};

/**
 * Retrieve a user by their unique identifier and "remember me" token.
 *
 * @param {*} identifier
 * @param {string} token
 * @param {function} callback
 */
WaterlineUserProvider.prototype.retrieveByToken = function (identifier, token, callback) {
    var where = {};
    where[this.getAuthIdentifierName()] = identifier;
    where[this.getRememberTokenName()] = token;

    return this.__model.findOne(where, function (err, user) {
        if (err) {
            throw err;
        }

        callback(user);
    });
};

/**
 * Retrieve a user by the given credentials.
 *
 * @param  {array} credentials
 * @param  {function} callback
 */
WaterlineUserProvider.prototype.retrieveByCredentials = function (credentials, callback) {
    // First we will add each credential element to the query as a where clause.
    // Then we can execute the query and, if we found a user, return it and
    // that will be utilized by the Guard instances.

    var where = {};
    var index;

    for (var key in credentials) {
        if (credentials.hasOwnProperty(key) && !~key.indexOf('password')) {
            where[key] = credentials[key];
        }
    }

    this.__model.findOne(where, function (err, user) {
        if (err) {
            throw err;
        } else {
            callback(user);
        }
    });
};

/**
 * Validate a user against the given credentials.
 *
 * @param {object} user
 * @param {array} credentials
 * @param {function} callback
 * @return {boolean}
 */
WaterlineUserProvider.prototype.validateCredentials = function (user, credentials, callback) {
    return this.__hasher.check(credentials['password'], user['password'], function (err, res) {
        callback(res);
    });
};

WaterlineUserProvider.prototype.getAuthIdentifierName = function () {
    return this.__model.primaryKey;
};

WaterlineUserProvider.prototype.getRememberTokenName = function () {
    return this.__model.getRememberTokenName();
};

/**
 * Update the "remember me" token for the given user in storage.
 *
 * @param {object} user
 * @param {string} token
 * @param {function} callback
 * @return void
 */
WaterlineUserProvider.prototype.updateRememberToken = function (user, token, callback) {
    user[this.getRememberTokenName()] = token;

    this.__model.update(user[this.getAuthIdentifierName()], user, function (err, users) {
        if (err) {
            throw err;
        } else {
            callback();
        }
    });
};

module.exports = WaterlineUserProvider;