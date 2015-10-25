/**
 * application.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var sinon = require('sinon');
var application = require('../../fixtures/applicationSingleton');
var application2 = require('../../fixtures/applicationSingleton');
var Application = require('../../../lib/foundation/Application');
var fs = require('fs');
var os = require('os');

describe('Application', function(){

    describe('application', function(){
       it('should be a singleton instance of Application constructor', function(done) {
           application.should.be.an.instanceOf(Application);
           application.should.be.equal(application2);
           done();
       });
    });

    describe('#bindInstallPaths', function() {
        application.bindInstallPaths({
            'app': __dirname + '/../../fixtures/quorra/app',
            'public': __dirname + '/../../fixtures/quorra/public',
            'base' : __dirname + '/../../fixtures/quorra/',
            'storage' : __dirname + '/../../fixtures/quorra/app/storage'
        });

        // load application so that other tests can run
        application.load(function(){}, 'development');

        it('should set application path property', function(done) {
            application.path.app.should.be.ok();
            application.path.public.should.be.ok();
            application.path.base.should.be.ok();
            application.path.storage.should.be.ok();

            done();
        });
    });

    describe('#before', function(){
        sinon.spy(application.router, 'before');

        var callback = function(){};
        application.before(callback);

        it('should register callback with router', function(done) {
            application.router.before.calledWith(callback).should.be.ok();
            done();
        });
    });

    /**
     * @covers #isDownForMaintenance, #handle
     */
    describe('#dispatch', function(){
        sinon.spy(application.__filter, 'callFilter');

        var filepath = __dirname + '/../../fixtures/quorra/app/storage/meta/down';
        fs.closeSync(fs.openSync(filepath, 'w'));

        application.dispatch();

        it('should call callFilter method of filter if application is down for maintenance', function(done) {
            application.__filter.callFilter.calledWith('positron.app.down').should.be.ok();
            done();
        });

        fs.unlinkSync(filepath);

        sinon.spy(application.router, 'dispatch');

        var req = {};
        var res = {};

        application.dispatch(req, res);

        it('should call dispatch method of the router if application is not down for maintenance', function(done) {
            application.router.dispatch.calledWith(req, res).should.be.ok();
            done();
        });
    });

    describe('#down', function(){
         it('should register callback with filter  class', function(done){
             sinon.spy(application.__filter, 'register');

             var callback = function(){};

             application.down(callback);

            application.__filter.register.calledWith('positron.app.down', callback).should.be.ok();
            done();
         });
    });

    /**
     * @covers #error
     */
    describe('#missing', function(){
        var callback = function(){};

        sinon.spy(application.exception, 'error');

        application.missing(callback);

        it('should register error callback with exception handler', function(done){
            application.exception.error.calledOnce.should.be.ok();
            done();
        });
    });

    describe('#detectEnvironment', function(){
        it('should assign detected environment to both process.env.NODE_ENV and env property of application class and ' +
            'return detected environment',
            function(done){
                var callback = function(){return 'staging'};

                application.detectEnvironment(callback).should.be.eql('staging');
                process.env.NODE_ENV.should.be.equal('staging');
                application.env.should.be.equal('staging');

                done();
            }
        );

    });

    describe('#environment', function() {
        it('should return current application environment', function(done) {
            application.detectEnvironment(function(){return 'development'});

            application.environment().should.be.eql('development');

            done();
        });

        it('should return whether passed arguments has current application environment', function(done) {
            application.environment('development').should.be.ok();
            application.environment('development', 'production').should.be.ok();
            application.environment('production').should.not.be.ok();

            done();
        });
    });

});