/**
 * environmentVariables.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var should = require('should');

describe('EnvironmentVariables', function(){
    var EnvironmentVariables = require('../../../lib/config/EnvironmentVariables');
    var FileEnvironmentVariablesLoader = require('../../../lib/config/FileEnvironmentVariablesLoader');
    var devEnvVariables = require('../../fixtures/env/.env.dev');
    var prodEnvVariables = require('../../fixtures/env/.env');

    describe('#constructor', function(){
        it('should return an instance of EnvironmentVariables when initialized', function(done) {
            var environmentVariables = new EnvironmentVariables();

            environmentVariables.should.be.an.instanceOf(EnvironmentVariables);

            done();
        });
    });

    describe('#load', function(){
        var loader = new FileEnvironmentVariablesLoader(__dirname+'/../../fixtures/env');
        var environmentVariables = new EnvironmentVariables(loader);
        it('should load environment variables from environment files based on specified environment to the global variable process.env', function(done){
            should(process.env.envVariable1).be.undefined();

            environmentVariables.load('dev');

            process.env.envVariable1.should.equal(devEnvVariables.envVariable1);
            delete process.env.envVariable1;

            done();
        });

        it('should load environment variables from production environment file if no environement is specified to the global variable process.env', function(done){
            should(process.env.envVariable2).be.undefined();

            environmentVariables.load();

            process.env.envVariable2.should.equal(prodEnvVariables.envVariable2);
            delete process.env.envVariable2;

            done();
        });
    })
});