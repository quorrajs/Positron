/**
 * SchemeValidator.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

function SchemeValidator() {

}

/**
 * Validate a given rule against a route and request.
 *
 * @param  route
 * @param  request
 * @return {bool}
 */
SchemeValidator.prototype.matches = function (route, request) {
    if (route.httpOnly()) {
        return !request.secure;
    } else if (route.secure()) {
        return request.secure;
    }

    return true;
};

module.exports = SchemeValidator;