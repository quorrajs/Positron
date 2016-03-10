var Route = require('../../../lib/routing/Route');
var should = require('should');
var sinon = require('sinon');
var MethodValidator = require('../../../lib/routing/matching/MethodValidator');
var HostValidator = require('../../../lib/routing/matching/HostValidator');
var SchemeValidator = require('../../../lib/routing/matching/SchemeValidator');
var UriValidator = require('../../../lib/routing/matching/UriValidator');
var CompiledRoute = require('../../../lib/routing/CompiledRoute');
var Filter = require('../../../lib/routing/Filter');

describe('Route', function () {
    describe('#constructor', function () {
        it('should return an instance of Route when initialized', function () {
            var route = new Route('GET', '/', function(){}, {});

            route.should.be.an.instanceOf(Route);
        });

        it('should parse passed action input and set route action', function(done) {
            var action = function(){};
            var route = new Route('GET', '/', action, {});

            (route.getAction())['uses'].should.be.equal(action);

            route = new Route('GET', '/', {'uses': action}, {});

            (route.getAction())['uses'].should.be.equal(action);

            done();
        });

        it('should set route uri', function(done) {
            var uri = '/hello';
            var route = new Route('GET', uri, function(){}, {});

            route.getUri().should.be.equal(uri);

            done();
        });

        it('should set route uri with prefix if action contains prefix', function(done) {
            var uri = '/hello';
            var prefix = 'admin';
            var route = new Route('GET', uri, {uses:function(){}, prefix: prefix}, {});

            route.getUri().should.be.equal(prefix+uri);

            done();
        });
    });

    describe('#domain', function() {
        var domain = "foo";

        it('should return domain if passed action input contains domain', function(done) {
            var route = new Route('GET', '/', { uses:function(){}, domain: domain}, {});

            route.domain().should.be.equal(domain);

            done();
        });
    });

    describe('#run', function() {
       it('should execute route action with request, response objects and non null route parameters', function(done) {
           var action = function(req, res, param1, param2, param3) {
               req.should.be.equal(req);
               res.should.be.equal(res);
               param1.should.be.equal(req.routeParameters.param1);
               param2.should.be.equal(req.routeParameters.param2);
               should(param3).be.undefined();

               done();
           };

           var route = new Route('GET', '/', action, {});
           var req = {
               routeParameters: {
                   param1: 'foo',
                   param2: 'bar',
                   param3: null
               }
           };
           var res = {};

           route.run(req, res);
       })
    });

    describe('#where', function () {
       it('should set passed where conditions on route', function(done) {
           var route = new Route('GET', '/', function () {}, {});

           route.where('foo', 'bar');
           route.__wheres['foo'].should.equal('bar');

           route.where({'foo': 'bar', 'test': 'hello'});
           route.__wheres['test'].should.equal('hello');
           route.__wheres['foo'].should.equal('bar');

           done();
       });
    });

    describe('#methods', function() {
        it('should return methods supported by the route', function (done) {
            var route = new Route('GET', '/', function () {}, {});
            var methods = route.methods();

            methods.should.containEql('GET');
            methods.should.containEql('HEAD');
            methods.should.not.containEql('POST');

            route = new Route(['POST', 'PUT'], '/', function () {}, {});
            methods = route.methods();

            methods.should.containEql('POST');
            methods.should.containEql('PUT');
            methods.should.not.containEql('HEAD');

            done();
        });
    });

    describe('#httpOnly', function () {
        it('should return true if route action input parameter\'s http attribute set to true', function (done) {
            var route = new Route('GET', '/', {uses:function () {}, http: true}, {});

            should(route.httpOnly()).be.true();

            done();
        });

        it('should return false if route action input parameter\'s http attribute is not set or set to false ', function (done) {
            var route = new Route('GET', '/', {uses:function () {}, http: false}, {});

            should(route.httpOnly()).be.false();

            route = new Route('GET', '/', {uses:function () {}}, {});

            should(route.httpOnly()).be.false();

            done();
        });
    });

    describe('#secure', function () {
        it('should return true if route action input parameter\'s https attribute set to true', function (done) {
            var route = new Route('GET', '/', {uses:function () {}, https: true}, {});

            should(route.secure()).be.true();

            done();
        });

        it('should return false if route action input parameter\'s https attribute is not set or set to false ', function (done) {
            var route = new Route('GET', '/', {uses:function () {}, https: false}, {});

            should(route.secure()).be.false();

            route = new Route('GET', '/', {uses:function () {}}, {});

            should(route.secure()).be.false();

            done();
        });
    });

    describe('#getValidators', function() {
        it('should return an array with all http validator class instances', function(done) {
            var route = new Route('GET', '/', function() {}, {});

            var validators  = route.getValidators();

            var validatorsClasses = [MethodValidator, SchemeValidator, HostValidator, UriValidator];

            validators.forEach(function (validator) {
                validatorsClasses.should.containEql(validator.constructor);
            });

            done();
        });
    });

    describe('#matches', function () {
        it('should return true if passed request matches the route', function (done) {
            var route = new Route('GET', '/', function() {}, {});

            should(route.matches({
                path: '/',
                method: 'get'
            })).be.true();

           route = new Route('POST', '/foo', function() {}, {});

           should(route.matches({
               path: '/foo',
               method: 'POST'
           })).be.true();

           done();
        });

        it('should return false if passed request do not match the route', function (done) {
            var route = new Route('GET', '/', function() {}, {});

            should(route.matches({
                path: '/',
                method: 'post'
            })).be.false();

            should(route.matches({
                path: '/foo',
                method: 'get'
            })).be.false();

            done();
        });

        it('should skip method validation if it is set to false', function (done) {
            var route = new Route('GET', '/', function() {}, {});

            should(route.matches({
                path: '/',
                method: 'post'
            }, false)).be.true();

            should(route.matches({
                path: '/',
                method: 'post'
            })).be.false();

            done();
        });

        it('should validate host if host is set in route', function (done) {
            var route = new Route('GET', '/', {uses: function() {}, domain: 'foo'}, {});

            var xregexp = require('xregexp');

            should(route.matches({
                path: '/',
                method: 'get',
                host: 'foo'
            })).be.true();

            should(route.matches({
                path: '/',
                method: 'get',
                host: 'bar'
            })).be.false();

            should(route.matches({
                path: '/',
                method: 'get'
            })).be.false();

            done();
        });
    });

    describe('#bind', function() {
        it('should call __compileRoute and bindParameters methods', function(done) {
            var route = new Route('GET', '/', function() {}, {});

            sinon.spy(route, '__compileRoute');
            sinon.spy(route, 'bindParameters');

            route.bind({
                path: '/',
                method: 'get'
            });

            route.__compileRoute.calledOnce.should.be.ok();
            route.bindParameters.calledOnce.should.be.ok();

            done();
        });
    });

    //@covers matchToKeys
    describe('#bindParameters', function() {
       it('should resolve path and host parameters from the request and assign to the requests.params object', function(done) {

           // path params
           var route = new Route('GET', '/{foo}', function() {}, {});
           var request = {
               path: '/bar',
               method: 'get'
           };

           route.bind(request);

           request.params.foo.should.equal('bar');

           // optional path params
           route = new Route('GET', '/{foo}/{boom?}', function() {}, {});
           request = {
               path: '/bar',
               method: 'get'
           };

           route.bind(request);

           request.params.foo.should.equal('bar');
           should(request.params.boom).be.undefined();

           request = {
               path: '/bar/baz',
               method: 'get'
           };

           route.bind(request);

           request.params.foo.should.equal('bar');
           request.params.boom.should.equal('baz');

           // host params
           route = new Route('GET', '/{foo}', {domain: '{subdomain}.mydomain', uses: function() {}}, {});

           request = {
               path: '/bar',
               method: 'get',
               host: 'boom.mydomain'
           };

           route.bind(request);

           request.params.foo.should.equal('bar');
           request.params.subdomain.should.equal('boom');

           done();
       });
    });

    describe('#parameterNames', function() {
       it('should return all route path and host parameter names', function(done) {
           var route = new Route('GET', '/{foo}/{bar?}', {domain: '{subdomain}.mydomain', uses: function() {}}, {});

           var params = route.parameterNames();

           params.should.containEql('foo');
           params.should.containEql('bar');
           params.should.containEql('subdomain');

           done();
       });
    });

    describe('#getCompiled', function() {
        it('should return an instance of class CompiledRoute when route is already compiled', function(done) {
            var route = new Route('GET', '/', function() {}, {});

            route.bind({
                path: '/',
                method: 'get'
            });

            route.getCompiled().should.be.an.instanceOf(CompiledRoute);

            done();
        });
    });

    describe('#beforeFilters', function () {
        it('should call #parseFilters of filter instance with before parameter of action input and return its output' +
            ' as response', function(done) {
            var filter = {
                parseFilters: function() {
                    arguments[0].should.equal('auth');
                    return arguments[0];
                }
            };
            var route = new Route('GET', '/', {uses: function() {}, before: 'auth'}, filter);

            route.beforeFilters().should.equal('auth');

            done();
        });
    });

    //@todo: add tests for compiler specific methods
});