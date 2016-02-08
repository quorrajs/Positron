
var Handler = require('../../../lib/exception/Handler');
var sinon = require('sinon');

describe('Handler', function(){
    describe('#constructor', function() {
        it('should return an instance of exception/Handler when instantiated', function(done) {
            var handler = new Handler();

            handler.should.be.an.instanceOf(Handler);
            done();
        });
    });

    describe('#error', function() {
        it('should register a custom exception handler', function(done) {
            var handler = new Handler();
            var callback = function(err, code, req, res, next){};

            handler.error(callback);

            handler.__handlers.indexOf(callback).should.be.equal(0);

            done();
        });
    });

    describe('#handle', function(){
        var PlainDisplayer = function(){};
        PlainDisplayer.prototype = {handleException:function(){}};

        var DebugDisplayer = function(){};
        DebugDisplayer.prototype = {handleException:function(){}};

        var error = {};
        error.status = 401;
        var req = {};
        var res = {};

        it('should call handleException method of plain displayer if handler is in non debug mode', function(done) {
            var plainDisplayerInstance = new PlainDisplayer();
            var debugDisplayerInstance = new DebugDisplayer();
            var handler = new Handler(plainDisplayerInstance, debugDisplayerInstance, false);

            sinon.spy(plainDisplayerInstance, 'handleException');
            sinon.spy(debugDisplayerInstance, 'handleException');

            handler.handle(error, req, res);

            plainDisplayerInstance.handleException.calledWith(error,req, res).should.be.ok();
            debugDisplayerInstance.handleException.calledOnce.should.not.be.ok();

            done();
        });

        it('should call handleException method of debug displayer if handler is in debug mode', function(done) {
            var plainDisplayerInstance = new PlainDisplayer();
            var debugDisplayerInstance = new DebugDisplayer();
            var handler = new Handler(plainDisplayerInstance, debugDisplayerInstance, true);

            sinon.spy(plainDisplayerInstance, 'handleException');
            sinon.spy(debugDisplayerInstance, 'handleException');

            handler.handle(error, req, res);

            debugDisplayerInstance.handleException.calledWith(error,req, res).should.be.ok();
            plainDisplayerInstance.handleException.calledOnce.should.not.be.ok();

            done();
        });

        it('should call all custom handlers first if it exists', function(done) {
            var plainDisplayerInstance = new PlainDisplayer();
            var debugDisplayerInstance = new DebugDisplayer();
            var handler = new Handler(plainDisplayerInstance, debugDisplayerInstance, true);

            sinon.spy(plainDisplayerInstance, 'handleException');
            sinon.spy(debugDisplayerInstance, 'handleException');

            handler.error(function(){
                plainDisplayerInstance.handleException.calledOnce.should.not.be.ok();
                debugDisplayerInstance.handleException.calledOnce.should.not.be.ok();

                done();
            });

            handler.handle(error, req, res);
        });
    });

    //describe('')


});