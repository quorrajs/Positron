var View = require('../../../lib/view/View');
var sinon = require('sinon');
var path = require('path');
var tmplEngine = require('../../support/tmpl');

describe('View', function () {
    describe('#constructor', function () {
        it('should return an instance of View when instantiated', function (done) {
            var viewInstance = new View('index.tmpl', {
                engine: tmplEngine,
                root: [__dirname + '/../../fixtures/quorra/resources/views']
            });

            viewInstance.should.be.an.instanceOf(View);

            done();
        });
    });

    describe('#render', function () {
        it('should execute engine with full template path, options and callback', function (done) {
            var viewInstance = new View('index.tmpl', {
                engine: tmplEngine,
                root: [__dirname + '/../../fixtures/quorra/resources/views']
            });

            viewInstance.__engine = function () {
            };

            sinon.spy(viewInstance, '__engine');

            var options = {title: "Testing"};
            var callback = function () {
            };
            var templatePath = path.join(__dirname + '/../../fixtures/quorra/resources/views/index.tmpl');

            viewInstance.render(options, callback);

            viewInstance.__engine.calledWith(templatePath, options, callback).should.be.ok();

            done();
        });
    });
});