/**
 * bcryptHasher.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var bcrypt = require('bcryptjs');

exports.make = function (value, callback, rounds) {
    rounds = rounds || 10;
    bcrypt.hash(value, rounds, callback)
};

exports.check = function (value, hash, callback) {
    bcrypt.compare(value, hash, callback);
};