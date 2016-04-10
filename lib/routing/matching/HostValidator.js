/**
 * HostValidator.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

function HostValidator() {

}

/**
 * Validate a given rule against a route and request.
 *
 * @param route
 * @param request
 * @returns {boolean}
 */
HostValidator.prototype.matches = function (route, request) {
    if (isNull(route.getCompiled().getHostRegex())) return true;

    return route.getCompiled().getHostRegex().test(request.host);
};

module.exports = HostValidator;