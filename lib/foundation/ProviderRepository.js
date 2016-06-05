/**
 * ProviderRepository.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

/**
 * Service provider repository
 *
 * @param {Object} app
 * @constructor
 */
function ProviderRepository(app) {
    this.__app = app;
}

/**
 * Register the application service providers.
 *
 * @param  {Array} providers
 * @param  {function} callback
 */
ProviderRepository.prototype.load = function(providers, callback) {
    var self = this;
    var providersCount = providers.length;
    var callbackReturnedProviders = {};
    var callbackCounter = 0;

    providers.forEach(function (provider) {
        self.__app.register(provider, false, function() {
            // Make sure that callback is retuned only once
            if(!callbackReturnedProviders[provider]) {
                callbackReturnedProviders[provider] = true;
                callbackCounter++;

                if (providersCount === callbackCounter) {
                    return callback();
                }
            }
        });
    });
};

module.exports = ProviderRepository;