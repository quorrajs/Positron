
var BaseController = require('./BaseController');

var RouteTestControllerDispatchStub = BaseController.extend(function(){
    this.foo = function(req, res) {
        res.end('bar');
    };

    this.bar = function(req, res) {
        res.end('baz');
    };

    this.filter = function(req, res) {
        res.end('filtered');
    };

    this.baz = function(req, res) {
        res.end('baz');
    };

    this.qux = function(req, res) {
        res.end('qux');
    };

    this.beforeFilter('foo', {'only': 'bar'});
    this.beforeFilter('@filter', {'only': 'baz'});
});

module.exports = RouteTestControllerDispatchStub;