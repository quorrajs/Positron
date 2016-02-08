
var should = require('should');

describe('Repository', function(){
    var FileLoader = require('../../../lib/config/FileLoader');
    var Repository = require('../../../lib/config/Repository');

    var fileLoader = new FileLoader(__dirname+'/../../fixtures/config');
    var config = new Repository(fileLoader, 'development');
    var appConfig = require('../../fixtures/config/app');

    describe('#constructor', function(){
        it("should return an instance of Repository when initialized", function(done) {
            config.should.be.an.instanceOf(Repository);
            done();
        });
    });

    describe('#has', function(){
        it('should return true when a given configuration value exists', function(done) {
            config.has('app.key').should.be.true();
            done();
        });

        it('should return false when a given configuration value doesn\'t exist', function(done) {
            config.has('app.nonExistingKey').should.be.false();
            done();
        });
    });

    describe('#hasGroup', function(){
        it('should return true when a given configuration group exists', function(done) {
            config.hasGroup('app').should.be.true();
            done();
        });

        it('should return false when a given configuration group doesn\'t exist', function(done) {
            config.hasGroup('nonExistingGroup').should.be.false();
            done();
        });
    });

    describe('#get', function(){
        it('should return configuration value by key', function(done) {
            config.get('app.key').should.be.equal(appConfig.key);
            done();
        });

        it('should return specified default value if configuration doesn\'t exist for specified key', function(done) {
            var defaultValue = "value";

            config.get('app.nonExistingKey', defaultValue).should.be.equal(defaultValue);
            done();
        });

        it('should return whole group when only group is specified with the key', function(done) {
            config.get('app').should.be.eql(appConfig);
            done();
        });
    });

    describe('#set', function(){
        it('should set specified configuration value by key', function(done) {
            var value = 'value';
            should(config.get('myGroup.key')).be.null();
            config.set('myGroup.key', value);
            config.get('myGroup.key').should.be.equal(value);
            done();
        });

        it('should set specified configuration value for group when item not specified in the key', function(done) {
            var value = 'value';
            should(config.get('myGroup2')).be.empty();
            config.set('myGroup2', value);
            config.get('myGroup2').should.be.equal(value);
            done();
        });
    });

    /**
     * @covers getNamespaces
     */
    describe('#addNamespace', function(){
        it('should store specified hint by namespace', function(done) {
            should(config.getNamespaces()['myNamespace']).be.undefined();
            config.addNamespace('myNamespace', '/app/myNamespace');
            config.getNamespaces()['myNamespace'].should.be.equal('/app/myNamespace');

            done();
        })
    });
});