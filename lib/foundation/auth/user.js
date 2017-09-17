/**
 * user.js
 *
 * @author: Harish Anchu <harishanchu@wimoku.com>
 * @copyright Copyright (c) 2017, Wimoku Pvt Ltd.
 */

var _ = require('lodash');
var authorizable =  require('./access/authorizable');

var user = _.merge({}, authorizable);
Object.defineProperty(user, 'extend', {
    enumerable: false,
    value: _.merge.bind(null, user)
});

module.exports = user;