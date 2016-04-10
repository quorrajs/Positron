/**
 * MailServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var nodemailer = require('nodemailer');
var Mailer = require('./Mailer');

function MailServiceProvider(app) {
    this.__app = app;

    return this.register();
}

/**
 * Register mail service
 *
 * @return {Mailer}
 */
MailServiceProvider.prototype.register = function () {
    var options;
    var defaults = {};
    var config = this.__app.config.get('mail');

    // If driver defined is smtp along with a well known service in
    // config then we only have to pass driverConfig object on transporter
    // creation as argument else we will create transporter object with
    // with defined driver module and use it for Nodemailer transporter
    // creation.
    if (config.driver == "nodemailer-smtp-transport" &&
        isset(config.driverConfig.service)) {
        options = config.driverConfig
    } else {
        options = require(config.driver)(config.driverConfig)
    }

    if (isset(config.from)) {
        defaults.from = config.from;
    }

    var transporter = nodemailer.createTransport(options, defaults);

    return new Mailer(this.__app.view, transporter);
};

module.exports = MailServiceProvider;