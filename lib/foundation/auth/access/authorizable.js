/**
 * authorizable.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2017, QuorraJS.
 * @license See LICENSE.txt
 */
var app = require('positron');
var authorizable = {
    attributes: {
        /**
         * Determine if the entity has a given ability.
         *
         * @param {string} ability
         * @param {array|*} methodArguments
         * @param {function} callback
         */
        can: function (ability, methodArguments, callback) {
            return app.gate.getAccessGateForUser(this).allows(ability, methodArguments, callback);
        },

        /**
         * Determine if the entity does not have a given ability.
         *
         * @param {string} ability
         * @param {array|*} methodArguments
         * @param {function} callback
         */
        cant: function (ability, methodArguments, callback) {
            return app.gate.getAccessGateForUser(this).denies(ability, methodArguments, callback);
        }
    }
};

module.exports = authorizable;