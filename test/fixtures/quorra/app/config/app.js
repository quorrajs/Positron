
var config = {

    'debug': true,
    'url': 'http://localhost:3000',
    'timezone': 'UTC',
    'locale': 'en',
    'key': '3duyXY4Yzd586UlJ21kzYuqaIQiKiVIH',
    'trustProxy': false,
    'providers': [
        'positron/exception/ExceptionServiceProvider',
        'positron/log/LogServiceProvider',
        'positron/database/ModelServiceProvider',
        'positron/auth/AuthServiceProvider',
        'positron/routing/RoutingServiceProvider',
        'positron/routing/ControllerServiceProvider',
        'positron/view/ViewServiceProvider',
        'positron/encryption/EncryptionServiceProvider',
        'positron/session/SessionServiceProvider',
        'positron/translation/TranslationServiceProvider',
        'positron/mail/MailServiceProvider',
        'positron/hashing/HashServiceProvider'
    ]
};

module.exports = config;