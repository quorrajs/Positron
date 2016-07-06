var sinon = require('sinon');
var application = require('../../fixtures/applicationSingleton');
var application2 = require('../../fixtures/applicationSingleton');
var Application = require('../../../lib/foundation/Application');
var Router = require('../../../lib/routing/Router');
var Filter = require('../../../lib/routing/Filter');
var ExceptionHandler = require('../../../lib/exception/Handler');
var environmentDetector = require('../../../lib/foundation/environmentDetector');
var ConfigRepository = require('../../../lib/config/Repository');
var ServiceProvider = require('../../../lib/support/ServiceProvider');
var i18n = require('i18n');
var fs = require('fs');
var os = require('os');
var should = require('should');
var async = require('async');

describe('Application', function () {
    var sandbox = sinon.sandbox.create();

    before(function (done) {
        sandbox.stub(environmentDetector);
        sandbox.stub(i18n);

        done()
    });

    after(function (done) {
        sandbox.restore();

        done();
    });

    it('should be a singleton instance of Application constructor', function (done) {
        application.should.be.an.instanceOf(Application);
        application.should.be.equal(application2);
        done();
    });

    describe('#bindInstallPaths', function () {
        var app = new Application();

        app.bindInstallPaths({
            'app': 'app_path',
            'public': 'public_path',
            'base': 'base_path',
            'storage': 'storage_path'
        });

        // load application so that other tests can run
        //application.load(function(){}, 'development');

        it('should set application path property', function (done) {
            app.path.app.should.be.ok();
            app.path.public.should.be.ok();
            app.path.base.should.be.ok();
            app.path.storage.should.be.ok();

            done();
        });
    });

    describe('#before', function () {
        var app = new Application();
        var callback = function () {
        };

        app.router = getRouter();

        app.before(callback);

        it('should register callback with router', function (done) {
            app.router.before.calledWith(callback).should.be.ok();
            done();
        });
    });

    /**
     * @covers #isDownForMaintenance, #handle
     */
    describe('#dispatch', function () {
        var request = {};
        var response = {};

        it('should call trigger "positron.app.down" filter with appropriate arguments when isDownForMaintenance method ' +
        'returns true', function (done) {
            var app = new Application();

            app.filter = getFilter();
            app.router = getRouter();

            sinon.stub(app, 'isDownForMaintenance');

            app.isDownForMaintenance.callsArgWith(0, true);
            app.dispatch(request, response);
            app.filter.callFilter.calledOnce.should.be.ok();
            app.filter.callFilter.calledWith('positron.app.down', request, response).should.be.ok();
            app.filter.callFilter.getCall(0).args[3].should.be.type('function');

            // execute callback argument
            app.filter.callFilter.getCall(0).args[3]();

            app.router.dispatch.calledWith(request, response).should.be.ok();

            done();
        });

        it('should call dispatch method of the router if isDownForMaintenance method returns false', function (done) {
            var app = new Application();

            app.filter = getFilter();
            app.router = getRouter();

            sinon.stub(app, 'isDownForMaintenance');

            app.isDownForMaintenance.callsArgWith(0, false);
            app.dispatch(request, response);

            app.router.dispatch.calledWith(request, response).should.be.ok();

            done();
        });
    });

    describe('#down', function () {
        it('should register callback with filter  class', function (done) {
            var app = new Application();
            var callback = function () {
            };

            app.filter = getFilter();

            app.down(callback);

            app.filter.register.calledWith('positron.app.down', callback).should.be.ok();

            done();
        });
    });

    /**
     * @covers #error
     */
    describe('#missing', function () {
        it('should register error callback with exception handler', function (done) {
            var app = new Application();
            var callback = function () {
            };

            app.exception = getExceptionHandler();

            app.missing(callback);

            app.exception.error.calledOnce.should.be.ok();
            done();
        });
    });

    describe('#detectEnvironment', function () {
        before(function (done) {
            resetEnvironment();

            done();
        });

        it('should assign value returned by environmentDetector.detect to both process.env.NODE_ENV and env property of application class and ' +
            'return the same',
            function (done) {
                var app = new Application();

                environmentDetector.detect.withArgs(123).returns('staging');

                app.detectEnvironment(123).should.be.eql('staging');
                process.env.NODE_ENV.should.be.equal('staging');
                app.env.should.be.equal('staging');

                done();
            }
        );

        after(function (done) {
            resetEnvironment();

            done();
        })

    });

    describe('#environment', function () {
        var app = new Application();

        app.env = 'development';

        it('should return the value of application property env', function (done) {
            app.environment().should.be.eql('development');

            done();
        });

        it('should return whether passed arguments has the value of application property env', function (done) {
            app.environment().should.be.eql('development');
            app.environment('development').should.be.ok();
            app.environment('development', 'production').should.be.ok();
            app.environment('production').should.not.be.ok();

            done();
        });
    });

    describe('#getLocale', function () {
        var app = new Application();
        var locale = 'en';

        app.translator = i18n;

        it('should return value returned by method translator.getLocale',
            function (done) {
                app.translator.getLocale.returns(locale);
                app.getLocale().should.be.equal(locale);

                done();
            });
    });

    describe('#setLocale', function () {
        var app = new Application();
        var locale = 'en';

        app.config = getConfig();
        app.translator = i18n;

        it('should call config.set method and translator.setLocale with appropriate arguments', function (done) {
            app.setLocale(locale);

            app.config.set.calledWith('app.defaultLocale', locale).should.be.ok();
            app.translator.setLocale.calledWith(locale).should.be.ok();

            done();
        });
    });

    describe('#exposeGlobals', function () {
        var resetGlobals = function () {
            delete global['App'];
            delete global['User'];
        };

        var app = new Application();

        app.config = getConfig();
        app.models = {user: {globalId: 'User'}};

        it('should expose some application variables globally based on the globals configuration', function (done) {
            app.config.get.withArgs('globals').returns({App: true, models: true});
            resetGlobals();

            app.exposeGlobals();

            global.App.should.equal(app);
            global.User.should.be.equal(app.models.user);

            app.config.get.withArgs('globals').returns({App: true});
            resetGlobals();

            app.exposeGlobals();

            global.App.should.equal(app);
            should(global.User).be.undefined();

            done();
        });
    });

    describe('#runningTests', function (done) {
        it('should return true if application.env property is set to testing', function (done) {
            var app = new Application();
            app.env = 'testing';

            app.runningTests().should.be.true();

            app.env = 'development';

            app.runningTests().should.be.false();

            done();
        })
    });

    describe('#register', function () {
        it('should return callback with value returned by getRegistered method for passed provider argument if force ' +
            'argument is set to false',
            function (done) {
                var app = new Application();
                var provider = 'MyTestProvider';
                var providerInstance = getServiceProviderInstance();

                sinon.stub(app, 'getRegistered');
                sinon.spy(app, 'resolveProvider');

                app.getRegistered.withArgs(provider).returns(providerInstance);

                app.register(provider, false, function (response) {
                    app.resolveProvider.calledOnce.should.be.false();
                    response.should.be.equal(providerInstance);

                    done();
                })
            });

        it('should resolve provider instance with resolveProvider method and call register method on resolved provider ' +
        'instance when getRegistered method returns falsy value', function (done) {
            var app = new Application();
            var provider = 'MyTestProvider';
            var providerInstance = getServiceProviderInstance();

            sinon.stub(app, 'getRegistered');
            sinon.stub(app, 'resolveProvider');

            app.getRegistered.withArgs(provider).returns(null);
            app.resolveProvider.withArgs(provider).returns(providerInstance);
            providerInstance.register.callsArg(0);

            app.register(provider, false, function () {
                app.resolveProvider.calledWith(provider).should.be.ok();
                providerInstance.register.calledOnce.should.be.ok();

                done();
            })
        });

        it('should execute register method on service provider instance even if getRegistered method returns already ' +
        'loaded provider instance when force argument is true', function (done) {
            var app = new Application();
            var provider = 'MyTestProvider';
            var providerInstance = getServiceProviderInstance();

            sinon.stub(app, 'getRegistered');
            sinon.stub(app, 'resolveProvider');

            app.getRegistered.withArgs(provider).returns(providerInstance);
            app.resolveProvider.withArgs(provider).returns(providerInstance);
            providerInstance.register.callsArg(0);

            app.register(provider, true, function () {
                providerInstance.register.calledOnce.should.be.ok();

                done();
            })
        });

        it('should throw error when resolveProvider returns value which is not an instance of ServiceProvider class',
            function (done) {
                var app = new Application();
                var provider = 'MyTestProvider';
                var providerInstance = sinon.stub({
                    register: function () {
                    }
                });

                sinon.stub(app, 'getRegistered');
                sinon.stub(app, 'resolveProvider');

                app.getRegistered.withArgs(provider).returns(null);
                app.resolveProvider.withArgs(provider).returns(providerInstance);

                (function () {
                    app.register(provider, false, function () {
                    })
                }).should.throw(Error);

                providerInstance.register.calledOnce.should.be.false();

                done();
            });

        it('should call markAsRegistered method with appropriate arguments on execution of callback method passed to ' +
        'service provider register method', function (done) {
            var app = new Application();
            var provider = 'MyTestProvider';
            var providerInstance = getServiceProviderInstance();

            sinon.stub(app, 'getRegistered');
            sinon.stub(app, 'resolveProvider');
            sinon.stub(app, 'markAsRegistered');

            app.getRegistered.withArgs(provider).returns(null);
            app.resolveProvider.withArgs(provider).returns(providerInstance);
            providerInstance.register.callsArg(0);

            app.register(provider, false, function () {
                app.markAsRegistered.calledWith(provider, providerInstance).should.be.ok();
                providerInstance.register.calledOnce.should.be.ok();

                done();
            })
        });

        it('shouldn call boot method on execution of callback method passed to service provider register method if ' +
        'application is already booted', function (done) {
            var app = new Application();
            var provider = 'MyTestProvider';
            var providerInstance = getServiceProviderInstance();

            sinon.stub(app, 'getRegistered');
            sinon.stub(app, 'resolveProvider');
            sinon.stub(app, 'markAsRegistered');

            app.getRegistered.withArgs(provider).returns(null);
            app.resolveProvider.withArgs(provider).returns(providerInstance);
            providerInstance.register.callsArg(0);
            providerInstance.boot.callsArg(0);
            app.__booted = false;

            app.register(provider, false, function () {
                providerInstance.boot.calledOnce.should.be.false();

                app.__booted = true;
                app.register(provider, false, function () {
                    providerInstance.boot.calledOnce.should.be.ok();

                    done();
                })
            })
        })
    });

    describe('#boot', function () {
        it('should execute boot methods on all loaded service providers and finally execute __bootApplication method',
            function (done) {
                var app = new Application();
                var providerInstance1 = getServiceProviderInstance();
                var providerInstance2 = getServiceProviderInstance();

                sinon.spy(app, '__bootApplication');
                providerInstance1.boot.callsArg(0);
                providerInstance2.boot.callsArg(0);

                app.__loadedProviders = {'p1': providerInstance1, 'p2': providerInstance2};

                app.boot(function () {
                    providerInstance1.boot.calledOnce.should.be.ok();
                    providerInstance2.boot.calledOnce.should.be.ok();
                    app.__bootApplication.calledOnce.should.be.ok();

                    done()
                });
            });

        it('should execute __bootApplication method directly when there are no service providers loaded',
            function (done) {
                var app = new Application();

                sinon.spy(app, '__bootApplication');

                app.boot(function () {
                    app.__bootApplication.calledOnce.should.be.ok();

                    done()
                });
            });
    });

    describe('#__bootApplication', function () {
        it('should execute __fireAppCallbacks with booting  callbacks and set application state to booted and ' +
            'execute __fireAppCallbacks with booted callbacks',
            function (done) {
                var app = new Application();

                sinon.spy(app, '__fireAppCallbacks');

                app.isBooted().should.be.false();

                app.boot(function () {
                    app.__fireAppCallbacks.getCall(0).args[0].should.equal(app.__bootingCallbacks);
                    app.__fireAppCallbacks.getCall(1).args[0].should.equal(app.__bootedCallbacks);
                    app.isBooted().should.be.true();

                    done()
                })
            });
    });

    describe('#__fireAppCallbacks', function () {
        var sandbox = sinon.sandbox.create();

        before(function (done) {
            sandbox.stub(async, 'parallel');

            done();
        });

        after(function (done) {
            sandbox.restore();

            done();
        });

        it('should call async.parallel with appropriate arguments',
            function (done) {
                var app = new Application();
                var callbacks = [];

                async.parallel.callsArg(1);

                app.__fireAppCallbacks(callbacks, function () {
                    async.parallel.getCall(0).args[0].should.equal(callbacks);
                    done();
                });
            });

        it('should throw error if callback is returned with error',
            function (done) {
                var app = new Application();
                var callbacks = [];

                async.parallel.callsArgWith(1, new Error('error'));

                (function () {
                    app.__fireAppCallbacks(callbacks, function () {
                    });
                }).should.throw();

                done();
            })
    });

    function resetEnvironment() {
        delete process.env.NODE_ENV;
    }

    function getConfig() {
        return sinon.createStubInstance(ConfigRepository);
    }

    function getRouter() {
        return sinon.createStubInstance(Router);
    }

    function getFilter() {
        return sinon.createStubInstance(Filter);
    }

    function getExceptionHandler() {
        return sinon.createStubInstance(ExceptionHandler)
    }

    function getServiceProviderInstance() {
        return sinon.createStubInstance(ServiceProvider);
    }
});