var sinon = require('sinon');
var should = require('should');
var Gate = require('../../../../lib/auth/access/Gate');
var GateManager = require('../../../../lib/auth/access/GateManager');

describe('Gate', function () {
    describe('#constructor', function () {
        it('should return an instance of Gate when initiated', function (done) {
            var gate = new Gate();

            gate.should.be.an.instanceOf(Gate);

            done();
        });
    });

    describe('#allows', function () {
        it('should call method #check with proper arguments', function (done) {
            var ability = 'ability';
            var methodArguments = 'methodArguments';
            var callback = 'callback';
            var gate = new Gate();
            var stub = sinon.stub(gate, 'check');

            gate.allows(ability, methodArguments, callback);
            stub.calledWithExactly(ability, methodArguments, callback).should.be.ok();

            done();
        });
    });

    describe('#denies', function () {
        it('should call method #allow and return callback with negation of response returned by method #allow',
            function (done) {
                var ability = 'ability';
                var methodArguments = 'methodArguments';
                var gate = new Gate();
                var stub = sinon.stub(gate, 'allows');
                var response = false;
                var callback = function (res) {
                    should(res).be.equal(!response);

                    done();
                };

                stub.withArgs(ability, methodArguments).callsArgWith(2, response);
                gate.denies(ability, methodArguments, callback);
            });
    });

    describe('#check', function () {
        it('should return callback with false response if user resolver returns false', function (done) {
            var userResolverStub = sinon.stub();
            var gate = new Gate(userResolverStub);
            var ability = 'ability';
            var methodArguments = 'methodArguments';

            userResolverStub.callsArgWith(0, false);
            gate.check(ability, methodArguments, function (response) {
                response.should.be.false();
                done();
            })
        });

        it('should return callback with appropriate boolean response by calling gatemanagers executeBeforeCallbacks and' +
            ' executeAfterCallbacks methods with proper arguments if user resolver returns truthy value and ' +
            'executeBeforeCallbacks method returns non null value; no other methods on gatemanager should be called',
            function (done) {
                var userResolverStub = sinon.stub();
                var gmStub = sinon.stub({
                    executeBeforeCallbacks: function () {
                    },
                    executeAfterCallbacks: function () {
                    }
                });
                var gate = new Gate(userResolverStub, gmStub);
                var user = 'user';
                var ability = 'ability';
                var methodArguments = parseArray('methodArguments');
                var beforeCallbackResponse = true;
                var checkCB = sinon.stub();

                userResolverStub.callsArgWith(0, user);
                gmStub.executeBeforeCallbacks.withArgs(user, ability, methodArguments).callsArgWith(3, beforeCallbackResponse);
                gmStub.executeAfterCallbacks.withArgs(user, ability, methodArguments, beforeCallbackResponse)
                    .callsArgWith(4, beforeCallbackResponse);
                gate.check(ability, methodArguments, checkCB);
                userResolverStub.calledOnce.should.be.true();
                checkCB.calledWith(beforeCallbackResponse).should.be.ok();

                beforeCallbackResponse = false;

                gmStub.executeBeforeCallbacks.withArgs(user, ability, methodArguments).callsArgWith(3, beforeCallbackResponse);
                gmStub.executeAfterCallbacks.withArgs(user, ability, methodArguments, beforeCallbackResponse)
                    .callsArgWith(4, beforeCallbackResponse);
                gate.check(ability, methodArguments, checkCB);
                userResolverStub.calledTwice.should.be.true();
                checkCB.calledWith(beforeCallbackResponse).should.be.ok();
                done();
            });

        it('should call gm.executeBeforeCallbacks, gate.executeAuthorizationCallback and gm.executeAfterCallbacks in sequence ' +
        'and return boolean response based on the response from gate.executeAuthorizationCallback if user resolver returns ' +
        'truthy response and gm.executeBeforeCallbacks return undefined or null response', function (done) {
            var userResolverStub = sinon.stub();
            var gmStub = sinon.stub({
                executeBeforeCallbacks: function () {
                },
                executeAfterCallbacks: function () {
                },
            });
            var gate = new Gate(userResolverStub, gmStub);
            var executeAuthorizationCallbackStub = sinon.stub(gate, 'executeAuthorizationCallback');
            var user = 'user';
            var ability = 'ability';
            var methodArguments = parseArray('methodArguments');
            var authorizeCallbackResponse = true;
            var checkCB = sinon.stub();

            userResolverStub.callsArgWith(0, user);
            gmStub.executeBeforeCallbacks.withArgs(user, ability, methodArguments).callsArgWith(3);
            executeAuthorizationCallbackStub.withArgs(user, ability, methodArguments).callsArgWith(3, authorizeCallbackResponse);
            gmStub.executeAfterCallbacks.withArgs(user, ability, methodArguments, authorizeCallbackResponse)
                .callsArgWith(4, authorizeCallbackResponse);
            gate.check(ability, methodArguments, checkCB);
            userResolverStub.calledOnce.should.be.true();
            checkCB.calledWith(authorizeCallbackResponse).should.be.ok();
            gmStub.executeBeforeCallbacks.calledBefore(executeAuthorizationCallbackStub).should.be.ok();
            executeAuthorizationCallbackStub.calledBefore(gmStub.executeAfterCallbacks).should.be.ok();

            done();
        });
    });

    describe('#forUser', function () {
        it('should return Gate instance with user resolver callback which returns passed user on execution and ' +
        'gatManager instance registered on current Gate instance', function (done) {
            var gm = {};
            var gate = new Gate('resolver', gm);
            var user = {};

            var newGate = gate.forUser(user);

            newGate.should.be.an.instanceOf(Gate);
            newGate.getGateManager().should.be.equal(gm);
            (newGate.getUserResolver())().should.be.equal(user);

            done();
        })
    });

    describe('#executeAuthorizationCallback', function () {
        describe('When gm.firstArgumentCorrespondsToPolicy returns true', function () {
            it('should call methods gm.getPolicyFor, policy instance.before but not ability callback defined on ' +
                'policy when policy instance.before callback returns a response other than null and undefined',
                function (done) {
                    var gm = {
                        firstArgumentCorrespondsToPolicy: sinon.stub(),
                        getPolicyFor: sinon.stub()
                    };
                    var gate = new Gate('resolver', gm);
                    var user = 'user';
                    var ability = 'ability';
                    var methodArguments = ['methodArguments'];
                    var policyInstance = {
                        before: sinon.stub()
                    };
                    var beforeCbResponse = 'beforeResp';

                    policyInstance[ability] = sinon.stub();

                    gm.firstArgumentCorrespondsToPolicy.withArgs(methodArguments).returns(true);
                    gm.getPolicyFor.withArgs(methodArguments[0]).returns(policyInstance);
                    policyInstance.before.withArgs(user, ability, methodArguments).callsArgWith(3, beforeCbResponse);

                    gate.executeAuthorizationCallback(user, ability, methodArguments, function (resp) {
                        gm.getPolicyFor.calledOnce.should.be.ok();
                        policyInstance.before.calledOnce.should.be.ok();
                        resp.should.be.equal(beforeCbResponse);
                        policyInstance[ability].calledOnce.should.be.false();
                        done();
                    });
                });

            it('should call methods gm.getPolicyFor, policy instance.before and ability callback defined on policy ' +
                'when policy instance.before callback returns a null or undefined response',
                function (done) {
                    var gm = {
                        firstArgumentCorrespondsToPolicy: sinon.stub(),
                        getPolicyFor: sinon.stub()
                    };
                    var gate = new Gate('resolver', gm);
                    var user = 'user';
                    var ability = 'ability';
                    var methodArguments = ['methodArguments'];
                    var policyInstance = {
                        before: sinon.stub()
                    };
                    var abilityCBResp = 'abilityCBResp';

                    policyInstance[ability] = sinon.stub();

                    gm.firstArgumentCorrespondsToPolicy.withArgs(methodArguments).returns(true);
                    gm.getPolicyFor.withArgs(methodArguments[0]).returns(policyInstance);
                    policyInstance.before.withArgs(user, ability, methodArguments).callsArgWith(3, null);
                    policyInstance[ability].withArgs(user, methodArguments[0]).callsArgWith(2, abilityCBResp);

                    gate.executeAuthorizationCallback(user, ability, methodArguments, function (resp) {
                        gm.getPolicyFor.calledOnce.should.be.ok();
                        policyInstance.before.calledOnce.should.be.ok();
                        policyInstance[ability].calledOnce.should.be.ok();
                        resp.should.be.equal(abilityCBResp);

                        done();
                    });
                });
        });

        it('should execute ability callback returned by gm.getAbility method with proper arguments when ' +
        'gm.firstArgumentCorrespondsToPolicy returns false and gm.has returns true', function (done) {
            var gm = {
                firstArgumentCorrespondsToPolicy: sinon.stub(),
                has: sinon.stub(),
                getAbility: sinon.stub()
            };
            var gate = new Gate('resolver', gm);
            var user = 'user';
            var ability = 'ability';
            var abilityCallback = sinon.stub();
            var methodArguments = ['methodArguments'];
            var abilityCBResp = 'abilityCBResp';

            gm.firstArgumentCorrespondsToPolicy.withArgs(methodArguments).returns(false);
            gm.has.withArgs(ability).returns(true);
            gm.getAbility.withArgs(ability).returns(abilityCallback);
            abilityCallback.withArgs(user, methodArguments[0]).callsArgWith(2, abilityCBResp);

            gate.executeAuthorizationCallback(user, ability, methodArguments, function (resp) {
                gm.firstArgumentCorrespondsToPolicy.calledOnce.should.be.ok();
                gm.has.calledOnce.should.be.ok();
                gm.getAbility.calledOnce.should.be.ok();
                resp.should.be.equal(abilityCBResp);
                abilityCallback.calledOnce.should.be.ok();

                done();
            });
        });

        it('should execute pssed callback with false as response when gm.firstArgumentCorrespondsToPolicy and ' +
        'gm.has returns false', function (done) {
            var gm = {
                firstArgumentCorrespondsToPolicy: sinon.stub(),
                has: sinon.stub()
            };
            var gate = new Gate('resolver', gm);
            var user = 'user';
            var ability = 'ability';
            var methodArguments = ['methodArguments'];

            gm.firstArgumentCorrespondsToPolicy.withArgs(methodArguments).returns(false);
            gm.has.withArgs(ability).returns(false);

            gate.executeAuthorizationCallback(user, ability, methodArguments, function (resp) {
                gm.firstArgumentCorrespondsToPolicy.calledOnce.should.be.ok();
                gm.has.calledOnce.should.be.ok();
                resp.should.be.equal(false);

                done();
            });
        });
    });
});