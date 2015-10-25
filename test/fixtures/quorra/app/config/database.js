/**
 * database.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */


var config = {
    'connections': {
        'localDiskDb': {
            'adapter': 'sails-disk'
        }
    },
    'model': {
        'connection': 'localDiskDb',
        'migrate': 'alter'
    }
};

module.exports = config;