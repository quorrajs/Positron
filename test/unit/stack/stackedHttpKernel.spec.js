var StackedHttpKernel = require('../../../lib/stack/StackedHttpKernel');

describe('StackedHttpKernel', function () {
    describe('#constructor', function () {
        it('should return an instance of StackedHttpKernel when initialized', function (done) {
            var stack = new StackedHttpKernel();

            stack.should.be.an.instanceOf(StackedHttpKernel);

            done();
        });
    });

    describe('#handle', function () {
        it('should call handle method of app instance with passed request and response arguments', function (done) {
            var request = {};
            var response = {};
            var app = {
                handle: function (req, res) {
                    req.should.be.equal(request);
                    res.should.be.equal(response);

                    done();
                }
            };
            var stack = new StackedHttpKernel(app);

            app.handle(request, response);
        });
    })
});