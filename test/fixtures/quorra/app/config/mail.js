
var config = {
    'driver': 'nodemailer-smtp-transport',
    'driverConfig': {
        'service': 'gmail',
        'auth': {
            'user': 'sender@gmail.com',
            'pass': 'password'
        }
    },
    'from': {'address': null, 'name': null}
};

module.exports = config;