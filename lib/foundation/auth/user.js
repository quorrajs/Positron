/**
 * user.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2017, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');
var authorizable =  require('./access/authorizable');

var user = _.merge({}, authorizable);
Object.defineProperty(user, 'extend', {
    enumerable: false,
    value: _.merge.bind(null, user)
});

module.exports = user;