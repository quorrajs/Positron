var sinon = require('sinon');
var GateManager = require('../../../../lib/auth/access/GateManager');
var Gate = require('../../../../lib/auth/access/Gate');
var _ = require('lodash');
var path = require('path');


describe('GateManager', function () {
    describe('#constructor', function () {
        it('should return an instance of GateManager when initiated', function (done) {
            var gm = new GateManager();

            gm.should.be.an.instanceOf(GateManager);

            done();
        })
    });

    describe('#has', function () {
        it('should return true if when an ability is defined with the GateManager', function (done) {
            var gm = new GateManager();

            gm.define('update', function () {
            });

            gm.has('update').should.be.true();
            gm.has('delete').should.be.false();

            done();
        })
    });

    describe('#define', function () {
        var isFunctionStub;

        before(function () {
            isFunctionStub = sinon.stub(_, 'isFunction');
        });

        after(function () {
            isFunctionStub.restore();
        });

        it('should call isFunction method of lodash and if it returns true define method should store ability method' +
        ' by key', function (done) {
            var gm = new GateManager();
            var gate = function () {
            };
            var ability = 'update-post';

            isFunctionStub.withArgs(gate).returns(true);

            gm.define(ability, gate);

            isFunctionStub.calledWith(gate).should.be.ok();

            gm.getAbility(ability).should.be.equal(gate);

            done();
        });

        it('should call isFunction method of lodash and if it returns false define method should throw an error and ' +
            'ability should not be stored',
            function (done) {
                var gm = new GateManager();
                var gate = function () {
                };
                var ability = 'update-post';

                isFunctionStub.withArgs(gate).returns(false);

                (function () {
                    gm.define(ability, gate);
                }).should.throw(Error);

                isFunctionStub.calledWith(gate).should.be.ok();

                (function () {
                    gm.getAbility(ability)
                }).should.throw(Error);

                done();
            });
    });

    describe('#policy', function () {
        var isFunctionStub;

        before(function () {
            isFunctionStub = sinon.stub(_, 'isFunction');
        });

        after(function () {
            isFunctionStub.restore();
        });

        it('should call isFunction method of lodash and if it returns true define method should store policy ' +
        'constructor by key', function (done) {
            var gm = new GateManager();
            var policy = path.resolve('test/fixtures/policies/TestPolicy');
            var PolicyConstructor = require(policy);
            var pType = 'Post';

            isFunctionStub.withArgs(PolicyConstructor).returns(true);

            gm.policy(pType, policy);
            isFunctionStub.calledWith(PolicyConstructor).should.be.ok();

            gm.getPolicyFor(pType).should.be.eql(new PolicyConstructor);

            done();
        });

        it('should call isFunction method of lodash and if it returns false define method should throw an error and ' +
            'policy should not be stored',
            function (done) {
                var gm = new GateManager();
                var policy = path.resolve('test/fixtures/policies/TestPolicy');
                var PolicyConstructor = require(policy);
                var pType = 'Post';

                isFunctionStub.withArgs(PolicyConstructor).returns(false);

                (function () {
                    gm.policy(pType, policy);
                }).should.throw(Error);

                isFunctionStub.calledWith(PolicyConstructor).should.be.ok();

                (function () {
                    gm.getPolicyFor(pType)
                }).should.throw(Error);

                done();
            });
    });

    describe('#firstArgumentCorrespondsToPolicy', function () {
        it('should return false if input[0] is not set', function (done) {
            var gm = new GateManager();

            gm.firstArgumentCorrespondsToPolicy([]).should.not.be.ok();

            done();
        });

        it('should return true if policy is registered by passed pType', function (done) {
            var gm = new GateManager();
            var policy = path.resolve('test/fixtures/policies/TestPolicy');
            var pType = 'Post';

            gm.firstArgumentCorrespondsToPolicy([{pType: pType}]).should.be.not.ok();
            gm.policy(pType, policy);
            gm.firstArgumentCorrespondsToPolicy([{pType: pType}]).should.be.ok();

            done();
        });

        it('should return true if there is policy registered by passed data objjects instance types globalId ' +
        'property', function (done) {
            var PostModel = function () {
            };

            var gm = new GateManager({
                models: {
                    Post: {_model: PostModel, globalId: 'Post'}
                }
            });

            var policy = path.resolve('test/fixtures/policies/TestPolicy');
            var pType = 'Post';

            gm.firstArgumentCorrespondsToPolicy(([new PostModel()])).should.be.not.ok();
            gm.policy(pType, policy);
            gm.firstArgumentCorrespondsToPolicy(([new PostModel()])).should.be.ok();
            gm.firstArgumentCorrespondsToPolicy(([new (function () {
            })])).should.be.not.ok();

            done();
        });
    });

    describe('#getAccessGate', function () {
        it('should initialize and return Gate class with a callable and gate manger instance, in which executing the ' +
        'callable should call auth.user method defined on request object', function (done) {
            var gm = new GateManager();
            var userResolverStub = sinon.stub();
            userResolverStub.callsArg(0);

            var gate = gm.getAccessGate({
                auth: {
                    user: userResolverStub
                }
            });

            gate.should.be.an.instanceOf(Gate);
            gate.getGateManager().should.be.equal(gm);
            gate.getUserResolver()(function () {
                userResolverStub.calledOnce.should.be.ok();

                done();
            });
        })
    });



    describe('#getAccessGateForUser', function () {
        it('should return Gate instance with user resolver callback which returns passed user on execution and ' +
        'gatManager instance', function (done) {
            var gm = new GateManager();
            var user = {};
            var gate = gm.getAccessGateForUser(user);

            gate.should.be.an.instanceOf(Gate);
            gate.getGateManager().should.be.equal(gm);
            (gate.getUserResolver())(function (userResp) {
                userResp.should.be.equal(user);

                done();
            });
        });
    });

    describe('#executeBeforeCallbacks', function () {
        it('should call all registered before  callbacks in sequence and finally call the passed callback', function (done) {
            var gm = new GateManager();
            var stub1 = sinon.stub();
            var stub2 = sinon.stub();

            stub1.callsArg(3);
            stub2.callsArg(3);

            gm.before(stub1);
            gm.before(stub2);

            var user = 'user';
            var ability = 'ability';
            var methodArguments = 'methodArguments';

            gm.executeBeforeCallbacks(user, ability, methodArguments, function () {
                stub1.calledWith(user, ability, methodArguments).should.be.ok();
                stub2.calledWith(user, ability, methodArguments).should.be.ok();

                stub1.calledBefore(stub2).should.be.ok();

                done();
            });
        });

        it('should call all registered callbacks in sequence until any of the callbacks return a defined response' +
        'and that reponse should be returned with the final callback', function (done) {
            var gm = new GateManager();
            var stub1 = sinon.stub();
            var stub2 = sinon.stub();
            var stub1Response = 'some response';

            stub1.callsArgWith(3, stub1Response);

            gm.before(stub1);
            gm.before(stub2);

            var user = 'user';
            var ability = 'ability';
            var methodArguments = 'methodArguments';

            gm.executeBeforeCallbacks(user, ability, methodArguments, function (response) {
                stub1.calledWith(user, ability, methodArguments).should.be.ok();
                stub2.calledOnce.should.be.not.ok();
                response.should.be.equal(stub1Response);

                done();
            });
        });
    });

    describe('#executeAfterCallbacks', function () {
        it('should call all registered after callbacks in sequence and finally call the passed callback', function (done) {
            var gm = new GateManager();
            var stub1 = sinon.stub();
            var stub2 = sinon.stub();

            stub1.callsArg(4);
            stub2.callsArg(4);

            gm.after(stub1);
            gm.after(stub2);

            var user = 'user';
            var ability = 'ability';
            var methodArguments = 'methodArguments';
            var authorizationResponse = 'authorizationResponse';

            gm.executeAfterCallbacks(user, ability, methodArguments, authorizationResponse, function () {
                stub1.calledWith(user, ability, authorizationResponse, methodArguments).should.be.ok();
                stub2.calledWith(user, ability, authorizationResponse, methodArguments).should.be.ok();

                stub1.calledBefore(stub2).should.be.ok();

                done();
            });
        });
    });
});
