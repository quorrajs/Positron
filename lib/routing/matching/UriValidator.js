/**
 * UriValidator.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var str = require('../../support/str');

function UriValidator() {

}

/**
 * Validate a given rule against a route and request.
 *
 * @param  route
 * @param  request
 * @return {boolean}
 */
UriValidator.prototype.matches = function (route, request) {
    var requestPath = request.path === '/' ? '/' : '/' + str.trim(request.path, '/');
    return decodeURIComponent(requestPath).match(route.getCompiled().getRegex());
};

module.exports = UriValidator;