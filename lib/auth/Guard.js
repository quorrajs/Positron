/**
 * Guard.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var str = require('../support/str');
var basicAuth = require('basic-auth');

function Guard(userProvider, session, config, request, response) {
    this.__userProvider = userProvider;
    this.__session = session;
    this.__config = config;
    this.__request = request;
    this.__response = response;

    /**
     * Indicates if the logout method has been called.
     *
     * @var {boolean}
     * @protected
     */
    this.__loggedOut = false;

    /**
     * The currently authenticated user.
     *
     * @var {object|null}
     * @protected
     */
    this.__user;

    /**
     * Indicates if a token user retrieval has been attempted.
     *
     * @var {boolean}
     * @protected
     */
    this.__tokenRetrievalAttempted = false;

    /**
     * Indicates if the user was authenticated via a recaller cookie.
     *
     * @var {boolean}
     * @protected
     */
    this.__viaRemember = false;
}

/**
 * Get the currently authenticated user.
 *
 * @param {function} callback
 */
Guard.prototype.user = function (callback) {
    if (this.__loggedOut) {
        callback(false);
    }

    // If we have already retrieved the user for the current request we can just
    // return it back immediately. We do not want to pull the user data every
    // request into the method because that would tremendously slow an app.
    if (this.__user) {
        return callback(this.__user);
    }

    var self = this;

    // First we will try to load the user using the identifier in the session if
    // one exists. Otherwise we will check for a "remember me" cookie in this
    // request, and if one exists, attempt to retrieve the user using that.
    var id = this.__session.get(this.getName());

    // If the user is null, but we decrypt a "recaller" cookie we can attempt to
    // pull the user data on that cookie which serves as a remember cookie on
    // the application. Once we have a user we can return it to the caller.
    var recaller = self.__getRecaller();

    if (id) {
        this.__userProvider.retrieveByID(id, function (user) {
            if (!user && recaller) {
                self.__getUserByRecaller(recaller, function (user) {
                    callback(self.__user = user)
                });
            } else {
                callback(self.__user = user);
            }

        });
    } else if (recaller) {
        self.__getUserByRecaller(recaller, function (user) {
            callback(self.__user = user)
        });
    } else {
        callback();
    }

};

/**
 * Get identifier for the auth session.
 *
 * @return {string}
 */
Guard.prototype.getName = function () {
    return this.__config.sessionAuthIdentifier;
};

/**
 * Get the name of the cookie used to store the "recaller".
 *
 * @return {string}
 */
Guard.prototype.getRecallerName = function () {
    return this.__config.rememberMeCookieIdentifier;
};

/**
 * Determine if the current user is authenticated.
 */
Guard.prototype.check = function (callback) {
    this.user(function (user) {
        callback(!!user)
    });
};

/**
 * Determine if the current user is a guest.
 */
Guard.prototype.guest = function (callback) {
    this.user(function (user) {
        callback(!user);
    });
};

/**
 * Set the current user of the application.
 *
 * @param {object} user
 */
Guard.prototype.setUser = function (user) {
    this.__user = user;

    this.__loggedOut = false;
};

/**
 * Return the currently cached user of the application.
 *
 * @return {object|null}
 */
Guard.prototype.getUser = function () {
    return this.__user;
};

/**
 * Log a user into the application.
 *
 * @param {user} user
 * @param {function} callback
 * @param {boolean} remember
 */
Guard.prototype.login = function (user, callback, remember) {
    var self = this;
    var userIdentifier = user[this.__userProvider.getAuthIdentifierName()];

    if (!userIdentifier) {
        throw new Error('Invalid auth identifier');
    }

    this.__updateSession(userIdentifier);

    // If the user should be permanently "remembered" by the application we will
    // set a permanent cookie that contains the encrypted copy of the user
    // identifier. We will then decrypt this later to retrieve the users.
    if (remember) {
        this.__createRememberTokenIfDoesntExist(user, function () {
            self.__setRecallerCookie(user);

            // @note: fire login event
            self.setUser(user);

            callback();
        });

    } else {
        // @note: fire login event
        this.setUser(user);

        callback();
    }
};

/**
 * Attempt to authenticate a user using the given credentials.
 *
 * @param {array} credentials
 * @param {function} callback
 * @param {boolean} remember
 * @param {boolean} login
 * @return {boolean}
 */
Guard.prototype.attempt = function (credentials, callback, remember, login) {
    var self = this;

    credentials = parseObject(credentials);

    if (!isset(remember)) {
        remember = false;
    }

    if (!isset(login)) {
        login = true;
    }

    // @note: fire attempt event

    this.__userProvider.retrieveByCredentials(credentials, function (user) {
        self.__lastAttempted = user;

        // If a user object was returned, we'll ask the provider
        // to validate the user against the given credentials, and if they are in
        // fact valid we'll log the users into the application and return true.
        self.__hasValidCredentials(user, credentials, function (valid) {
            if (valid) {
                if (login) {
                    self.login(user, function () {
                        callback(true)
                    }, remember);
                } else {
                    callback(true)
                }
            } else {
                callback(false);
            }
        });
    });
};

/**
 * Get the ID for the currently authenticated user.
 *
 * @return {undefined|null}
 */
Guard.prototype.id = function () {
    if (this.__loggedOut) return;

    return this.__session.get(this.getName());
};

/**
 * Validate a user's credentials.
 *
 * @param {object} credentials
 * @param {function} callback
 * @return {boolean}
 */
Guard.prototype.validate = function (credentials, callback) {
    return this.attempt(credentials, callback, false, false);
};

/**
 * Log a user into the application without sessions or cookies.
 *
 * @param {object} credentials
 * @param {function} callback
 * @return {boolean}
 */
Guard.prototype.once = function (credentials, callback) {
    var self = this;
    this.validate(credentials, function (valid) {
        if (valid) {
            self.setUser(self.__lastAttempted);
            callback(true);
        } else {
            callback(false);
        }
    });
};

/**
 * Log the given user ID into the application.
 *
 * @param  {*} id
 * @param  {function} callback
 * @param  {boolean} remember
 */
Guard.prototype.loginUsingId = function (id, callback, remember) {
    var self = this;

    this.__userProvider.retrieveByID(id, function (user) {
        self.login(user, function () {
            callback(user);
        }, remember)
    });
};

/**
 * Log the given user ID into the application without sessions or cookies.
 *
 * @param  {*} id
 * @param  {function} callback
 */
Guard.prototype.onceUsingId = function (id, callback) {
    var self = this;

    this.__userProvider.retrieveByID(id, function (user) {
        self.setUser(user);
        callback(user);
    });
};

/**
 * Determine if the user was authenticated via "remember me" cookie.
 *
 * @return bool
 */
Guard.prototype.viaRemember = function () {
    return this.__viaRemember;
};

/**
 * Attempt to authenticate using HTTP Basic Auth.
 *
 * @param {function} callback
 * @param {string} [field]
 */
Guard.prototype.basic = function (callback, field) {
    var self = this;

    if (!isset(field)) {
        field = 'email';
    }

    this.check(function (valid) {
        if (valid) {
            callback(true);
        } else {
            // If a username is set on the HTTP basic request, we will try to authenticate
            // and return callback with true if authentication succeeds. Otherwise, we'll
            // return callback with false
            self.__attemptBasic(field, callback);
        }
    });
};

/**
 * Perform a stateless HTTP Basic login attempt.
 *
 * @param {function} callback
 * @param {string} field
 */
Guard.prototype.onceBasic = function (callback, field) {
    if (!isset(field)) {
        field = 'email';
    }

    var credentials = this.__getBasicCredentials(field);

    if (!credentials[field]) {
        callback(false);
    } else {
        this.once(credentials, callback)
    }
};

/**
 * Log the user out of the application.
 *
 * @param {function} callback
 */
Guard.prototype.logout = function (callback) {
    var self = this;
    this.user(function (user) {
        self.__clearUserDataFromStorage();

        if (user) {
            self.__refreshRememberToken(user, function () {

                // @note: fire logout event

                self.__clearUser(callback);
            });
        } else {
            self.__clearUser(callback);
        }
    });
};

/**
 * Clear user from memory
 *
 * @param callback
 * @protected
 */
Guard.prototype.__clearUser = function (callback) {
    // We will clear the users out of memory so they are no longer available
    // as the user is no longer considered as being signed into this
    // application and should not be available here.
    this.__user = undefined;
    this.__loggedOut = true;

    callback();
};

/**
 * Get the decrypted recaller cookie for the request.
 *
 * @return string|null
 * @protected
 */
Guard.prototype.__getRecaller = function () {
    return this.__request.signedCookies[this.getRecallerName()];
};

/**
 * Pull a user from the repository by its recaller ID.
 *
 * @param {string} recaller
 * @param {function} callback
 * @protected
 */
Guard.prototype.__getUserByRecaller = function (recaller, callback) {
    if (this.__validRecaller(recaller) && !this.__tokenRetrievalAttempted) {

        var self = this;

        this.__tokenRetrievalAttempted = true;

        var segments = recaller.split('|');

        this.__userProvider.retrieveByToken(segments[0], segments[1], function (user) {
            self.__viaRemember = !!user;

            callback(user);
        });
    } else {
        callback();
    }
};

/**
 * Determine if the recaller cookie is in a valid format.
 *
 * @param {string} recaller
 * @return {boolean}
 * @protected
 */
Guard.prototype.__validRecaller = function (recaller) {
    if (!_.isString(recaller) || !~recaller.indexOf('|')) return false;

    var segments = recaller.split('|');

    return segments.length == 2 && segments[0] !== '' && segments[1] !== '';
};

/**
 * Update the session with the given ID.
 *
 * @param {string} id
 * @protected
 */
Guard.prototype.__updateSession = function (id) {
    this.__session.put(this.getName(), id);

    this.__session.migrate(true);
};

/**
 * Refresh the remember token for the user.
 *
 * @param {object} user
 * @param {function} callback
 */
Guard.prototype.__refreshRememberToken = function (user, callback) {
    var token = str.quickRandom(60);

    this.__userProvider.updateRememberToken(user, token, callback);
};

/**
 * Create a new remember token for the user if one doesn't already exist.
 *
 * @param {object} user
 * @param {function} callback
 * @protected
 */
Guard.prototype.__createRememberTokenIfDoesntExist = function (user, callback) {
    var rememberToken = user[this.__userProvider.getRememberTokenName()];

    if (!rememberToken) {
        this.__refreshRememberToken(user, callback);
    } else {
        callback()
    }
};

/**
 * set the recaller cookie into the response.
 *
 * @param {object} user
 * @protected
 */
Guard.prototype.__setRecallerCookie = function (user) {
    var value = user[this.__userProvider.getAuthIdentifierName()] +
        '|' + user[this.__userProvider.getRememberTokenName()];

    this.__response.cookie(this.getRecallerName(), value, {
        maxAge: 157700000000, // five years
        httpOnly: true,
        signed: true
    })
};

/**
 * Determine if the user matches the credentials.
 *
 * @param {*} user
 * @param {array} credentials
 * @param {function} callback
 * @return {boolean}
 * @protected
 */
Guard.prototype.__hasValidCredentials = function (user, credentials, callback) {
    if (user && user['password']) {
        this.__userProvider.validateCredentials(user, credentials, callback);
    } else {
        callback(false);
    }
};

/**
 * Remove the user data from the session and cookies.
 *
 * @protected
 */
Guard.prototype.__clearUserDataFromStorage = function () {
    this.__session.forget(this.getName());

    var recaller = this.getRecallerName();

    this.__response.clearCookie(recaller);
};

/**
 * Get the credential array for a HTTP Basic request.
 *
 * @param {string} field
 * @return {object}
 * @protected
 */
Guard.prototype.__getBasicCredentials = function (field) {
    var result = {};
    var credentials = basicAuth(this.__request);

    if (credentials) {
        result[field] = credentials.name;
        result['password'] = credentials.pass;
    }

    return result;
};

/**
 * Attempt to authenticate using basic authentication.
 *
 * @param {string} field
 * @param {function} callback
 * @protected
 */
Guard.prototype.__attemptBasic = function (field, callback) {
    var credentials = this.__getBasicCredentials(field);

    if (!credentials[field]) {
        callback(false);
    } else {
        this.attempt(credentials, callback)
    }
};

module.exports = Guard;