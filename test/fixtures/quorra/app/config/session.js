/**
 * session.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */
var App = require('../../../applicationSingleton');

var config = {
    'driver': 'database',
    'lifetime': 300000, // five minutes
    'expireOnClose': false,
    'files': App.path.storage + '/sessions',
    'connection': 'localDiskDb',
    'table': 'sessions',
    'lottery': [2, 100],
    'cookie': 'quorra_session',
    'path': '/',
    'domain': null,
    'secure': false,
    'httpOnly': true
};

module.exports = config;