/**
 * view.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var engines = require('consolidate');
var path = require('path');

var config = {
    'paths': [
        path.resolve(__dirname, '../../resources/views')
    ],
    'cache': false,
    'defaultEngine': 'jade',
    'engines': {
        'jade': engines.jade
    }
};

module.exports = config;