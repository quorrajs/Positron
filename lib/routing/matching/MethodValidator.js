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
MethodValidator.prototype.matches = function(route, request)
{   //@todo: res method case
    return _.findKey(route.methods(), function(method){
        return request.method.toUpperCase() == method;
    }) !== false;
};

module.exports = MethodValidator;
