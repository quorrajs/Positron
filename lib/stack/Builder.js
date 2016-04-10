/**
 * Builder.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var StackedHttpKernel = require('./StackedHttpKernel');

function Builder() {

    /**
     * Stores middleware classes
     *
     * @type {Array}
     * @protected
     */
    this.__specs = [];

}

/**
 * Push a middleware class to spec array
 *
 * @param spec
 * @returns {Builder}
 */

Builder.prototype.push = function (spec) {

    if (typeof spec != 'function') {
        throw new Error("Spec error");
    }

    this.__specs.push(spec);

    return this;

};

/**
 * Builds a nested executable middleware instance stack
 *
 * @param app
 * @returns {StackedHttpKernel}
 */
Builder.prototype.resolve = function (app) {
    var next = app;
    var key;
    var spec;

    for (key = this.__specs.length - 1; key >= 0; key--) {
        spec = this.__specs[key];

        next = new spec(app, next);
    }

    return new StackedHttpKernel(next);
};

module.exports = Builder;