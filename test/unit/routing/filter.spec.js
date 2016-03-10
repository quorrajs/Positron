var Filter = require('../../../lib/routing/Filter');
var sinon = require('sinon');
var should = require('should');
var Route = require('../../../lib/routing/Route');

describe('Filter', function() {
    describe('#constructor', function() {
        it('should return an instance of Filter when initialized', function(done) {
            var filter = new Filter();

            filter.should.be.an.instanceOf(Filter);
            done();
        })
    });

    describe('#callFilter', function() {
        it('should execute #run with array of registered filter callbacks and arguments passed', function(done) {
            var filter = new Filter();
            var filterCallback1 = function() {};
            var filterCallback2 = function() {};
            var filterCallback3 = function() {};

            //var spy = sinon.spy(filter, 'run');

            // single callback register with priority
            filter.register('myTestFilter', filterCallback1, 3);
            // multiple callbacks register with priority
            filter.register('myTestFilter', [filterCallback2, filterCallback3], 6);

            var req = {};
            var res = {};
            var params = ['foo', 'bar'];
            var callback = function() {
            };

            filter.run = function(){
               arguments[0][0].should.equal(filterCallback2);
               arguments[0][1].should.equal(filterCallback3);
               arguments[0][2].should.equal(filterCallback1);
               arguments[1].should.equal(req);
               arguments[2].should.equal(res);
               arguments[3].should.equal(callback);
               arguments[4].should.equal(params);

               done();
            };

            filter.callFilter('myTestFilter',req, res, callback, params);

            //filter.run.calledOnce.should.be.ok();
            //filter.run.getCalls(0).args[0].should.be.equal()
            //[[filterCallback]], req, res, callback, params
        });
    });

    // @covers #findPatternFilters #registerPatternFilter
    describe('#callPatternFilters', function() {
        it('should call #callRouteFilters with all pattern filters for the request and arguments passed', function(done) {
            var filter = new Filter();
            var filterCallback1 = function() {};
            var filterCallback2 = function() {};
            var filterCallback3 = function() {};
            var req = {path: '/foo/bar'};
            var res = {};
            var callback = function() {
            };

            filter.register('myTestFilter', filterCallback1);
            filter.register('myTestFilter2', filterCallback2);
            filter.register('myTestFilter3', filterCallback3);

            filter.registerPatternFilter('/foo/*', 'myTestFilter');
            filter.registerPatternFilter('/foo/*', 'myTestFilter3');

            filter.callRouteFilters = function() {
                arguments[0].myTestFilter.should.be.an.Array();
                should(arguments[0].myTestFilter2).be.undefined();
                arguments[0].myTestFilter3.should.be.an.Array();

                arguments[1].should.equal(req);
                arguments[2].should.equal(res);
                arguments[3].should.equal(callback);

                done();
            };

            filter.callPatternFilters(req, res, callback);
        });
    });

    describe('#callAttachedBefores', function() {
        it('should call #callRouteFilters with filters from the passed route and arguments passed', function(done) {
            var filter = new Filter();
            var route = new Route(['GET'], '/foo/bar', function(){});
            var req = {};
            var res = {};
            var callback = function() {
            };

            route.beforeFilters = function() {
                return 'before filters returned from route';
            };

            filter.callRouteFilters = function() {
                arguments[0].should.be.equal('before filters returned from route');
                arguments[1].should.equal(req);
                arguments[2].should.equal(res);
                arguments[3].should.equal(callback);

                done();
            };

            filter.callAttachedBefores(route, req, res, callback);
        });
    });

    describe('#callRouteFilters', function() {
        it('should execute callback passed when filters object is empty', function(done) {
            var filter = new Filter();
            var req = {};
            var res = {};
            var callback = function() {
                done();
            };

            filter.callRouteFilters({}, req, res, callback);
        });

        it('should execute #callFilter with route filter name, request, response, next filter method ' +
        'and filter parameters', function(done) {
            var filter = new Filter();
            var req = {};
            var res = {};
            var callback = function() {
            };

            filter.callFilter = function() {
                arguments[0].should.be.equal('router.filter: myFilter');
                arguments[1].should.equal(req);
                arguments[2].should.equal(res);
                arguments[3].should.be.type('function');
                arguments[4].should.eql(['foo', 'bar']);
                done();
            };

            filter.callRouteFilters({myFilter: ['foo', 'bar']}, req, res, callback);
        });

        it('should execute #callFilter for all the passed filters asynchronously with appropriate parameters and ' +
        'finally execute the passed callback function', function(done) {
            var filter = new Filter();
            var req = {};
            var res = {};
            var callback = function() {
                if(filterCount === 2) {
                    done();
                }
            };
            var filterCount = 0;

            filter.callFilter = function() {
                if(filterCount === 0) {
                    arguments[0].should.be.equal('router.filter: myFilter');
                    arguments[1].should.equal(req);
                    arguments[2].should.equal(res);
                    arguments[3].should.be.type('function');
                    arguments[4].should.eql(['foo', 'bar']);

                    filterCount++;

                    arguments[3](); // next method
                } else if(filterCount === 1) {
                    arguments[0].should.be.equal('router.filter: myFilter2');
                    arguments[1].should.equal(req);
                    arguments[2].should.equal(res);
                    arguments[3].should.be.type('function');
                    arguments[4].should.eql(['foo', 'baz']);

                    filterCount++;

                    arguments[3]();
                }
            };

            filter.callRouteFilters({myFilter: ['foo', 'bar'], myFilter2: ['foo', 'baz']}, req, res, callback);
        });
    });

    describe('#run', function() {
        it('should execute callback passed when there are filters object is empty', function(done) {
            var filter = new Filter();
            var req = {};
            var res = {};
            var callback = function() {
                done();
            };

            filter.run({}, req, res, callback);
        });

        it('should execute passed filter function with request, response, next filter method ' +
        'and filter parameters', function(done) {
            var filter = new Filter();
            var req = {};
            var res = {};
            var callback = function() {
            };

            filter.run([function() {
                arguments[0].should.equal(req);
                arguments[1].should.equal(res);
                arguments[2].should.be.type('function');
                arguments[3].should.eql('foo');
                arguments[4].should.eql('bar');

                done();
            }], req, res, callback, ['foo', 'bar']);
        });

        it('should execute all the passed filters asynchronously with appropriate parameters and finally execute the ' +
        'passed callback function', function(done) {
            var filter = new Filter();
            var req = {};
            var res = {};
            var callback = function() {
                if(filterCount === 2) {
                    done();
                }
            };
            var filterCount = 0;

            filter.run([
                function() {
                    if(filterCount === 0) {
                        arguments[0].should.equal(req);
                        arguments[1].should.equal(res);
                        arguments[2].should.be.type('function');
                        arguments[3].should.eql('foo');
                        arguments[4].should.eql('bar');

                        filterCount++;

                        arguments[2](); // next method
                    }
                },
                function() {
                    if(filterCount === 1) {
                        arguments[0].should.equal(req);
                        arguments[1].should.equal(res);
                        arguments[2].should.be.type('function');
                        arguments[3].should.eql('foo');
                        arguments[4].should.eql('bar');

                        filterCount++;

                        arguments[2](); // next method
                    }
                }
            ], req, res, callback, ['foo', 'bar']);
        });
    });

    // @covers #register
    describe('#getFilters', function() {
       it('should return all matched filters by filter string passed', function(done) {
           var filter = new Filter();
           var filterCallback1 = function() {};
           var filterCallback2 = function() {};
           var filterCallback3 = function() {};
           var registeredFilters = [filterCallback1, filterCallback2, filterCallback3];

           // single callback register with priority
           filter.register('myTestFilter', filterCallback1, 3);
           // multiple callbacks register with priority
           filter.register('myTestFilter', [filterCallback2, filterCallback3], 6);

           filter.register('myTestFilter2*', filterCallback2);

           var filters = filter.getFilters('myTestFilter');

           registeredFilters.indexOf(filters[0]).should.be.above(-1);
           registeredFilters.indexOf(filters[1]).should.be.above(-1);
           registeredFilters.indexOf(filters[2]).should.be.above(-1);

           // test false condition
           filter.getFilters('myTest').should.be.empty();


           // test retrieval of wildcard filters
           filter.getFilters('myTestFilter2').should.be.an.Array().and.have.lengthOf(1);
           filter.getFilters('myTestFilter2')[0].should.be.equal(filterCallback2);

           filter.getFilters('myTestFilter2wildcard').should.be.an.Array().and.have.lengthOf(1);
           filter.getFilters('myTestFilter2wildcard')[0].should.be.equal(filterCallback2);

           done();
       })
    });

    // @covers #explodeFilters, #parseFilter #explodeArrayFilters
    describe('#parseFilters', function() {
        it('should parse filter string in different formats to a object with filters string as key ' +
        'and filter parameters as value', function(done) {
            var filter = new Filter();

            filter.parseFilters('auth|session').should.be.eql({auth: [], session: []});
            filter.parseFilters('auth:78,23|session').should.be.eql({auth: ['78', '23'], session: []});
            filter.parseFilters('auth:78,23|session:92').should.be.eql({auth: ['78', '23'], session: ['92']});
            filter.parseFilters(['auth|session', 'guest']).should.be.eql({auth: [], session: [], 'guest': []});
            filter.parseFilters(['auth|session:89', 'guest']).should.be.eql({auth: [], session: ['89'], 'guest': []});

            done();
        })
    })
});