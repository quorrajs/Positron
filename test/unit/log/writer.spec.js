/**
 * writer.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var logger = require('../../../lib/log/writer');
var winston = require('winston');
// sinon spy breaks; hence manual

describe('logger', function(){
    var loggerInstance = logger();
    var options = {};

    it('should return an instance of winston logger when executed', function(done) {
        loggerInstance.should.be.an.instanceOf(winston.Logger);

        done();
    }) ;

    describe('#useFiles', function(){
        it('should call add method of winston logger with arguments "winston.transports.File" and options object',
            function(done) {
                loggerInstance.add = function() {
                    arguments[0].should.be.equal(winston.transports.File);

                    arguments[1].should.be.equal(options);

                    done();
                };

                loggerInstance.useFiles(options);
            }
        );
    });
    describe('#useDailyFiles', function(){
        it('should call add method of winston logger with arguments "winston.transports.DailyRotateFile" and options ' +
            'object',
            function(done) {
                loggerInstance.add = function() {
                    arguments[0].should.be.equal(winston.transports.DailyRotateFile);

                    arguments[1].should.be.equal(options);
                    done();
                };

                loggerInstance.useDailyFiles(options);
            }
        );
    });
    describe('#useMongoDB', function(){
        it('should call add method of winston logger with arguments "require(\'winston-mongodb\').MongoDB" and options' +
            ' object',
            function(done) {
                loggerInstance.add = function() {
                    arguments[0].should.be.equal(require('winston-mongodb').MongoDB);

                    arguments[1].should.be.equal(options);
                    done();
                };

                loggerInstance.useMongoDB(options);
            }
        );
    });
    describe('#useMail', function(){
        it('should call add method of winston logger with arguments "require(\'winston-mail\').Mail" and options ' +
            'object',
            function(done) {
                loggerInstance.add = function() {
                    arguments[0].should.be.equal(require('winston-mail').Mail);

                    arguments[1].should.be.equal(options);
                    done();
                };

                loggerInstance.useMail(options);
            }
        );
    });
});