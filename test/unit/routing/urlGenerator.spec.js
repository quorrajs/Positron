var UrlGenerator = require('../../../lib/routing/UrlGenerator');
var Router = require('../../../lib/routing/Router');
var Filter = require('../../../lib/routing/Filter');
var Application = require('../../../lib/foundation/Application');

describe('UrlGenerator', function () {
    var app = getApp();

    app.bindInstallPaths({
        'app': __dirname + '/../../fixtures/quorra/app'
    });

    var routerInstance = new Router(app, new Filter());

    routerInstance.get('/foo/bar', {
        as: 'foo', uses: function (req, res) {
            res.end('hello');
        }
    });
    routerInstance.post('/foo/bar', {
        as: 'bar', uses: function (req, res) {
            res.end('hello');
        }
    });
    routerInstance.get('/foo/baz', {
        domain: 'foo.com', as: 'baz', uses: function (req, res) {
            res.end('hello');
        }
    });
    routerInstance.get('foo/bar/åαф/{baz}', {
        as: 'foobarbaz', uses: function (req, res) {
            res.end('hello');
        }
    });
    routerInstance.get('foo/bar#derp', {
        as: 'fragment', uses: function (req, res) {
            res.end('hello');
        }
    });
    routerInstance.get('/foo/pom', 'RouteTestControllerDispatchStub@foo');
    routerInstance.get('/foo/namespaced/controller/route', 'controllers/namespace/FooController@method');
    routerInstance.get('/foo/namespaced2/controller/route', 'newRootNamespace/namespace/FooController@method');

    describe('#constructor', function () {
        it('should return an instance of UrlGenerator when initialized', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.should.be.an.instanceOf(UrlGenerator);

            done();
        });
    });

    describe('#to', function () {
        it('should generate url for supplied path', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.to('/foo').should.be.eql('http://localhost/foo');
            urlGen.to('/foo', [], true).should.be.eql('https://localhost/foo');
            urlGen.to('/foo', 'baz').should.be.eql('http://localhost/foo/baz');
            urlGen.to('/foo', ['bar', 'baz']).should.be.eql('http://localhost/foo/bar/baz');

            done();
        });

    });

    describe('#forceRootUrl', function () {
        it('should force root url to specified value during url generation', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.forceRootUrl('http://foo.com');

            urlGen.to('/bar', []).should.be.eql('http://foo.com/bar');
            urlGen.to('/bar', [], true).should.be.eql('https://foo.com/bar');

            done();
        })
    });

    describe('#forceSchema', function () {
        it('should force schema in the generated url to the specified one', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.to('/bar', []).should.be.eql('http://localhost/bar');

            urlGen.forceSchema('https');

            urlGen.to('/bar', []).should.be.eql('https://localhost/bar');

            done();
        });
    });

    describe('#secure', function () {
        it('should generate secure url to specified path', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.secure('/bar', []).should.be.eql('https://localhost/bar');

            done();
        });
    });

    describe('#isValidUrl', function () {
        it('should return whether a url is valid or not', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.isValidUrl('foo/bar').should.be.false();
            urlGen.isValidUrl('#foo/bar').should.be.true();
            urlGen.isValidUrl('http://foo/bar').should.be.true();
            urlGen.isValidUrl('http/bar').should.be.false();
            urlGen.isValidUrl('https/:/foo/bar').should.be.false();

            done();
        })
    });

    describe('#route', function () {
        var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);
        it('should return the url to the specified named root', function (done) {

            urlGen.route('foo').should.be.eql('http://localhost/foo/bar');
            urlGen.route('baz').should.be.eql('http://foo.com/foo/baz');
            urlGen.route('baz').should.be.eql('http://foo.com/foo/baz');
            urlGen.route('foobarbaz', {'baz': 'åαф'}).should.be.eql('http://localhost/foo/bar/%C3%A5%CE%B1%D1%84/%C3%A5%CE%B1%D1%84');
            urlGen.route('foo', {'foo': 'bar'}, false).should.be.eql('/foo/bar?foo=bar');
            urlGen.route('fragment', {}, false).should.be.eql('/foo/bar#derp');
            urlGen.route('fragment', {'foo': 'bar'}, false).should.be.eql('/foo/bar?foo=bar#derp');

            done();
        });
    });

    describe('#action', function () {
        it('should return url to a controller action', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.action('RouteTestControllerDispatchStub@foo', {}).should.be.eql('http://localhost/foo/pom');
            urlGen.action('/controllers/namespace/FooController@method', {}).should.be.eql('http://localhost/foo/namespaced/controller/route');
            urlGen.action('namespace/FooController@method', {}).should.be.eql('http://localhost/foo/namespaced/controller/route');

            done();
        })
    });

    describe('#setRootControllerNamespace', function (done) {
        it('should update default root controller namespace to specified value', function (done) {
            var urlGen = new UrlGenerator(routerInstance.getRoutes(), app);

            urlGen.action('namespace/FooController@method', {}).should.be.eql('http://localhost/foo/namespaced/controller/route');

            urlGen.setRootControllerNamespace('newRootNamespace');

            urlGen.action('namespace/FooController@method', {}).should.be.eql('http://localhost/foo/namespaced2/controller/route');

            done();

        });
    });

    function getApp() {
        var app = new Application();
        app.config = {
            get: function (item) {
                var value = {};

                switch (item) {
                    case 'app':
                        return {url: 'http://localhost'};
                }

                return value;
            }
        };

        return app;
    }
});