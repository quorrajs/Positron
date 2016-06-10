require('../lib/support/helpers');

before(function (done) {
    var application = require('./fixtures/applicationSingleton');

    application.bindInstallPaths({
        'app': __dirname + '/fixtures/quorra/app',
        'public': __dirname + '/fixtures/quorra/public',
        'base' : __dirname + '/fixtures/quorra/',
        'storage' : __dirname + '/fixtures/quorra/app/storage'
    });
    application.load(function(){}, 'development');

    done();
});