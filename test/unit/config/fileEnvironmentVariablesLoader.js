/**
 * fileEnvironmentVariablesLoader.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

describe('FileEnvironmentVariablesLoader', function(){
    var FileEnvironmentVariablesLoader = require('../../../lib/config/FileEnvironmentVariablesLoader');
    var fileEnvironmentVariablesLoader = new FileEnvironmentVariablesLoader(__dirname+'/../../fixtures/env');
    var devEnvVariables = require('../../fixtures/env/.env.dev');
    var prodEnvVariables = require('../../fixtures/env/.env');

    describe('#constructor', function(){
        it('should return an instance of EnvironmentVariables when initialized', function(done) {
            fileEnvironmentVariablesLoader.should.be.an.instanceOf(FileEnvironmentVariablesLoader);

            done();
        });
    });

    describe('#load', function(){
        it('should read and return environment variables from environment files based on specified environment',
            function(done){
                fileEnvironmentVariablesLoader.load('dev').should.be.equal(devEnvVariables);

                done();
        });

        it('should read and return environment variables from production environment file if no environment is specified',
            function(done){
                fileEnvironmentVariablesLoader.load().should.be.equal(prodEnvVariables);

                done();
        });

        it('should read and return empty object if no environment file for specified environment doesn\'t exist',
            function(done){
                fileEnvironmentVariablesLoader.load('patch').should.be.eql({});

                done();
            });
    })

});