var ProviderRepository = require('../../../lib/foundation/ProviderRepository');
var sinon = require('sinon');

describe('ProviderRepository', function () {
    describe('#constructor', function () {
        it('should return and instance of ProviderRepository when initialized', function (done) {
            var providerRepository = new ProviderRepository();

            providerRepository.should.be.an.instanceOf(ProviderRepository);

            done();
        });
    });

    describe('#load', function () {
        it('should call register method on app for each provider and return callback when all app.register call ' +
        'completes its execution', function (done) {
            var app = sinon.stub({
                register: function () {
                }
            });
            var providerRepository = new ProviderRepository(app);
            var provider1 = 'p1';
            var provider2 = 'p2';

            app.register.callsArg(2);

            providerRepository.load([provider1, provider2], function () {
                app.register.calledWith(provider1, false).should.be.true();
                app.register.calledWith(provider2, false).should.be.true();

                done();
            })
        });

        it('should return callback method if providers array is empty', function (done) {
            var providerRepository = new ProviderRepository();

            providerRepository.load([], function () {
                done();
            })
        });
    })
});