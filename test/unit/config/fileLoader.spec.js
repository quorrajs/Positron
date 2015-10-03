/**
 * fileLoader.spec.js
 *
 * @author: Harish Anchu <twitter:@harishanchu>
 * Copyright (c) 2015, Wimoku Pvt Ltd. All rights reserved.
 */

var should = require('should');

describe('FileLoader', function(){
    var FileLoader = require('../../../lib/config/FileLoader');
    var appConfig = require('../../fixtures/config/app');
    var appConfigForNamespace = require('../../fixtures/configNamespace/app');

    var fileLoader = new FileLoader(__dirname+'/../../fixtures/config');

    describe('#constructor', function() {
        it('should return an instance of FileLoader when initialized', function(done) {
            fileLoader.should.be.an.instanceOf(FileLoader);
            done();
        });
    });

    /**
     * covers #addNamespace
     */
    describe('#load', function(){
        it('should return configuration items from specified group', function(done) {
            fileLoader.load('development', 'app', null).should.eql(appConfig);
            done();
        });

        it('should override and return default configuration with environment specific configuration based on ' +
        'environment and group specified', function(done){
            appConfig.debug = false;
            fileLoader.load('production', 'app').should.eql(appConfig);
            appConfig.debug = true;
            done();
        });

        it('should return configuration from namespace if specified namespace is registered and it exists', function(done) {
            fileLoader.addNamespace('myModuleNamespace', __dirname+'/../../fixtures/configNamespace');
            fileLoader.load('production', 'app', 'myModuleNamespace').should.eql(appConfigForNamespace);
            done();
        })
    });

    describe('#exists', function(){
        it('should return true if specified group exists', function(done){
            should(fileLoader.exists('app')).be.true();
            should(fileLoader.exists('db')).be.false();
            done();
        });

        it('should return true if specified group exists in specified namespace', function(done){
            should(fileLoader.exists('app', 'myModuleNamespace')).be.true();
            should(fileLoader.exists('db'), 'myModuleNamespace').be.false();
            done();
        });

    });
    //@todo: add remaining tests
});
