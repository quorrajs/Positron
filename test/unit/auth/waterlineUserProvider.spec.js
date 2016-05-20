var WaterlineUserProvider = require('../../../lib/auth/WaterlineUserProvider');
var sinon = require('sinon');

describe('WaterlineUserProvider', function () {
    describe('#constructor', function () {
        it('should return an instance of WaterlineUserProvider when initialized', function (done) {
            (new WaterlineUserProvider()).should.be.an.instanceOf(WaterlineUserProvider);

            done();
        })
    });

    describe('#retrieveByID', function () {
        it('should call findOne method on modal instance with id as argument and return callback with the data ' +
        'returned by the method', function (done) {

            var model = getModel();
            var provider = new WaterlineUserProvider(model);
            var id = 'user123';

            sinon.spy(model, 'findOne');

            provider.retrieveByID(id, function (user) {
                user.should.be.equal('foo');
                model.findOne.calledWith(id).should.be.true();

                done();
            })
        });
    })

    describe('#retrieveByToken', function () {
        it('should call findOne method on modal instance with appropriate where ' +
        'condition and return callback with the data returned by the method', function (done) {

            var model = getModel();
            var provider = new WaterlineUserProvider(model);
            var id = 'user123';
            var token = "mytoken";

            sinon.spy(model, 'findOne');

            provider.retrieveByToken(id, token, function (user) {
                user.should.be.equal('foo');
                model.findOne.calledOnce.should.be.ok();
                model.findOne.getCall(0).args[0].should.be.eql({
                    'id': id,
                    'remember_token': token
                });

                done();
            })
        });
    });

    describe('#retrieveByCredentials', function () {
        it('should call findOne method on modal instance with appropriate where ' +
        'condition and return callback with the data returned by the method', function (done) {

            var model = getModel();
            var provider = new WaterlineUserProvider(model);
            var username = 'user123';
            var password = 'mysecret';

            sinon.spy(model, 'findOne');

            provider.retrieveByCredentials({username: username, password: password}, function (user) {
                user.should.be.equal('foo');
                model.findOne.calledOnce.should.be.ok();
                model.findOne.getCall(0).args[0].should.be.eql({username: username});

                done();
            })
        });
    });

    describe('#validateCredentials', function () {
        it('should call check method on hash instance with with password from both user and credentials object ' +
        'and return callback with the data returned by the method', function (done) {

            var model = getModel();
            var hash = getHasher();
            var provider = new WaterlineUserProvider(model, hash);
            var username = 'user123';
            var password1 = 'mysecret';
            var password2 = 'wrongsecret';

            sinon.spy(hash, 'check');

            provider.validateCredentials({username: username, password: password1},
                {username: username, password: password2}, function (response) {
                    response.should.be.equal('bar');
                    hash.check.calledOnce.should.be.ok();
                    hash.check.getCall(0).args[0].should.be.equal(password2);
                    hash.check.getCall(0).args[1].should.be.equal(password1);

                    done();
                });
        });
    });

    describe('#getAuthIdentifierName', function () {
        it('should return model primaryKey attribute', function (done) {
            var model = getModel();
            var provider = new WaterlineUserProvider(model);

            provider.getAuthIdentifierName().should.be.equal('id');

            done();
        });
    });

    describe('#getRememberTokenName', function () {
        it('should return model data returned by models getRememberTokenName method', function (done) {
            var model = getModel();
            var provider = new WaterlineUserProvider(model);

            provider.getRememberTokenName().should.be.equal('remember_token');

            done();
        });
    });

    describe('#updateRememberToken', function () {
        it('should call update method on model with appropriate arguments', function (done) {
            var model = getModel();
            var provider = new WaterlineUserProvider(model);
            var user = {
                id: '1',
                email: 'clu@example.com',
                token: 'token'
            };
            var updateToken = 'mySecretToken';

            sinon.spy(model, 'update');

            provider.updateRememberToken(user, updateToken, function () {
                model.update.calledOnce.should.be.true();
                model.update.getCall(0).args[0].should.be.equal(user[provider.getAuthIdentifierName()]);
                user.token = updateToken;
                model.update.getCall(0).args[1].should.be.eql(user);
            });

            done();
        });
    });

    function getModel() {
        return {
            primaryKey: 'id',
            findOne: function (condition, callback) {
                callback(null, 'foo');
            },
            update: function (arg1, arg2, callback) {
                callback();
            },
            getRememberTokenName: function () {
                return 'remember_token'
            }
        };
    }

    function getHasher() {
        return {
            check: function (user, credentials, callback) {
                callback(null, 'bar');
            }
        };
    }
});