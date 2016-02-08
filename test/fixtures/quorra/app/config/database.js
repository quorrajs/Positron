
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