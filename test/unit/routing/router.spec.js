
var Router = require('../../../lib/routing/Router');
var http = require('http');
var Filter = require('../../../lib/routing/Filter');
var ControllerDispatcher = require('../../../lib/routing/ControllerDispatcher');
var requestProto = require('../../../lib/http/request');
var sinon = require('sinon');
var async = require('async');
var should = require('should');
var Application = require('../../../lib/foundation/Application');

var _ = require('lodash');

const HTTP_METHODS = require('methods');

var server;

before(function(done){
    server = http.createServer(function(request, response){
        response.end();
    }).listen(3001, 'localhost');
    server.on("listening", function () { done(); });
});


after(function(){
    server.close();
});

describe('Router', function() {
    describe('#constructor', function() {
        it('should return an instance of Router when initialized', function(done) {
            var routerInstance = new Router();

            routerInstance.should.be.an.instanceOf(Router);
            done();
        })
    });

    /**
    * @covers findRoute, dispatchToRoute, get, post, options etc
    */
    describe('#dispatch', function(){
        it('should dispatch request to defined route(get route)', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/foo/bar', function(req, res){res.end('get hello');});

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                res.end = function(){
                    arguments[0].should.equal('get hello');
                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should dispatch request to defined controller route', function(done){
            var app = new Application();

            app.bindInstallPaths({
                'app': __dirname + '/../../fixtures/quorra/app'
            });

            var routerInstance = app.router = new Router(app, new Filter());

            routerInstance.get('/foo/bar', 'RouteTestControllerDispatchStub@foo');

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                res.end = function(){
                    arguments[0].should.equal('bar');
                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should dispatch request to defined route with sub-domain attribute', function(done){
            var app = getApp();

            var routerInstance = new Router(app, new Filter());

            routerInstance.get('/foo/bar', {domain:'users.localhost', uses:function(req, res){res.end('get hello');}});

            var options = {
                port: 3001,
                path: '/foo/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                req.app = app;
                req.headers.host = 'users.localhost';

                res.end = function(){
                    arguments[0].should.equal('get hello');
                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should dispatch request to defined route with wildcard sub-domain', function(done){
            var app = getApp();

            var routerInstance = new Router(app, new Filter());

            routerInstance.get('/foo/bar', {domain:'{subdomain}.localhost', uses:function(req, res, subdomain){
                res.end(subdomain);
            }});

            var options = {
                port: 3001,
                path: '/foo/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                req.app = app;
                req.headers.host = 'users.localhost';

                res.end = function(){
                    arguments[0].should.equal('users');
                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should dispatch request to defined route(post route)', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.post('/foo/bar', function(req, res){res.end('post hello');});

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'POST'
            };

            getRequest(options, function(req, res){
                res.end = function(){
                    arguments[0].should.equal('post hello');
                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should dispatch request to defined route with route parameter', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/foo/parameter/{routerParameter}',
                function(req, res, routerParameter){
                    res.end(routerParameter);
                }
            );

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/parameter/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                res.end = function(){
                    arguments[0].should.equal('bar');
                    done();
                };

                routerInstance.dispatch(req, res);
            });

        });

        it('should dispatch request to defined route with optional route parameter', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/foo/optionalParameter/{bar?}', function(req, res, bar){res.end(bar);});
            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/optionalParameter',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                res.end = function(){
                    should(arguments[0]).be.undefined();
                    done();
                };

                routerInstance.dispatch(req, res);
            });

        });

        it('should dispatch request to defined route with a combination of normal route parameter and ' +
        'optional route parameter', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/foo/{routeParameter}/{optionalRouteParameter?}', function(
                req, res, routeParameter, optionalRouteParameter)
            {res.end(optionalRouteParameter?optionalRouteParameter:routeParameter);});

            async.series([
                function(callback){

                    var options = {
                        host: 'localhost',
                        port: 3001,
                        path: '/foo/routeParameter',
                        method: 'GET'
                    };

                    getRequest(options, function(req, res){
                        res.end = function(){
                            arguments[0].should.equal('routeParameter');
                            callback();
                        };

                        routerInstance.dispatch(req, res);
                    });
                },
                function(callback){
                    var options = {
                        host: 'localhost',
                        port: 3001,
                        path: '/foo/routeParameter/optionalRouteParameter',
                        method: 'GET'
                    };

                    getRequest(options, function(req, res){
                        res.end = function(){
                            arguments[0].should.equal('optionalRouteParameter');
                            callback();
                        };

                        routerInstance.dispatch(req, res);
                    });
                }
            ], function(err){ if(!err) { done(); }});
        });

        it('should call response.abort with 404 error when routes don\'t match non matching paths with leading optionals', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('{baz?}', function(req, res){res.end('get hello');});

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                res.abort = function(err) {
                    err.status.should.be.equal(404);

                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should call response.abort with 404 error when routes don\'t match non matching domain', function(done) {
            var app = getApp();
            var routerInstance = new Router(app, new Filter());

            routerInstance.get('/foo/bar', {domain: 'api.foo.bar', uses: function(req, res){res.end('get hello');}});

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                req.app = app;

                res.end = function(){
                    arguments[0].should.equal('get hello');
                    done();
                };

                res.abort = function (err) {
                    err.status.should.be.equal(404);

                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });
    });

    describe('#get #post', function(){
        it('should respond to a option request by default on defining any route for a path with Allow header',
            function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/foo/bar', function(req, res){res.end('get hello');});
            routerInstance.post('/foo/bar', function(req, res){res.end('post hello');});

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'OPTIONS'
            };

            getRequest(options, function(req, res){
                var header, value;

                res.status = function(){
                    return res;
                };
                res.header = function(h, v){
                    header = h; value = v.split(',');

                    return res;
                };

                res.send = function(){
                    header.should.equal('Allow');
                    value.should.containEql('GET');
                    value.should.containEql('HEAD');
                    value.should.containEql('POST');

                    done();
                };

                routerInstance.dispatch(req, res);
            });
        });

        it('should generate head route by default when a get route is defined for a path', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/foo/bar', function(req, res){res.end('get hello');});

            var options = {
                host: 'localhost',
                port: 3001,
                path: '/foo/bar',
                method: 'HEAD'
            };

            getRequest(options, function(req, res){
                res.end = function(){
                    done();
                };

                routerInstance.dispatch(req, res);
            });
        })
    });

    describe('#findRoute', function(){
        it('should find appropriate Route instance based on request', function(done){
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.get('/{optionalRouteParameter?}', {as: 'foo', uses: function(req, res){res.end('hello');}});
            var options = {
                host: 'localhost',
                port: 3001,
                path: '/routeParameter',
                method: 'GET'
            };

            getRequest(options, function(req, res){
                routerInstance.findRoute(req, function(route){
                    if(route) {
                        route.getName().should.equal('foo');

                        options = {
                            host: 'localhost',
                            port: 3001,
                            path: '/',
                            method: 'GET'
                        };

                        getRequest(options, function(req, res){
                            routerInstance.findRoute(req, function(route){
                                route.getName().should.equal('foo');
                                done();
                            });
                        });
                    }
                });
            });
        });
    });

    /**
     * @covers most of the http protocols
     */
    describe('#any', function(){
        it('should register routes with all http verbs except options', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            var count = 0;

            routerInstance.any('/foo', function(req, res){
                count ++;
                if(HTTP_METHODS.length-3 == count) {
                    done();
                }
            });

            // exclude connect, m-search : https://github.com/nodejs/node-v0.x-archive/issues/7019
            _.difference(HTTP_METHODS, ['options', 'connect', 'm-search']).map(function(method){

                var options = {
                    host: 'localhost',
                    port: 3001,
                    path: '/foo',
                    method: method.toUpperCase()
                };

                getRequest(options, function(req, res){
                    routerInstance.dispatch(req, res);
                });

            })
        });
    });

    describe('#match', function(){
       it('should register routes with given  http verbs', function(done) {
           var routerInstance = new Router(getApp(), new Filter());
           var i = 0;
           var callback = function(){
               i++;
               if(i==2) {
                   done();
               }
           };

           routerInstance.match(['get', 'post'], '/foo', function(req, res){res.end(req.method);});

           ['get', 'POST'].map(function(method){

               var options = {
                   host: 'localhost',
                   port: 3001,
                   path: '/foo',
                   method: method
               };

               getRequest(options, function(req, res){
                    res.end = function(){
                        arguments[0].should.equal(method.toUpperCase());
                        callback();
                    };

                   routerInstance.dispatch(req, res);
               });
           })
       }) ;
    });

    describe('#getControllerDispatcher', function(){
        it('should return an singleton instance of ControllerDispatcher', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            routerInstance.getControllerDispatcher().should.be.an.instanceOf(ControllerDispatcher);

            routerInstance.getControllerDispatcher().should.equal(routerInstance.getControllerDispatcher());

            done();
        });
    });

    describe('#callFilter', function(){
        it('should call callFilter method of filter instance with appropriate arguments', function(done) {
            var filter = 'foo';
            var request = {};
            var response = {};
            var CB = {};
            var routerInstance = new Router(getApp(),
                {
                    callFilter: function(){
                    arguments[0].should.be.equal('router.foo');
                    arguments[1].should.be.equal(request);
                    arguments[2].should.be.equal(response);
                    arguments[3].should.be.equal(CB);
                    done();
                }});

            routerInstance.callFilter(filter, request, response, CB);
        });
    });

    describe('#callRouteBefore', function() {
       it('should call callPatternFilters and executing CB method from its arguments should execute ' +
       'callAttachedBefores methods of filter instance with appropriate arguments', function(done) {
           var route = {};
           var request = {};
           var response = {};
           var CB = {};
           var flag = false;
           var routerInstance = new Router(getApp(),
               {
                   callPatternFilters: function(){
                       arguments[0].should.be.equal(request);
                       arguments[1].should.be.equal(response);
                       flag = true;
                       arguments[2]();
                    },
                   callAttachedBefores: function(){
                       arguments[0].should.be.equal(route);
                       arguments[1].should.be.equal(request);
                       arguments[2].should.be.equal(response);
                       arguments[3].should.be.equal(CB);

                       if(flag) {
                           done();
                       }
                    }
               });

           routerInstance.callRouteBefore(route, request, response, CB);
       });
    });

    describe('#before', function() {
        it('should call addGlobalFilter method  with "before" filter and provided filter function', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            var filterFunction = function(){};

            sinon.spy(routerInstance, 'addGlobalFilter');

            routerInstance.before(filterFunction);

            routerInstance.addGlobalFilter.withArgs('before', filterFunction).calledOnce.should.be.ok();

            done();
        })
    });

    describe('#addGlobalFilter', function() {
       it('should call register method of filter instance with appropriate arguments', function(done) {
           var filter = 'foo';
           var filterFunction = function(){};
           var routerInstance = new Router(getApp(), {
               register: function(){
                   arguments[0].should.be.equal('router.foo');
                   arguments[1].should.be.equal(filterFunction);

                   done();
               }});

           routerInstance.addGlobalFilter('foo', filterFunction);
       });
    });

    describe('#filter', function() {
        it('should call register method of filter instance with appropriate arguments', function(done) {
            var filter = 'foo';
            var filterFunction = function(){};
            var routerInstance = new Router(getApp(), {
                register: function(){
                    arguments[0].should.be.equal('router.filter: foo');
                    arguments[1].should.be.equal(filterFunction);

                    done();
                }});

            routerInstance.filter('foo', filterFunction);
        });
    });

    describe('#when', function() {
        it('should call registerPatternFilter method of filter instance with appropriate arguments', function(done) {
            var pattern = 'foo';
            var name = 'bar';
            var filterFunction = function(){};
            var routerInstance = new Router(getApp(), {
                registerPatternFilter: function(){
                    arguments[0].should.be.equal(pattern);
                    arguments[1].should.be.equal(name);
                    arguments[2].should.be.equal(filterFunction);

                    done();
                }});

            routerInstance.when(pattern, name , filterFunction);
        });
    });

    describe('#group', function() {
        it('should apply filters to routes defined inside', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            var route1;
            var route2;
            var route3;

            routerInstance.group({'before': 'auth:name'}, function() {
                route1 = routerInstance.get('/', function() {
                });

                route2 = routerInstance.get('user/profile', function() {
                });
            });

            route3 = routerInstance.get('user/profile', function() {
            });

            route1.beforeFilters().should.be.eql({auth:['name']});
            route2.beforeFilters().should.be.eql({auth:['name']});
            route3.beforeFilters().should.be.eql({});

            done();
        });

        it('should merge filters, to directly defined filters on route', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            var route;

            routerInstance.group({'before': 'auth'}, function() {
                route = routerInstance.get('/', {'before': 'access', 'uses': function() {
                }});

                route.beforeFilters().should.be.eql({auth:[], access: []});

                done();
            });
        });

        it('should apply route prefixes to routes defined inside', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            var route1;
            var route2;
            var route3;
            var route4;
            var route5;

            routerInstance.group({'prefix': 'admin'}, function() {

                route1 = routerInstance.get('user1', function()
                {
                });

                route2 = routerInstance.get('user2', function()
                {
                });

                routerInstance.group({'prefix': 'super'}, function() {

                    route4 = routerInstance.get('user1', function()
                    {
                    });

                    route5 = routerInstance.get('user2', function()
                    {
                    });

                });

            });

            route3 = routerInstance.get('user3', function()
            {
            });

            route1.getUri().should.be.equal('admin/user1');
            route2.getUri().should.be.equal('admin/user2');
            route3.getUri().should.be.equal('user3');
            route4.getUri().should.be.equal('admin/super/user1');
            route5.getUri().should.be.equal('admin/super/user2');

            done()
        });

        it('should apply domain to routes defined inside', function(done) {
            var routerInstance = new Router(getApp(), new Filter());
            var route1;
            var route2;
            var route3;

            routerInstance.group({domain: 'admin'}, function() {

                route1 = routerInstance.get('user1', function()
                {
                });

                routerInstance.group({domain: 'myapp.localhost'}, function() {

                    route2 = routerInstance.get('user2', function()
                    {
                    });

                });

            });

            route3 = routerInstance.get('user3', function()
            {
            });

            route1.domain().should.be.equal('admin');
            route2.domain().should.be.equal('myapp.localhost');
            route3.domain().should.be.equal('');

            done()
        });

        it('should appy namespace to controller routes defined inside', function(done){
            var routerInstance = new Router(getApp(), new Filter());
            var route1;
            var route2;

            routerInstance.group({namespace:'namespace'}, function(){
                route1 = routerInstance.get('/foo/bar', 'Controller');

                routerInstance.group({namespace:'nested'}, function(){
                    route2 = routerInstance.get('/foo/bar', 'Controller');
                });
            });

            route1.getAction()['controller'].should.be.equal('namespace/Controller');
            route2.getAction()['controller'].should.be.equal('namespace/nested/Controller');

            done();
        });
    });

    describe('#resource', function() {
        it('should register all the default resource routes + missing route', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo', 'FooController');
            routerInstance.getRoutes().getRoutes().should.have.a.lengthOf(9);

            done();
        });

        it('should register only specified routes + missing routes when `only` attribute is used', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo', 'FooController', {only: ['show', 'destroy']});
            routerInstance.getRoutes().getRoutes().should.have.a.lengthOf(3);

            done();
        });

        it('should register all excluded resource routes + missing routes when `except` ' +
        'attribute is used', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo', 'FooController', {except: ['show', 'destroy']});
            routerInstance.getRoutes().getRoutes().should.have.a.lengthOf(7);

            done();
        });

        it('should register routes with proper resource route wildcard', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo-bars', 'FooController', {only: ['show']});
            routerInstance.getRoutes().getRoutes()[0].getUri().should.equal('foo-bars/{foo_bars}');

            done();
        });

        it('should support resource nesting', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo-bars.foo-bazs', 'FooController', {only: ['show']});
            routerInstance.getRoutes().getRoutes()[0].getUri().should.equal('foo-bars/{foo_bars}/foo-bazs/{foo_bazs}');

            done();
        });

        it('should support resource route naming', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo-bars', 'FooController', {only: ['show'], as: 'prefix'});
            routerInstance.getRoutes().getRoutes()[0].getUri().should.equal('foo-bars/{foo_bars}');
            routerInstance.getRoutes().getRoutes()[0].getName().should.equal('prefix.foo-bars.show');

            done();
        });

        it('should register all routes with proper names', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo', 'FooController');

            routerInstance.getRoutes().hasNamedRoute('foo.index').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.show').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.create').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.store').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.edit').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.update').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.destroy').should.be.ok();

            done();
        });

        it('should register all routes with proper names', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo.bar', 'FooController');

            routerInstance.getRoutes().hasNamedRoute('foo.bar.index').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.bar.show').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.bar.create').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.bar.store').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.bar.edit').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.bar.update').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('foo.bar.destroy').should.be.ok();

            done();
        });

        it('should support custom route names for any of the specified resource routes', function(done) {
            var routerInstance = new Router(getApp(), new Filter());

            routerInstance.resource('foo.bar', 'FooController', {
                names: {
                    index: 'foo',
                    show: 'bar'
                }
            });

            routerInstance.getRoutes().hasNamedRoute('foo').should.be.ok();
            routerInstance.getRoutes().hasNamedRoute('bar').should.be.ok();

            done();
        });
    });

    function getApp() {
        return {
            config: {
                get: function(item) {
                    var value = {};

                    switch (item) {
                        case 'request': value.trustProxyFn = function trustNone() {
                                                return false;
                                        }
                    }

                    return value;
                }
            }
        };
    }

    function getRequest(options, CB) {
        options.headers = options.headers || {};

        options. headers = { 'Connection':'Close' };

        var request = http.request(options, function(response){
            request.__proto__ = requestProto;
            request.headers = request._headers;

            CB(request, response);
        });

        request.on('error',function(err){console.log(err); console.log(request.method);});
        request.end();
    }
});