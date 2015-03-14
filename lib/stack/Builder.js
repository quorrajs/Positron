/**
 * Builder.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var StackedHttpKernel = require('./StackedHttpKernel');

function Builder() {

    /**
     *
     * @type {Array}
     * @protected
     */
    this.__specs = [];

}

Builder.prototype.push = function() {

    if (arguments.length === 0) {
        throw new Error("Missing argument(s) when calling push");
    }

    this.__specs.push(Array.prototype.slice.call(arguments, 0));

    return this;

};

Builder.prototype.resolve = function(app)
{
    var middlewares = [app], key, spec, firstArg, kernelClass;

    for(key = this.__specs.length -1; key >= 0; key--) {
        spec = this.__specs[key];

        firstArg = spec.shift();

        if (typeof firstArg === 'function') {
            app = new firstArg(app);
        } else {
            throw new Error("Middleware error");
        }

        middlewares.unshift(app);
    }

    return new StackedHttpKernel(app, middlewares);
};

module.exports = Builder;