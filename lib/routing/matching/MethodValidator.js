/**
 * MethodValidator.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var _ = require('lodash');

function MethodValidator() {

}

/**
 * Validate a given rule against a route and request.
 *
 * @param  route
 * @param  request
 * @return {bool}
 */
MethodValidator.prototype.matches = function (route, request) {
    return !!~route.methods().indexOf(request.method.toUpperCase());
};

module.exports = MethodValidator;
