
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