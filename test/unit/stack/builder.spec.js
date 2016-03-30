var Builder = require('../../../lib/stack/Builder');
var StackedHttpKernel = require('../../../lib/stack/StackedHttpKernel');

describe('Builder', function () {
   describe('#constructor', function () {

       it('should return an instance of Builder when initialized', function (done) {
           var builder = new Builder();

           builder.should.be.an.instanceOf(Builder);
           done();
       });
   });

    describe('#resolve', function () {
       it('should return an instance of StackedHttpKernel', function (done) {
           var builder = new Builder();

           builder.push(function() {});

           builder.resolve({}).should.be.an.instanceOf(StackedHttpKernel);

           done();
       });

        it('should execute each spec in spec array starting from the last with first argument as app instance and second ' +
        'argument as app instance for the first spec and previous spec instance for others', function (done) {
            var builder = new Builder();
            var app = {};
            var spec1 = function() {
                executedSpec2.should.be.true();
                arguments[0].should.be.equal(app);
                arguments[1].should.be.an.instanceOf(spec2);

                done();
            };
            var spec2 = function() {
                arguments[0].should.be.equal(app);
                arguments[1].should.be.equal(app);
                executedSpec2 = true;
            };

            var executedSpec2;

            builder.push(spec1, 'hello', 'world');
            builder.push(spec2);

            builder.resolve(app);
        });
    });
});