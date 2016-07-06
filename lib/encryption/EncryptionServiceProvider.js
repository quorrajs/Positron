/**
 * EncryptionServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var Encrypter = require('encrypter');

var EncryptionServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the encryption service.
 *
 * @param {function} done
 */
EncryptionServiceProvider.prototype.register = function (done) {
    this.__app.encrypter = new Encrypter(this.__app.config.get('app').key);

    done();
};

module.exports = EncryptionServiceProvider;