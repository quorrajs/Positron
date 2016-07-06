/**
 * TranslationServiceProvider.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var ServiceProvider = require('../support/ServiceProvider');
var i18n = require("i18n");
var _ = require('lodash');

var TranslationServiceProvider = ServiceProvider.extend(function(app) {
    this.__app = app;
});

/**
 * Register the translation service with application.
 *
 * Translator will be registered for each request from the translation middleware.
 *
 * @param {function} done
 */
TranslationServiceProvider.prototype.register = function (done) {
    var translationConfig = _.clone(this.__app.config.get('lang'));

    translationConfig.directory = this.__app.path.app + '/lang';

    i18n.configure(translationConfig);

    this.__app.translator = i18n;

    done();
};

module.exports = TranslationServiceProvider;