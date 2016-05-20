var sinon = require('sinon');
var Guard = require('../../../lib/auth/Guard');
var Provider = require('../../../lib/auth/WaterlineUserProvider');
var Session = require('../../../node_modules/node-session/lib/store/Store.js');
var should = require('should');


describe('Guard', function () {
    describe('#constructor', function () {
        it('should return and instance of Guard when initialized', function () {
            (new Guard()).should.be.an.instanceOf(Guard);
        });
    });

    describe('#user', function () {
        it('should return callback with user when user is already set', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();
            var guard = new Guard(provider, session, config);
            var user = {
                id: '1',
                name: 'tron'
            };

            guard.setUser(user);
            guard.user(function (user) {
                user.should.be.eql(user);

                done();
            });
        });

        it('should retrieve auth identifier from session and get user from provider if user is not set',
            function (done) {
                var provider = getProvider();
                var session = getSession();
                var config = getConfig();
                var request = getRequest();

                var guard = new Guard(provider, session, config, request);
                var userId = '1';
                var user = {
                    id: userId,
                    name: 'tron'
                };

                session.get.withArgs(config.sessionAuthIdentifier).returns(userId);
                provider.retrieveByID.withArgs(userId).callsArgWith(1, user);

                guard.user(function (response) {
                    response.should.be.eql(user);
                    session.get.calledWith(config.sessionAuthIdentifier).should.be.ok();
                    provider.retrieveByID.calledWith(userId).should.be.ok();

                    done();
                });
            });

        it('should return nothing if auth identifier is not in session and recaller is not set',
            function (done) {
                var provider = getProvider();
                var session = getSession();
                var config = getConfig();
                var request = getRequest();

                var guard = new Guard(provider, session, config, request);

                session.get.withArgs(config.sessionAuthIdentifier).returns();

                guard.user(function (response) {
                    should(response).be.undefined();
                    session.get.calledOnce.should.be.ok();
                    provider.retrieveByID.notCalled.should.be.ok();
                    provider.retrieveByToken.notCalled.should.be.ok();

                    done();
                });
            });

        it('should retrieve user using recaller if user with id doesn\'t exist', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();
            var recallerTokenValue = '123|456';
            var request = getRequest();
            request.signedCookies[config.rememberMeCookieIdentifier] = recallerTokenValue;

            var guard = new Guard(provider, session, config, request);
            var userId = '1';
            var user = {
                id: userId,
                name: 'tron'
            };

            session.get.withArgs(config.sessionAuthIdentifier).returns(userId);
            provider.retrieveByID.withArgs(userId).callsArg(1);
            provider.retrieveByToken.withArgs(
                recallerTokenValue.split('|')[0],
                recallerTokenValue.split('|')[1]).callsArgWith(2, user);

            guard.user(function (response) {
                response.should.be.eql(user);
                session.get.calledWith(config.sessionAuthIdentifier).should.be.ok();
                provider.retrieveByID.calledWith(userId).should.be.ok();
                provider.retrieveByToken.calledWith(
                    recallerTokenValue.split('|')[0],
                    recallerTokenValue.split('|')[1]
                ).should.be.ok();

                done();
            });
        });

        it('should return nothing if recaller is not valid', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();
            var recallerTokenValue = '123|';
            var request = getRequest();
            request.signedCookies[config.rememberMeCookieIdentifier] = recallerTokenValue;

            var guard = new Guard(provider, session, config, request);
            var userId = '1';

            session.get.withArgs(config.sessionAuthIdentifier).returns(userId);
            provider.retrieveByID.withArgs(userId).callsArg(1);

            guard.user(function (response) {
                should(response).be.undefined();
                session.get.calledWith(config.sessionAuthIdentifier).should.be.ok();
                provider.retrieveByID.calledWith(userId).should.be.ok();
                provider.retrieveByToken.notCalled.should.be.ok();

                done();
            });
        });

        it('should return nothing if there is no matching record for recller in db', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();
            var recallerTokenValue = '123|456';
            var request = getRequest();
            request.signedCookies[config.rememberMeCookieIdentifier] = recallerTokenValue;

            var guard = new Guard(provider, session, config, request);
            var userId = '1';

            session.get.withArgs(config.sessionAuthIdentifier).returns(userId);
            provider.retrieveByID.withArgs(userId).callsArg(1);
            provider.retrieveByToken.withArgs(
                recallerTokenValue.split('|')[0],
                recallerTokenValue.split('|')[1]).callsArgWith(2);

            guard.user(function (response) {
                should(response).be.undefined();
                session.get.calledWith(config.sessionAuthIdentifier).should.be.ok();
                provider.retrieveByID.calledWith(userId).should.be.ok();
                provider.retrieveByToken.calledWith(
                    recallerTokenValue.split('|')[0],
                    recallerTokenValue.split('|')[1]
                ).should.be.ok();

                done();
            });
        });

    });

    describe('#getName', function () {
        it('should return session auth identifier set in the configuration', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();

            var guard = new Guard(provider, session, config);

            guard.getName().should.be.equal(config.sessionAuthIdentifier);

            done();
        });
    });

    describe('#getRecallerName', function () {
        it('should return recaller cookie identifier set in the configuration', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();

            var guard = new Guard(provider, session, config);

            guard.getRecallerName().should.be.equal(config.rememberMeCookieIdentifier);

            done();
        });
    });

    describe('#check', function () {
        it('should return callback with false if user is not authenticated', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'user');
            guard.user.onCall(0).callsArg(0);

            guard.check(function (response) {
                response.should.be.false();

                done();
            });
        });

        it('should return callback with true if user is authenticated', function (done) {
            var provider = getProvider();
            var session = getSession();
            var config = getConfig();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'user');
            guard.user.onCall(0).callsArgWith(0, {id: '1', username: 'ron'});

            guard.check(function (response) {
                response.should.be.true();

                done();
            });
        });
    });

    describe('guest', function () {

        var provider = getProvider();
        var session = getSession();
        var config = getConfig();
        var guard = new Guard(provider, session, config);

        sinon.stub(guard, 'user');

        it('should return callback with false if user is not a guest', function (done) {
            guard.user.onCall(0).callsArgWith(0, {id: '1', username: 'tron'});

            guard.guest(function (response) {
                response.should.be.false();

                done();
            });
        });

        it('should return callback with true if user is a guest', function (done) {
            guard.user.onCall(1).callsArg(0);

            guard.guest(function (response) {
                response.should.be.true();

                done();
            });
        });
    });

    describe('#setUser', function () {
        var provider = getProvider();
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron'};

        it('should set a user as the current application user', function (done) {
            var guard = new Guard(provider, session, config);
            guard.setUser(user);

            guard.user(function (user) {
                user.should.be.eql(user);

                done();
            })
        })
    });

    describe('#getUser', function () {
        var provider = getProvider();
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron'};

        it('should return the currently cached user of the application', function (done) {
            var guard = new Guard(provider, session, config);

            should(guard.getUser()).be.undefined();
            guard.setUser(user);
            guard.getUser().should.be.eql(user);

            done();
        })
    });

    describe('#login', function () {
        var provider = getProvider();
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron'};
        var modelAuthIdentifierName = 'id';
        var modelRememberTokenName = 'remember_token';

        provider.getAuthIdentifierName.returns(modelAuthIdentifierName);

        it('should throw an error if user identifier is not set in the passed user argument', function (done) {
            var guard = new Guard(provider, session, config);

            (function () {
                guard.login({userName: 'tron'}, function () {
                });
            }).should.throw('Invalid auth identifier');

            done();
        });

        it('should update session with user identifier and set current user', function (done) {
            var guard = new Guard(provider, session, config);

            guard.login(user, function () {
                session.put.calledWith(config.sessionAuthIdentifier, user[modelAuthIdentifierName]).should.be.true();

                done()
            });
        });

        it('should call updateRememberToken method of provider if remember option is set and remember ' +
        'token is not already set with the user argument', function (done) {
            var request = getRequest();
            var response = getResponse();
            var provider = getProvider();

            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.updateRememberToken.callsArg(2);
            provider.getRememberTokenName.returns(modelRememberTokenName);

            var guard = new Guard(provider, session, config, request, response);

            guard.login(user, function () {
                provider.updateRememberToken.calledOnce.should.be.true();
                provider.updateRememberToken.getCall(0).args[0].id.should.be.equal(user.id);
                provider.updateRememberToken.getCall(0).args[0].username.should.be.equal(user.username);
                provider.updateRememberToken.getCall(0).args[1].should.be.ok();

                done()
            }, true);
        });

        it('shouldn\'t call updateRememberToken method of provider if remember option is set and remember ' +
        'token is already set with the user argument', function (done) {
            var request = getRequest();
            var response = getResponse();
            var provider = getProvider();
            var user = {id: '1', username: 'tron'};

            user[modelRememberTokenName] = 'token';

            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.getRememberTokenName.returns(modelRememberTokenName);

            var guard = new Guard(provider, session, config, request, response);

            guard.login(user, function () {
                provider.updateRememberToken.notCalled.should.be.true();

                done();
            }, true);
        });

        it('should set remember cookie when remember option is set to true', function (done) {
            var request = getRequest();
            var response = getResponse();
            var provider = getProvider();
            var user = {id: '1', username: 'tron'};

            user[modelRememberTokenName] = 'token';
            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.getRememberTokenName.returns(modelRememberTokenName);

            sinon.stub(response, 'cookie');

            var guard = new Guard(provider, session, config, request, response);

            guard.login(user, function () {
                response.cookie.calledWith(config.rememberMeCookieIdentifier,
                    user[modelAuthIdentifierName] + '|' + user[modelRememberTokenName]).should.be.true();

                done();
            }, true);
        });
    });

    describe('#attempt', function () {
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron', password: 'secret'};
        var credentials = {username: 'tron', password: 'secret'};
        var modelAuthIdentifierName = 'id';

        it('should retrieve user by credentials and return callback with true if credentials are valid', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.retrieveByCredentials.callsArgWith(1, user);
            provider.validateCredentials.callsArgWith(2, true);

            guard.attempt(credentials, function (response) {
                provider.retrieveByCredentials.calledWith(credentials).should.be.ok();
                provider.validateCredentials.calledWith(user, credentials).should.be.ok();
                response.should.be.true();

                done();
            })
        });

        it('should fail when user don\'t exist', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.retrieveByCredentials.callsArg(1);

            guard.attempt(credentials, function (response) {
                provider.retrieveByCredentials.calledWith(credentials).should.be.ok();
                response.should.be.false();

                done();
            })
        });

        it('should fail when password validation fails', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.retrieveByCredentials.callsArgWith(1, user);
            provider.validateCredentials.callsArgWith(2, false);

            guard.attempt(credentials, function (response) {
                provider.retrieveByCredentials.calledWith(credentials).should.be.ok();
                provider.validateCredentials.calledWith(user, credentials).should.be.ok();
                response.should.be.false();

                done();
            })
        });

        it('should login after attempt if login argument is set to true', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'login');
            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.retrieveByCredentials.callsArgWith(1, user);
            provider.validateCredentials.callsArgWith(2, true);
            guard.login.callsArg(1);

            guard.attempt(credentials, function (response) {
                provider.retrieveByCredentials.calledWith(credentials).should.be.ok();
                provider.validateCredentials.calledWith(user, credentials).should.be.ok();
                response.should.be.true();
                guard.login.calledOnce.should.be.ok();
                guard.login.getCall(0).args[0].should.equal(user);
                should(guard.login.getCall(0).args[2]).not.be.ok();

                done();
            }, false, true)
        });

        it('should login and set recaller after attempt if login and remember arguments are set to true', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'login');
            provider.getAuthIdentifierName.returns(modelAuthIdentifierName);
            provider.retrieveByCredentials.callsArgWith(1, user);
            provider.validateCredentials.callsArgWith(2, true);
            guard.login.callsArg(1);

            guard.attempt(credentials, function (response) {
                provider.retrieveByCredentials.calledWith(credentials).should.be.ok();
                provider.validateCredentials.calledWith(user, credentials).should.be.ok();
                response.should.be.true();
                guard.login.calledOnce.should.be.ok();
                guard.login.getCall(0).args[0].should.equal(user);
                guard.login.getCall(0).args[2].should.be.true();

                done();
            }, true, true)
        });
    });

    describe('#id', function () {
        it('should return currently authenticated users id by retrieving it from session when user is authenticated',
            function (done) {
                var session = getSession();
                var config = getConfig();
                var user = {id: '1', username: 'tron'};
                var provider = getProvider();
                var guard = new Guard(provider, session, config);

                should(guard.id()).be.undefined();
                session.get.withArgs(config.sessionAuthIdentifier).returns(user.id);
                guard.id().should.be.equal(user.id);

                done();
            });
    });

    describe('#validate', function () {
        it('should call attempt method with appropriate arguments', function (done) {
            var session = getSession();
            var config = getConfig();
            var credentials = {id: '1', username: 'tron'};
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'attempt').callsArgWith(1, true);

            guard.validate(credentials, function () {
                guard.attempt.calledOnce.should.be.ok();
                guard.attempt.getCall(0).args[0].should.be.equal(credentials);
                guard.attempt.getCall(0).args[2].should.be.false();
                guard.attempt.getCall(0).args[3].should.be.false();

                done();
            });
        })
    });

    describe('#once', function () {
        var session = getSession();
        var config = getConfig();
        var credentials = {id: '1', username: 'tron'};

        it('should call setUser with when validation is success and return callback with success', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'validate');
            guard.validate.withArgs(credentials).callsArgWith(1, true);

            sinon.spy(guard, 'setUser');

            guard.once(credentials, function (response) {
                guard.setUser.calledOnce.should.be.ok();
                response.should.be.true();

                done();
            });
        });

        it('should return callback with false when validation fails', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'validate');
            guard.validate.withArgs(credentials).callsArgWith(1, false);

            sinon.spy(guard, 'setUser');

            guard.once(credentials, function (response) {
                guard.setUser.calledOnce.should.be.false();
                response.should.be.false();

                done();
            });
        });
    });

    describe('#loginUsingId', function () {
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron'};

        it('should call login function by retrieving user by id from provider', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'login');
            provider.retrieveByID.withArgs(user.id).callsArgWith(1, user);
            guard.login.withArgs(user).callsArgWith(1, user);

            guard.loginUsingId(user.id, function () {
                arguments[0].should.be.eql(user);
                provider.retrieveByID.calledWith(user.id).should.be.ok();
                guard.login.calledWith(user).should.be.ok();
                done();
            }, true);
        });
    });

    describe('#onceUsingId', function () {
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron'};

        it('should call setUser function by retrieving user by id from provider', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'setUser');
            provider.retrieveByID.withArgs(user.id).callsArgWith(1, user);

            guard.onceUsingId(user.id, function () {
                arguments[0].should.be.eql(user);
                provider.retrieveByID.calledWith(user.id).should.be.ok();
                guard.setUser.calledWith(user).should.be.ok();
                done();
            }, true);
        });
    });

    describe('#basic', function () {
        var session = getSession();
        var config = getConfig();

        it('should return callback with true if check method returns true', function (done) {
            var provider = getProvider();
            var guard = new Guard(provider, session, config);

            sinon.stub(guard, 'check');
            guard.check.callsArgWith(0, true);

            guard.basic(function () {
                arguments[0].should.be.true();
                done();
            });
        });

        it('should return callback with false if check method returns false and ' +
        'credentials are not set on request headers', function (done) {
            var provider = getProvider();
            var request = getRequest();
            var guard = new Guard(provider, session, config, request);

            sinon.stub(guard, 'check');
            guard.check.callsArgWith(0, false);

            guard.basic(function () {
                arguments[0].should.be.false();
                done();
            });
        });

        it('should return callback with response from attempt method if check method ' +
        'returns false and credentials are set on request headers', function (done) {
            var responseFromAttempt = 'Response from attempt';
            var provider = getProvider();
            var request = getRequest();
            request.headers.authorization = "Basic dXNlcjpwYXNz";
            var guard = new Guard(provider, session, config, request);

            sinon.stub(guard, 'check');
            sinon.stub(guard, 'attempt');
            guard.check.callsArgWith(0, false);
            guard.attempt.callsArgWith(1, responseFromAttempt);

            guard.basic(function () {
                guard.attempt.calledOnce.should.be.true();
                guard.attempt.getCall(0).args[0].should.be.eql({email: 'user', password: 'pass'});
                arguments[0].should.be.equal(responseFromAttempt);
                done();
            });
        });

        it('should set passed field name as the auth identifier key name in the credentials object ' +
        'when passed to attempt method', function (done) {
            var responseFromAttempt = 'Response from attempt';
            var provider = getProvider();
            var request = getRequest();
            request.headers.authorization = "Basic dXNlcjpwYXNz";
            var guard = new Guard(provider, session, config, request);

            sinon.stub(guard, 'check');
            sinon.stub(guard, 'attempt');
            guard.check.callsArgWith(0, false);
            guard.attempt.callsArgWith(1, responseFromAttempt);

            guard.basic(function () {
                guard.attempt.getCall(0).args[0].should.be.eql({mayAuthIdentifier: 'user', password: 'pass'});
                arguments[0].should.be.equal(responseFromAttempt);
                done();
            }, 'mayAuthIdentifier');
        });
    });

    describe('#onceBasic', function () {
        var session = getSession();
        var config = getConfig();

        it('should return callback with false if credentials are not set on request headers', function (done) {
            var provider = getProvider();
            var request = getRequest();
            var guard = new Guard(provider, session, config, request);

            guard.onceBasic(function () {
                arguments[0].should.be.false();
                done();
            });
        });

        it('should return callback with response from attempt method if credentials are set on ' +
        'request headers', function (done) {
            var responseFromOnce = 'Response from once';
            var provider = getProvider();
            var request = getRequest();
            request.headers.authorization = "Basic dXNlcjpwYXNz";
            var guard = new Guard(provider, session, config, request);

            sinon.stub(guard, 'once');
            guard.once.callsArgWith(1, responseFromOnce);

            guard.onceBasic(function () {
                guard.once.calledOnce.should.be.true();
                guard.once.getCall(0).args[0].should.be.eql({email: 'user', password: 'pass'});
                arguments[0].should.be.equal(responseFromOnce);
                done();
            });
        });

        it('should set passed field name as the auth identifier key name in the credentials object ' +
        'when passed to once method', function (done) {
            var responseFromOnce = 'Response from once';
            var provider = getProvider();
            var request = getRequest();
            request.headers.authorization = "Basic dXNlcjpwYXNz";
            var guard = new Guard(provider, session, config, request);

            sinon.stub(guard, 'once');
            guard.once.callsArgWith(1, responseFromOnce);

            guard.onceBasic(function () {
                guard.once.getCall(0).args[0].should.be.eql({mayAuthIdentifier: 'user', password: 'pass'});
                done();
            }, 'mayAuthIdentifier');
        });
    });

    describe('#logout', function () {
        var session = getSession();
        var config = getConfig();
        var user = {id: '1', username: 'tron'};

        it('should remove user from session and clear recaller cookie if user is set', function (done) {
            var provider = getProvider();
            var request = getRequest();
            var response = getResponse();
            var guard = new Guard(provider, session, config, request, response);

            sinon.stub(guard, 'user');
            sinon.stub(response, 'clearCookie');
            guard.user.callsArg(0);

            guard.logout(function () {
                session.forget.calledWith(guard.getName()).should.be.true();
                response.clearCookie.calledWith(guard.getRecallerName()).should.be.true();

                done();
            })
        });

        it('should unset user from guard', function (done) {
            var provider = getProvider();
            var request = getRequest();
            var response = getResponse();
            var guard = new Guard(provider, session, config, request, response);

            sinon.stub(guard, 'user');
            sinon.stub(response, 'clearCookie');
            guard.user.callsArg(0);

            guard.logout(function () {
                should(guard.getUser()).be.undefined();
                done();
            })
        });

        it('should call provider.updateRememberToken method if a user is presently logged in', function (done) {
            var provider = getProvider();
            var request = getRequest();
            var response = getResponse();
            var guard = new Guard(provider, session, config, request, response);

            sinon.stub(guard, 'user');
            guard.user.callsArgWith(0, user);
            provider.updateRememberToken.withArgs(user).callsArg(2);

            guard.logout(function () {
                provider.updateRememberToken.calledWith(user).should.be.true();
                done();
            })
        });
    });

    function getProvider() {
        return sinon.createStubInstance(Provider);
    }

    function getSession() {
        return sinon.createStubInstance(Session);
    }

    function getConfig() {
        return {
            sessionAuthIdentifier: 'login',
            rememberMeCookieIdentifier: 'remember'
        };
    }

    function getRequest() {
        return {
            signedCookies: {},
            headers: {}
        };
    }

    function getResponse() {
        return {
            cookie: function () {

            },
            clearCookie: function () {

            }
        };
    }
});