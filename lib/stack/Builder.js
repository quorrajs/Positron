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

Builder.prototype.push = function(spec) {

    if (typeof spec != 'function') {
        throw new Error("Spec error");
    }

    this.__specs.push(spec);

    return this;

};

Builder.prototype.resolve = function(app)
{
    var next = app;
    var middlewares = [app];
    var key;
    var spec;

    for(key = this.__specs.length -1; key >= 0; key--) {
        spec = this.__specs[key];

        next = new spec(app, next);

        middlewares.unshift(next);
    }

    return new StackedHttpKernel(next, middlewares);
};

module.exports = Builder;