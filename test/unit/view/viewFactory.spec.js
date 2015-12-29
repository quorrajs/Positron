/**
 * viewFactory.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */
var ViewFactory = require('../../../lib/view/ViewFactory');
var View = require('../../../lib/view/View');
var tmplEngine = require('../../support/tmpl');
var path = require('path');

describe('ViewFactory', function() {
   describe('#constructor', function(){
       it('should return an instance of ViewFactory when instantiated', function(done) {
           var view = new ViewFactory();

           view.should.be.an.instanceOf(ViewFactory);

           done();
       });
   });

    describe('#render', function(){

        it('should support full template paths', function(done){
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.locals.user = { name: 'tobi' };
            view.render(__dirname + '/../../fixtures/quorra/resources/views/user.tmpl',
                {}, function (err, str) {
                if (err) return done(err);
                str.should.equal('<p>tobi</p>');
                done();
            })
        });

        it('should support full template paths when template extension is not provided and  default template engine is configured in ' +
        'configuration files', function(done){
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.locals.user = { name: 'tobi' };
            app.config.defaultEngine = 'tmpl';

            view.render(__dirname + '/../../fixtures/quorra/resources/views/user', {}, function(err, str){
                if (err) return done(err);
                str.should.equal('<p>tobi</p>');
                done();
            })
        });

        it('should expose app.locals', function(done){
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];
            app.locals.user = { name: 'tobi' };

            view.render('user.tmpl', {}, function (err, str) {
                if (err) return done(err);
                str.should.equal('<p>tobi</p>');
                done();
            })
        });

        it('should support index.<engine>', function(done){
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];
            app.config.defaultEngine = 'tmpl';

            view.render('blog/post', {}, function (err, str) {
                if (err) return done(err);
                str.should.equal('<h1>blog post</h1>');
                done();
            })
        });

        describe('should handle render error throws', function(){

            it('when no default engine or extension specified', function(done){
                var app =  getApp();
                var view = new ViewFactory(app, app.config);

                view.render('something', {}, function(err, str){
                    err.should.be.ok;
                    err.message.should.equal('No default engine was specified and no extension was provided.');
                    done();
                });
            });

            it('when template file doesn\'t exist', function(done){
                var app =  getApp();
                var view = new ViewFactory(app, app.config);

                app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];
                app.config.defaultEngine = 'tmpl';

                view.render('something', {}, function(err, str){
                    err.should.be.ok;
                    err.message.should.equal('Failed to lookup view "something.tmpl" in views directory "'+
                    path.resolve(__dirname + '/../../fixtures/quorra/resources/views')+'"');
                    done();
                });
            });
        });

        describe('when an error occurs', function(){
            it('should invoke the callback', function(done){
                var app =  getApp();
                var view = new ViewFactory(app, app.config);

                app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];

                view.render('user.tmpl', {}, function (err, str) {
                    // nextTick to prevent cyclic
                    process.nextTick(function(){
                        err.message.should.match(/Cannot read property '[^']+' of undefined/);
                        done();
                    });
                })
            })
        });

        it('when there are multiple template paths it should lookup in later paths until template is found', function(done){
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.config.paths = [
                path.resolve(__dirname + '/../../fixtures/quorra/resources/views/path1'),
                path.resolve(__dirname + '/../../fixtures/quorra/resources/views/path2')
            ];

            app.locals.name = 'tobi';

            view.render('name.tmpl', {}, function (err, str) {
                if (err) return done(err);
                str.should.equal('<p>tobi</p>');
                done();
            })
        });

       /* describe('caching', function(){
            it('should not cache a view if caching is set to false', function() {
                var app =  getApp();
                var view = new ViewFactory(app, app.config);

                app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];

                app.config.cache = false;

                view.render('name.tmpl', {}, function (err, str) {
                    if (err) return done(err);
                    str.should.equal('<p>tobi</p>');
                    done();
                })
            })
        });*/

    });

    describe('#make', function() {
        it('should return View instance for specified template', function(){
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];

            view.make('user.tmpl',false).should.be.an.instanceOf(View);
        });

        it('should not cache a view if caching is false', function() {
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];

            view1 = view.make('user.tmpl',false);
            view2 = view.make('user.tmpl',false);

            view1.should.not.be.equal(view2);
        });

        it('should cache a view if caching is true', function() {
            var app =  getApp();
            var view = new ViewFactory(app, app.config);

            app.config.paths = [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')];

            view1 = view.make('user.tmpl',true);
            view2 = view.make('user.tmpl',true);

            view1.should.be.equal(view2);
        });
    });

    function getApp() {
        return {
            locals: {},
            config: {
                engines: {
                    tmpl: tmplEngine
                }
            }
        };
    }

});