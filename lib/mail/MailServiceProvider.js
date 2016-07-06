/**
 * MailServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var nodemailer = require('nodemailer');
var Mailer = require('./Mailer');

var MailServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register mail service
 *
 * @param {function} done
 */
MailServiceProvider.prototype.register = function (done) {
    var defaults = {};
    var config = this.__app.config.get('mail');
    var options = this.__getMailerOptions(config);

    if (isset(config.from)) {
        defaults.from = config.from;
    }

    var transporter = nodemailer.createTransport(options, defaults);

    this.__app.mail = new Mailer(transporter);

    done();
};

/**
 * Get node mailer options.
 *
 * @param config
 * @return {Object}
 * @protected
 */
MailServiceProvider.prototype.__getMailerOptions = function (config) {
    // If driver defined is smtp along with a well known service in
    // config then we only have to pass driverConfig object on transporter
    // creation as argument else we will create transporter object with
    // with defined driver module and use it for Nodemailer transporter
    // creation.
    if (config.driver == "nodemailer-smtp-transport" &&
        isset(config.driverConfig.service)) {
        return config.driverConfig;
    } else {
        return require(config.driver)(config.driverConfig);
    }
};

/**
 * Set view service for mail.
 *
 * @param {function} done
 */
MailServiceProvider.prototype.boot = function (done) {
    this.__app.mail.setViewService(this.__app.view);

    done();
};

module.exports = MailServiceProvider;