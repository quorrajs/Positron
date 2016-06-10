var environmentDetector = require('../../../lib/foundation/environmentDetector');
var os = require('os');

describe('environmentDetector', function () {
    it('should be an object literal with method detect', function (done) {
        environmentDetector.detect.should.be.type('function');
        done();
    });

    describe('#detectEnvironment', function () {
        it('should return "production" when environments object doesn\'t contain executing machine\'s host name',
            function (done) {
                environmentDetector.detect({
                    local: ['tron']
                }).should.be.eql('production');

                done();
            });

        it('should return matched environment when environments object contain executig machine\'s host name',
            function (done) {
                environmentDetector.detect({
                    local: ['dsfsdf', os.hostname()],
                    production: ['sjlkdjfsdf']
                }).should.be.eql('local');

                done();
            }
        );

        it('should return environment returned by the callback function if function is passed as argument istead of ' +
            'object',
            function (done) {
                environmentDetector.detect(function () {
                    return 'staging';
                }).should.be.eql('staging');

                done();
            }
        );

        it('should return value of process.env.NODE_ENV if it already set', function (done) {
            process.env.NODE_ENV = 'local';

            environmentDetector.detect(function () {
                return 'staging';
            }).should.be.eql('local');

            done();
        });

        it('should return value of --env flag if it is set', function (done) {
            process.argv.push('--env');
            process.argv.push('development');

            process.env.NODE_ENV = 'local';

            environmentDetector.detect(function () {
                return 'staging';
            }).should.be.eql('development');

            process.argv.pop();
            process.argv.pop();

            done();
        })
    });
});