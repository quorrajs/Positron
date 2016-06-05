var Mailer = require('../../../lib/mail/Mailer');
var stubTransport = require('nodemailer-stub-transport');
var tmplEngine = require('../../support/tmpl');
var path = require('path');
var nodemailer = require('nodemailer');
var ViewFactory = require('../../../lib/view/ViewFactory');
var should = require('should');

describe('Mailer', function () {
    describe('#constructor', function () {
        it('should return an instance of Mailer when initialized', function (done) {
            var mailer = new Mailer();

            mailer.should.be.an.instanceOf(Mailer);

            done();
        });
    });

    describe('#plain', function () {
       it('should call send method with appropriate arguments', function (done) {
           var mailer = new Mailer();
           var view = "email";
           var data = {};
           var options = {};
           var callback = function () {};

           mailer.send = function () {
               arguments[0].should.be.eql({'text': view});
               arguments[1].should.be.equal(data);
               arguments[2].should.be.equal(options);
               arguments[3].should.be.equal(callback);

               done();
           };

           mailer.plain(view, data, options, callback);
       })
    });

    describe('#send', function () {
        var transport = nodemailer.createTransport(stubTransport());
        var app =  getApp();
        var viewFactory = new ViewFactory(app, app.config);
        var mailer = new Mailer(transport);

        mailer.setViewService(viewFactory);

        var view;
        var data = { user: 'tron' };
        var options = {
            from: 'bar@foo.com',
            to: 'foo@bar.com'
        };

        it('should send mail with proper view with view data, mail options and return callback with email info',
            function (done) {
            view  = "email";

            mailer.send(view, data ,options, function (err, info) {
                should(err).be.null();
                info.envelope.from.should.be.equal('bar@foo.com');
                info.envelope.to[0].should.be.equal('foo@bar.com');
                info.messageId.should.be.ok();
                info.response.toString().indexOf('Hello tron').should.be.above(-1);

                done();
            });
        });

        it('should return error when error in view',function (done) {
            view  = "nonExistingView";

            mailer.send(view, data ,options, function (err, info) {
                should(err).not.be.null();
                should(info).be.undefined();

                done();
            });
        });
    });

    function getApp() {
        return {
            locals: {},
            config: {
                defaultEngine: 'tmpl',
                engines: {
                    tmpl: tmplEngine
                },
                paths: [path.resolve(__dirname + '/../../fixtures/quorra/resources/views')]
            }
        };
    }
});